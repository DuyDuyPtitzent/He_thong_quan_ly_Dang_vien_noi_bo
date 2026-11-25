import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { HocTapNghiQuyetService } from '../src/modules/resolution-learning/learning.service'

const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' } as never
const branch = '00000000-0000-4000-8000-000000000011'
const team = '00000000-0000-4000-8000-000000000012'
const profile = '00000000-0000-4000-8000-000000000013'
const session = '00000000-0000-4000-8000-000000000014'

function setup() {
  const row = {
    ma: 'row-id', maHoSo: profile, trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: branch,
    tenChiBoSnapshot: 'Chi bộ A', maToSnapshot: team, tenToSnapshot: 'Tổ 1', themLuc: new Date(), loaiLuc: null,
    khoiPhucLuc: null, hoSo: { maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An' },
  }
  const findMany = vi.fn().mockResolvedValue([row])
  const count = vi.fn().mockResolvedValue(21)
  const prisma = {
    buoiHocNghiQuyet: { findUnique: vi.fn().mockResolvedValue({ ma: session }) },
    danhSachThamGiaBuoiHoc: { findMany, count },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }
  const authorization = { layDonViTrongPhamVi: vi.fn().mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: [team] }) }
  const service = new HocTapNghiQuyetService(prisma as never, authorization as never, {} as never)
  return { service, prisma, authorization, findMany, count }
}

describe('resolution learning roster read API', () => {
  it('requires the list-view Permission and filters by roster organization snapshots before pagination', async () => {
    const { service, prisma, findMany, count } = setup()
    const response = await service.danhSachThamGia(actor, session, { trang: 2, gioiHan: 10, tuKhoa: 'Nguyễn', trangThai: 'TRONG_DANH_SACH', sapXep: 'hoVaTen', thuTu: 'asc' })
    expect(prisma.buoiHocNghiQuyet.findUnique).toHaveBeenCalledWith({ where: { ma: session }, select: { ma: true, trangThai: true, phamVi: { select: { maDonVi: true } }, phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true, maNguoiXacNhanDanhSach: true, xacNhanDanhSachLuc: true } })
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { maBuoi: session, trangThai: 'TRONG_DANH_SACH', AND: [{ OR: [{ maChiBoSnapshot: { in: [team] } }, { maToSnapshot: { in: [team] } }] }, { hoSo: { is: { OR: [{ hoVaTen: expect.any(Object) }, { maHoSoNoiBo: expect.any(Object) }] } } }] }, skip: 10, take: 10 })
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where)
    expect(response.phanTrang).toEqual({ trang: 2, gioiHan: 10, tongSo: 21, tongTrang: 3 })
    expect(response.duLieu[0]).toEqual(expect.objectContaining({ maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', tenChiBoSnapshot: 'Chi bộ A', tenToSnapshot: 'Tổ 1' }))
    expect(response.duLieu[0]).not.toHaveProperty('soCccd')
  })

  it('rejects organization filters outside the active Assignment scope', async () => {
    const { service, findMany } = setup()
    await expect(service.danhSachThamGia(actor, session, { maChiBo: branch })).rejects.toBeInstanceOf(ForbiddenException)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('does not query any roster row if the Assignment lacks list-view Permission', async () => {
    const { service, authorization, findMany } = setup()
    authorization.layDonViTrongPhamVi.mockResolvedValueOnce({ coQuyen: false, toanHeThong: false, maDonVi: [] })
    await expect(service.danhSachThamGia(actor, session, {})).rejects.toBeInstanceOf(ForbiddenException)
    expect(findMany).not.toHaveBeenCalled()
  })
})
