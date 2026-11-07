import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/infrastructure/database/generated/prisma/client'
import { BamMatKhauService } from '../src/modules/auth/password-hasher'
import { TaiKhoanService } from '../src/modules/accounts/accounts.service'
import { DataTransferService } from '../src/modules/data-transfer/data-transfer.service'

const enabled = process.env['CHAY_KIEM_THU_POSTGRES'] === '1'
const integration = enabled ? describe : describe.skip

integration('TaiKhoanService Excel import với PostgreSQL', () => {
  let prisma: PrismaClient
  let service: TaiKhoanService
  let actorId = ''
  let createdId: string | undefined
  const testId = randomUUID()
  const login = `rollback-${testId}`

  beforeAll(async () => {
    const connection = process.env['KET_NOI_CO_SO_DU_LIEU']
    if (!connection) throw new Error('Thiếu KET_NOI_CO_SO_DU_LIEU cho kiểm thử PostgreSQL.')
    prisma = new PrismaClient({ adapter: new PrismaPg(connection) })
    const identity = await prisma.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`
    if (identity[0]?.database !== 'quan_ly_dang_vien_dev') throw new Error('Kiểm thử bị dừng: kết nối không trỏ đến PostgreSQL phát triển quan_ly_dang_vien_dev.')
    actorId = (await prisma.taiKhoanNguoiDung.findFirst({ select: { ma: true } }))?.ma ?? ''
    if (!actorId) throw new Error('Cần có tài khoản sẵn có để kiểm tra quan hệ audit; kiểm thử không tạo actor bền vững.')

    const permissions = { kiemTra: async () => undefined }
    const transactionalRollback = new Error('ROLLBACK_IMPORT_INTEGRATION_TEST')
    const prismaWithRollback = new Proxy(prisma, {
      get(target, property, receiver) {
        if (property === '$transaction') return async (callback: (tx: PrismaClient) => Promise<unknown>) => target.$transaction(async (tx) => {
          const result = await callback(tx as unknown as PrismaClient)
          const account = await tx.taiKhoanNguoiDung.findUnique({ where: { tenDangNhap: `rollback-${testId}` }, select: { ma: true, matKhauBam: true } })
          expect(account?.matKhauBam).toMatch(/^scrypt\$/)
          expect(account?.matKhauBam).not.toContain('not-a-plaintext-password')
          createdId = account?.ma
          expect(await tx.nhatKyKiemToan.count({ where: { loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: account?.ma, hanhDong: 'TAI_KHOAN_TAO' } })).toBe(1)
          throw transactionalRollback
        })
        const value = Reflect.get(target, property, receiver) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    service = new TaiKhoanService(prismaWithRollback as never, permissions as never, new BamMatKhauService(), new DataTransferService())
  })

  afterAll(async () => { await prisma?.$disconnect() })

  it('writes account and audit inside the transaction, then verifies rollback leaves neither behind', async () => {
    const workbook = new DataTransferService().createWorkbook()
    const sheet = workbook.addWorksheet('Tài khoản')
    sheet.addRow(['Tên đăng nhập', 'Email đăng nhập', 'Mật khẩu khởi tạo', 'Trạng thái ban đầu'])
    sheet.addRow([login, '', 'not-a-plaintext-password', 'DANG_HOAT_DONG'])
    const buffer = await new DataTransferService().write(workbook)
    const preview = await service.kiemTraNhap({ maTaiKhoan: actorId, maPhien: 'integration-session' } as never, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')

    await expect(service.xacNhanNhap({ maTaiKhoan: actorId, maPhien: 'integration-session' } as never, preview.maPhienNhap!, null)).rejects.toThrow('ROLLBACK_IMPORT_INTEGRATION_TEST')
    expect(createdId).toBeTruthy()
    expect(await prisma.taiKhoanNguoiDung.count({ where: { tenDangNhap: login } })).toBe(0)
    expect(await prisma.nhatKyKiemToan.count({ where: { loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: createdId } })).toBe(0)
  })
})
