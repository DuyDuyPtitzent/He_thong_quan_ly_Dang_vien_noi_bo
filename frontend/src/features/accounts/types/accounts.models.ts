export type AccountStatus = 'DANG_HOAT_DONG' | 'TAM_KHOA' | 'NGUNG_HOAT_DONG'

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

export type MemberProfile = {
  id: string
  code: string
  name: string
  cccd: string | null
  birthDate: string | null
  partyBranch: string
  branchId?: string | null
  group: string | null
  status: string
}

export type AccountAuditEntry = {
  at: string
  actor: string
  action: string
  change: string
  result: 'Thành công' | 'Từ chối'
}

export type AccountAssignment = {
  role: string
  scope: string
  expiresAt: string | null
  active: boolean
}

export type AccountRecord = {
  id: string
  login: string
  email: string
  status: AccountStatus
  createdAt: string
  updatedAt: string
  lastLogin: string | null
  lockedUntil: string | null
  passwordResetRequired: boolean
  profile: MemberProfile | null
  assignments: AccountAssignment[]
  sessions: { device: string; location: string; lastSeen: string; current: boolean }[]
  audit: AccountAuditEntry[]
  deletable: boolean
}
