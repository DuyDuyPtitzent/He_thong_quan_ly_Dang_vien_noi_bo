import 'reflect-metadata'
import { ForbiddenException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiemDanhThuCongService } from '../src/modules/resolution-learning/attendance-manual.service'
import { GuiYeuCauCongKhaiDto } from '../src/modules/resolution-learning/attendance.dto'

const actor = { maTaiKhoan: 'actor', maPhien: 'session' } as never
const buoi = { ma: 'buoi', trangThai: 'DANG_DIEN_RA', yeuCauPheDuyet: false, phamVi: [{ maDonVi: 'unit' }] }
const roster = { maBuoi: 'buoi', maHoSo: 'profile', trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: 'unit', tenChiBoSnapshot: 'Chi bộ 1', hoSo: { ma: 'profile', hoVaTen: 'Nguyễn An', thongTinCaNhan: null } }

function fixture({ approval = false, birthDate = null as Date | null, current = null as null | { ma: string; version: number; trangThai: string | null }, hasPending = false, status = 'DANG_DIEN_RA', hasChot = false } = {}) {
  const createResult = vi.fn(async ({ data }) => ({ ma: 'result', version: data.version, trangThai: data.trangThai }))
  const createRequest = vi.fn(async ({ data }) => ({ ma: 'request', trangThai: data.trangThai, received: data }))
  const updateResult = vi.fn(async ({ data }) => ({ ma: 'result', version: current!.version + 1, trangThai: data.trangThai }))
  const historyCreate = vi.fn(async () => ({})); const auditCreate = vi.fn(async () => ({}))
  const tx = {
    $queryRaw: vi.fn(async () => []),
    buoiHocNghiQuyet: { findUnique: vi.fn(async () => ({ trangThai: status, yeuCauPheDuyet: approval })) },
    chotDanhSachDiemDanh: { findUnique: vi.fn(async () => hasChot ? { ma: 'chot' } : null) },
    danhSachThamGiaBuoiHoc: { findUnique: vi.fn(async () => ({ ...roster, hoSo: { ...roster.hoSo, thongTinCaNhan: birthDate ? { ngaySinh: birthDate } : null } })) },
    ketQuaDiemDanh: { findUnique: vi.fn(async () => current), create: createResult, update: updateResult },
    yeuCauDiemDanh: { findFirst: vi.fn(async () => hasPending ? { ma: 'pending' } : null), findMany: vi.fn(async () => []), create: createRequest },
    lichSuDiemDanh: { create: historyCreate },
    nhatKyKiemToan: { create: auditCreate },
  }
  const prisma = { buoiHocNghiQuyet: { findUnique: vi.fn(async () => buoi) }, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => typeof callback === 'function' ? callback(tx) : callback) }
  const permissions = { layDonViTrongPhamVi: vi.fn(async () => ({ coQuyen: true, toanHeThong: false, maDonVi: ['unit'] })) }
  return { service: new DiemDanhThuCongService(prisma as never, permissions as never), tx, permissions, createResult, createRequest, updateResult, historyCreate, auditCreate }
}

