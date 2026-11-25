import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { UngDungModule } from '../app.module'
import { DichVuPrisma } from '../infrastructure/database/prisma.service'

const databaseNameAllowed = 'quan_ly_dang_vien_dev'
const catalogCode = 'HINH_THUC_BUOI_HOC_NGHI_QUYET'
const initialValues = [
  { maGiaTri: 'TRUC_TIEP', tenHienThi: 'Trực tiếp', thuTu: 10 },
  { maGiaTri: 'TRUC_TUYEN', tenHienThi: 'Trực tuyến', thuTu: 20 },
  { maGiaTri: 'KET_HOP', tenHienThi: 'Kết hợp', thuTu: 30 },
] as const

function verifyDevelopmentDatabase() {
  const configured = process.env['KET_NOI_CO_SO_DU_LIEU']
  if (!configured) throw new Error('Thiếu KET_NOI_CO_SO_DU_LIEU; không chạy khởi tạo danh mục.')
  const connection = new URL(configured)
  const name = decodeURIComponent(connection.pathname.replace(/^\//, ''))
  if (!['127.0.0.1', 'localhost', '::1'].includes(connection.hostname) || name !== databaseNameAllowed) {
    throw new Error(`Chỉ cho phép khởi tạo trong CSDL phát triển ${databaseNameAllowed} tại loopback; không ghi dữ liệu.`)
  }
}

async function main() {
  verifyDevelopmentDatabase()
  const app = await NestFactory.createApplicationContext(UngDungModule, { logger: false })
  try {
    const prisma = app.get(DichVuPrisma)
    const result = await prisma.$transaction(async tx => {
      const group = await tx.nhomDanhMucNghiepVu.findUnique({ where: { maNhom: catalogCode }, select: { ma: true, trangThai: true } })
      if (!group || group.trangThai !== 'DANG_HOAT_DONG') throw new Error('Nhóm hình thức buổi học không tồn tại hoặc đã ngừng hoạt động.')
      const created = await tx.giaTriDanhMucNghiepVu.createMany({
        data: initialValues.map(value => ({ maNhomDanhMuc: group.ma, ...value })),
        skipDuplicates: true,
      })
      const values = await tx.giaTriDanhMucNghiepVu.findMany({
        where: { maNhomDanhMuc: group.ma, maGiaTri: { in: initialValues.map(value => value.maGiaTri) } },
        select: { maGiaTri: true, tenHienThi: true, thuTu: true, trangThai: true },
        orderBy: [{ thuTu: 'asc' }, { maGiaTri: 'asc' }],
      })
      return { daThem: created.count, values }
    })
    const listing = result.values.map(value => `${value.maGiaTri}: ${value.tenHienThi} (thứ tự ${value.thuTu}, ${value.trangThai})`).join('\n')
    process.stdout.write(`Đã khởi tạo danh mục hình thức: thêm ${result.daThem} giá trị còn thiếu; không cập nhật giá trị đã tồn tại.\n${listing}\n`)
  } finally { await app.close() }
}

main().catch((error: unknown) => {
  process.stderr.write(`Không thể khởi tạo danh mục hình thức: ${error instanceof Error ? error.message : 'Lỗi không xác định'}\n`)
  process.exitCode = 1
})
