export type PermissionItem = {
  ma: string
  maDinhDanh: string
  ten: string
  moTa: string
  maNhom: string
  tenNhom: string
  tinhTrangApi: 'DA_CO_API' | 'CHUA_CO_API'
}

export type RolePermission = {
  maQuyen: string
  quyen: { ma: string; maDinhDanh: string; ten: string }
}

export type RoleItem = {
  ma: string
  maDinhDanh: string
  ten: string
  moTa: string | null
  trangThai: string
  laVaiTroHeThong: boolean
  quyen: RolePermission[]
  _count: { phanCong: number }
}

export type AccountOption = {
  maTaiKhoan: string
  tenDangNhap: string
  hoVaTen: string | null
  maHoSoNoiBo: string | null
  chiBoHienTai?: string | null
}

export type OrganizationNode = {
  maDonVi: string
  maDinhDanh: string | null
  loaiDonVi: 'DANG_UY' | 'CHI_BO' | 'TO'
  tenDonVi: string | null
  trangThai: string
  donViCon: OrganizationNode[]
}

export type AssignmentItem = {
  maPhanCong: string
  maVaiTro: string
  tenVaiTro: string
  loaiPhamVi: 'CAY_DON_VI' | 'DON_VI_CHI_DINH' | 'CA_NHAN' | 'TOAN_HE_THONG'
  danhSachMaQuyen: string[]
  maDonViGoc: string | null
  danhSachMaDonVi: string[]
  tenDonViGoc?: string | null
  loaiDonViGoc?: string | null
  donViChiDinh?: { maDonVi: string; tenDonVi: string | null; loaiDonVi: string }[]
  ngayHieuLucTu: string
  ngayHieuLucDen: string | null
  thuHoiLuc: string | null
  lyDo: string | null
  trangThaiVaiTro?: string
  laVaiTroHeThong?: boolean
  ngayTao?: string
  maNguoiCap?: string | null
  tenNguoiCap?: string | null
  maNguoiThuHoi?: string | null
  tenNguoiThuHoi?: string | null
}

export type AssignmentInput = {
  maTaiKhoan: string
  maVaiTro: string
  loaiPhamVi: 'CAY_DON_VI' | 'DON_VI_CHI_DINH'
  maDonViGoc?: string
  danhSachMaDonVi?: string[]
  ngayHieuLucTu?: string
  ngayHieuLucDen?: string
  lyDo: string
}

export type AssignmentUpdateInput = Omit<AssignmentInput, 'maTaiKhoan' | 'maVaiTro' | 'ngayHieuLucTu' | 'ngayHieuLucDen'> & { ngayHieuLucDen?: string | null }
