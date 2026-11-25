import { ConflictException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { VanHanhDiemDanhService } from '../src/modules/resolution-learning/attendance-operations.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
const sessionId = '00000000-0000-4000-8000-000000000010'
const unitId = '00000000-0000-4000-8000-000000000020'
const config = { choPhepTrucTuyen: true, choPhepQr: true, choPhepBieuMau: true, choPhepKhongDangNhap: true, chuKyQrGiay: 30, moTheoKeHoachLuc: new Date(Date.now() - 60_000), dongTheoKeHoachLuc: new Date(Date.now() + 24 * 60 * 60 * 1000) }

function setup(options: { permission?: { coQuyen: boolean; toanHeThong: boolean; maDonVi: string[] }; status?: string; alreadyOpen?: boolean; qrEnabled?: boolean; attendanceConfig?: Partial<typeof config> } = {}) {
  let active = options.alreadyOpen ?? false
  const sessionConfig = { ...config, ...options.attendanceConfig }
  const existing = { ma: 'window-1', maBuoi: sessionId, maPhienQr: 'nonce', moLucThucTe: new Date('2026-11-11T10:00:00Z'), dongLucThucTe: null, dongTheoKeHoachLuc: config.dongTheoKeHoachLuc, choPhepQr: options.qrEnabled ?? true, choPhepBieuMau: true, choPhepKhongDangNhap: true, chuKyQrGiay: config.chuKyQrGiay, phienBanLienKetBieuMau: 1 }
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    cuaSoDiemDanhTrucTuyen: {
      findFirst: vi.fn().mockImplementation(async () => active ? existing : null),
      create: vi.fn().mockImplementation(async ({ data }) => { active = true; return { ...data, ma: existing.ma, maPhienQr: 'nonce' } }),
      findUnique: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockImplementation(async ({ data }) => { active = false; return { ...existing, ...data, phienBanLienKetBieuMau: data.phienBanLienKetBieuMau?.increment ? existing.phienBanLienKetBieuMau + data.phienBanLienKetBieuMau.increment : existing.phienBanLienKetBieuMau } }),
    },
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ trangThai: options.status ?? 'DANG_DIEN_RA', cauHinhDiemDanh: sessionConfig }) },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  let pending = Promise.resolve()
  const prisma = {
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: sessionId, trangThai: options.status ?? 'DANG_DIEN_RA', phamVi: [{ maDonVi: unitId }], cauHinhDiemDanh: sessionConfig }) },
    cuaSoDiemDanhTrucTuyen: { findFirst: vi.fn().mockImplementation(async () => active ? existing : null) },
    cauHinhDiemDanhBuoiHoc: { findUnique: vi.fn().mockResolvedValue(config) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
      let release!: () => void
      const predecessor = pending
      pending = new Promise<void>(resolve => { release = resolve })
      await predecessor
      try { return await callback(tx) } finally { release() }
    }),
  }
  const phanQuyen = { layDonViTrongPhamVi: vi.fn().mockResolvedValue(options.permission ?? { coQuyen: true, toanHeThong: true, maDonVi: [] }) }
  const security = { token: vi.fn().mockReturnValue('signed-token') }
  const configService = { get: (_key: string, fallback?: unknown) => fallback }
  const service = new VanHanhDiemDanhService(prisma as never, phanQuyen as never, security as never, configService as never)
  return { service, prisma, tx, phanQuyen, security }
}

