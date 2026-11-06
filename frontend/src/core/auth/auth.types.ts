export type TaiKhoanXacThuc = {
  maTaiKhoan: string
  tenDangNhap: string
  doiMatKhauLanDau: boolean
}

export type TaiKhoanPhien = TaiKhoanXacThuc & {
  maPhanCongVaiTroDangHoatDong: string | null
  phanCongHopLe: PhanCongPhien[]
  quyenDangHoatDong: string[]
}

export type PhanCongPhien = {
  maPhanCong: string
  maVaiTro: string
  tenVaiTro: string
  loaiPhamVi: string
  maDonViGoc: string | null
  tenDonViGoc: string | null
  donViChiDinh: (string | null)[]
}

export type PhienHienTai = {
  taiKhoan: TaiKhoanXacThuc
  maPhanCongVaiTroDangHoatDong: string | null
  phanCongHopLe: PhanCongPhien[]
  quyenDangHoatDong: string[]
}

export type KetQuaDangNhap = {
  taiKhoan: TaiKhoanXacThuc
  hetHanLuc: string
  maTuongQuan: string
}
