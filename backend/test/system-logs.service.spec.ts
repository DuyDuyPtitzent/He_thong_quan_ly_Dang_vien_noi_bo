import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { NhatKyHeThongService } from '../src/modules/system-logs/system-logs.service'

const actor = { maTaiKhoan: 'actor', maPhien: 'session' } as never
function setup(scope = { coQuyen: true, toanHeThong: true, maDonVi: [] as string[] }) {
  const row = { ma: 'log-1', maNguoiThucHien: 'actor', hanhDong: 'DANG_NHAP', loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: 'actor', ketQua: 'THAT_BAI', lyDo: 'THONG_TIN_DANG_NHAP_KHONG_HOP_LE', thoiDiem: new Date(), nguoiThucHien: null }
  const prisma = {
    hoSoDangVien: { findMany: vi.fn().mockResolvedValue([{ ma: 'profile-1', maTaiKhoan: 'account-1' }]) },
    donViToChuc: { findUnique: vi.fn().mockResolvedValue({ ma: 'unit-1' }), findMany: vi.fn().mockResolvedValue([]) },
    nhatKyKiemToan: { count: vi.fn().mockResolvedValue(1), findMany: vi.fn().mockResolvedValue([row]), findFirst: vi.fn().mockResolvedValue({ ...row, duLieuTruoc: { matKhau: 'secret' }, duLieuSau: { token: 'secret' } }), groupBy: vi.fn().mockResolvedValue([{ ketQua: 'THANH_CONG', _count: { _all: 1 } }]) },
    $transaction: vi.fn((calls: Promise<unknown>[]) => Promise.all(calls)),
  }
  const permissions = {
    layDonViTrongPhamVi: vi.fn().mockResolvedValue(scope),
    kiemTraQuanTriVienToanHeThong: vi.fn().mockResolvedValue(undefined),
  }
  return { prisma, permissions, service: new NhatKyHeThongService(prisma as never, permissions as never) }
}