describe('DiemDanhThuCongService', () => {
  beforeEach(() => vi.restoreAllMocks())
  it('ghi trực tiếp kết quả, version, history và audit nếu tắt phê duyệt; năm sinh thiếu vẫn null', async () => {
    const f = fixture()
    const result = await f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CO_MAT' })
    expect(result).toMatchObject({ ketQua: 'CO_MAT', version: 1, choPheDuyet: false })
    expect(f.createResult).toHaveBeenCalledOnce(); expect(f.historyCreate).toHaveBeenCalledOnce(); expect(f.auditCreate).toHaveBeenCalledOnce()
    expect(f.tx.lichSuDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ketQuaTruoc: null, ketQuaSau: 'CO_MAT', versionSau: 1 }) }))
  })
  it('khi bật phê duyệt tạo yêu cầu chờ, lưu null nếu hồ sơ chưa có ngày sinh và không ghi kết quả chính thức', async () => {
    const f = fixture({ approval: true })
    const result = await f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'VANG_CO_PHEP' })
    expect(result).toMatchObject({ trangThai: 'CHO_PHE_DUYET', choPheDuyet: true })
    expect(f.createRequest.mock.calls[0][0].data).toMatchObject({ namSinhDoiChieu: null, maCuaSo: null, maHoSo: 'profile' })
    expect(f.createResult).not.toHaveBeenCalled(); expect(f.historyCreate).not.toHaveBeenCalled()
  })
  it('dùng năm sinh thực tế nếu hồ sơ có ngày sinh', async () => {
    const f = fixture({ approval: true, birthDate: new Date('1990-04-03T00:00:00.000Z') })
    await f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'VANG_KHONG_PHEP' })
    expect(f.createRequest.mock.calls[0][0].data.namSinhDoiChieu).toBe(1990)
  })
  it('chặn khi scope không bao phủ đơn vị snapshot', async () => {
    const f = fixture(); f.permissions.layDonViTrongPhamVi.mockResolvedValue({ coQuyen: true, toanHeThong: false, maDonVi: [] })
    await expect(f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CO_MAT' })).rejects.toBeInstanceOf(ForbiddenException)
  })
  it('không bỏ qua yêu cầu công khai đang chờ', async () => {
    const f = fixture({ hasPending: true })
    await expect(f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CO_MAT' })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'YEU_CAU_DANG_CHO_XU_LY' }) })
    expect(f.createResult).not.toHaveBeenCalled()
  })
  it('gửi lại trạng thái hiện hành là no-op, không ghi history hoặc audit', async () => {
    const f = fixture({ current: { ma: 'result', version: 4, trangThai: 'CO_MAT' } })
    const result = await f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CO_MAT', version: 4 })
    expect(result).toMatchObject({ version: 4, khongThayDoi: true })
    expect(f.updateResult).not.toHaveBeenCalled(); expect(f.historyCreate).not.toHaveBeenCalled(); expect(f.auditCreate).not.toHaveBeenCalled()
  })
  it('chuyển kết quả về Chưa điểm danh bằng NULL, giữ result row và ghi history', async () => {
    const f = fixture({ current: { ma: 'result', version: 2, trangThai: 'CO_MAT' } })
    const result = await f.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CHUA_DIEM_DANH', version: 2 })
    expect(result).toMatchObject({ ketQua: 'CHUA_DIEM_DANH', version: 3 })
    expect(f.updateResult).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ trangThai: null, version: { increment: 1 }, thoiDiemCoMat: null }) }))
    expect(f.tx.lichSuDiemDanh.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ketQuaTruoc: 'CO_MAT', ketQuaSau: null, versionTruoc: 2, versionSau: 3 }) }))
  })
  it('điều chỉnh sau chốt dùng Permission riêng và vẫn áp dụng yêu cầu phê duyệt', async () => {
    const f = fixture({ approval: true, status: 'DA_KET_THUC', hasChot: true })
    const result = await f.service.capNhatSauChot(actor, 'buoi', 'profile', { ketQua: 'VANG_CO_PHEP' })
    expect(result).toMatchObject({ choPheDuyet: true, trangThai: 'CHO_PHE_DUYET' })
    expect(f.permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('actor', 'HOC_TAP_NGHI_QUYET_DIEM_DANH_DIEU_CHINH', 'session')
    expect(f.createRequest).toHaveBeenCalledOnce(); expect(f.createResult).not.toHaveBeenCalled()
  })
  it('cho phép sau khi buổi kết thúc nhưng từ chối buổi đã hủy', async () => {
    const ended = fixture({ status: 'DA_KET_THUC' })
    await expect(ended.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CO_MAT' })).resolves.toMatchObject({ choPheDuyet: false })
    const cancelled = fixture({ status: 'DA_HUY' })
    await expect(cancelled.service.capNhat(actor, 'buoi', { maHoSo: 'profile', ketQua: 'CO_MAT' })).rejects.toMatchObject({ response: expect.objectContaining({ maLoi: 'BUOI_DA_HUY' }) })
  })
  it('biểu mẫu công khai vẫn bắt buộc năm sinh', async () => {
    const dto = plainToInstance(GuiYeuCauCongKhaiDto, { token: 'token', hoVaTen: 'Nguyễn An', maChiBo: '00000000-0000-4000-8000-000000000000' })
    const errors = await validate(dto)
    expect(errors.some(error => error.property === 'namSinh')).toBe(true)
  })
})
