import ExcelJS from 'exceljs'
import { ForbiddenException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTransferService } from '../src/modules/data-transfer/data-transfer.service'
import { TaiKhoanService } from '../src/modules/accounts/accounts.service'

const actor = { maTaiKhoan: 'actor-id', maPhien: 'session-id' } as never

function makeWorkbook(mode: 'LIEN_KET_HO_SO' | 'DOC_LAP', values: (string | null)[][]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Tài khoản')
  sheet.addRow([...(mode === 'LIEN_KET_HO_SO' ? ['Mã hồ sơ nội bộ'] : []), 'Tên đăng nhập', 'Email đăng nhập', 'Mật khẩu khởi tạo', 'Trạng thái ban đầu'])
  for (const row of values) sheet.addRow(row)
  return workbook.xlsx.writeBuffer().then((buffer) => Buffer.from(buffer))
}

describe('TaiKhoanService Excel import', () => {
  let service: TaiKhoanService
  let prisma: Record<string, any>
  let permission: { kiemTra: ReturnType<typeof vi.fn>; kiemTraQuyenDuocPhanCong: ReturnType<typeof vi.fn> }
  let created: { ma: string; tenDangNhap: string; email: string | null; trangThai: string }[]
  let audits: unknown[]

  beforeEach(() => {
    created = []
    audits = []
    const tx = {
      taiKhoanNguoiDung: { create: vi.fn(async ({ data }: { data: Record<string, any> }) => { const row = { ma: `new-${created.length + 1}`, tenDangNhap: data.tenDangNhap, email: data.email, trangThai: data.trangThai }; created.push(row); return row }) },
      nhatKyKiemToan: { create: vi.fn(async ({ data }: { data: unknown }) => { audits.push(data); return data }) },
    }
    prisma = {
      taiKhoanNguoiDung: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
      hoSoDangVien: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => ({ maTaiKhoan: null })) },
      $transaction: vi.fn(async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx)),
    }
    permission = { kiemTra: vi.fn(async () => undefined), kiemTraQuyenDuocPhanCong: vi.fn(async () => ({ coQuyen: true, toanHeThong: false, maDonVi: [] })) }
    service = new TaiKhoanService(prisma as never, permission as never, { tao: vi.fn(async (value: string) => `hash:length-${value.length}`) } as never, new DataTransferService())
  })

  it('validates, hashes before session storage, then atomically creates an independent account with audit', async () => {
    const buffer = await makeWorkbook('DOC_LAP', [['standalone01', 'person@example.edu.vn', 'correct-horse-battery', 'DANG_HOAT_DONG']])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')
    expect(preview).toMatchObject({ tongSo: 1, hopLe: 1, soTaiKhoanDocLap: 1, loi: [] })
    const sessions = (service as unknown as { importSessions: Map<string, { rows: { passwordHash: string; dto: Record<string, unknown> }[] }> }).importSessions
    const session = [...sessions.values()][0]!
    expect(JSON.stringify(session)).not.toContain('correct-horse-battery')
    expect(session.rows[0]?.passwordHash).toBe('hash:length-21')

    await expect(service.xacNhanNhap(actor, preview.maPhienNhap!, null)).resolves.toMatchObject({
      tongSo: 1, soTaiKhoanLienKet: 0, soTaiKhoanDocLap: 1,
      duLieu: [{ dong: 2, tenDangNhap: 'standalone01', email: 'person@example.edu.vn', hopLe: true, daTonTai: true, trangThaiTonTai: 'DA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] }],
    })
    expect(created).toEqual([{ ma: 'new-1', tenDangNhap: 'standalone01', email: 'person@example.edu.vn', trangThai: 'DANG_HOAT_DONG' }])
    expect(audits).toHaveLength(1)
    expect(JSON.stringify(audits)).not.toContain('correct-horse-battery')
    await expect(service.xacNhanNhap(actor, preview.maPhienNhap!, null)).rejects.toMatchObject({ response: { maLoi: 'PHIEN_NHAP_HET_HAN' } })
  })

  it('returns actionable validation errors for invalid password and status without exposing the password', async () => {
    const secret = 'short'
    const buffer = await makeWorkbook('DOC_LAP', [['account02', '', secret, 'UNKNOWN']])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')
    expect(preview.maPhienNhap).toBeNull()
    expect(preview.loi.map(({ field, message }) => `${field}: ${message}`).join(' ')).toContain('Trạng thái ban đầu')
    expect(preview.loi.map(({ field, message }) => `${field}: ${message}`).join(' ')).toContain('Mật khẩu khởi tạo')
    expect(JSON.stringify(preview)).not.toContain(secret)
    expect((service as unknown as { importSessions: Map<string, unknown> }).importSessions.size).toBe(0)
  })

  it('keeps valid rows valid when another row has errors and counts account type across every row', async () => {
    const buffer = await makeWorkbook('DOC_LAP', [
      ['valid-one', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
      ['invalid-two', '', 'short', 'UNKNOWN'],
      ['valid-three', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
    ])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')

    expect(preview).toMatchObject({ tongSo: 3, hopLe: 2, coLoi: 1, soTaiKhoanDocLap: 3, soTaiKhoanLienKet: 0, soDongChuaKiemTra: 0 })
    expect(preview.duLieu.map((row) => [row.tenDangNhap, row.trangThaiKiemTra, row.hopLe])).toEqual([
      ['valid-one', 'HOP_LE', true],
      ['invalid-two', 'CO_LOI', false],
      ['valid-three', 'HOP_LE', true],
    ])
    expect(preview.duLieu[1]?.loi?.length).toBeGreaterThan(1)
    expect(preview.tongSo).toBe(preview.hopLe + preview.coLoi + (preview.soDongChuaKiemTra ?? 0))
    expect(preview.maPhienNhap).toBeNull()
  })

  it.each([
    { name: 'all valid', passwords: ['correct-horse-battery', 'correct-horse-battery', 'correct-horse-battery'], expectedValid: 3, expectedError: 0 },
    { name: 'one valid and two invalid', passwords: ['correct-horse-battery', 'short', 'short'], expectedValid: 1, expectedError: 2 },
    { name: 'all invalid', passwords: ['short', 'short', 'short'], expectedValid: 0, expectedError: 3 },
  ])('counts every row exactly once when $name', async ({ passwords, expectedValid, expectedError }) => {
    const buffer = await makeWorkbook('DOC_LAP', passwords.map((password, index) => [`account-${index + 1}`, '', password, 'DANG_HOAT_DONG']))
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')

    expect(preview).toMatchObject({ tongSo: 3, hopLe: expectedValid, coLoi: expectedError, soTaiKhoanDocLap: 3 })
    expect(preview.tongSo).toBe(preview.hopLe + preview.coLoi + (preview.soDongChuaKiemTra ?? 0))
    expect(preview.duLieu.filter((row) => row.hopLe)).toHaveLength(expectedValid)
    expect(preview.duLieu.filter((row) => !row.hopLe)).toHaveLength(expectedError)
  })

  it('marks only rows whose username conflicts with an existing account', async () => {
    prisma.taiKhoanNguoiDung.findMany.mockImplementation(async ({ where }: { where: { tenDangNhap?: { in: string[] } } }) =>
      where.tenDangNhap?.in ? [{ tenDangNhap: 'existing-login' }] : [],
    )
    const buffer = await makeWorkbook('DOC_LAP', [
      ['existing-login', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
      ['new-login', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
    ])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')

    expect(preview).toMatchObject({ tongSo: 2, hopLe: 1, coLoi: 1, soDaTonTai: 1, soTaiKhoanDocLap: 2 })
    expect(preview.duLieu.map((row) => row.hopLe)).toEqual([false, true])
    expect(preview.duLieu.map((row) => row.daTonTai)).toEqual([true, false])
    expect(preview.duLieu.map((row) => row.trangThaiTonTai)).toEqual(['DA_TON_TAI', 'CHUA_TON_TAI'])
    expect(preview.loi).toEqual([expect.objectContaining({ row: 2, field: 'Tên đăng nhập' })])
  })

  it('rechecks username and email before confirmation and creates nothing if an account appeared after preview', async () => {
    const buffer = await makeWorkbook('DOC_LAP', [['new-candidate', 'new@example.edu.vn', 'correct-horse-battery', 'DANG_HOAT_DONG']])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')
    prisma.taiKhoanNguoiDung.count.mockResolvedValueOnce(1)

    await expect(service.xacNhanNhap(actor, preview.maPhienNhap!, null)).rejects.toMatchObject({ response: { maLoi: 'DU_LIEU_NHAP_DA_THAY_DOI' } })
    expect(created).toHaveLength(0)
  })

  it('counts persisted email collisions separately from workbook duplicates', async () => {
    prisma.taiKhoanNguoiDung.findMany.mockImplementation(async ({ where }: { where: { tenDangNhap?: { in: string[] }; email?: { in: string[] } } }) =>
      where.email?.in ? [{ email: 'stored@example.edu.vn' }] : [],
    )
    const buffer = await makeWorkbook('DOC_LAP', [
      ['account-a', 'stored@example.edu.vn', 'correct-horse-battery', 'DANG_HOAT_DONG'],
      ['account-b', 'duplicate@example.edu.vn', 'correct-horse-battery', 'DANG_HOAT_DONG'],
      ['account-c', 'duplicate@example.edu.vn', 'correct-horse-battery', 'DANG_HOAT_DONG'],
    ])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')

    expect(preview).toMatchObject({ tongSo: 3, hopLe: 0, coLoi: 3, soDaTonTai: 1 })
    expect(preview.duLieu.map((row) => row.daTonTai)).toEqual([true, false, false])
    expect(preview.duLieu.map((row) => row.trangThaiTonTai)).toEqual(['DA_TON_TAI', 'CHUA_TON_TAI', 'CHUA_TON_TAI'])
    expect(preview.loi.filter((item) => item.message.includes('trùng trong tệp'))).toHaveLength(2)
    expect(preview.loi).toContainEqual(expect.objectContaining({ row: 2, field: 'Email đăng nhập', message: 'Email đã tồn tại trong hệ thống.' }))
  })

  it('does not return a partial preview as data-valid when a system check fails', async () => {
    prisma.taiKhoanNguoiDung.findMany.mockRejectedValueOnce(new Error('database unavailable'))
    const buffer = await makeWorkbook('DOC_LAP', [['candidate', '', 'correct-horse-battery', 'DANG_HOAT_DONG']])

    await expect(service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')).rejects.toThrow('database unavailable')
  })

  it('writes only the actual row issues to the downloadable error report', async () => {
    const buffer = await makeWorkbook('DOC_LAP', [
      ['valid-row', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
      ['invalid-row', '', 'short', 'DANG_HOAT_DONG'],
    ])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')
    const report = await service.taoBaoCaoLoiNhap(actor, preview.loi)
    const workbook = await new DataTransferService().read(report)
    const sheet = workbook.getWorksheet('Lỗi nhập tài khoản')!

    expect(sheet.rowCount).toBe(preview.loi.length + 1)
    expect(sheet.getColumn(1).values.slice(2)).toEqual(preview.loi.map((issue) => issue.row))
    expect(JSON.stringify(report)).not.toContain('correct-horse-battery')
  })

  it('rejects an empty workbook as a file-level error without inventing a row error', async () => {
    const buffer = await makeWorkbook('DOC_LAP', [])
    await expect(service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'DOC_LAP')).rejects.toMatchObject({ response: { maLoi: 'SO_DONG_KHONG_HOP_LE' } })
  })

  it('resolves existing unlinked profiles, verifies scoped permission, and links without recreating the profile', async () => {
    prisma.hoSoDangVien.findMany.mockResolvedValue([{ ma: 'profile-uuid', maHoSoNoiBo: 'DV0001', maTaiKhoan: null }])
    const buffer = await makeWorkbook('LIEN_KET_HO_SO', [['DV0001', 'memberlogin', '', 'correct-horse-battery', 'DANG_HOAT_DONG']])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'LIEN_KET_HO_SO')
    expect(preview.maPhienNhap).toBeTruthy()
    expect(permission.kiemTra).toHaveBeenCalledWith('actor-id', 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: 'profile-uuid' }, 'session-id')
    await service.xacNhanNhap(actor, preview.maPhienNhap!, null)
    expect(created).toHaveLength(1)
    expect(prisma.hoSoDangVien.findMany).toHaveBeenCalledTimes(1)
  })

  it('rejects unknown or already linked profiles and duplicate usernames in the workbook', async () => {
    prisma.hoSoDangVien.findMany.mockResolvedValue([])
    const buffer = await makeWorkbook('LIEN_KET_HO_SO', [
      ['MISSING', 'duplicate', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
      ['DV0002', 'duplicate', '', 'correct-horse-battery', 'DANG_HOAT_DONG'],
    ])
    const preview = await service.kiemTraNhap(actor, { buffer, size: buffer.length, originalname: 'accounts.xlsx' }, 'LIEN_KET_HO_SO')
    expect(preview.maPhienNhap).toBeNull()
    expect(preview.loi.some(({ message }) => message.toLocaleLowerCase('vi-VN').includes('không tìm thấy hồ sơ'))).toBe(true)
    expect(preview.loi.filter(({ message }) => message.includes('trùng trong tệp'))).toHaveLength(2)
    expect(created).toHaveLength(0)
  })

  it('rejects a profile that is already linked and a profile outside the actor scope', async () => {
    const linked = await makeWorkbook('LIEN_KET_HO_SO', [['DV0003', 'login-linked', '', 'correct-horse-battery', 'DANG_HOAT_DONG']])
    prisma.hoSoDangVien.findMany.mockResolvedValue([{ ma: 'profile-uuid', maHoSoNoiBo: 'DV0003', maTaiKhoan: 'existing-account' }])
    const linkedPreview = await service.kiemTraNhap(actor, { buffer: linked, size: linked.length, originalname: 'accounts.xlsx' }, 'LIEN_KET_HO_SO')
    expect(linkedPreview.loi.some(({ message }) => message.includes('đã được liên kết'))).toBe(true)
    expect(linkedPreview.soDaTonTai).toBe(1)
    expect(linkedPreview.duLieu[0]?.daTonTai).toBe(true)

    prisma.hoSoDangVien.findMany.mockResolvedValue([{ ma: 'profile-scope', maHoSoNoiBo: 'DV0004', maTaiKhoan: null }])
    permission.kiemTra.mockImplementation(async (_account: string, permissionCode: string) => {
      if (permissionCode === 'TAI_KHOAN_LIEN_KET_HO_SO') throw new ForbiddenException()
    })
    const outOfScope = await makeWorkbook('LIEN_KET_HO_SO', [['DV0004', 'login-scope', '', 'correct-horse-battery', 'DANG_HOAT_DONG']])
    const scopePreview = await service.kiemTraNhap(actor, { buffer: outOfScope, size: outOfScope.length, originalname: 'accounts.xlsx' }, 'LIEN_KET_HO_SO')
    expect(scopePreview.loi.some(({ message }) => message.includes('không có quyền liên kết'))).toBe(true)
    expect(scopePreview.maPhienNhap).toBeNull()
  })
})
