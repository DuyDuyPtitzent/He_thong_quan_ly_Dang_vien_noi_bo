import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { DanhMucNghiepVuService } from '../src/modules/system-settings/business-catalogs.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never
function setup() {
  const tx = {
    nhomDanhMucNghiepVu: { create: vi.fn(), update: vi.fn() },
    giaTriDanhMucNghiepVu: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
  }
  const prisma = {
    nhomDanhMucNghiepVu: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), update: vi.fn() },
    giaTriDanhMucNghiepVu: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: unknown) => Promise<unknown>) => cb(tx)),
  }
  const authorization = { kiemTraQuyenDanhMucChung: vi.fn().mockResolvedValue(undefined) }
  return { service: new DanhMucNghiepVuService(prisma as never, authorization as never), prisma, authorization, tx }
}

describe('DanhMucNghiepVuService', () => {
  it('requires the catalog view Permission and lists active groups by default', async () => {
    const { service, prisma, authorization } = setup()
    await service.danhSachNhom(actor, { baoGomNgungHoatDong: false })
    expect(authorization.kiemTraQuyenDanhMucChung).toHaveBeenCalledWith(actor.maTaiKhoan, 'CAU_HINH_DANH_MUC_XEM', actor.maPhien, ['CAY_DON_VI', 'DON_VI_CHI_DINH', 'TOAN_HE_THONG'])
    expect(prisma.nhomDanhMucNghiepVu.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { trangThai: 'DANG_HOAT_DONG' } }))
  })

  it('validates a learning-session type against an active value in the active category group', async () => {
    const { service, tx } = setup()
    tx.giaTriDanhMucNghiepVu.findFirst.mockResolvedValue({ ma: 'value-id', maGiaTri: 'HINH_THUC_TRUC_TIEP' })
    await expect(service.kiemTraHinhThucBuoiHoc(tx as never, 'HINH_THUC_TRUC_TIEP')).resolves.toEqual({ ma: 'value-id', maGiaTri: 'HINH_THUC_TRUC_TIEP' })
    expect(tx.giaTriDanhMucNghiepVu.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ maGiaTri: 'HINH_THUC_TRUC_TIEP', trangThai: 'DANG_HOAT_DONG', nhom: { maNhom: 'HINH_THUC_BUOI_HOC_NGHI_QUYET', trangThai: 'DANG_HOAT_DONG' } }) }))
  })

  it('rejects unknown, inactive-value and inactive-group type codes', async () => {
    const { service, tx } = setup()
    tx.giaTriDanhMucNghiepVu.findFirst.mockResolvedValue(null)
    await expect(service.kiemTraHinhThucBuoiHoc(tx as never, 'UNKNOWN')).rejects.toBeInstanceOf(BadRequestException)
    expect(tx.giaTriDanhMucNghiepVu.findFirst).toHaveBeenCalledTimes(1)
  })

  it('does not create catalog data when the current Assignment lacks the required Permission/Scope', async () => {
    const { service, authorization, tx } = setup()
    authorization.kiemTraQuyenDanhMucChung.mockRejectedValue(new ForbiddenException())
    await expect(service.taoNhom(actor, { maNhom: 'LOAI_TAI_LIEU', ten: 'Loại tài liệu' }, null)).rejects.toBeInstanceOf(ForbiddenException)
    expect(tx.nhomDanhMucNghiepVu.create).not.toHaveBeenCalled()
  })

  it('creates a value only in an active group and records an audit entry', async () => {
    const { service, prisma, tx, authorization } = setup()
    prisma.nhomDanhMucNghiepVu.findUnique.mockResolvedValue({ ma: 'group-id', maNhom: 'HINH_THUC_BUOI_HOC_NGHI_QUYET', trangThai: 'DANG_HOAT_DONG' })
    tx.giaTriDanhMucNghiepVu.create.mockResolvedValue({ ma: 'value-id', maGiaTri: 'HINH_THUC_TRUC_TIEP', tenHienThi: 'Trực tiếp', thuTu: 10, trangThai: 'DANG_HOAT_DONG' })
    await service.taoGiaTri(actor, 'HINH_THUC_BUOI_HOC_NGHI_QUYET', { maGiaTri: 'HINH_THUC_TRUC_TIEP', tenHienThi: 'Trực tiếp', thuTu: 10 }, null)
    expect(authorization.kiemTraQuyenDanhMucChung).toHaveBeenCalledWith(actor.maTaiKhoan, 'CAU_HINH_DANH_MUC_TAO', actor.maPhien, ['TOAN_HE_THONG'])
    expect(tx.giaTriDanhMucNghiepVu.create).toHaveBeenCalledWith({ data: expect.objectContaining({ maNhomDanhMuc: 'group-id', maGiaTri: 'HINH_THUC_TRUC_TIEP', thuTu: 10 }) })
    expect(tx.nhatKyKiemToan.create).toHaveBeenCalled()
  })

  it('lets BUOI_TAO read only active form types without catalog-management Permission', async () => {
    const { service, prisma, authorization } = setup()
    authorization.kiemTraQuyenDanhMucChung.mockRejectedValueOnce(new ForbiddenException()).mockResolvedValueOnce(undefined)
    prisma.nhomDanhMucNghiepVu.findUnique.mockResolvedValue({ ma: 'group-id', maNhom: 'HINH_THUC_BUOI_HOC_NGHI_QUYET', trangThai: 'DANG_HOAT_DONG', giaTri: [{ maGiaTri: 'TRUC_TIEP', tenHienThi: 'Trực tiếp', trangThai: 'DANG_HOAT_DONG' }] })
    await service.chiTietNhom(actor, 'HINH_THUC_BUOI_HOC_NGHI_QUYET', { baoGomNgungHoatDong: false })
    expect(authorization.kiemTraQuyenDanhMucChung).toHaveBeenNthCalledWith(2, actor.maTaiKhoan, 'HOC_TAP_NGHI_QUYET_BUOI_TAO', actor.maPhien, ['CAY_DON_VI', 'DON_VI_CHI_DINH', 'TOAN_HE_THONG'])
    expect(prisma.nhomDanhMucNghiepVu.findUnique).toHaveBeenCalledWith(expect.objectContaining({ include: { giaTri: expect.objectContaining({ where: { trangThai: 'DANG_HOAT_DONG' } }) } }))
  })

  it('deactivates values without deleting rows or changing codes used for history', async () => {
    const { service, prisma, tx } = setup()
    const prior = { ma: 'value-id', maNhomDanhMuc: 'group-id', maGiaTri: 'HINH_THUC_TRUC_TIEP', tenHienThi: 'Trực tiếp', thuTu: 10, trangThai: 'DANG_HOAT_DONG' }
    prisma.nhomDanhMucNghiepVu.findUnique.mockResolvedValue({ ma: 'group-id', maNhom: 'HINH_THUC_BUOI_HOC_NGHI_QUYET' })
    prisma.giaTriDanhMucNghiepVu.findUnique.mockResolvedValue(prior)
    tx.giaTriDanhMucNghiepVu.update.mockResolvedValue({ ...prior, trangThai: 'NGUNG_HOAT_DONG' })
    await service.suaGiaTri(actor, 'HINH_THUC_BUOI_HOC_NGHI_QUYET', prior.maGiaTri, { trangThai: 'NGUNG_HOAT_DONG' }, null)
    expect(tx.giaTriDanhMucNghiepVu.update).toHaveBeenCalledWith({ where: { ma: 'value-id' }, data: { tenHienThi: undefined, thuTu: undefined, trangThai: 'NGUNG_HOAT_DONG' } })
    expect(tx.giaTriDanhMucNghiepVu).not.toHaveProperty('delete')
  })

  it('only exposes deactivation and update operations; it has no physical-delete service method', () => {
    const { service } = setup()
    expect('xoaGiaTri' in service).toBe(false)
    expect('xoaNhom' in service).toBe(false)
  })
})
