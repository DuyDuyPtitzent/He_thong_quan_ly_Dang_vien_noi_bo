import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { HocTapCaNhanService } from '../src/modules/resolution-learning/personal-learning.service'

const actor = { maTaiKhoan: 'account-1', maPhien: 'session-1' }
function setup() {
  const permissions = { kiemTraQuyenCaNhan: vi.fn().mockResolvedValue(undefined) }
  const profile = { ma: 'profile-1' }
  const prisma = {
    hoSoDangVien: { findMany: vi.fn().mockResolvedValue([profile]) },
    buoiHocNghiQuyet: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn() },
    $transaction: vi.fn(async (calls: Promise<unknown>[]) => Promise.all(calls)),
  }
  return { service: new HocTapCaNhanService(prisma as never, permissions as never), permissions, prisma }
}

describe('Personal learning service privacy and history behavior', () => {
  it('requires personal scope permission before resolving only the actor-linked profile', async () => {
    const { service, permissions, prisma } = setup()
    await service.lich(actor as never, { trang: 1, gioiHan: 20 } as never)
    expect(permissions.kiemTraQuyenCaNhan).toHaveBeenCalledWith('account-1', 'HOC_TAP_NGHI_QUYET_CA_NHAN_XEM', 'session-1')
    expect(prisma.hoSoDangVien.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { maTaiKhoan: 'account-1' }, select: { ma: true } }))
    expect(prisma.buoiHocNghiQuyet.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([expect.objectContaining({ danhSachThamGia: { some: { maHoSo: 'profile-1', trangThai: 'TRONG_DANH_SACH' } } })]) }) }))
  })
  it('does not query when the selected assignment lacks the personal permission', async () => {
    const { service, permissions, prisma } = setup(); permissions.kiemTraQuyenCaNhan.mockRejectedValue(new ForbiddenException())
    await expect(service.lich(actor as never, { trang: 1, gioiHan: 20 } as never)).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.hoSoDangVien.findMany).not.toHaveBeenCalled()
  })
  it('returns a business error when the account has no linked profile', async () => {
    const { service, prisma } = setup(); prisma.hoSoDangVien.findMany.mockResolvedValue([])
    await expect(service.lich(actor as never, { trang: 1, gioiHan: 20 } as never)).rejects.toMatchObject({ response: { maLoi: 'TAI_KHOAN_CHUA_LIEN_KET_HO_SO' } })
    expect(prisma.buoiHocNghiQuyet.findMany).not.toHaveBeenCalled()
  })
  it('includes an excluded-roster session only when an official result or attendance history remains, including canceled sessions', async () => {
    const { service, prisma } = setup()
    prisma.buoiHocNghiQuyet.findMany.mockResolvedValue([{ ma: 'session-row', maBuoi: 'SESSION-CODE', ten: 'Session', maDot: 'campaign', batDauLuc: new Date(), ketThucLuc: new Date(), diaDiem: null, hinhThuc: 'TRUC_TIEP', noiDung: null, trangThai: 'DA_HUY', dotHoc: { ten: 'Campaign', maNamHoc: 'year', namHoc: { tenNamHoc: '2026-2027' } }, giaTriHinhThuc: null, danhSachThamGia: [{ trangThai: 'DA_LOAI' }], ketQuaDiemDanh: [{ trangThai: null }], lichSuDiemDanh: [{ ma: 'history' }] }] as never)
    const response = await service.lichSu(actor as never, { trang: 1, gioiHan: 20 } as never)
    const query = prisma.buoiHocNghiQuyet.findMany.mock.calls[0]?.[0] as any
    expect(query.where.AND[1].OR).toHaveLength(3)
    expect(query.where).not.toHaveProperty('trangThai')
    expect(response.duLieu[0]).toMatchObject({ trangThaiBuoi: 'DA_HUY', ketQuaDiemDanh: 'CHUA_DIEM_DANH', rosterHienHanh: false, coLichSuDiemDanh: true })
    expect(JSON.stringify(response)).not.toMatch(/cccd|token|maHoSo|ghiChu/i)
  })
  it('does not reveal a UUID-only session outside the member schedule/history', async () => {
    const { service, prisma } = setup(); prisma.buoiHocNghiQuyet.findFirst.mockResolvedValue(null)
    await expect(service.chiTiet(actor as never, 'session-outside')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.buoiHocNghiQuyet.findFirst.mock.calls[0]?.[0]).toMatchObject({ where: { ma: 'session-outside', AND: expect.any(Array) } })
  })
  it('maps an absent current result to CHUA_DIEM_DANH without reading requests or finalization snapshots', async () => {
    const { service, prisma } = setup()
    prisma.buoiHocNghiQuyet.findFirst.mockResolvedValue({ ma: 'session-row', maBuoi: 'SESSION-CODE', ten: 'Session', maDot: 'campaign', batDauLuc: new Date(), ketThucLuc: new Date(), diaDiem: null, hinhThuc: 'TRUC_TIEP', noiDung: null, trangThai: 'DA_KET_THUC', dotHoc: { ten: 'Campaign', maNamHoc: 'year', namHoc: { tenNamHoc: '2026-2027' } }, giaTriHinhThuc: { maGiaTri: 'format', tenHienThi: 'Trực tiếp' }, ketQuaDiemDanh: [] } as never)
    const response = await service.chiTiet(actor as never, 'session-row')
    expect(response.ketQuaDiemDanh).toBe('CHUA_DIEM_DANH')
    const args = prisma.buoiHocNghiQuyet.findFirst.mock.calls[0]?.[0] as any
    expect(args.select).not.toHaveProperty('yeuCauDiemDanh')
    expect(args.select).not.toHaveProperty('chotDanhSach')
  })
  it('rejects invalid timestamp filters', async () => {
    const { service } = setup()
    await expect(service.lich(actor as never, { trang: 1, gioiHan: 20, tuLuc: '2026-01-01T00:00:00' } as never)).rejects.toMatchObject({ response: { maLoi: 'THIEU_MUI_GIO' } })
  })
})
