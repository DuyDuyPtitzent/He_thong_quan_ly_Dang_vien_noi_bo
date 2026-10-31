export type TaiKhoanPhien = {
  maTaiKhoan: string
  tenDangNhap: string
  doiMatKhauLanDau: boolean
}

export type PhienHienTai = {
  taiKhoan: TaiKhoanPhien
}

export type KetQuaDangNhap = {
  taiKhoan: TaiKhoanPhien
  hetHanLuc: string
  maTuongQuan: string
}
