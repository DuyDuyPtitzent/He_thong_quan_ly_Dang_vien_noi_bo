import { ConflictException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '../src/infrastructure/database/generated/prisma/client'
import { NamHocService } from '../src/modules/school-years/school-years.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never
const input = { maNamHoc: '2026-2027', tenNamHoc: '2026–2027', ngayBatDau: '2026-09-01', ngayKetThuc: '2027-08-31', trangThai: 'DANG_HOAT_DONG' }

function setup(scope: string, permission = 'NAM_HOC_XEM') {
  const prisma = {
    phienDangNhap: { findFirst: vi.fn().mockResolvedValue({ maPhanCongVaiTroDangHoatDong: 'assignment-1' }) },
    phanCongVaiTro: { findFirst: vi.fn().mockResolvedValue({ loaiPhamVi: scope }) },
    namHoc: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ namHoc: prisma.namHoc, nhatKyKiemToan: { create: vi.fn() } })),
  }
  prisma.phanCongVaiTro.findFirst.mockImplementation(async (args: { where: { vaiTro: { quyen: { some: { quyen: { maDinhDanh: string } } } } } }) =>
    args.where.vaiTro.quyen.some.quyen.maDinhDanh === permission ? { loaiPhamVi: scope } : null)
  return { prisma, service: new NamHocService(prisma as never) }
}

describe('NamHocService', () => {
  it('allows viewing shared catalog with the active Assignment permission, independently of the organization code', async () => {
    const { prisma, service } = setup('CAY_DON_VI')
    await service.danhSach(actor, {} as never)
    expect(prisma.phanCongVaiTro.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ma: 'assignment-1' }) }))
    expect(prisma.namHoc.findMany).toHaveBeenCalled()
  })

  it('requires TOAN_HE_THONG on the active Assignment to create shared catalog entries', async () => {
    const { prisma, service } = setup('CAY_DON_VI', 'NAM_HOC_TAO')
    await expect(service.tao(actor, input, null)).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.namHoc.create).not.toHaveBeenCalled()
  })

  it('rejects when Permission is absent from the active Assignment', async () => {
    const { prisma, service } = setup('TOAN_HE_THONG')
    await expect(service.tao(actor, input, null)).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.namHoc.create).not.toHaveBeenCalled()
  })

  it('rejects a reversed or zero-length date period before writing', async () => {
    const { prisma, service } = setup('TOAN_HE_THONG', 'NAM_HOC_TAO')
    await expect(service.tao(actor, { ...input, ngayKetThuc: input.ngayBatDau }, null)).rejects.toMatchObject({ response: { maLoi: 'KHOANG_NGAY_KHONG_HOP_LE' } })
    expect(prisma.namHoc.create).not.toHaveBeenCalled()
  })

  it('maps database uniqueness and exclusion violations to domain conflicts', async () => {
    const { prisma, service } = setup('TOAN_HE_THONG', 'NAM_HOC_TAO')
    const unique = new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    const overlap = new Prisma.PrismaClientKnownRequestError('overlap', { code: 'P2004', clientVersion: 'test' })
    prisma.$transaction.mockRejectedValueOnce(unique).mockRejectedValueOnce(overlap)
    await expect(service.tao(actor, input, null)).rejects.toBeInstanceOf(ConflictException)
    await expect(service.tao(actor, input, null)).rejects.toBeInstanceOf(ConflictException)
  })
})
