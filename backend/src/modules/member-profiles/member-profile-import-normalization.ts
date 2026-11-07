const normalizeLabel = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi-VN')

const memberStatusLabels: Record<string, string> = {
  'du bi': 'DU_BI',
  'chinh thuc': 'CHINH_THUC',
  'da ra khoi dang': 'DA_RA_KHOI_DANG',
  'tu tran': 'TU_TRAN',
}

export function normalizeMemberStatus(value: string) {
  const normalized = normalizeLabel(value)
  if (['DU_BI', 'CHINH_THUC', 'DA_RA_KHOI_DANG', 'TU_TRAN'].includes(value.trim().toLocaleUpperCase('vi-VN'))) return value.trim().toLocaleUpperCase('vi-VN')
  return memberStatusLabels[normalized]
}

/** Convert spreadsheet dates to date-only ISO values without local/UTC timezone shifts. */
export function normalizeExcelDate(value: string | Date | number, excelSerial = false): string | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
  }
  if (typeof value === 'number') {
    if (!excelSerial || !Number.isFinite(value)) return undefined
    const wholeDays = Math.floor(value)
    const date = new Date(Date.UTC(1899, 11, 30 + wholeDays))
    return Number.isNaN(date.getTime()) ? undefined : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  }
  const input = value.trim()
  const vietnamese = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  let parts: [number, number, number] | undefined
  if (vietnamese) parts = [Number(vietnamese[3]), Number(vietnamese[2]), Number(vietnamese[1])]
  else if (iso) parts = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  if (!parts) return undefined
  const [year, month, day] = parts
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function importValidationMessage(field: string, constraints: Record<string, string>) {
  if (field === 'trangThaiDangVien') return 'Trạng thái Đảng viên không hợp lệ. Vui lòng chọn giá trị trong danh mục.'
  if (['ngaySinh', 'ngayVaoDang', 'ngayChinhThuc', 'ngayQuyetDinhKetNap', 'ngayCapCccd', 'ngaySinhHoatTu'].includes(field)) {
    const labels: Record<string, string> = { ngaySinh: 'Ngày sinh', ngayVaoDang: 'Ngày vào Đảng', ngayChinhThuc: 'Ngày chính thức', ngayQuyetDinhKetNap: 'Ngày quyết định kết nạp', ngayCapCccd: 'Ngày cấp CCCD', ngaySinhHoatTu: 'Ngày bắt đầu sinh hoạt' }
    return `${labels[field]} không hợp lệ. Vui lòng nhập theo định dạng ngày/tháng/năm.`
  }
  if (field === 'maChiBo') return 'Không tìm thấy Chi bộ tương ứng với mã đã nhập.'
  if (field === 'maTo') return 'Không tìm thấy Tổ tương ứng với mã đã nhập hoặc Tổ không thuộc Chi bộ đã chọn.'
  if (field === 'gioiTinh') return 'Giới tính không hợp lệ. Vui lòng chọn giá trị trong danh mục.'
  if (field === 'soCccd') return 'CCCD phải gồm đúng 12 chữ số.'
  if (field === 'taiKhoanMoi') return 'Thông tin tài khoản đăng nhập không hợp lệ.'
  const friendly: Record<string, string> = { maHoSoNoiBo: 'Mã hồ sơ nội bộ', hoVaTen: 'Họ và tên', khoaDangVien: 'Khóa Đảng viên', emailLienHe: 'Email liên hệ' }
  if (constraints.isDateString || constraints.isDate) return `${friendly[field] ?? field} không hợp lệ.`
  if (constraints.isIn || constraints.isEnum) return `${friendly[field] ?? field} không hợp lệ. Vui lòng chọn giá trị trong danh mục.`
  if (constraints.isEmail) return `${friendly[field] ?? field} không đúng định dạng email.`
  if (constraints.isString || constraints.minLength || constraints.maxLength) return `${friendly[field] ?? field} không hợp lệ.`
  return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra giá trị trong cột này.'
}
