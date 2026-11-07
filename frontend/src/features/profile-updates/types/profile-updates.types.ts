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
