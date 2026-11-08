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
  soDienThoaiBoNguoiNuoiDuong?: string
  soDienThoaiMeNguoiNuoiDuong?: string
  emailLienHe?: string
  diaChi?: {
    loaiDiaChi: 'NOI_SINH' | 'QUE_QUAN' | 'THUONG_TRU' | 'NOI_O_HIEN_NAY'
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
  thongTinCaNhan?: { ngaySinh?: string | null; gioiTinh?: string | null; soCccd?: string | null; ngayCapCccd?: string | null; noiCapCccd?: string | null; quocTich?: string | null; danToc?: string | null; tonGiao?: string | null; soDienThoai?: string | null; soDienThoaiBoNguoiNuoiDuong?: string | null; soDienThoaiMeNguoiNuoiDuong?: string | null; emailLienHe?: string | null } | null
  diaChi?: { loaiDiaChi: 'NOI_SINH' | 'QUE_QUAN' | 'THUONG_TRU' | 'NOI_O_HIEN_NAY'; phanLoaiNoiSinh: string | null; quocGia: string | null; tinhThanhPho: string | null; quanHuyen: string | null; xaPhuong: string | null; diaChiChiTiet: string | null }[]
  thongTinSinhVien?: { maSinhVien: string; khoaHoc: string | null; donViPhuTrach: string | null; chuongTrinhDaoTao: string | null; nganh: string | null; chuyenNganh: string | null; lopHanhChinh: string | null; trangThaiHocTap: string | null } | null
  quaTrinh: { soQuyetDinh: string | null; ngayQuyetDinh: string | null; donViBanHanhQuyetDinh: string | null; nguoiGioiThieuThuNhat: string | null; nguoiGioiThieuThuHai: string | null }[]
  lichSuDonVi: { ma: string; maChiBo: string; maTo: string | null; ngayHieuLucTu: string; tenDangUy?: string | null; chiBo?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] }; to?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] } | null }[]
}