describe('VanHanhDiemDanhService — cửa sổ và QR', () => {
  it('opens a configured window without changing the planned times or channels', async () => {
    const { service, tx } = setup()
    const row = await service.moCuaSo(actor as never, sessionId)
    expect(row).toMatchObject({ choPhepQr: true, choPhepBieuMau: true, chuKyQrGiay: 30, moTheoKeHoachLuc: config.moTheoKeHoachLuc, maNguoiMo: actor.maTaiKhoan })
    expect(tx.cuaSoDiemDanhTrucTuyen.create).toHaveBeenCalledOnce()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()
  })

  it('denies missing Permission and an Assignment Scope that does not cover the whole session', async () => {
    const missing = setup({ permission: { coQuyen: false, toanHeThong: false, maDonVi: [] } })
    await expect(missing.service.moCuaSo(actor as never, sessionId)).rejects.toBeInstanceOf(ForbiddenException)
    const outside = setup({ permission: { coQuyen: true, toanHeThong: false, maDonVi: ['other-unit'] } })
    await expect(outside.service.moCuaSo(actor as never, sessionId)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rejects opening when session state disallows it or an active window already exists', async () => {
    const wrongState = setup({ status: 'DA_LEN_LICH' })
    await expect(wrongState.service.moCuaSo(actor as never, sessionId)).rejects.toBeInstanceOf(ConflictException)
    const active = setup({ alreadyOpen: true })
    await expect(active.service.moCuaSo(actor as never, sessionId)).rejects.toMatchObject({ response: { maLoi: 'CUA_SO_DANG_MO' } })
    const disabled = setup({ attendanceConfig: { choPhepTrucTuyen: false } })
    await expect(disabled.service.moCuaSo(actor as never, sessionId)).rejects.toMatchObject({ response: { maLoi: 'KENH_DIEM_DANH_TRUC_TUYEN_DANG_TAT' } })
  })

  it('serializes simultaneous opens so only one active window is created', async () => {
    const { service, tx } = setup()
    const results = await Promise.allSettled([service.moCuaSo(actor as never, sessionId), service.moCuaSo(actor as never, sessionId)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    expect(tx.cuaSoDiemDanhTrucTuyen.create).toHaveBeenCalledOnce()
  })

  it('closes a window with an actual server time and rejects a second close', async () => {
    const { service, tx } = setup({ alreadyOpen: true })
    const closed = await service.dongCuaSo(actor as never, sessionId)
    expect(closed.dongLucThucTe).toBeInstanceOf(Date)
    expect(closed.maNguoiDong).toBe(actor.maTaiKhoan)
    expect(closed.phienBanLienKetBieuMau).toBe(2)
    await expect(service.dongCuaSo(actor as never, sessionId)).rejects.toBeInstanceOf(ConflictException)
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()
  })

  it('issues dynamic QR tokens with the configured bucket and no-cache payload', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T10:00:17Z'))
    const { service, security } = setup({ alreadyOpen: true })
    const result = await service.qr(actor as never, sessionId)
    expect(security.token).toHaveBeenCalledWith(expect.objectContaining({ mucDich: 'QR', maPhienQr: 'nonce', bucket: Math.floor(Date.now() / 30_000) }))
    expect(result.hetHanLuc).toBe(new Date((Math.floor(Date.now() / 30_000) + 1) * 30_000).toISOString())
    expect(result.noiDungQr).toContain('#t=signed-token')
    vi.useRealTimers()
  })

  it('does not issue a QR when the channel is disabled or the window is closed', async () => {
    const disabled = setup({ alreadyOpen: true, qrEnabled: false })
    await expect(disabled.service.qr(actor as never, sessionId)).rejects.toMatchObject({ response: { maLoi: 'QR_KHONG_HOAT_DONG' } })
    const closed = setup()
    await expect(closed.service.qr(actor as never, sessionId)).rejects.toMatchObject({ response: { maLoi: 'QR_KHONG_HOAT_DONG' } })
  })

  it('issues a separate versioned public form link and rejects issuance without Permission', async () => {
    const good = setup({ alreadyOpen: true })
    const link = await good.service.taoLienKet(actor as never, sessionId, {}, '127.0.0.1')
    expect(link).toMatchObject({ phienBan: 2, token: 'signed-token' })
    expect(link.url).toContain('/diem-danh/cong-khai#f=signed-token')
    expect(good.security.token).toHaveBeenCalledWith(expect.objectContaining({ mucDich: 'BIEU_MAU', phienBan: 2 }))
    const denied = setup({ alreadyOpen: true, permission: { coQuyen: false, toanHeThong: false, maDonVi: [] } })
    await expect(denied.service.taoLienKet(actor as never, sessionId, {})).rejects.toBeInstanceOf(ForbiddenException)
  })
})
