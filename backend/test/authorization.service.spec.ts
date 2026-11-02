import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { PhanQuyenService } from '../src/modules/authorization/authorization.service'

function setup(assignments: any[] = []) {
  const prisma = {
    phanCongVaiTro: { findMany: vi.fn().mockResolvedValue(assignments) },
    hoSoDangVien: { findFirst: vi.fn() },
    lichSuDonViDangVien: { findFirst: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([{ found: true }]),
  }
  return { service: new PhanQuyenService(prisma as never), prisma }
}

const grant = (scope: string, maDonViGoc: string | null = null, permissions = ['P_READ']) => ({
  maTaiKhoan: 'account-1',
  loaiPhamVi: scope,
  maDonViGoc,
  phamViDonViChiDinh: [{ maDonVi: 'unit-1' }],
  vaiTro: { quyen: permissions.map((maDinhDanh) => ({ quyen: { maDinhDanh } })) },
})

describe('PhanQuyenService', () => {
  it('requires Permission and Scope on the same Assignment', async () => {
    const { service } = setup([
      grant('TOAN_HE_THONG', null, ['P_OTHER']),
      grant('DON_VI_CHI_DINH', null, ['P_READ']),
    ])
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'unit-outside' }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('allows only an explicitly selected unit for DON_VI_CHI_DINH', async () => {
    const { service } = setup([grant('DON_VI_CHI_DINH')])
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'unit-1' })).resolves.toBeUndefined()
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'child-unit' }))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('checks current party membership under organizational Scope', async () => {
    const { service, prisma } = setup([grant('CAY_DON_VI', 'root-unit')])
    prisma.lichSuDonViDangVien.findFirst.mockResolvedValue({ maChiBo: 'unit-1', maTo: 'unit-2' })
    await expect(service.kiemTra('account-1', 'P_READ', { maHoSo: 'profile-1' })).resolves.toBeUndefined()
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('matches CA_NHAN only through the authenticated account profile link', async () => {
    const { service, prisma } = setup([grant('CA_NHAN')])
    prisma.hoSoDangVien.findFirst.mockResolvedValue({ ma: 'profile-1' })
    await expect(service.kiemTra('account-1', 'P_READ', { maHoSo: 'profile-1' })).resolves.toBeUndefined()
    expect(prisma.hoSoDangVien.findFirst).toHaveBeenCalledWith({
      where: { ma: 'profile-1', maTaiKhoan: 'account-1' },
      select: { ma: true },
    })
  })

  it('does not grant access when an Assignment is expired or revoked', async () => {
    const { service, prisma } = setup([])
    await expect(service.kiemTra('account-1', 'P_READ', { maDonVi: 'unit-1' }))
      .rejects.toBeInstanceOf(ForbiddenException)
    const where = prisma.phanCongVaiTro.findMany.mock.calls[0][0].where
    expect(where.thuHoiLuc).toBeNull()
    expect(where.ngayHieuLucTu.lte).toBeInstanceOf(Date)
    expect(where.OR[1].ngayHieuLucDen.gt).toBeInstanceOf(Date)
  })
})
