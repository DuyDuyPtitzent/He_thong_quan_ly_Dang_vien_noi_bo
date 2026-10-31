import type { Request } from 'express'

export type TaiKhoanDaXacThuc = {
  maTaiKhoan: string
  tenDangNhap: string
  doiMatKhauLanDau: boolean
  maPhien: string
}

export type YeuCauDaXacThuc = Request & {
  taiKhoanDaXacThuc: TaiKhoanDaXacThuc
}
