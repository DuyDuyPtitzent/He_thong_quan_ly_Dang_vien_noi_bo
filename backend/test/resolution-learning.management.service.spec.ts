import { ConflictException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { HocTapNghiQuyetService } from '../src/modules/resolution-learning/learning.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never
const unit = '00000000-0000-4000-8000-000000000011'
const branch = '00000000-0000-4000-8000-000000000012'
const team = '00000000-0000-4000-8000-000000000013'
const profile = '00000000-0000-4000-8000-000000000014'
const session = '00000000-0000-4000-8000-000000000015'
const taskId = '00000000-0000-4000-8000-000000000016'

function membership(maHoSo = profile) {
  return { maHoSo, maChiBo: branch, maTo: team, hoSoDangVien: { ma: maHoSo, maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'CHINH_THUC' }, chiBo: { ma: branch, trangThai: 'DANG_HOAT_DONG', tenDonVi: [{ ten: 'Chi bộ A' }] }, to: { ma: team, trangThai: 'DANG_HOAT_DONG', tenDonVi: [{ ten: 'Tổ 1' }] } }
}

function setup(options: { scope?: string[]; sessionState?: string; initialMemberships?: unknown[] } = {}) {
  const generated = { ma: 'roster-row', maHoSo: profile, maChiBoSnapshot: branch, tenChiBoSnapshot: 'Chi bộ A', maToSnapshot: team, tenToSnapshot: 'Tổ 1' }
  const currentRoster = { ma: 'roster-row', maBuoi: session, maHoSo: profile, trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: branch, tenChiBoSnapshot: 'Chi bộ A', maToSnapshot: team, tenToSnapshot: 'Tổ 1', maNguoiLoai: null, loaiLuc: null, maNguoiKhoiPhuc: null, khoiPhucLuc: null }
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ trangThai: options.sessionState ?? 'DA_LEN_LICH', phamVi: [{ maDonVi: unit }], phienBanDanhSach: 0, phienBanDanhSachDaXacNhan: null, maNguoiXacNhanDanhSach: null, xacNhanDanhSachLuc: null }), update: vi.fn().mockResolvedValue({ phienBanDanhSach: 1, phienBanDanhSachDaXacNhan: null, maNguoiXacNhanDanhSach: actor.maTaiKhoan, xacNhanDanhSachLuc: new Date() }) },
    lichSuDonViDangVien: { findMany: vi.fn().mockResolvedValue(options.initialMemberships ?? [membership()]) },
    danhSachThamGiaBuoiHoc: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockImplementation(async (args: { where: Record<string, unknown> }) => 'ma' in args.where ? [generated] : []),
      findUnique: vi.fn().mockResolvedValue(currentRoster), create: vi.fn().mockResolvedValue(currentRoster), update: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...currentRoster, ...data })), count: vi.fn().mockResolvedValue(0),
    },
    phanCongNhiemVuBuoiHoc: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ ma: taskId, maBuoi: session, maTaiKhoan: profile, nhiemVu: 'XAC_MINH', hieuLucTu: new Date(), hieuLucDen: null }), update: vi.fn().mockResolvedValue({ ma: taskId, maBuoi: session, maTaiKhoan: profile, nhiemVu: 'XAC_MINH', hieuLucTu: new Date(), hieuLucDen: new Date() }) },
    taiKhoanNguoiDung: { findFirst: vi.fn().mockResolvedValue({ ma: profile, tenDangNhap: 'user1', trangThai: 'DANG_HOAT_DONG', hoSoDangVien: null }) },
    yeuCauDiemDanh: { count: vi.fn().mockResolvedValue(0) },
    ketQuaDiemDanh: { findUnique: vi.fn().mockResolvedValue(null) },
    lichSuDanhSachThamGia: { create: vi.fn().mockResolvedValue({ ma: 'history-row' }) },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  const prisma = {
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: session, trangThai: options.sessionState ?? 'DA_LEN_LICH', phamVi: [{ maDonVi: unit }], phienBanDanhSach: 0, phienBanDanhSachDaXacNhan: null, maNguoiXacNhanDanhSach: null, xacNhanDanhSachLuc: null }) },
    lichSuDonViDangVien: { findMany: vi.fn().mockResolvedValue([membership()]) },
    danhSachThamGiaBuoiHoc: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue({ maChiBoSnapshot: branch, maToSnapshot: team }) },
    donViToChuc: { findMany: vi.fn().mockResolvedValue([]) },
    phanCongNhiemVuBuoiHoc: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(async (operation: ((client: unknown) => Promise<unknown>) | Promise<unknown>[]) => typeof operation === 'function' ? operation(tx) : Promise.all(operation)),
  }
  const authorization = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: options.scope ?? [unit, branch, team] }) }
  const service = new HocTapNghiQuyetService(prisma as never, authorization as never, {} as never)
  return { service, prisma, tx, authorization, currentRoster }
}

