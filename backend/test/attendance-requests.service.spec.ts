import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { XuLyYeuCauDiemDanhService } from '../src/modules/resolution-learning/attendance-requests.service'

const actor = { maTaiKhoan: 'actor-1', maPhien: 'session-1' } as never
const request = (overrides: Record<string, unknown> = {}) => ({
  ma: 'request-1', maBuoi: 'buoi-1', maCuaSo: 'window-1', maHoSo: null, loaiYeuCau: 'TAO_MOI', maKetQuaHienTai: null, versionKetQuaLucTao: null,
  ketQuaDuKien: 'CO_MAT', trangThai: 'CHO_XAC_MINH', hoVaTenDoiChieu: 'Nguyen Van A', maDonViDoiChieu: 'unit-1', tenDonViDoiChieu: 'Chi bo 1', namSinhDoiChieu: 1990,
  cccd: null, guiLuc: new Date('2026-11-01T08:00:00Z'), maNguoiXacMinh: null, xacMinhLuc: null, maNguoiXuLy: null, xuLyLuc: null, ghiChuTuChoi: null,
  idempotencyHash: null, dauVanTayCoBanBam: null, dauVanTayCccdBam: null, phienBanKhoaBam: null, ngayTao: new Date(), ngayCapNhat: new Date(),
  buoiHoc: { yeuCauPheDuyet: true, phamVi: [{ maDonVi: 'unit-1' }] }, hoSo: null, ...overrides,
})

function setup(options: { permission?: boolean; units?: string[]; request?: ReturnType<typeof request>; roster?: unknown } = {}) {
  const row = options.request ?? request()
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    yeuCauDiemDanh: { findUnique: vi.fn().mockResolvedValue(row), update: vi.fn(async ({ data }: { data: object }) => ({ ...row, ...data })), delete: vi.fn().mockResolvedValue({ ma: row.ma }) },
    danhSachThamGiaBuoiHoc: { findUnique: vi.fn().mockResolvedValue(options.roster ?? null) },
    ketQuaDiemDanh: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ ma: 'result-1', trangThai: 'CO_MAT', version: 1 }), update: vi.fn() },
    lichSuDiemDanh: { create: vi.fn().mockResolvedValue({}) },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  const prisma = {
    $transaction: vi.fn(async (op: unknown) => typeof op === 'function' ? (op as (tx: unknown) => Promise<unknown>)(tx) : Promise.all(op as Promise<unknown>[])),
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: 'buoi-1', phamVi: [{ maDonVi: 'unit-1' }] }) },
    yeuCauDiemDanh: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findUnique: vi.fn().mockResolvedValue(row) },
  }
  const permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: options.permission ?? true, toanHeThong: false, maDonVi: options.units ?? ['unit-1'] }), kiemTra: vi.fn().mockResolvedValue(undefined) }
  return { service: new XuLyYeuCauDiemDanhService(prisma as never, permissions as never), prisma, tx, permissions }
}

