const enumLabels: Record<string, string> = {
  DU_BI: 'Đảng viên dự bị',
  CHINH_THUC: 'Đảng viên chính thức',
  DA_RA_KHOI_DANG: 'Đã ra khỏi Đảng',
  TU_TRAN: 'Đã từ trần',
  DANG_HOAT_DONG: 'Đang hoạt động',
  TAM_NGUNG: 'Tạm ngừng',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
  NAM: 'Nam',
  NU: 'Nữ',
  KHAC: 'Khác',
  TRONG_NUOC: 'Trong nước',
  NUOC_NGOAI: 'Nước ngoài',
  CHUA_HOC: 'Chưa học',
  DANG_HOC: 'Đang học',
  DA_HOAN_THANH: 'Đã hoàn thành',
}

export function formatMemberProfileEnum(value?: string | null) {
  if (!value) return 'Chưa cập nhật'
  return enumLabels[value] ?? value.replaceAll('_', ' ').toLocaleLowerCase('vi')
}

export function formatMemberProfileDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa cập nhật'
}
