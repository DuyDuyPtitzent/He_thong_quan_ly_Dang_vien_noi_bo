import type { HoSoInput } from '../types/member-profiles.types'

export type LoiTruong = Record<string, string>

export function kiemTraSuaHoSo(form: HoSoInput, coThongTinSinhVien: boolean): LoiTruong {
  const errors: LoiTruong = {}
  if (!form.maHoSoNoiBo.trim()) errors.maHoSoNoiBo = 'Vui lòng nhập mã hồ sơ nội bộ.'
  else if (form.maHoSoNoiBo.trim().length > 50) errors.maHoSoNoiBo = 'Mã hồ sơ tối đa 50 ký tự.'
  if (form.soPhieuLyLich && form.soPhieuLyLich.trim().length > 50) errors.soPhieuLyLich = 'Số phiếu lý lịch tối đa 50 ký tự.'
  if (form.soTheDangVien && form.soTheDangVien.trim().length > 50) errors.soTheDangVien = 'Số thẻ Đảng viên tối đa 50 ký tự.'
  if (form.khoaDangVien && form.khoaDangVien.trim().length > 50) errors.khoaDangVien = 'Khóa Đảng viên tối đa 50 ký tự.'
  if (!form.hoVaTen.trim()) errors.hoVaTen = 'Vui lòng nhập họ và tên.'
  else if (form.hoVaTen.trim().length > 200) errors.hoVaTen = 'Họ và tên tối đa 200 ký tự.'
  if (form.ngayVaoDang && Number.isNaN(Date.parse(form.ngayVaoDang))) errors.ngayVaoDang = 'Vui lòng chọn ngày vào Đảng hợp lệ.'
  if (form.ngayChinhThuc && Number.isNaN(Date.parse(form.ngayChinhThuc))) errors.ngayChinhThuc = 'Vui lòng chọn ngày chính thức hợp lệ.'
  if (form.ngayQuyetDinhKetNap && Number.isNaN(Date.parse(form.ngayQuyetDinhKetNap))) errors.ngayQuyetDinhKetNap = 'Vui lòng chọn ngày quyết định hợp lệ.'
  if (form.emailLienHe && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailLienHe)) errors.emailLienHe = 'Vui lòng nhập địa chỉ thư điện tử hợp lệ.'
  if (form.soCccd && !/^\d{12}$/.test(form.soCccd.trim())) errors.soCccd = 'CCCD phải gồm đúng 12 chữ số.'
  if (coThongTinSinhVien) {
    const studentCode = form.thongTinSinhVien?.maSinhVien?.trim() ?? ''
    if (!studentCode) errors['thongTinSinhVien.maSinhVien'] = 'Vui lòng nhập mã sinh viên.'
    else if (studentCode.length > 50) errors['thongTinSinhVien.maSinhVien'] = 'Mã sinh viên tối đa 50 ký tự.'
  }
  return errors
}

export function kiemTraTaoHoSo(
  form: HoSoInput,
  tuyChon: { coThongTinSinhVien: boolean; taoTaiKhoan: boolean; maChiBoHopLe: boolean; maToHopLe: boolean },
): LoiTruong {
  const errors: LoiTruong = {}
  if (!form.maHoSoNoiBo.trim()) errors.maHoSoNoiBo = 'Vui lòng nhập mã hồ sơ nội bộ.'
  else if (form.maHoSoNoiBo.trim().length > 50) errors.maHoSoNoiBo = 'Mã hồ sơ tối đa 50 ký tự.'
  if (form.soPhieuLyLich && form.soPhieuLyLich.trim().length > 50) errors.soPhieuLyLich = 'Số phiếu lý lịch tối đa 50 ký tự.'
  if (form.soTheDangVien && form.soTheDangVien.trim().length > 50) errors.soTheDangVien = 'Số thẻ Đảng viên tối đa 50 ký tự.'
  if (form.khoaDangVien && form.khoaDangVien.trim().length > 50) errors.khoaDangVien = 'Khóa Đảng viên tối đa 50 ký tự.'
  if (!form.hoVaTen.trim()) errors.hoVaTen = 'Vui lòng nhập họ và tên.'
  else if (form.hoVaTen.trim().length > 200) errors.hoVaTen = 'Họ và tên tối đa 200 ký tự.'
  if (!form.trangThaiDangVien) errors.trangThaiDangVien = 'Vui lòng chọn trạng thái Đảng viên.'
  if (!tuyChon.maChiBoHopLe) errors.maChiBo = 'Vui lòng chọn Chi bộ đang hoạt động.'
  if (form.maTo && !tuyChon.maToHopLe) errors.maTo = 'Tổ phải thuộc Chi bộ đã chọn.'
  if (!form.ngaySinhHoatTu || Number.isNaN(Date.parse(form.ngaySinhHoatTu))) errors.ngaySinhHoatTu = 'Vui lòng chọn ngày bắt đầu sinh hoạt hợp lệ.'
  if (form.emailLienHe && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailLienHe)) errors.emailLienHe = 'Vui lòng nhập địa chỉ thư điện tử hợp lệ.'
  if (tuyChon.coThongTinSinhVien) {
    const studentCode = form.thongTinSinhVien?.maSinhVien?.trim() ?? ''
    if (!studentCode) errors['thongTinSinhVien.maSinhVien'] = 'Vui lòng nhập mã sinh viên.'
    else if (studentCode.length > 50) errors['thongTinSinhVien.maSinhVien'] = 'Mã sinh viên tối đa 50 ký tự.'
  }
  if (tuyChon.taoTaiKhoan) {
    if (!/^\d{12}$/.test(form.soCccd?.trim() ?? '')) errors.soCccd = 'Vui lòng nhập CCCD gồm đúng 12 chữ số để kiểm tra trùng hồ sơ/tài khoản.'
    const username = form.taiKhoanMoi?.tenDangNhap?.trim() ?? ''
    const password = form.taiKhoanMoi?.matKhau ?? ''
    if (username.length < 3 || username.length > 100) errors['taiKhoanMoi.tenDangNhap'] = 'Tên đăng nhập phải có từ 3 đến 100 ký tự.'
    if (password.length < 12 || password.length > 128) errors['taiKhoanMoi.matKhau'] = 'Mật khẩu khởi tạo phải có từ 12 đến 128 ký tự.'
    const loginEmail = form.taiKhoanMoi?.email?.trim()
    if (loginEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) errors['taiKhoanMoi.email'] = 'Vui lòng nhập địa chỉ thư điện tử hợp lệ.'
  }
  return errors
}
