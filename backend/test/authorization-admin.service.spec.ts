import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { QuanTriPhanQuyenService } from '../src/modules/authorization/authorization-admin.service'

function actor(maTaiKhoan = 'actor-1') {
  return { maTaiKhoan, tenDangNhap: 'actor', doiMatKhauLanDau: false, maPhien: 'session-1' }
}

function setup(assignments: any[] = [], phanQuyen: any = {}) {
  const prisma = {
    taiKhoanNguoiDung: {
      findUnique: vi.fn().mockResolvedValue({ ma: 'target-1', trangThai: 'DANG_HOAT_DONG' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    vaiTro: { findUnique: vi.fn().mockResolvedValue({ ma: 'role-1', trangThai: 'DANG_HOAT_DONG', laVaiTroHeThong: false, quyen: [{ quyen: { maDinhDanh: 'TO_CHUC_TAO' } }] }) },
    phanCongVaiTro: { findMany: vi.fn().mockResolvedValue(assignments) },
    $transaction: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{ found: true }]),
  }
  const service = new QuanTriPhanQuyenService(prisma as never, phanQuyen as never)
  return { service, prisma }
}

function source(codes: string[], scope: 'CAY_DON_VI' | 'DON_VI_CHI_DINH' | 'TOAN_HE_THONG' = 'CAY_DON_VI') {
  return {
    loaiPhamVi: scope,
    maDonViGoc: scope === 'CAY_DON_VI' ? 'root-1' : null,
    phamViDonViChiDinh: scope === 'DON_VI_CHI_DINH' ? [{ maDonVi: 'unit-1' }] : [],
    vaiTro: { quyen: codes.map((maDinhDanh) => ({ quyen: { maDinhDanh } })) },
  }
}

describe('QuanTriPhanQuyenService', () => {
  it('filters account-picker results to currently assigned units inside the actor Scope', async () => {
    const phanQuyen = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: ['root-1', 'unit-1'] }) }
    const { service, prisma } = setup([
      { maTaiKhoan: 'target-tree', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'root-1', phamViDonViChiDinh: [] },
      { maTaiKhoan: 'target-list', loaiPhamVi: 'DON_VI_CHI_DINH', maDonViGoc: null, phamViDonViChiDinh: [{ maDonVi: 'unit-1' }] },
      { maTaiKhoan: 'target-outside', loaiPhamVi: 'DON_VI_CHI_DINH', maDonViGoc: null, phamViDonViChiDinh: [{ maDonVi: 'unit-1' }, { maDonVi: 'outside' }] },
      { maTaiKhoan: 'target-other-tree', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'outside', phamViDonViChiDinh: [] },
    ], phanQuyen)
    prisma.taiKhoanNguoiDung.findMany.mockResolvedValue([{ ma: 'target-tree', tenDangNhap: 'tree-user', hoSoDangVien: null }])

    await service.taiKhoanDePhanQuyen(actor(), { tuKhoa: 'tree', gioiHan: 20 })

    expect(phanQuyen.layDonViTrongPhamVi).toHaveBeenCalledWith('actor-1', 'TAI_KHOAN_XEM')
    expect(prisma.taiKhoanNguoiDung.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ma: { in: ['target-tree', 'target-list'] }, trangThai: 'DANG_HOAT_DONG' }),
    }))
  })

  it('does not return accounts when the actor lacks account-view Permission', async () => {
    const phanQuyen = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: false, toanHeThong: false, maDonVi: [] }) }
    const { service, prisma } = setup([], phanQuyen)
    await expect(service.taiKhoanDePhanQuyen(actor(), {})).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.taiKhoanNguoiDung.findMany).not.toHaveBeenCalled()
  })

  it('blocks self-assignment before reading role or target account', async () => {
    const { service, prisma } = setup()
    await expect(service.taoPhanCong(actor(), {
      maTaiKhoan: 'actor-1', maVaiTro: 'role-1', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'root-1', lyDo: 'test',
    })).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.vaiTro.findUnique).not.toHaveBeenCalled()
  })

  it('reserves the system administrator role code for the controlled operations process', async () => {
    const { service, prisma } = setup()
    await expect(service.taoVaiTro(actor(), {
      maDinhDanh: 'QUAN_TRI_VIEN_TOAN_HE_THONG', ten: 'Không được tạo qua API',
    })).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.phanCongVaiTro.findMany).not.toHaveBeenCalled()
  })

  it('keeps system administrator assignments outside ordinary API revocation', async () => {
    const { service, prisma } = setup()
    prisma.phanCongVaiTro = {
      ...prisma.phanCongVaiTro,
      findUnique: vi.fn().mockResolvedValue({
        ma: 'assignment-1', maTaiKhoan: 'target-1', loaiPhamVi: 'TOAN_HE_THONG', maDonViGoc: null,
        vaiTro: { maDinhDanh: 'QUAN_TRI_VIEN_TOAN_HE_THONG', laVaiTroHeThong: true, quyen: [] },
        phamViDonViChiDinh: [],
      }),
    } as never
    await expect(service.thuHoiPhanCong(actor(), 'assignment-1', 'test')).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('never allows normal APIs to issue TOAN_HE_THONG or CA_NHAN Assignments', async () => {
    const { service, prisma } = setup()
    for (const loaiPhamVi of ['TOAN_HE_THONG', 'CA_NHAN'] as const) {
      await expect(service.taoPhanCong(actor(), {
        maTaiKhoan: 'target-1', maVaiTro: 'role-1', loaiPhamVi, lyDo: 'test',
      })).rejects.toBeInstanceOf(ForbiddenException)
    }
    expect(prisma.taiKhoanNguoiDung.findUnique).not.toHaveBeenCalled()
  })

  it('does not combine grant Permission from one Assignment with capability from another', async () => {
    const { service } = setup([
      source(['PHAN_CONG_VAI_TRO_TAO']),
      source(['TO_CHUC_TAO']),
    ])
    await expect(service.taoPhanCong(actor(), {
      maTaiKhoan: 'target-1', maVaiTro: 'role-1', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'root-1', lyDo: 'test',
    })).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('lets the explicitly system-wide administrator delegate business Permissions without inheriting them', async () => {
    const adminSource = {
      loaiPhamVi: 'TOAN_HE_THONG', maDonViGoc: null, phamViDonViChiDinh: [],
      vaiTro: { maDinhDanh: 'QUAN_TRI_VIEN_TOAN_HE_THONG', laVaiTroHeThong: true, quyen: [
        { quyen: { maDinhDanh: 'PHAN_CONG_VAI_TRO_TAO' } },
      ] },
    }
    const { service } = setup([adminSource])
    const prisma = (service as any).prisma
    prisma.vaiTro.findUnique.mockResolvedValue({
      ma: 'role-1', trangThai: 'DANG_HOAT_DONG', laVaiTroHeThong: false,
      quyen: [{ quyen: { maDinhDanh: 'HO_SO_CA_NHAN_DUYET_CAP_NHAT' } }],
    })
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      phanCongVaiTro: { create: vi.fn().mockResolvedValue({ ma: 'assignment-new' }) },
      nhatKyKiemToan: { create: vi.fn().mockResolvedValue({}) },
    }))
    await expect(service.taoPhanCong(actor(), {
      maTaiKhoan: 'target-1', maVaiTro: 'role-1', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'root-1', lyDo: 'ủy quyền',
    })).resolves.toMatchObject({ maPhanCong: expect.any(String) })
  })

  it('does not grant a child unit outside the manager tree', async () => {
    const { service } = setup([source(['PHAN_CONG_VAI_TRO_TAO', 'TO_CHUC_TAO'])])
    const prisma = (service as any).prisma
    prisma.$queryRaw.mockResolvedValue([{ found: false }])
    await expect(service.taoPhanCong(actor(), {
      maTaiKhoan: 'target-1', maVaiTro: 'role-1', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'outside-root', lyDo: 'test',
    })).rejects.toBeInstanceOf(ForbiddenException)
  })
})
