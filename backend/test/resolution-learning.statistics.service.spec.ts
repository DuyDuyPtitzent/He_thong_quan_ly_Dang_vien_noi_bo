import { ForbiddenException, BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ThongKeHocTapNghiQuyetService } from '../src/modules/resolution-learning/statistics.service'

const actor = { maTaiKhoan: 'account', maPhien: 'session' } as never
const uuidA = '00000000-0000-4000-8000-000000000001'
const uuidB = '00000000-0000-4000-8000-000000000002'
function setup(options: { access?: Record<string, unknown>; aggregates?: Record<string, unknown>[]; cte?: Record<string, unknown>[]; dot?: Record<string, unknown>; buoi?: Record<string, unknown> } = {}) {
  const activeAccess = options.access ?? { coQuyen: true, toanHeThong: true, maDonVi: [] }
  const permissions = { layDonViTrongPhamVi: vi.fn().mockResolvedValue(activeAccess) }
  const defaultAggregate = { khoa: null, ten: null, tongLuot: 4, coMat: 1, vangCoPhep: 1, vangKhongPhep: 1, chuaDiemDanh: 1, soNguoiDuyNhat: 3, soBuoi: 2 }
  const prisma = {
    $queryRaw: vi.fn().mockImplementation((strings: TemplateStringsArray) => strings.join('').includes('WITH theo_ho_so')
      ? Promise.resolve(options.cte ?? [{ thamGiaDayDu: 1, thamGiaMotPhan: 0, chuaThamGia: 1, tong: 2 }])
      : Promise.resolve(options.aggregates ?? [defaultAggregate])),
    dotHocNghiQuyet: {
      findUnique: vi.fn().mockResolvedValue(options.dot ?? { ma: 'c1', maDot: 'DOT-1', ten: 'Đợt 1', maNamHoc: 'year-1', ngayBatDau: new Date('2026-01-01'), ngayKetThuc: new Date('2026-02-01'), trangThai: 'DA_KET_THUC', phamVi: [{ maDonVi: 'u1' }, { maDonVi: 'u2' }], namHoc: { tenNamHoc: '2025-2026' } }),
      findMany: vi.fn().mockResolvedValue([{ ma: 'c1', maDot: 'DOT-1', ten: 'Đợt 1', maNamHoc: 'year-1', ngayBatDau: new Date('2026-01-01'), namHoc: { tenNamHoc: '2025-2026' } }]),
    },
    buoiHocNghiQuyet: {
      findUnique: vi.fn().mockResolvedValue(options.buoi ?? { ma: 's1', maBuoi: 'B1', ten: 'Buổi 1', maDot: 'c1', batDauLuc: new Date(), ketThucLuc: new Date(), trangThai: 'DA_KET_THUC', phamVi: [{ maDonVi: 'u1' }, { maDonVi: 'u2' }] }),
      count: vi.fn().mockResolvedValue(2),
    },
  }
  const service = new ThongKeHocTapNghiQuyetService(prisma as never, permissions as never)
  return { service, prisma, permissions }
}

