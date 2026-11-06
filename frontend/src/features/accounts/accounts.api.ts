import { apiClient } from '@/core/api/client'

export type TaiKhoan = {
  maTaiKhoan: string
  tenDangNhap: string
  email: string | null
  trangThai: string
  ngayTao: string
  ngayCapNhat: string
  khoaDen: string | null
  doiMatKhauLanDau: boolean
  hoSoDangVien: { ma: string; maHoSoNoiBo: string; hoVaTen: string; trangThai: string; cccd: string | null; ngaySinh?: string | null; chiBoHienTai: string | null; maChiBoHienTai: string | null; toHienTai?: string | null } | null
  hoVaTen: string | null
  chiBoHienTai: string | null
  maChiBoHienTai: string | null
  vaiTroDangPhanCong: string[]
  phamViPhanCong: { maPhanCong: string; maVaiTro: string; maDinhDanhVaiTro: string; tenVaiTro: string; loaiPhamVi: string; maDonViGoc: string | null; tenDonViGoc: string | null; ngayHieuLucTu: string; ngayHieuLucDen: string | null; danhSachMaDonVi: string[]; donViChiDinh: string[] }[]
  soPhanCongHieuLuc: number
  dangNhapCuoiLuc: string | null
}

export type DanhSachTaiKhoan = {
  duLieu: TaiKhoan[]
  phanTrang: { trang: number; gioiHan: number; tongSo: number }
  thongKe: { tongTaiKhoan: number; dangHoatDong: number; khoaHoacVoHieuHoa: number; chuaLienKetHoSo: number }
  thongKePhanQuyen: { tongTaiKhoan: number; daPhanQuyen: number; chuaPhanQuyen: number; sapHetHan: number }
  danhMucChiBo: { ma: string; ten: string | null }[]
}

export type HoSoChuaLienKet = { ma: string; maHoSoNoiBo: string; hoVaTen: string; chiBoHienTai: string | null; maChiBoHienTai: string | null }
export type NhatKyTaiKhoan = { hanhDong: string; ketQua: string; lyDo: string | null; duLieuTruoc: unknown; duLieuSau: unknown; thoiDiem: string; maNguoiThucHien: string | null }

export const accountsApi = {
  async list(params: Record<string, string | number>) { const { data } = await apiClient.get<DanhSachTaiKhoan>('/tai-khoan', { params }); return data },
  async create(input: { tenDangNhap: string; email?: string; matKhauBanDau: string; maHoSo?: string; trangThai?: string }) { const { data } = await apiClient.post('/tai-khoan', input); return data },
  async update(id: string, input: { tenDangNhap?: string; email?: string | null; trangThai?: string; matKhauMoi?: string; yeuCauDoiMatKhau?: boolean }) { const { data } = await apiClient.patch(`/tai-khoan/${id}`, input); return data },
  async status(id: string, trangThai: string, lyDo?: string) { const { data } = await apiClient.patch(`/tai-khoan/${id}/trang-thai`, { trangThai, lyDo }); return data },
  async remove(id: string) { const { data } = await apiClient.delete(`/tai-khoan/${id}`); return data },
  async detail(id: string) { const { data } = await apiClient.get<{ maTaiKhoan: string; tenDangNhap: string; email: string | null; trangThai: string; dangNhapCuoiLuc: string | null; doiMatKhauLanDau: boolean; ngayTao: string; ngayCapNhat: string; khoaDen: string | null; daLienKetHoSo: boolean; hoSoDangVien: TaiKhoan['hoSoDangVien']; phienDangNhap: { ngayTao: string; hetHanLuc: string; diaChiIp: string | null }[] }>(`/tai-khoan/${id}`); return data },
  async history(id: string) { const { data } = await apiClient.get<NhatKyTaiKhoan[]>(`/tai-khoan/${id}/lich-su`); return data },
  async searchProfiles(keyword: string) { const { data } = await apiClient.get<HoSoChuaLienKet[]>('/tai-khoan/ho-so-chua-lien-ket', { params: { tuKhoa: keyword } }); return data },
  async linkProfile(id: string, maHoSo: string | null) { const { data } = await apiClient.patch(`/tai-khoan/${id}/lien-ket-ho-so`, { maHoSo }); return data },
}
