import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import { ChotDiemDanhService } from '../src/modules/resolution-learning/attendance-finalization.service'

const actor = { maTaiKhoan: 'actor', maPhien: 'session' } as never
const roster = [
  { maHoSo: 'member-present', maChiBoSnapshot: 'unit-a' },
  { maHoSo: 'member-unmarked', maChiBoSnapshot: 'unit-a' },
  { maHoSo: 'member-reset', maChiBoSnapshot: 'unit-b' },
  { maHoSo: 'member-removed-not-returned', maChiBoSnapshot: 'unit-a' },
]

function fixture(options: { status?: string; pending?: { ma: string; maHoSo: string | null; trangThai: 'CHO_XAC_MINH' | 'CHO_PHE_DUYET' }[]; existingChot?: { ma: string } | null; scope?: string[]; activeRoster?: typeof roster } = {}) {
  const activeRoster = options.activeRoster ?? roster.slice(0, 3)
  const resultRows = [
    { maHoSo: 'member-present', ma: 'r1', trangThai: 'CO_MAT', version: 2 },
    { maHoSo: 'member-reset', ma: 'r3', trangThai: null, version: 4 },
  ].filter(row => activeRoster.some(member => member.maHoSo === row.maHoSo))
  const unitList = [...new Set(activeRoster.map(row => row.maChiBoSnapshot))]
  const chotCreate = vi.fn(async ({ data }) => ({ ...data, ma: 'chot-1' }))
  const snapshotCreateMany = vi.fn(async () => ({ count: activeRoster.length }))
  const snapshotFindMany = vi.fn(async () => activeRoster.map((member, index) => ({ ma: `snapshot-${index}`, ...member, trangThai: member.maHoSo === 'member-present' ? 'CO_MAT' : 'VANG_KHONG_PHEP', versionKetQua: 1 })))
  const tx = {
    $queryRaw: vi.fn(async () => []),
    buoiHocNghiQuyet: { findUnique: vi.fn(async () => ({ ma: 'session-1', trangThai: options.status ?? 'DA_KET_THUC', phienBanDanhSach: 3, phamVi: unitList.map(maDonVi => ({ maDonVi })) })) },
    danhSachThamGiaBuoiHoc: { findMany: vi.fn(async () => activeRoster) },
    yeuCauDiemDanh: { findMany: vi.fn(async () => options.pending ?? []) },
    chotDanhSachDiemDanh: { findUnique: vi.fn(async () => options.existingChot ?? null, ), create: chotCreate },
    ketQuaDiemDanh: { findMany: vi.fn(async () => resultRows), create: vi.fn(async ({ data }) => ({ ...data, ma: 'created-result', version: 1 })), update: vi.fn(async ({ where, data }) => ({ ...data, ma: where.ma, version: 5 })) },
    lichSuDiemDanh: { create: vi.fn(async () => ({})) },
    chiTietChotDanhSachDiemDanh: { createMany: snapshotCreateMany, findMany: snapshotFindMany },
    nhatKyKiemToan: { create: vi.fn(async () => ({})) },
  }
  const prisma = {
    buoiHocNghiQuyet: { findUnique: vi.fn(async () => ({ ma: 'session-1', trangThai: options.status ?? 'DA_KET_THUC', phienBanDanhSach: 3, phamVi: unitList.map(maDonVi => ({ maDonVi })) })) },
    danhSachThamGiaBuoiHoc: { findMany: vi.fn(async () => activeRoster) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => typeof callback === 'function' ? callback(tx) : callback),
  }
  const permissions = { layDonViTrongPhamVi: vi.fn(async () => ({ coQuyen: true, toanHeThong: false, maDonVi: options.scope ?? ['unit-a', 'unit-b'] })) }
  const security = { hashCurrent: vi.fn(() => 'a'.repeat(64)) }
  return { service: new ChotDiemDanhService(prisma as never, permissions as never, security as never), tx, prisma, permissions, security, chotCreate, snapshotCreateMany, snapshotFindMany }
}

describe('ChotDiemDanhService', () => {
  it('preview trả counts trước chốt, số sẽ chuyển và digest nhất quán', async () => {
    const f = fixture()
    const preview = await f.service.kiemTra(actor, 'session-1')
    expect(preview).toMatchObject({ duDieuKienChot: true, tongThuocDien: 3, tongCoMat: 1, tongVangKhongPhep: 0, tongChuaDiemDanh: 2, soNguoiSeChuyenSangVangKhongPhep: 2, phienBanXemTruoc: 'a'.repeat(64) })
  })
  it('yêu cầu preview version mới, chuyển từng hồ sơ chưa điểm danh rồi lưu snapshot và audit trong transaction', async () => {
    const f = fixture()
    const snapshot = await f.service.kiemTra(actor, 'session-1')
    const result = await f.service.chot(actor, 'session-1', { phienBanXemTruoc: snapshot.phienBanXemTruoc })
    expect(result).toMatchObject({ ma: 'chot-1', tongThuocDien: 3, tongCoMat: 1, tongVangKhongPhep: 2, tongChuaDiemDanh: 0 })
    expect(f.tx.ketQuaDiemDanh.create).toHaveBeenCalledOnce()
    expect(f.tx.ketQuaDiemDanh.update).toHaveBeenCalledOnce()
    expect(f.tx.lichSuDiemDanh.create).toHaveBeenCalledTimes(2)
    expect(f.snapshotCreateMany).toHaveBeenCalledOnce()
    expect(f.tx.nhatKyKiemToan.create).toHaveBeenCalledOnce()
  })
  it('từ chối xác nhận nếu dữ liệu đã thay đổi từ lần preview', async () => {
    const f = fixture()
    await expect(f.service.chot(actor, 'session-1', { phienBanXemTruoc: 'b'.repeat(64) })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'DU_LIEU_DA_THAY_DOI_XEM_LAI' }) })
    expect(f.chotCreate).not.toHaveBeenCalled()
  })
  it('không cho chốt trước kết thúc, khi hủy, đang có request chờ hoặc đã chốt', async () => {
    const future = fixture({ status: 'DANG_DIEN_RA' })
    await expect(future.service.chot(actor, 'session-1', { phienBanXemTruoc: 'a'.repeat(64) })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'BUOI_CHUA_KET_THUC' }) })
    const cancelled = fixture({ status: 'DA_HUY' })
    await expect(cancelled.service.chot(actor, 'session-1', { phienBanXemTruoc: 'a'.repeat(64) })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'BUOI_DA_HUY' }) })
    const pending = fixture({ pending: [{ ma: 'req', maHoSo: 'member-1', trangThai: 'CHO_PHE_DUYET' }] })
    await expect(pending.service.chot(actor, 'session-1', { phienBanXemTruoc: 'a'.repeat(64) })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'CON_YEU_CAU_CHO_PHE_DUYET' }) })
    const already = fixture({ existingChot: { ma: 'chot-old' } })
    await expect(already.service.chot(actor, 'session-1', { phienBanXemTruoc: 'a'.repeat(64) })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'BUOI_DA_CHOT' }) })
  })
  it('từ chối chốt khi Scope không bao phủ roster', async () => {
    const f = fixture({ scope: ['unit-a'] })
    await expect(f.service.kiemTra(actor, 'session-1')).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'KHONG_DU_PHAM_VI' }) })
  })
})
