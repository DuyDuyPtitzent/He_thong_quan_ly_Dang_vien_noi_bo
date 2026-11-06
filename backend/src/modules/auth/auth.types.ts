import type { Request } from 'express'

export type TaiKhoanDaXacThuc = {
  maTaiKhoan: string
  tenDangNhap: string
  doiMatKhauLanDau: boolean
  maPhien: string
  maPhanCongVaiTroDangHoatDong?: string | null
  phanCongHopLe?: {
    maPhanCong: string
    maVaiTro: string
    tenVaiTro: string
    loaiPhamVi: string
    maDonViGoc: string | null
    tenDonViGoc: string | null
    donViChiDinh: (string | null)[]
  }[]
  quyenDangHoatDong?: string[]
}

export type YeuCauDaXacThuc = Request & {
  taiKhoanDaXacThuc: TaiKhoanDaXacThuc
}
