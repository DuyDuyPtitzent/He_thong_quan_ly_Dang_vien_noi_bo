import { describe, expect, it, vi } from 'vitest'
import { DichVuPrisma } from '../src/infrastructure/database/prisma.service'
import { PhanQuyenService } from '../src/modules/authorization/authorization.service'
import { VanHanhDiemDanhService } from '../src/modules/resolution-learning/attendance-operations.service'
import { BaoMatDiemDanhService } from '../src/modules/resolution-learning/attendance-security.service'

const key = Buffer.alloc(32, 55).toString('base64url')
const buoiId = '00000000-0000-4000-8000-000000000010'
const cuaSoId = '00000000-0000-4000-8000-000000000011'
const maChiBo = '00000000-0000-4000-8000-000000000020'
const now = new Date('2026-11-11T10:00:00Z')

function setup(options: { profiles?: Array<{ ma: string; thongTinCaNhan: { ngaySinh: Date; soCccd: string | null } | null; danhSachThamGiaNghiQuyet: Array<{ ma: string }> }>; formEnabled?: boolean; windowOpen?: boolean } = {}) {
  const profiles = options.profiles ?? [{ ma: '00000000-0000-4000-8000-000000000030', thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z'), soCccd: null }, danhSachThamGiaNghiQuyet: [{ ma: 'roster-row' }] }]
  const requests: Array<Record<string, unknown>> = []
  let limitCount = 0
  let transactionQueue = Promise.resolve()
  const window = { ma: cuaSoId, maBuoi: buoiId, maPhienQr: '00000000-0000-4000-8000-000000000099', phienBanLienKetBieuMau: 1, hetHanLienKetBieuMauLuc: new Date('2026-11-12T00:00:00Z'), choPhepQr: true, choPhepBieuMau: options.formEnabled ?? true, choPhepKhongDangNhap: true, chuKyQrGiay: 30, moLucThucTe: new Date('2026-11-11T09:00:00Z'), dongLucThucTe: options.windowOpen === false ? new Date('2026-11-11T09:30:00Z') : null, dongTheoKeHoachLuc: new Date('2026-11-12T12:00:00Z'), buoiHoc: { trangThai: 'DANG_DIEN_RA', ten: 'Sinh hoạt nghị quyết', phamVi: [{ maDonVi: maChiBo }], dotHoc: { ten: 'Đợt 2026' } } }
  const tx = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      if (strings[0]?.includes('INSERT INTO bo_dem_cong_khai_diem_danh')) return [{ so_yeu_cau: ++limitCount }]
      return []
    }),
    $executeRaw: vi.fn().mockResolvedValue(0),
    cuaSoDiemDanhTrucTuyen: { findUnique: vi.fn().mockResolvedValue(window) },
    donViToChuc: {
      findFirst: vi.fn().mockResolvedValue({ ma: maChiBo, loaiDonVi: 'CHI_BO', tenDonVi: [{ ten: 'Chi bộ A' }] }),
      findMany: vi.fn().mockResolvedValue([{ ma: maChiBo, tenDonVi: [{ ten: 'Chi bộ A' }] }]),
    },
    yeuCauDiemDanh: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findFirst: vi.fn().mockImplementation(async (args: { where: Record<string, unknown> }) => {
        const where = args.where
        if (where.idempotencyHash && typeof where.idempotencyHash === 'object') return requests.find(row => (where.idempotencyHash as { in: string[] }).in.includes(String(row.idempotencyHash))) ?? null
        if (where.dauVanTayCccdBam && typeof where.dauVanTayCccdBam === 'object') return requests.find(row => (where.OR as Array<{ dauVanTayCccdBam: string; phienBanKhoaBam: string }>).some(or => row.dauVanTayCccdBam === or.dauVanTayCccdBam && row.phienBanKhoaBam === or.phienBanKhoaBam)) ?? null
        return null
      }),
      findMany: vi.fn().mockImplementation(async (args: { where: { OR: Array<{ dauVanTayCoBanBam: string; phienBanKhoaBam: string }> } }) => requests.filter(row => args.where.OR.some(or => row.dauVanTayCoBanBam === or.dauVanTayCoBanBam && row.phienBanKhoaBam === or.phienBanKhoaBam && ['CHO_XAC_MINH', 'CHO_PHE_DUYET'].includes(String(row.trangThai))))),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => { const row = { ma: `request-${requests.length + 1}`, ...data }; requests.push(row); return row }),
    },
    hoSoDangVien: { findMany: vi.fn().mockResolvedValue(profiles) },
  }
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
      let release!: () => void
      const prior = transactionQueue
      transactionQueue = new Promise<void>(resolve => { release = resolve })
      await prior
      try { return await callback(tx) } finally { release() }
    }),
    yeuCauDiemDanh: tx.yeuCauDiemDanh,
  }
  const config = { get: (name: string, fallback?: unknown) => ({ HOC_TAP_NGHI_QUYET_HMAC_KEY_HIEN_TAI: 'v1', HOC_TAP_NGHI_QUYET_HMAC_KEYS: `v1:${key}`, HOC_TAP_GIOI_HAN_TRUY_CAP_MOI_PHUT: 60, HOC_TAP_GIOI_HAN_GUI_MOI_PHUT: 10, HOC_TAP_LUU_IDEMPOTENCY_GIO: 24 } as Record<string, unknown>)[name] ?? fallback }
  const security = new BaoMatDiemDanhService(config as never, prisma as never)
  const service = new VanHanhDiemDanhService(prisma as never as DichVuPrisma, {} as PhanQuyenService, security, config as never)
  const token = security.token({ mucDich: 'QR', maBuoi: buoiId, maCuaSo: cuaSoId, maPhienQr: window.maPhienQr, bucket: Math.floor(now.getTime() / 30_000), hetHanGiay: Math.floor(now.getTime() / 1000) + 30 })
  return { service, tx, security, requests, window, token }
}

