export type LogType = 'thao-tac' | 'bao-mat'
export type SystemLog = {
  ma: string; maNguoiThucHien: string | null; hanhDong: string; tenHanhDong: string; loaiDoiTuong: string; maDoiTuong: string | null
  ketQua: string; lyDo: string | null; thoiDiem: string
  nguoiThucHien: { tenDangNhap: string; hoSoDangVien: { hoVaTen: string } | null } | null
}
export type LogFilters = { trang: number; kichThuoc: number; tuKhoa: string; hanhDong: string; ketQua: string; tuNgay: string; denNgay: string; taiKhoan: string; maDonVi: string }
export type LogUnit = { ma: string; maDinhDanh: string | null; loaiDonVi: string; ten: string }
export type RemovalPreviewInput = { maNhatKy?: string[]; tuNgay?: string; denNgay?: string; maDonVi?: string; lyDo: string }
export type RemovalPreview = { loaiNhatKy: LogType; cheDo: string; soBanGhiYeuCau: number | null; soBanGhiKhopTrongPhamVi: number; soBanGhiDuDieuKienXoa: null; tuNgay: string | null; denNgay: string | null; maDonVi: string | null; lyDo: string; coTheXoa: false; lyDoKhongTheXoa: string }
export type LogPage = { items: SystemLog[]; tongSo: number; trang: number; kichThuoc: number }
export type LogStats = { tong: number; thanhCong: number; thatBai: number; ketQuaKhac: number; baoMat: number }