describe('ThongKeHocTapNghiQuyetService', () => {
  it('tổng hợp theo đợt từ lượt active roster, tách người duy nhất và trả null-safe rate', async () => {
    const { service } = setup()
    const result = await service.theoDot(actor, 'c1', {})
    expect(result).toMatchObject({ tongSoBuoi: 2, soDangVienDuyNhat: 3, tongLuot: 4, coMat: 1, vangCoPhep: 1, vangKhongPhep: 1, chuaDiemDanh: 1, tyLeThamGia: 25, trangThaiDuLieu: 'CO_DU_LIEU' })
  })

  it('tính các trạng thái null/thiếu như Chưa điểm danh; buổi hủy không có mẫu số', async () => {
    const { service, prisma } = setup({ buoi: { ma: 's1', maBuoi: 'B1', ten: 'Buổi hủy', maDot: 'c1', batDauLuc: new Date(), ketThucLuc: new Date(), trangThai: 'DA_HUY', phamVi: [{ maDonVi: 'u1' }] } })
    const result = await service.theoBuoi(actor, 's1')
    expect(result).toMatchObject({ buoi: { trangThai: 'DA_HUY' }, tongThuocDien: 0, chuaDiemDanh: 0, tyLeThamGia: null, trangThaiDuLieu: 'CHUA_CO_DU_LIEU' })
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('lọc và nhóm theo Chi bộ snapshot, không dùng đơn vị hiện tại của hồ sơ', async () => {
    const { service, permissions } = setup({ access: { coQuyen: true, toanHeThong: false, maDonVi: ['u1'] }, aggregates: [{ khoa: 'u1', ten: 'Chi bộ A', tongLuot: 2, coMat: 1, vangCoPhep: 0, vangKhongPhep: 0, chuaDiemDanh: 1, soNguoiDuyNhat: 2, soBuoi: 1 }] })
    const result = await service.theoChiBo(actor, {})
    expect(result.duLieu).toHaveLength(1)
    expect(result.duLieu[0]).toMatchObject({ maChiBo: 'u1', tenChiBo: 'Chi bộ A', tongLuot: 2, coMat: 1, chuaDiemDanh: 1 })
    expect(permissions.layDonViTrongPhamVi).toHaveBeenCalledWith('account', 'HOC_TAP_NGHI_QUYET_THONG_KE_XEM', 'session')
  })

  it('đưa Scope vào SQL trước aggregate và chỉ đọc kết quả chính thức hiện hành', async () => {
    const { service, prisma } = setup({ access: { coQuyen: true, toanHeThong: false, maDonVi: ['u1'] } })
    await service.theoChiBo(actor, {})
    const call = prisma.$queryRaw.mock.calls[0]
    const sql = (call[0] as TemplateStringsArray).join(' ')
    expect(JSON.stringify(call.slice(1))).toContain('ma_chi_bo_snapshot')
    expect(sql).toContain('ket_qua_diem_danh')
    expect(sql).toContain('k.trang_thai IS NULL')
    expect(sql).not.toContain('yeu_cau_diem_danh')
    expect(sql).not.toContain('chi_tiet_chot_danh_sach_diem_danh')
  })

  it('xu hướng có điểm kỳ thật không có mẫu số với tỷ lệ null', async () => {
    const { service, prisma } = setup({ aggregates: [], access: { coQuyen: true, toanHeThong: true, maDonVi: [] } })
    const result = await service.xuHuong(actor, {})
    expect(result.duLieu[0]).toMatchObject({ maDot: 'c1', tongLuotDuKien: 0, tongLuotCoMat: 0, tyLeThamGia: null, trangThaiDuLieu: 'CHUA_CO_DU_LIEU' })
    expect(prisma.dotHocNghiQuyet.findMany).toHaveBeenCalled()
  })

  it('phân loại mức độ tham gia trên từng tập roster scoped, không cộng các buổi ngoài Scope', async () => {
    const { service } = setup({ access: { coQuyen: true, toanHeThong: false, maDonVi: ['u1'] }, cte: [{ thamGiaDayDu: 1, thamGiaMotPhan: 0, chuaThamGia: 1, tong: 2 }] })
    const result = await service.mucDoThamGia(actor, { maDot: 'c1' })
    expect(result).toMatchObject({ tongDangVienTrongTapApDung: 2, thamGiaDayDu: 1, thamGiaMotPhan: 0, chuaThamGia: 1 })
  })

  it('từ chối Scope CA_NHAN và không mở rộng thành Scope tổ chức', async () => {
    const { service } = setup({ access: { coQuyen: true, toanHeThong: false, maDonVi: [] } })
    await expect(service.theoChiBo(actor, {})).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('từ chối bộ lọc Chi bộ ngoài Scope và khoảng thời gian sai', async () => {
    const { service } = setup({ access: { coQuyen: true, toanHeThong: false, maDonVi: ['u1'] } })
    await expect(service.theoChiBo(actor, { maChiBo: 'u2' })).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.xuHuong(actor, { tuLuc: '2026-02-01T00:00:00Z', denLuc: '2026-01-01T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException)
  })
})