describe('XuLyYeuCauDiemDanhService', () => {
  it('filters public-form history to the active assignment Scope and masks CCCD', async () => {
    const { service, prisma, permissions } = setup()
    const result = await service.danhSach(actor, 'buoi-1', { trang: 1, gioiHan: 20 })
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('actor-1', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', 'session-1')
    expect(prisma.yeuCauDiemDanh.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ maDonViDoiChieu: { in: ['unit-1'] } }) }))
    expect(result).toEqual({ duLieu: [], phanTrang: { trang: 1, gioiHan: 20, tongSo: 0 } })
  })

  it('rejects list access without permission and rejects a filter outside Scope', async () => {
    const noPermission = setup({ permission: false })
    await expect(noPermission.service.danhSach(actor, 'buoi-1', { trang: 1, gioiHan: 20 })).rejects.toBeInstanceOf(ForbiddenException)
    const outside = setup()
    await expect(outside.service.danhSach(actor, 'buoi-1', { maDonVi: 'other-unit', trang: 1, gioiHan: 20 })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('returns a safe not-found error for request detail', async () => {
    const { service, prisma } = setup()
    prisma.yeuCauDiemDanh.findUnique.mockResolvedValue(null)
    await expect(service.chiTiet(actor, 'missing')).rejects.toBeInstanceOf(NotFoundException)
  })

  it.each(['CHO_XAC_MINH', 'CHO_PHE_DUYET', 'TU_CHOI', 'DA_DUYET'])('physically deletes a %s request while preserving result/history and writing a minimal audit', async (trangThai) => {
    const row = request({ trangThai, maHoSo: 'profile-1', cccd: '012345678901' })
    const { service, tx, permissions } = setup({ request: row })
    await expect(service.xoa(actor, 'request-1', '127.0.0.1')).resolves.toEqual({ ma: 'request-1', daXoa: true })
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('actor-1', 'HOC_TAP_NGHI_QUYET_YEU_CAU_DIEM_DANH_XOA', 'session-1')
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2)
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.yeuCauDiemDanh.findUnique.mock.invocationCallOrder[1])
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(tx.yeuCauDiemDanh.findUnique.mock.invocationCallOrder[1])
    expect(tx.yeuCauDiemDanh.delete).toHaveBeenCalledWith({ where: { ma: 'request-1' } })
    expect(tx.nhatKyKiemToan.create.mock.invocationCallOrder[0]).toBeLessThan(tx.yeuCauDiemDanh.delete.mock.invocationCallOrder[0])
    expect(tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
    expect(tx.ketQuaDiemDanh.update).not.toHaveBeenCalled()
    expect(tx.lichSuDiemDanh.create).not.toHaveBeenCalled()
    const audit = tx.nhatKyKiemToan.create.mock.calls[0][0]
    expect(audit.data).toMatchObject({ hanhDong: 'HOC_TAP_YEU_CAU_XOA', loaiDoiTuong: 'YEU_CAU_DIEM_DANH', maDoiTuong: 'request-1' })
    expect(JSON.stringify(audit.data)).not.toContain('012345678901')
    expect(JSON.stringify(audit.data)).not.toContain('profile-1')
  })

  it('rejects physical deletion without its dedicated permission or when outside Scope', async () => {
    const denied = setup({ permission: false })
    await expect(denied.service.xoa(actor, 'request-1')).rejects.toBeInstanceOf(ForbiddenException)
    expect(denied.tx.yeuCauDiemDanh.delete).not.toHaveBeenCalled()
    const outside = setup({ units: ['other-unit'] })
    await expect(outside.service.xoa(actor, 'request-1')).rejects.toBeInstanceOf(ForbiddenException)
    expect(outside.tx.yeuCauDiemDanh.delete).not.toHaveBeenCalled()
  })

  it('returns not found and does not create audit when the request is already absent', async () => {
    const { service, tx } = setup()
    tx.yeuCauDiemDanh.findUnique.mockResolvedValue(null)
    await expect(service.xoa(actor, 'missing')).rejects.toBeInstanceOf(NotFoundException)
    expect(tx.nhatKyKiemToan.create).not.toHaveBeenCalled()
    expect(tx.yeuCauDiemDanh.delete).not.toHaveBeenCalled()
  })

  it('returns full retained CCCD only with profile personal-information Permission and Scope', async () => {
    const row = request({ maHoSo: 'profile-1', cccd: '012345678901', idempotencyHash: 'private-hash', dauVanTayCccdBam: 'fingerprint' })
    const { service, permissions } = setup({ request: row })
    const detail = await service.chiTiet(actor, 'request-1')
    expect(detail).toMatchObject({ cccd: '012345678901', hoVaTenDoiChieu: 'Nguyen Van A' })
    expect(permissions.kiemTra).toHaveBeenCalledWith('actor-1', 'HO_SO_CA_NHAN_XEM', { maHoSo: 'profile-1' }, 'session-1')
    expect(detail).not.toHaveProperty('idempotencyHash')
    expect(detail).not.toHaveProperty('dauVanTayCccdBam')
  })

  it('returns plaintext CCCD only after Permission and Scope checks', async () => {
    const plain = request({ maHoSo: 'profile-1', cccd: '012345678901' })
    const allowed = setup({ request: plain })
    expect(await allowed.service.chiTiet(actor, 'request-1')).toMatchObject({ cccd: '012345678901' })
    const denied = setup({ request: plain })
    denied.permissions.kiemTra.mockRejectedValue(new ForbiddenException())
    expect(await denied.service.chiTiet(actor, 'request-1')).toMatchObject({ cccd: null })
  })

  it('does not return self-reported CCCD for an unmatched request or when profile permission is denied', async () => {
    const row = request({ maHoSo: 'profile-1', cccd: '012345678901' })
    const { service, permissions } = setup({ request: row })
    permissions.kiemTra.mockRejectedValue(new ForbiddenException())
    expect(await service.chiTiet(actor, 'request-1')).toMatchObject({ cccd: null })
    const unmatched = setup({ request: request({ cccd: '012345678901' }) })
    expect(await unmatched.service.chiTiet(actor, 'request-1')).toMatchObject({ cccd: null })
    expect(unmatched.permissions.kiemTra).not.toHaveBeenCalled()
  })

  it('moves a valid verified request to approval without creating an official result', async () => {
    const roster = { trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit-1', hoSo: { ma: 'profile-1', maHoSoNoiBo: 'HS-1', hoVaTen: 'Nguyen Van A', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'CHINH_THUC', thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z') } } }
    const { service, tx } = setup({ roster })
    const result = await service.xacMinh(actor, 'request-1', { ketQuaXacMinh: 'HOP_LE', maHoSo: 'profile-1' })
    expect(result.trangThai).toBe('CHO_PHE_DUYET')
    expect(result.ketQuaDaGhiNhan).toBe(false)
    expect(tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
    expect(tx.yeuCauDiemDanh.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maNguoiXacMinh: 'actor-1', trangThai: 'CHO_PHE_DUYET' }) }))
  })

  it('does not create a result when verification explicitly rejects invalid submitted data', async () => {
    const { service, tx } = setup()
    const result = await service.xacMinh(actor, 'request-1', { ketQuaXacMinh: 'KHONG_HOP_LE', ghiChu: 'Không khớp' })
    expect(result.trangThai).toBe('TU_CHOI')
    expect(tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
    expect(tx.yeuCauDiemDanh.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maNguoiXacMinh: 'actor-1', maNguoiXuLy: 'actor-1', trangThai: 'TU_CHOI' }) }))
  })

  it('writes official attendance on valid verification when the session does not require approval', async () => {
    const roster = { trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit-1', hoSo: { ma: 'profile-1', maHoSoNoiBo: 'HS-1', hoVaTen: 'Nguyen Van A', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'CHINH_THUC', thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z') } } }
    const { service, tx } = setup({ roster, request: request({ buoiHoc: { yeuCauPheDuyet: false, phamVi: [{ maDonVi: 'unit-1' }] } }) })
    const result = await service.xacMinh(actor, 'request-1', { ketQuaXacMinh: 'HOP_LE', maHoSo: 'profile-1' })
    expect(result).toMatchObject({ trangThai: 'DA_DUYET', ketQuaDaGhiNhan: true })
    expect(tx.ketQuaDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maHoSo: 'profile-1', trangThai: 'CO_MAT' }) }))
    expect(tx.lichSuDiemDanh.create).toHaveBeenCalledOnce()
    expect(tx.lichSuDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maYeuCau: 'request-1', maYeuCauNguon: 'request-1' }) }))
  })

  it('approves a verified request and records result plus immutable history atomically', async () => {
    const roster = { trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit-1' }
    const { service, tx } = setup({ roster, request: request({ trangThai: 'CHO_PHE_DUYET', maHoSo: 'profile-1' }) })
    const result = await service.duyet(actor, 'request-1', {})
    expect(result.trangThai).toBe('DA_DUYET')
    expect(tx.ketQuaDiemDanh.create).toHaveBeenCalledOnce()
    expect(tx.lichSuDiemDanh.create).toHaveBeenCalledOnce()
    expect(tx.yeuCauDiemDanh.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ trangThai: 'DA_DUYET', maNguoiXuLy: 'actor-1' }) }))
  })

  it('rejects an unverified request without touching the current attendance result', async () => {
    const { service, tx } = setup({ request: request({ trangThai: 'CHO_XAC_MINH' }) })
    await expect(service.duyet(actor, 'request-1', {})).rejects.toBeInstanceOf(ConflictException)
    await expect(service.tuChoi(actor, 'request-1', { ghiChu: 'Không hợp lệ' })).rejects.toBeInstanceOf(ConflictException)
    expect(tx.ketQuaDiemDanh.create).not.toHaveBeenCalled()
    expect(tx.ketQuaDiemDanh.update).not.toHaveBeenCalled()
  })

  it('does not overwrite an official result with a create request', async () => {
    const roster = { trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit-1', hoSo: { ma: 'profile-1', maHoSoNoiBo: 'HS-1', hoVaTen: 'Nguyen Van A', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'CHINH_THUC', thongTinCaNhan: { ngaySinh: new Date('1990-01-01T00:00:00Z') } } }
    const { service, tx } = setup({ roster, request: request({ buoiHoc: { yeuCauPheDuyet: false, phamVi: [{ maDonVi: 'unit-1' }] } }) })
    tx.ketQuaDiemDanh.findUnique.mockResolvedValue({ ma: 'existing-result', trangThai: 'VANG_CO_PHEP', version: 2 })
    await expect(service.xacMinh(actor, 'request-1', { ketQuaXacMinh: 'HOP_LE', maHoSo: 'profile-1' })).rejects.toBeInstanceOf(ConflictException)
    expect(tx.ketQuaDiemDanh.update).not.toHaveBeenCalled()
    expect(tx.yeuCauDiemDanh.update).not.toHaveBeenCalled()
  })

  it('applies an approved adjustment to CHUA_DIEM_DANH using NULL and preserves versioned history', async () => {
    const row = request({ trangThai: 'CHO_PHE_DUYET', loaiYeuCau: 'DIEU_CHINH', maHoSo: 'profile-1', maKetQuaHienTai: 'result-1', versionKetQuaLucTao: 3, ketQuaDuKien: null })
    const { service, tx } = setup({ request: row, roster: { trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit-1' } })
    tx.ketQuaDiemDanh.findUnique.mockResolvedValue({ ma: 'result-1', maBuoi: 'buoi-1', maHoSo: 'profile-1', trangThai: 'VANG_CO_PHEP', version: 3 })
    tx.ketQuaDiemDanh.update.mockResolvedValue({ ma: 'result-1', trangThai: null, version: 4 })
    const result = await service.duyet(actor, 'request-1', {})
    expect(result.trangThai).toBe('DA_DUYET')
    expect(tx.ketQuaDiemDanh.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ trangThai: null, version: { increment: 1 }, thoiDiemCoMat: null }) }))
    expect(tx.lichSuDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ketQuaTruoc: 'VANG_CO_PHEP', ketQuaSau: null, versionTruoc: 3, versionSau: 4 }) }))
  })
})