const input = (token: string, overrides: Record<string, unknown> = {}) => ({ token, hoVaTen: ' Nguyễn Văn A ', maChiBo, namSinh: 1990, ...overrides })

describe('Public attendance request intake', () => {
  it('accepts a valid no-CCCD request as pending verification without echoing identity data', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const { service, tx, token, requests } = setup()
    const result = await service.guiYeuCauCongKhai(input(token), 'idempotency-key-0001')
    expect(result).toMatchObject({ trangThai: 'DA_TIEP_NHAN' })
    expect(JSON.stringify(result)).not.toContain('Nguyễn Văn A')
    expect(tx.yeuCauDiemDanh.create).toHaveBeenCalledWith({ data: expect.objectContaining({ maHoSo: expect.any(String), trangThai: 'CHO_XAC_MINH', ketQuaDuKien: 'CO_MAT', cccd: null, dauVanTayCccdBam: null }) })
    expect(requests[0]).toHaveProperty('cccd', null)
    vi.useRealTimers()
  })

  it('returns only fixed public form fields and in-scope Chi bộ options after validating QR', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const { service, token } = setup()
    const result = await service.truyCapCongKhai({ token })
    expect(result).toMatchObject({ choPhepGuiBieuMau: true, truong: [{ ma: 'hoVaTen' }, { ma: 'maChiBo' }, { ma: 'namSinh' }, { ma: 'cccd' }], danhSachChiBo: [{ ma: maChiBo, ten: 'Chi bộ A' }] })
    expect(JSON.stringify(result)).not.toContain('roster')
    vi.useRealTimers()
  })

  it('rejects a QR token bound to a different session and keeps the independent form token usable when QR is off', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const wrongSession = setup()
    const mismatched = wrongSession.security.token({ mucDich: 'QR', maBuoi: '00000000-0000-4000-8000-000000000099', maCuaSo: cuaSoId, maPhienQr: wrongSession.window.maPhienQr, bucket: Math.floor(now.getTime() / 30_000), hetHanGiay: Math.floor(now.getTime() / 1000) + 30 })
    await expect(wrongSession.service.truyCapCongKhai({ token: mismatched })).rejects.toMatchObject({ response: { maLoi: 'CUA_SO_DIEM_DANH_KHONG_HOAT_DONG' } })
    const independent = setup()
    independent.window.choPhepQr = false
    const formToken = independent.security.token({ mucDich: 'BIEU_MAU', maBuoi: buoiId, maCuaSo: cuaSoId, phienBan: 1, hetHanGiay: Math.floor(now.getTime() / 1000) + 600 })
    await expect(independent.service.truyCapCongKhai({ token: formToken })).resolves.toMatchObject({ choPhepGuiBieuMau: true })
    vi.useRealTimers()
  })

  it('keeps unmatched, ambiguous and outside-roster identities unlinked for later verification', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const ambiguous = [1, 2].map(i => ({ ma: `profile-${i}`, thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z'), soCccd: null }, danhSachThamGiaNghiQuyet: [{ ma: `roster-${i}` }] }))
    const outside = [{ ma: 'profile-outside', thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z'), soCccd: null }, danhSachThamGiaNghiQuyet: [] }]
    for (const profiles of [[], ambiguous, outside]) {
      const { service, token, tx } = setup({ profiles })
      const result = await service.guiYeuCauCongKhai(input(token), `idempotency-key-${profiles.length}-0001`)
      expect(result.trangThai).toBe('DA_TIEP_NHAN')
      expect(tx.yeuCauDiemDanh.create).toHaveBeenCalledWith({ data: expect.objectContaining({ maHoSo: null, trangThai: 'CHO_XAC_MINH' }) })
    }
    vi.useRealTimers()
  })

  it('returns the same generic acknowledgement for a duplicate fingerprint without creating another request', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const { service, token, requests, tx } = setup()
    await service.guiYeuCauCongKhai(input(token), 'idempotency-key-0001')
    const second = await service.guiYeuCauCongKhai(input(token), 'idempotency-key-0002')
    expect(second).toMatchObject({ trangThai: 'DA_TIEP_NHAN' })
    expect(requests).toHaveLength(1)
    expect(tx.yeuCauDiemDanh.create).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('allows distinct CCCD values for the same basic fingerprint to reach verification', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const profiles = ['012345678901', '012345678902'].map((cccd, i) => ({ ma: `profile-${i}`, thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z'), soCccd: cccd }, danhSachThamGiaNghiQuyet: [{ ma: `roster-${i}` }] }))
    const { service, token, requests, security } = setup({ profiles })
    await service.guiYeuCauCongKhai(input(token, { cccd: profiles[0].thongTinCaNhan.soCccd }), 'idempotency-key-0001')
    await service.guiYeuCauCongKhai(input(token, { cccd: profiles[1].thongTinCaNhan.soCccd }), 'idempotency-key-0002')
    expect(requests).toHaveLength(2)
    expect(requests.map(row => row.cccd)).toEqual(['012345678901', '012345678902'])
    vi.useRealTimers()
  })

  it('blocks a closed window or disabled public form without persisting requests', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const closed = setup({ windowOpen: false })
    await expect(closed.service.guiYeuCauCongKhai(input(closed.token), 'idempotency-key-0001')).rejects.toMatchObject({ response: { maLoi: 'CUA_SO_DIEM_DANH_KHONG_HOAT_DONG' } })
    const disabled = setup({ formEnabled: false })
    await expect(disabled.service.guiYeuCauCongKhai(input(disabled.token), 'idempotency-key-0001')).rejects.toMatchObject({ response: { maLoi: 'BIEU_MAU_CONG_KHAI_DANG_TAT' } })
    expect(closed.requests).toHaveLength(0)
    expect(disabled.requests).toHaveLength(0)
    vi.useRealTimers()
  })

  it('returns a generic duplicate receipt under concurrent submission with the same idempotency key', async () => {
    vi.useFakeTimers(); vi.setSystemTime(now)
    const { service, token, requests } = setup()
    const results = await Promise.all([service.guiYeuCauCongKhai(input(token), 'idempotency-key-0001'), service.guiYeuCauCongKhai(input(token), 'idempotency-key-0001')])
    expect(results.every(result => result.trangThai === 'DA_TIEP_NHAN')).toBe(true)
    expect(requests).toHaveLength(1)
    vi.useRealTimers()
  })
})
