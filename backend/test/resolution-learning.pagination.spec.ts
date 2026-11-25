import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { HocTapNghiQuyetService } from '../src/modules/resolution-learning/learning.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never

function setup() {
  const findMany = vi.fn().mockResolvedValue([])
  const count = vi.fn().mockResolvedValue(0)
  const prisma = {
    dotHocNghiQuyet: { findMany, count },
    $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
  }
  const authorization = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: true, maDonVi: [] }) }
  const service = new HocTapNghiQuyetService(prisma as never, authorization as never, {} as never)
  return { service, findMany, count }
}

describe('Resolution learning campaign list pagination', () => {
  it('normalizes URL query strings before passing pagination to Prisma', async () => {
    const { service, findMany } = setup()
    const result = await service.danhSachDot(actor, { trang: '2', gioiHan: '20', sapXep: 'ngayTao', thuTu: 'desc' } as never)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }))
    expect(result.phanTrang).toEqual({ trang: 2, gioiHan: 20, tongSo: 0 })
  })

  it.each([
    { trang: '0', gioiHan: '20' },
    { trang: '1', gioiHan: '101' },
    { trang: 'khong-phai-so', gioiHan: '20' },
    { trang: '1', gioiHan: 'khong-phai-so' },
  ])('rejects invalid pagination without querying Prisma: %j', async (query) => {
    const { service, findMany } = setup()
    await expect(service.danhSachDot(actor, query as never)).rejects.toBeInstanceOf(BadRequestException)
    expect(findMany).not.toHaveBeenCalled()
  })
})
