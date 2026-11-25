export const ATTENDANCE_EXPORT_PERMISSION = 'HOC_TAP_NGHI_QUYET_BAO_CAO_XUAT'

export const ATTENDANCE_EXPORT_FIELDS = [
  { key: 'stt', label: 'STT', group: 'Danh sách', permission: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', kind: 'number' },
  { key: 'maHoSoNoiBo', label: 'Mã hồ sơ', group: 'Đảng viên', permission: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', kind: 'text' },
  { key: 'hoVaTen', label: 'Họ và tên', group: 'Đảng viên', permission: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', kind: 'text' },
  { key: 'chiBoSnapshot', label: 'Chi bộ snapshot', group: 'Đảng viên', permission: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', kind: 'text' },
  { key: 'toSnapshot', label: 'Tổ snapshot', group: 'Đảng viên', permission: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', kind: 'text' },
  { key: 'dotHoc', label: 'Đợt học', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_DOT_XEM', kind: 'text' },
  { key: 'namHoc', label: 'Năm học', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_DOT_XEM', kind: 'text' },
  { key: 'buoiHoc', label: 'Buổi học', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_BUOI_XEM', kind: 'text' },
  { key: 'hinhThuc', label: 'Hình thức học', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_BUOI_XEM', kind: 'text' },
  { key: 'thoiGianDuKien', label: 'Thời gian học dự kiến', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_BUOI_XEM', kind: 'text' },
  { key: 'diaDiem', label: 'Địa điểm', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_BUOI_XEM', kind: 'text' },
  { key: 'trangThaiBuoi', label: 'Trạng thái buổi', group: 'Buổi học', permission: 'HOC_TAP_NGHI_QUYET_BUOI_XEM', kind: 'text' },
  { key: 'trangThaiRoster', label: 'Trạng thái roster', group: 'Điểm danh', permission: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', kind: 'text' },
  { key: 'ketQuaDiemDanh', label: 'Kết quả điểm danh', group: 'Điểm danh', permission: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', kind: 'text' },
  { key: 'thoiDiemCoMat', label: 'Thời điểm có mặt', group: 'Điểm danh', permission: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', kind: 'text' },
  { key: 'soCccd', label: 'CCCD', group: 'Thông tin cá nhân', permission: 'HO_SO_CA_NHAN_XEM', kind: 'text' },
  { key: 'ngaySinh', label: 'Ngày sinh', group: 'Thông tin cá nhân', permission: 'HO_SO_CA_NHAN_XEM', kind: 'date' },
] as const

export type AttendanceExportField = typeof ATTENDANCE_EXPORT_FIELDS[number]
