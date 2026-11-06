import { apiClient } from '@/core/api/client'
import { sanitizeRichTextHtml } from '@/shared/lib/rich-text'

export type DonViSinhHoat = {
  ma: string
  maDinhDanh: string | null
  loaiDonVi: 'CHI_BO' | 'TO'
  ten: string | null
  maChiBo: string | null
}
export type HoSoRow = {
  stt: number
  maHoSo: string
  maHoSoNoiBo: string
  hoVaTen: string
  trangThai: string
  trangThaiDangVien: string
  ngayVaoDang: string | null
  ngaySinh: string | null
  soCccd: string | null
  coQuyenXemCaNhan: boolean
  daLienKetTaiKhoan: boolean
  chiBo: string | null
  to: string | null
}
export type DanhSachHoSo = {
  duLieu: HoSoRow[]
  phanTrang: { trang: number; gioiHan: number; tongSo: number }
  thongKe: { tongSo: number; chinhThuc: number; duBi: number; dangSinhHoat: number }
}
export type BanGhiSinhHoat = { ma: string; ngayHieuLucTu: string; ngayHieuLucDen: string | null; lyDoChuyen: string | null; tenDangUy: string | null; tenChiBo: string | null; tenTo: string | null }
export type LichSuSinhHoat = { donViHienTai: BanGhiSinhHoat | null; lichSu: BanGhiSinhHoat[] }
export type QuaTrinhDang = { ma: string; loaiSuKien: string; ngaySuKien: string; soQuyetDinh: string | null; ngayQuyetDinh: string | null; donViBanHanhQuyetDinh: string | null; nguoiGioiThieuThuNhat: string | null; nguoiGioiThieuThuHai: string | null; moTa: string | null; nguoiGhiNhan: { tenDangNhap: string } }
export type PhanCongChucVu = { ma: string; tenChucVu: string; tenDonVi: string | null; nhiemKy: { ten: string; ngayBatDau: string; ngayKetThuc: string } | null; ngayHieuLucTu: string; ngayHieuLucDen: string | null; trangThai: 'SAP_HIEU_LUC' | 'DANG_HIEU_LUC' | 'DA_KET_THUC'; soQuyetDinh: string | null; ghiChu: string | null }
export type LichSuThayDoi = { hanhDong: string; ketQua: string; lyDo: string | null; thoiDiem: string; nguoiThucHien: string; duLieuTruoc: Record<string, unknown> | null; duLieuSau: Record<string, unknown> | null }
export type HoSoInput = {
  maHoSoNoiBo: string
  hoVaTen: string
  trangThai: string
  trangThaiDangVien: string
  ngayVaoDang?: string
  soPhieuLyLich?: string
  soTheDangVien?: string
  khoaDangVien?: string
  ngayChinhThuc?: string
  soQuyetDinhKetNap?: string
  ngayQuyetDinhKetNap?: string
  donViBanHanhQuyetDinh?: string
  nguoiGioiThieuThuNhat?: string
  nguoiGioiThieuThuHai?: string
  ngaySinh?: string
  gioiTinh?: string
  soCccd?: string
  ngayCapCccd?: string
  noiCapCccd?: string
  quocTich?: string
  danToc?: string
  tonGiao?: string
  soDienThoai?: string
  emailLienHe?: string
  diaChi?: {
    loaiDiaChi: 'NOI_SINH' | 'QUE_QUAN' | 'THUONG_TRU'
    phanLoaiNoiSinh?: 'TRONG_NUOC' | 'NUOC_NGOAI'
    quocGia?: string
    tinhThanhPho?: string
    quanHuyen?: string
    xaPhuong?: string
    diaChiChiTiet?: string
  }[]
  maChiBo: string
  maTo?: string
  ngaySinhHoatTu: string
  thongTinSinhVien?: {
    maSinhVien: string
    khoaHoc?: string
    donViPhuTrach?: string
    chuongTrinhDaoTao?: string
    nganh?: string
    chuyenNganh?: string
    lopHanhChinh?: string
    trangThaiHocTap?: string
  }
  taiKhoanMoi?: { tenDangNhap: string; email?: string; matKhau: string }
}
export type HoSoChiTiet = {
  ma: string
  maHoSoNoiBo: string
  hoVaTen: string
  trangThai: string
  trangThaiDangVien: string | null
  ngayVaoDang: string | null
  ngayChinhThuc: string | null
  soPhieuLyLich: string | null
  soTheDangVien: string | null
  khoaDangVien: string | null
  thongTinCaNhan?: { ngaySinh?: string | null; gioiTinh?: string | null; soCccd?: string | null; ngayCapCccd?: string | null; noiCapCccd?: string | null; quocTich?: string | null; danToc?: string | null; tonGiao?: string | null; soDienThoai?: string | null; emailLienHe?: string | null } | null
  diaChi?: { loaiDiaChi: 'NOI_SINH' | 'QUE_QUAN' | 'THUONG_TRU'; phanLoaiNoiSinh: string | null; quocGia: string | null; tinhThanhPho: string | null; quanHuyen: string | null; xaPhuong: string | null; diaChiChiTiet: string | null }[]
  thongTinSinhVien?: { maSinhVien: string; khoaHoc: string | null; donViPhuTrach: string | null; chuongTrinhDaoTao: string | null; nganh: string | null; chuyenNganh: string | null; lopHanhChinh: string | null; trangThaiHocTap: string | null } | null
  quaTrinh: { soQuyetDinh: string | null; ngayQuyetDinh: string | null; donViBanHanhQuyetDinh: string | null; nguoiGioiThieuThuNhat: string | null; nguoiGioiThieuThuHai: string | null }[]
  lichSuDonVi: { ma: string; maChiBo: string; maTo: string | null; ngayHieuLucTu: string; tenDangUy?: string | null; chiBo?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] }; to?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] } | null }[]
}
export type DotCapNhatHoSo = { ma: string; ten: string; moTa: string | null; maDonVi: string | null; tenDonVi: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[]; trangThaiQuanLy: 'BAN_NHAP' | 'DA_KICH_HOAT' | 'KET_THUC_SOM'; maNguoiTao: string; nguoiTao: string; ngayTao: string; maNguoiKichHoat: string | null; nguoiKichHoat: string | null; thoiDiemKichHoat: string | null; maNguoiKetThucSom: string | null; nguoiKetThucSom: string | null; thoiDiemKetThucSom: string | null; soYeuCau: number; trangThai?: 'BAN_NHAP' | 'CHUA_BAT_DAU' | 'DANG_MO' | 'DA_KET_THUC' }
export type ThongKeDotCapNhat = { tongYeuCau: number; choXuLy: number; daPheDuyet: number; daTuChoi: number }
export type YeuCauCapNhatHoSo = { ma: string; maHoSo: string; maDotCapNhat: string; maDonViDuyet: string; trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'DA_TU_CHOI' | 'DA_HUY'; giaTriTruoc: Record<string, unknown>; giaTriDeNghi: Record<string, unknown>; coAnhDaiDienDuocDeNghi: boolean; maNguoiGui?: string; nguoiGui?: string; tenChiBo: string; tenDotCapNhat?: string; tenNguoiXuLy?: string | null; hoSo?: { maHoSoNoiBo: string; hoVaTen: string }; ngayTao: string; thoiDiemXuLy: string | null; lyDoXuLy: string | null }
export type DanhSachYeuCauCapNhat = {
  duLieu: YeuCauCapNhatHoSo[]
  phanTrang: { trang: number; gioiHan: number; tongSo: number; tongTrang: number }
  thongKe: { tongYeuCau: number; choXuLy: number; daPheDuyet: number; daTuChoi: number; daHuy: number }
  boLoc: { donVi: { ma: string; ten: string }[]; dotCapNhat: { ma: string; ten: string }[] }
}
export type DonViMoDot = { ma: string; maDinhDanh: string | null; ten: string | null }
export const memberProfilesApi = {
  myProfile: async () => (await apiClient.get<{ hoSo: HoSoChiTiet | null }>('/ho-so-dang-vien/cua-toi')).data,
  myUpdateWindow: async () => (await apiClient.get<{ hoSoLienKet: boolean; dotCapNhat: DotCapNhatHoSo | null }>('/ho-so-dang-vien/cua-toi/dot-cap-nhat')).data,
  myUpdateRequests: async () => (await apiClient.get<YeuCauCapNhatHoSo[]>('/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat')).data,
  submitUpdateRequest: async (changes: Record<string, unknown>, image?: File) => {
    if (!image) return (await apiClient.post('/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat', { thayDoi: changes })).data
    const body = new FormData()
    body.append('thayDoi', JSON.stringify(changes))
    body.append('anhDaiDien', image)
    return (await apiClient.post('/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat', body, { headers: { 'Content-Type': undefined } })).data
  },
  cancelUpdateRequest: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat/${id}/huy`)).data,
  myAvatar: async () => (await apiClient.get<Blob>('/ho-so-dang-vien/cua-toi/anh-dai-dien', { responseType: 'blob' })).data,
  memberAvatar: async (id: string) => (await apiClient.get<Blob>(`/ho-so-dang-vien/${id}/anh-dai-dien`, { responseType: 'blob' })).data,
  updateUnits: async () => (await apiClient.get<{ donVi: DonViMoDot[]; coTheMoToanPhamVi: boolean }>('/ho-so-dang-vien/dot-cap-nhat/don-vi')).data,
  updateWindows: async () => (await apiClient.get<DotCapNhatHoSo[]>('/ho-so-dang-vien/dot-cap-nhat')).data,
  createUpdateWindow: async (body: { ten: string; moTa?: string | null; maDonVi?: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[] }) => (await apiClient.post('/ho-so-dang-vien/dot-cap-nhat', body)).data,
  createAndActivateUpdateWindow: async (body: { ten: string; moTa?: string | null; maDonVi?: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[] }) => (await apiClient.post('/ho-so-dang-vien/dot-cap-nhat/tao-va-kich-hoat', body)).data,
  updateUpdateWindow: async (id: string, body: Partial<{ ten: string; moTa: string | null; maDonVi: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[] }>) => (await apiClient.patch(`/ho-so-dang-vien/dot-cap-nhat/${id}`, body)).data,
  activateUpdateWindow: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/dot-cap-nhat/${id}/kich-hoat`)).data,
  finishUpdateWindow: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/dot-cap-nhat/${id}/ket-thuc`)).data,
  deleteUpdateWindow: async (id: string) => (await apiClient.delete(`/ho-so-dang-vien/dot-cap-nhat/${id}`)).data,
  updateWindowStats: async (id: string) => (await apiClient.get<ThongKeDotCapNhat>(`/ho-so-dang-vien/dot-cap-nhat/${id}/thong-ke`)).data,
  reviewRequests: async (params: { maDotCapNhat?: string; maDonViDuyet?: string; trangThai?: YeuCauCapNhatHoSo['trangThai']; tuKhoa?: string; tuNgay?: string; denNgay?: string; trang?: number; gioiHan?: number }) => (await apiClient.get<DanhSachYeuCauCapNhat>('/ho-so-dang-vien/yeu-cau-cap-nhat', { params })).data,
  approveUpdateRequest: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/yeu-cau-cap-nhat/${id}/duyet`)).data,
  rejectUpdateRequest: async (id: string, lyDo: string) => (await apiClient.post(`/ho-so-dang-vien/yeu-cau-cap-nhat/${id}/tu-choi`, { lyDo: sanitizeRichTextHtml(lyDo) })).data,
  list: async (params: Record<string, string | number>) =>
    (await apiClient.get<DanhSachHoSo>('/ho-so-dang-vien', { params })).data,
  units: async () => (await apiClient.get<DonViSinhHoat[]>('/ho-so-dang-vien/don-vi')).data,
  membershipHistory: async (id: string) => (await apiClient.get<LichSuSinhHoat>(`/ho-so-dang-vien/${id}/lich-su-sinh-hoat`)).data,
  partyProcess: async (id: string) => (await apiClient.get<QuaTrinhDang[]>(`/ho-so-dang-vien/${id}/qua-trinh`)).data,
  positionAssignments: async (id: string) => (await apiClient.get<PhanCongChucVu[]>(`/ho-so-dang-vien/${id}/phan-cong-chuc-vu`)).data,
  changeHistory: async (id: string) => (await apiClient.get<LichSuThayDoi[]>(`/ho-so-dang-vien/${id}/lich-su-thay-doi`)).data,
  detail: async (id: string) =>
    (
      await apiClient.get<HoSoInput & {
        ma: string
        thongTinCaNhan?: { ngaySinh?: string | null; gioiTinh?: string | null; soCccd?: string | null; ngayCapCccd?: string | null; noiCapCccd?: string | null; quocTich?: string | null; danToc?: string | null; tonGiao?: string | null; soDienThoai?: string | null; emailLienHe?: string | null }
        thongTinSinhVien?: { maSinhVien: string; khoaHoc?: string | null; donViPhuTrach?: string | null; chuongTrinhDaoTao?: string | null; nganh?: string | null; chuyenNganh?: string | null; lopHanhChinh?: string | null; trangThaiHocTap?: string | null }
        quaTrinh?: { soQuyetDinh?: string | null; ngayQuyetDinh?: string | null; donViBanHanhQuyetDinh?: string | null; nguoiGioiThieuThuNhat?: string | null; nguoiGioiThieuThuHai?: string | null }[]
        lichSuDonVi?: { ma: string; maChiBo: string; maTo: string | null; ngayHieuLucTu: string; tenDangUy?: string | null; chiBo?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] }; to?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] } | null }[]
      }>(
        `/ho-so-dang-vien/${id}`,
      )
    ).data,
  create: async (body: HoSoInput) => (await apiClient.post('/ho-so-dang-vien', body)).data,
  update: async (id: string, body: Partial<HoSoInput>) =>
    (await apiClient.patch(`/ho-so-dang-vien/${id}`, body)).data,
}
