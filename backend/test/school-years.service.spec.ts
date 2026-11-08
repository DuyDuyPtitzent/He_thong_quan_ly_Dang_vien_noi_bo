import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '../src/infrastructure/database/generated/prisma/client'
import { NamHocService } from '../src/modules/school-years/school-years.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never
const input = { maNamHoc: '2026-2027', tenNamHoc: '2026–2027', ngayBatDau: '2026-09-01', ngayKetThuc: '2027-08-31', trangThai: 'DANG_HOAT_DONG' }

function setup() {
  const prisma = {
    namHoc: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ namHoc: prisma.namHoc, nhatKyKiemToan: { create: vi.fn() } })),
  }
  const authorization = { kiemTraQuyenDanhMucNamHoc: vi.fn().mockResolvedValue(undefined) }
  return { prisma, authorization, service: new NamHocService(prisma as never, authorization as never) }
}

describe('NamHocService', () => {
  it('checks NAM_HOC_XEM through the catalog-specific assignment policy', async () => {
    const { prisma, authorization, service } = setup()
    await service.danhSach(actor, {} as never)
    expect(authorization.kiemTraQuyenDanhMucNamHoc).toHaveBeenCalledWith(actor.maTaiKhoan, 'NAM_HOC_XEM', actor.maPhien)
    expect(prisma.namHoc.findMany).toHaveBeenCalled()
  })

  it.each(['NAM_HOC_TAO', 'NAM_HOC_SUA', 'NAM_HOC_XOA'] as const)('routes %s through the shared-catalog policy, independent of Scope', async (permission) => {
    const { prisma, authorization, service } = setup()
    prisma.namHoc.findUnique.mockResolvedValue({ ma: 'year-1', maNamHoc: '2026-2027', tenNamHoc: '2026–2027', ngayBatDau: new Date('2026-09-01T00:00:00Z'), ngayKetThuc: new Date('2027-08-31T00:00:00Z'), trangThai: 'DANG_HOAT_DONG' })
    if (permission === 'NAM_HOC_TAO') await service.tao(actor, input, null)
    if (permission === 'NAM_HOC_SUA') await service.sua(actor, 'year-1', { tenNamHoc: 'Năm học mới' }, null)
    if (permission === 'NAM_HOC_XOA') await service.xoa(actor, 'year-1', null)
    expect(authorization.kiemTraQuyenDanhMucNamHoc).toHaveBeenCalledWith(actor.maTaiKhoan, permission, actor.maPhien)
  })

  it('preserves date validation and database uniqueness/overlap constraints after authorization', async () => {
    const { prisma, service } = setup()
    await expect(service.tao(actor, { ...input, ngayKetThuc: input.ngayBatDau }, null)).rejects.toMatchObject({ response: { maLoi: 'KHOANG_NGAY_KHONG_HOP_LE' } })
    const unique = new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    const overlap = new Prisma.PrismaClientKnownRequestError('overlap', { code: 'P2004', clientVersion: 'test' })
    prisma.$transaction.mockRejectedValueOnce(unique).mockRejectedValueOnce(overlap)
    await expect(service.tao(actor, input, null)).rejects.toBeInstanceOf(ConflictException)
    await expect(service.tao(actor, input, null)).rejects.toBeInstanceOf(ConflictException)
  })
})
