import 'dotenv/config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/infrastructure/database/generated/prisma/client'
import { ThongKeHocTapNghiQuyetService } from '../src/modules/resolution-learning/statistics.service'

const enabled = process.env['CHAY_KIEM_THU_POSTGRES'] === '1'
const integration = enabled ? describe : describe.skip

integration('API thống kê học tập với PostgreSQL phát triển (chỉ đọc)', () => {
  let prisma: PrismaClient
  let service: ThongKeHocTapNghiQuyetService
  beforeAll(async () => {
    const connection = process.env['KET_NOI_CO_SO_DU_LIEU']
    if (!connection) throw new Error('Thiếu KET_NOI_CO_SO_DU_LIEU.')
    prisma = new PrismaClient({ adapter: new PrismaPg(connection) })
    const identity = await prisma.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`
    if (identity[0]?.database !== 'quan_ly_dang_vien_dev') throw new Error('Kiểm thử dừng vì không trỏ đến DB phát triển đã xác minh.')
    const permissions = { layDonViTrongPhamVi: async () => ({ coQuyen: true, toanHeThong: true, maDonVi: [] }) }
    service = new ThongKeHocTapNghiQuyetService(prisma as never, permissions as never)
  })
  afterAll(async () => { await prisma?.$disconnect() })

  it('thực thi các truy vấn tổng hợp PostgreSQL mà không ghi dữ liệu hoặc tạo fixture', async () => {
    const actor = { maTaiKhoan: 'read-only-statistics-test', maPhien: 'read-only-statistics-test' } as never
    const [byUnit, trend, campaign, session] = await Promise.all([
      service.theoChiBo(actor, {}), service.xuHuong(actor, {}),
      prisma.dotHocNghiQuyet.findFirst({ select: { ma: true } }), prisma.buoiHocNghiQuyet.findFirst({ select: { ma: true } }),
    ])
    expect(byUnit.duLieu).toBeDefined(); expect(trend.duLieu).toBeDefined()
    if (campaign) {
      const [overview, participation] = await Promise.all([service.theoDot(actor, campaign.ma, {}), service.mucDoThamGia(actor, { maDot: campaign.ma })])
      expect(overview.tongLuot).toBeGreaterThanOrEqual(0); expect(participation.tongDangVienTrongTapApDung).toBeGreaterThanOrEqual(0)
    }
    if (session) expect((await service.theoBuoi(actor, session.ma)).tongThuocDien).toBeGreaterThanOrEqual(0)
  })
})
