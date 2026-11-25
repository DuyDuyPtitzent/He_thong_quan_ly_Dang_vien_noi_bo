import { ConflictException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { VanHanhDiemDanhService } from '../src/modules/resolution-learning/attendance-operations.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
const buoiId = '00000000-0000-4000-8000-000000000010'
const hoSoId = '00000000-0000-4000-8000-000000000011'
const windowId = '00000000-0000-4000-8000-000000000012'
const token = 'valid-qr'

function setup(options: { allowed?: boolean; profileCount?: number; profileStatus?: string; rosterStatus?: string; current?: Record<string, unknown> | null; pending?: Record<string, unknown> | null; approval?: boolean; tokenValid?: boolean; unitEnabled?: boolean } = {}) {
  const now = Date.now()
  const payload = { mucDich: 'QR', maBuoi: buoiId, maCuaSo: windowId, maPhienQr: 'nonce', bucket: Math.floor(now / 30_000), hetHanGiay: Math.floor(now / 1000) + 30 }
  const profile = { ma: hoSoId, trangThai: options.profileStatus ?? 'DANG_HOAT_DONG', hoVaTen: 'Nguyễn Văn A', thongTinCaNhan: { ngaySinh: new Date('1990-02-03T00:00:00.000Z') } }
  const window = { ma: windowId, maBuoi: buoiId, moLucThucTe: new Date(now - 60_000), dongLucThucTe: null, dongTheoKeHoachLuc: new Date(now + 60_000), choPhepQr: options.unitEnabled ?? true, choPhepKhongDangNhap: false, chuKyQrGiay: 30, maPhienQr: 'nonce', buoiHoc: { trangThai: 'DANG_DIEN_RA', yeuCauPheDuyet: options.approval ?? false, cauHinhDiemDanh: {}, phamVi: [], dotHoc: { ten: 'Đợt' } } }
  let currentResult = options.current ?? null
  let pendingRequest = options.pending ?? null
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    cuaSoDiemDanhTrucTuyen: { findUnique: vi.fn().mockResolvedValue(window) },
    danhSachThamGiaBuoiHoc: { findUnique: vi.fn().mockResolvedValue({ ma: 'roster-1', trangThai: options.rosterStatus ?? 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit-1', tenChiBoSnapshot: 'Chi bộ 1' }) },
    yeuCauDiemDanh: { findFirst: vi.fn().mockImplementation(async () => pendingRequest), create: vi.fn().mockImplementation(async ({ data }) => { pendingRequest = { ma: 'request-1', ...data }; return pendingRequest }) },
    ketQuaDiemDanh: { findUnique: vi.fn().mockImplementation(async () => currentResult), create: vi.fn().mockImplementation(async ({ data }) => { currentResult = { ma: 'result-1', ...data }; return currentResult }) },
    lichSuDiemDanh: { create: vi.fn().mockResolvedValue({}) },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  let transactionQueue = Promise.resolve()
  const prisma = {
    hoSoDangVien: { findMany: vi.fn().mockResolvedValue(options.profileCount === 0 ? [] : options.profileCount === 2 ? [profile, { ...profile, ma: 'other' }] : [profile]) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
      let release!: () => void
      const before = transactionQueue
      transactionQueue = new Promise<void>(resolve => { release = resolve })
      await before
      try { return await callback(tx) } finally { release() }
    }),
  }
  const authorization = { kiemTraQuyenCaNhan: vi.fn().mockImplementation(async () => { if (options.allowed === false) throw new ForbiddenException() }) }
  const security = { xacMinhToken: vi.fn().mockImplementation(() => options.tokenValid === false ? null : payload) }
  const service = new VanHanhDiemDanhService(prisma as never, authorization as never, security as never, { get: (_key: string, fallback?: unknown) => fallback } as never)
  return { service, prisma, tx, authorization, security }
}

describe('Tự điểm danh bằng QR — API cá nhân', () => {
  it('requires the dedicated permission in the selected CA_NHAN assignment and an unambiguous linked profile', async () => {
    const denied = setup({ allowed: false })
    await expect(denied.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toBeInstanceOf(ForbiddenException)
    expect(denied.authorization.kiemTraQuyenCaNhan).toHaveBeenCalledWith(actor.maTaiKhoan, 'HOC_TAP_NGHI_QUYET_TU_DIEM_DANH', actor.maPhien)
    expect(denied.prisma.hoSoDangVien.findMany).not.toHaveBeenCalled()
    const missing = setup({ profileCount: 0 })
    await expect(missing.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'TAI_KHOAN_CHUA_LIEN_KET_HO_SO' } })
    const ambiguous = setup({ profileCount: 2 })
    await expect(ambiguous.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'LIEN_KET_HO_SO_KHONG_HOP_LE' } })
  })

  it('accepts a valid QR for the linked profile even when public anonymous submission is disabled', async () => {
    const { service, tx } = setup()
    await expect(service.tuDiemDanh(actor as never, buoiId, { token })).resolves.toMatchObject({ ketQua: 'CO_MAT', choPheDuyet: false, khongThayDoi: false })
    expect(tx.ketQuaDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maBuoi: buoiId, maHoSo: hoSoId, trangThai: 'CO_MAT', maNguoiCapNhat: actor.maTaiKhoan }) }))
    expect(tx.lichSuDiemDanh.create).toHaveBeenCalledOnce()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()
    expect(tx.yeuCauDiemDanh.create).not.toHaveBeenCalled()
  })

  it('rejects invalid/expired/revoked QR, a QR for another session, and an unavailable QR channel', async () => {
    const invalid = setup({ tokenValid: false })
    await expect(invalid.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'QR_KHONG_HOP_LE' } })
    const wrongSession = setup()
    await expect(wrongSession.service.tuDiemDanh(actor as never, '00000000-0000-4000-8000-000000000099', { token })).rejects.toMatchObject({ response: { maLoi: 'QR_KHONG_HOP_LE' } })
    const disabled = setup({ unitEnabled: false })
    await expect(disabled.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'QR_HET_HAN' } })
  })

  it('rejects inactive profiles and roster members that were removed or never added', async () => {
    await expect(setup({ profileStatus: 'DA_XOA' }).service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'HO_SO_KHONG_HOAT_DONG' } })
    await expect(setup({ rosterStatus: 'DA_LOAI' }).service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'KHONG_THUOC_ROSTER' } })
    const missing = setup(); missing.tx.danhSachThamGiaBuoiHoc.findUnique.mockResolvedValue(null)
    await expect(missing.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'KHONG_THUOC_ROSTER' } })
  })

  it('returns idempotent success for current CO_MAT and does not overwrite another official result', async () => {
    const present = setup({ current: { ma: 'result-1', trangThai: 'CO_MAT', version: 2 } })
    await expect(present.service.tuDiemDanh(actor as never, buoiId, { token })).resolves.toMatchObject({ khongThayDoi: true, version: 2 })
    expect(present.tx.nhatKyKiemToan.create).not.toHaveBeenCalled()
    const absent = setup({ current: { ma: 'result-1', trangThai: 'VANG_CO_PHEP', version: 1 } })
    await expect(absent.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'KET_QUA_DA_TON_TAI' } })
    expect(absent.tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
  })

  it('creates only a pending approval request when approval is enabled and returns the same pending request on retry', async () => {
    const approved = setup({ approval: true })
    await expect(approved.service.tuDiemDanh(actor as never, buoiId, { token })).resolves.toMatchObject({ trangThai: 'CHO_PHE_DUYET', choPheDuyet: true })
    expect(approved.tx.yeuCauDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maHoSo: hoSoId, maCuaSo: windowId, trangThai: 'CHO_PHE_DUYET', ketQuaDuKien: 'CO_MAT' }) }))
    expect(approved.tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
    expect(approved.tx.lichSuDiemDanh.create).not.toHaveBeenCalled()
    expect(approved.tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()
    const retry = setup({ approval: true, pending: { ma: 'request-existing', maCuaSo: windowId, trangThai: 'CHO_PHE_DUYET' } })
    await expect(retry.service.tuDiemDanh(actor as never, buoiId, { token })).resolves.toMatchObject({ maYeuCau: 'request-existing', daGuiTruocDo: true })
    expect(retry.tx.yeuCauDiemDanh.create).not.toHaveBeenCalled()
  })

  it('does not turn a pending public verification request into a self-attendance result', async () => {
    const setupValue = setup({ pending: { ma: 'public-request', maCuaSo: windowId, trangThai: 'CHO_XAC_MINH' } })
    await expect(setupValue.service.tuDiemDanh(actor as never, buoiId, { token })).rejects.toMatchObject({ response: { maLoi: 'YEU_CAU_DANG_CHO_XU_LY' } })
    expect(setupValue.tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
  })

  it('serializes simultaneous QR submissions so no duplicate result or pending request is created', async () => {
    const direct = setup()
    const directResults = await Promise.all([direct.service.tuDiemDanh(actor as never, buoiId, { token }), direct.service.tuDiemDanh(actor as never, buoiId, { token })])
    expect(direct.tx.ketQuaDiemDanh.create).toHaveBeenCalledOnce()
    expect(directResults.filter(result => result.khongThayDoi)).toHaveLength(1)
    const approval = setup({ approval: true })
    const approvalResults = await Promise.all([approval.service.tuDiemDanh(actor as never, buoiId, { token }), approval.service.tuDiemDanh(actor as never, buoiId, { token })])
    expect(approval.tx.yeuCauDiemDanh.create).toHaveBeenCalledOnce()
    expect(approvalResults.filter(result => result.daGuiTruocDo)).toHaveLength(1)
  })
})