describe('NhatKyHeThongService', () => {
  it('separates the audit and security event types and paginates in the database', async () => {
    const { prisma, service } = setup()
    const result = await service.danhSach(actor, 'bao-mat', { trang: 2, kichThuoc: 10 } as never)
    expect(prisma.nhatKyKiemToan.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ hanhDong: { in: expect.arrayContaining(['DANG_NHAP']) } })]) })]) }) }))
    expect(result.tongSo).toBe(1)
  })

  it('converts query-string pagination values to integers before Prisma', async () => {
    const { prisma, service } = setup()
    const result = await service.danhSach(actor, 'thao-tac', { trang: '3', kichThuoc: '25' } as never)
    expect(prisma.nhatKyKiemToan.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 25 }))
    expect(result).toMatchObject({ trang: 3, kichThuoc: 25 })
  })

  it('uses identical scope and filters for count and page rows', async () => {
    const { prisma, service } = setup({ coQuyen: true, toanHeThong: false, maDonVi: ['unit-1'] })
    await service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20, ketQua: 'THAT_BAI' } as never)
    const countWhere = prisma.nhatKyKiemToan.count.mock.calls[0]?.[0].where
    const rowsWhere = prisma.nhatKyKiemToan.findMany.mock.calls[0]?.[0].where
    expect(rowsWhere).toEqual(countWhere)
  })

  it('rejects invalid, non-positive, and oversized page parameters before querying Prisma', async () => {
    const invalidInputs = [
      { trang: 'abc', kichThuoc: '20' },
      { trang: '0', kichThuoc: '20' },
      { trang: '1.5', kichThuoc: '20' },
      { trang: '1', kichThuoc: '101' },
    ]
    for (const input of invalidInputs) {
      const { prisma, service } = setup()
      await expect(service.danhSach(actor, 'thao-tac', input as never)).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    }
  })

  it('returns an empty page when the scoped count and query contain no rows', async () => {
    const { prisma, service } = setup()
    prisma.nhatKyKiemToan.count.mockResolvedValue(0)
    prisma.nhatKyKiemToan.findMany.mockResolvedValue([] as never)
    await expect(service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20 } as never)).resolves.toMatchObject({ items: [], tongSo: 0 })
  })

  it('applies keyword, account, action, result, date, and unit filters together', async () => {
    const { prisma, service } = setup()
    const unitId = '00000000-0000-4000-8000-000000000001'
    await service.danhSach(actor, 'thao-tac', {
      trang: '2', kichThuoc: '25', tuKhoa: 'Nguyễn', taiKhoan: 'nguyenvana', hanhDong: 'HO_SO_DANG_VIEN_SUA',
      ketQua: 'THAT_BAI', tuNgay: '2026-01-01', denNgay: '2026-01-31', maDonVi: unitId,
    } as never)
    const call = prisma.nhatKyKiemToan.findMany.mock.calls[0]?.[0]
    expect(call).toMatchObject({ skip: 25, take: 25 })
    const where = JSON.stringify(call?.where)
    for (const filter of ['Nguyễn', 'nguyenvana', 'HO_SO_DANG_VIEN_SUA', 'THAT_BAI', '2026-01-01', '2026-01-31', unitId]) {
      expect(where).toContain(filter)
    }
  })

  it('denies a user without the assignment scope for the requested log permission', async () => {
    const { service } = setup({ coQuyen: false, toanHeThong: false, maDonVi: [] })
    await expect(service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20 } as never)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('requires full-system administrator access before every log endpoint query', async () => {
    const { service, permissions, prisma } = setup()
    permissions.kiemTraQuanTriVienToanHeThong.mockRejectedValue(new ForbiddenException())
    await expect(service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20 } as never)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.thongKe(actor, 'bao-mat')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.hanhDong(actor, 'thao-tac')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.donVi(actor, 'bao-mat')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.chiTiet(actor, 'thao-tac', 'log-1')).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.xemTruocXoa(actor, 'thao-tac', { maNhatKy: ['log-1'], lyDo: 'Kiểm tra' } as never)).rejects.toBeInstanceOf(ForbiddenException)
    expect(permissions.kiemTraQuanTriVienToanHeThong).toHaveBeenCalledTimes(6)
    expect(prisma.nhatKyKiemToan.count).not.toHaveBeenCalled()
    expect(prisma.nhatKyKiemToan.findMany).not.toHaveBeenCalled()
    expect(prisma.nhatKyKiemToan.groupBy).not.toHaveBeenCalled()
  })

  it('limits a unit assignment to actors and targets in its organization scope', async () => {
    const { prisma, service } = setup({ coQuyen: true, toanHeThong: false, maDonVi: ['unit-1'] })
    await service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20 } as never)
    expect(prisma.nhatKyKiemToan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ maNguoiThucHien: { in: ['account-1'] } }), expect.objectContaining({ maDoiTuong: { in: expect.arrayContaining(['unit-1', 'profile-1']) } })]) })]) }) }))
  })

  it('limits an assignment without organization scope to the current account', async () => {
    const { prisma, service } = setup({ coQuyen: true, toanHeThong: false, maDonVi: [] })
    await service.danhSach(actor, 'bao-mat', { trang: 1, kichThuoc: 20 } as never)
    expect(prisma.nhatKyKiemToan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ maNguoiThucHien: { in: ['actor'] } }), expect.objectContaining({ maDoiTuong: { in: expect.arrayContaining(['actor']) } })]) })]) }) }))
  })

  it('rejects an organization filter outside the active assignment scope', async () => {
    const { service } = setup({ coQuyen: true, toanHeThong: false, maDonVi: ['unit-1'] })
    await expect(service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20, maDonVi: 'unit-outside' } as never)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('does not return stored before/after JSON in detail responses', async () => {
    const { service, prisma } = setup()
    prisma.nhatKyKiemToan.findFirst.mockResolvedValue({ ma: 'log-1', maNguoiThucHien: 'actor', hanhDong: 'DANG_NHAP', loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: 'actor', ketQua: 'THAT_BAI', lyDo: 'reason', thoiDiem: new Date(), nguoiThucHien: null } as never)
    const detail = await service.chiTiet(actor, 'bao-mat', 'log-1')
    expect(detail).not.toHaveProperty('duLieuTruoc')
    expect(detail).not.toHaveProperty('duLieuSau')
    expect(detail).toHaveProperty('duLieuThayDoi', null)
  })

  it('does not expose security event totals on the audit tab', async () => {
    const { service, prisma } = setup()
    const result = await service.thongKe(actor, 'thao-tac')
    expect(result).toEqual({ tong: 1, thanhCong: 1, thatBai: 0, ketQuaKhac: 0, baoMat: 0 })
    expect(prisma.nhatKyKiemToan.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['ketQua'], _count: { _all: true } }))
  })

  it('counts remaining outcomes separately so summary categories reconcile to the total', async () => {
    const { service, prisma } = setup()
    prisma.nhatKyKiemToan.groupBy.mockResolvedValue([
      { ketQua: 'THANH_CONG', _count: { _all: 104 } },
      { ketQua: 'THAT_BAI', _count: { _all: 0 } },
      { ketQua: 'TU_CHOI', _count: { _all: 10 } },
    ] as never)
    await expect(service.thongKe(actor, 'thao-tac')).resolves.toMatchObject({ tong: 114, thanhCong: 104, thatBai: 0, ketQuaKhac: 10 })
  })

  it('uses the same scoped filter for list and summary aggregation', async () => {
    const { service, prisma } = setup({ coQuyen: true, toanHeThong: false, maDonVi: ['unit-1'] })
    await service.danhSach(actor, 'thao-tac', { trang: '1', kichThuoc: '20' } as never)
    await service.thongKe(actor, 'thao-tac')
    const listWhere = prisma.nhatKyKiemToan.findMany.mock.calls[0]?.[0].where
    const summaryWhere = prisma.nhatKyKiemToan.groupBy.mock.calls[0]?.[0].where
    expect(summaryWhere).toEqual(listWhere)
  })

  it('includes the full selected end date in timestamp filters', async () => {
    const { prisma, service } = setup()
    await service.danhSach(actor, 'thao-tac', { trang: 1, kichThuoc: 20, denNgay: '2026-11-06' } as never)
    expect(prisma.nhatKyKiemToan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ thoiDiem: { lte: new Date('2026-11-06T23:59:59.999Z') } })]) })]) }) }))
  })

  it('requires the separate deletion permission before counting selected audit rows', async () => {
    const { service, permissions, prisma } = setup()
    permissions.layDonViTrongPhamVi.mockImplementation(async (_account: string, permission: string) => permission === 'NHAT_KY_XOA'
      ? { coQuyen: true, toanHeThong: true, maDonVi: [] }
      : { coQuyen: true, toanHeThong: true, maDonVi: [] })
    const result = await service.xemTruocXoa(actor, 'thao-tac', { maNhatKy: ['00000000-0000-4000-8000-000000000001'], lyDo: 'Đã hết hạn' } as never)
    expect(result.soBanGhiKhopTrongPhamVi).toBe(1)
    expect(result.soBanGhiDuDieuKienXoa).toBeNull()
    expect(result.coTheXoa).toBe(false)
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('actor', 'NHAT_KY_XOA', 'session')
    expect(prisma.nhatKyKiemToan).not.toHaveProperty('deleteMany')
  })

  it('denies preview to users who can view but do not have deletion permission', async () => {
    const { service, permissions, prisma } = setup()
    permissions.layDonViTrongPhamVi.mockImplementation(async (_account: string, permission: string) => ({ coQuyen: permission !== 'NHAT_KY_XOA', toanHeThong: true, maDonVi: [] }))
    await expect(service.xemTruocXoa(actor, 'thao-tac', { maNhatKy: ['00000000-0000-4000-8000-000000000001'], lyDo: 'Kiểm tra' } as never)).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.nhatKyKiemToan.count).not.toHaveBeenCalled()
  })

  it('counts only the chosen date range and applies both view and deletion scope', async () => {
    const { service, permissions, prisma } = setup({ coQuyen: true, toanHeThong: false, maDonVi: ['unit-1'] })
    permissions.layDonViTrongPhamVi.mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: ['unit-1'] })
    await service.xemTruocXoa(actor, 'bao-mat', { tuNgay: '2025-01-01', denNgay: '2025-01-31', maDonVi: 'unit-1', lyDo: 'Hết hạn lưu trữ' } as never)
    expect(prisma.nhatKyKiemToan.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ OR: expect.any(Array) }), expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ hanhDong: { in: expect.arrayContaining(['DANG_NHAP']) } }), expect.objectContaining({ thoiDiem: { gte: new Date('2025-01-01'), lte: new Date('2025-01-31T23:59:59.999Z') } })]) })]) }) }))
  })

  it('rejects an invalid type and blank removal reason', async () => {
    const { service } = setup()
    await expect(service.xemTruocXoa(actor, 'khac', { maNhatKy: ['00000000-0000-4000-8000-000000000001'], lyDo: 'Xyz' } as never)).rejects.toThrow()
    await expect(service.xemTruocXoa(actor, 'thao-tac', { maNhatKy: ['00000000-0000-4000-8000-000000000001'], lyDo: '   ' } as never)).rejects.toThrow()
  })
})