describe('resolution learning roster mutations and task assignments', () => {
  it('initializes only eligible scoped members, deduplicates by profile, snapshots membership, and does not confirm or create results', async () => {
    const { service, tx } = setup()
    const result = await service.khoiTaoDanhSach(actor, session)
    expect(tx.lichSuDonViDangVien.findMany.mock.calls[0][0].where).toMatchObject({ AND: expect.arrayContaining([{ hoSoDangVien: { is: { trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: { in: ['DU_BI', 'CHINH_THUC'] } } } }]) })
    expect(tx.danhSachThamGiaBuoiHoc.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ maBuoi: session, maHoSo: profile, maChiBoSnapshot: branch, maToSnapshot: team, trangThai: 'TRONG_DANH_SACH' })], skipDuplicates: true })
    expect(tx.lichSuDanhSachThamGia.create).toHaveBeenCalledOnce()
    expect(tx.ketQuaDiemDanh.findUnique).not.toHaveBeenCalled()
    expect(tx.buoiHocNghiQuyet.update).toHaveBeenCalledWith(expect.objectContaining({ data: { phienBanDanhSach: { increment: 1 } } }))
    expect(result).toMatchObject({ soThemMoi: 1, phienBanDanhSach: 1, trangThaiXacNhan: 'CHUA_XAC_NHAN' })
  })

  it('does not restore a previously removed record during idempotent initialization', async () => {
    const { service, tx } = setup()
    tx.danhSachThamGiaBuoiHoc.findMany.mockImplementation(async (args: { where: Record<string, unknown> }) => 'ma' in args.where ? [] : [{ maHoSo: profile, trangThai: 'DA_LOAI' }])
    const result = await service.khoiTaoDanhSach(actor, session)
    expect(tx.danhSachThamGiaBuoiHoc.createMany).not.toHaveBeenCalled()
    expect(tx.danhSachThamGiaBuoiHoc.update).not.toHaveBeenCalled()
    expect(result).toMatchObject({ soThemMoi: 0, idempotent: true })
  })

  it('rejects an exception unless the active Assignment covers both session and member units', async () => {
    const { service, prisma, authorization, tx } = setup({ scope: [unit] })
    prisma.lichSuDonViDangVien.findMany.mockResolvedValueOnce([membership()])
    authorization.layDonViTrongPhamVi.mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: [unit] })
    await expect(service.boSungNgoaiLe(actor, session, profile)).rejects.toBeInstanceOf(ForbiddenException)
    expect(tx.danhSachThamGiaBuoiHoc.create).not.toHaveBeenCalled()
  })

  it('rejects removal while an attendance request is awaiting verification or approval', async () => {
    const { service, prisma, tx } = setup()
    tx.yeuCauDiemDanh.count.mockResolvedValue(1)
    await expect(service.loaiKhoiDanhSach(actor, session, profile)).rejects.toBeInstanceOf(ConflictException)
    expect(tx.danhSachThamGiaBuoiHoc.update).not.toHaveBeenCalled()
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('rejects confirming a stale roster version and does not record confirmation', async () => {
    const { service, tx } = setup()
    tx.buoiHocNghiQuyet.findUnique.mockResolvedValue({ trangThai: 'DA_LEN_LICH', phienBanDanhSach: 3, phienBanDanhSachDaXacNhan: null, maNguoiXacNhanDanhSach: null, xacNhanDanhSachLuc: null })
    await expect(service.xacNhanDanhSach(actor, session, 2)).rejects.toMatchObject({ response: { maLoi: 'PHIEN_BAN_DANH_SACH_DA_THAY_DOI' } })
    expect(tx.buoiHocNghiQuyet.update).not.toHaveBeenCalled()
  })

  it('creates assignments by account ID and task, without creating Role/Permission assignments', async () => {
    const { service, tx } = setup()
    await service.taoPhanCong(actor, session, { maTaiKhoan: profile, nhiemVu: 'XAC_MINH' })
    expect(tx.phanCongNhiemVuBuoiHoc.create).toHaveBeenCalledWith({ data: expect.objectContaining({ maBuoi: session, maTaiKhoan: profile, nhiemVu: 'XAC_MINH', maNguoiGiao: actor.maTaiKhoan }) })
    expect(tx.phanCongNhiemVuBuoiHoc.findMany).toHaveBeenCalledOnce()
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ hanhDong: 'HOC_TAP_PHAN_CONG_TAO' }) }))
  })

  it('rejects duplicated overlapping task assignments', async () => {
    const { service, tx } = setup()
    tx.phanCongNhiemVuBuoiHoc.findMany.mockResolvedValue([{ ma: taskId, hieuLucTu: new Date(Date.now() - 60_000), hieuLucDen: null }])
    await expect(service.taoPhanCong(actor, session, { maTaiKhoan: profile, nhiemVu: 'XAC_MINH' })).rejects.toBeInstanceOf(ConflictException)
    expect(tx.phanCongNhiemVuBuoiHoc.create).not.toHaveBeenCalled()
  })

  it('updates and revokes only the selected assignment without physical deletion', async () => {
    const { service, tx } = setup()
    tx.phanCongNhiemVuBuoiHoc.findFirst.mockResolvedValue({ ma: taskId, maBuoi: session, maTaiKhoan: profile, nhiemVu: 'XAC_MINH', hieuLucTu: new Date(Date.now() - 60_000), hieuLucDen: null })
    await service.suaPhanCong(actor, session, taskId, { nhiemVu: 'PHE_DUYET' })
    expect(tx.phanCongNhiemVuBuoiHoc.update).toHaveBeenCalledWith(expect.objectContaining({ where: { ma: taskId }, data: expect.objectContaining({ nhiemVu: 'PHE_DUYET' }) }))
    await service.thuHoiPhanCong(actor, session, taskId)
    expect(tx.phanCongNhiemVuBuoiHoc.update).toHaveBeenLastCalledWith(expect.objectContaining({ where: { ma: taskId }, data: expect.objectContaining({ hieuLucDen: expect.any(Date) }) }))
    expect(tx.phanCongNhiemVuBuoiHoc.delete).toBeUndefined()
  })
})
