import type { TaiKhoan } from '@/features/accounts/types/accounts.models'
import type { AssignmentItem } from '../types/authorization.types'

export type AssignmentHistory = { maDoiTuong: string | null; hanhDong: string; ketQua: string; lyDo: string | null; duLieuTruoc: unknown; duLieuSau: unknown; thoiDiem: string; tenNguoiThucHien: string }

export const vnDateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }) : 'Không thời hạn'
export const localVnInput = (value?: string | null) => {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
export const vnInputToIso = (value: string) => new Date(`${value}:00+07:00`).toISOString()
export const roleState = (account: TaiKhoan) => account.soPhanCongHieuLuc > 0
export const accountStatusLabel = (status: string) => ({ DANG_HOAT_DONG: 'Đang hoạt động', TAM_KHOA: 'Tạm khóa', NGUNG_HOAT_DONG: 'Ngừng hoạt động' })[status as 'DANG_HOAT_DONG' | 'TAM_KHOA' | 'NGUNG_HOAT_DONG'] ?? status
export const assignmentState = (item: AssignmentItem) => {
  if (item.thuHoiLuc) return 'Đã thu hồi'
  const now = Date.now()
  if (new Date(item.ngayHieuLucTu).getTime() > now) return 'Chưa đến hạn'
  if (item.ngayHieuLucDen && new Date(item.ngayHieuLucDen).getTime() <= now) return 'Hết hạn'
  if (item.trangThaiVaiTro && item.trangThaiVaiTro !== 'DANG_HOAT_DONG') return 'Role đã ngừng'
  return 'Đang có hiệu lực'
}
export const isAssignmentActive = (item: AssignmentItem) => assignmentState(item) === 'Đang có hiệu lực'
export const scopeText = (item: AssignmentItem, unitNames: Map<string, string>) => {
  if (item.loaiPhamVi === 'TOAN_HE_THONG') return 'Toàn hệ thống'
  if (item.loaiPhamVi === 'CA_NHAN') return 'Phạm vi cá nhân'
  if (item.loaiPhamVi === 'CAY_DON_VI') return `${item.tenDonViGoc ?? unitNames.get(item.maDonViGoc ?? '') ?? item.maDonViGoc ?? 'Đơn vị'} và các đơn vị trực thuộc`
  return item.danhSachMaDonVi.map((id) => item.donViChiDinh?.find((unit) => unit.maDonVi === id)?.tenDonVi ?? unitNames.get(id) ?? id).join(', ')
}
export const scopeLabel = (value: unknown) => ({ CAY_DON_VI: 'Cây đơn vị', DON_VI_CHI_DINH: 'Đơn vị được chỉ định', CA_NHAN: 'Cá nhân', TOAN_HE_THONG: 'Toàn hệ thống' }[String(value) as 'CAY_DON_VI' | 'DON_VI_CHI_DINH' | 'CA_NHAN' | 'TOAN_HE_THONG'] ?? 'Phạm vi phân quyền')
export const historyActionLabel = (value: string) => ({ PHAN_CONG_VAI_TRO_TAO: 'Gán vai trò', PHAN_CONG_VAI_TRO_SUA: 'Cập nhật phân quyền', PHAN_CONG_VAI_TRO_THU_HOI: 'Thu hồi vai trò' }[value] ?? 'Thay đổi phân quyền')
export const historyResultLabel = (value: string) => value === 'THANH_CONG' ? 'Thành công' : value === 'THAT_BAI' ? 'Thất bại' : 'Đã ghi nhận'

export function historySnapshot(value: unknown, assignment: AssignmentItem | undefined, unitNames: Map<string, string>) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  if (!data) return ''
  const rows: string[] = []
  if (data.loaiPhamVi) rows.push(`Phạm vi: ${scopeLabel(data.loaiPhamVi)}`)
  const rootId = typeof data.maDonViGoc === 'string' ? data.maDonViGoc : null
  if (rootId) rows.push(`Đơn vị áp dụng: ${assignment?.tenDonViGoc ?? unitNames.get(rootId) ?? 'Đơn vị được chọn'}`)
  if (Array.isArray(data.danhSachMaDonVi) && data.danhSachMaDonVi.length) {
    const names = data.danhSachMaDonVi.map((id) => typeof id === 'string' ? assignment?.donViChiDinh?.find((unit) => unit.maDonVi === id)?.tenDonVi ?? unitNames.get(id) : null).filter((name): name is string => Boolean(name))
    rows.push(`Đơn vị được chỉ định: ${names.length ? names.join(', ') : `${data.danhSachMaDonVi.length} đơn vị`}`)
  }
  if (typeof data.ngayHieuLucTu === 'string') rows.push(`Bắt đầu hiệu lực: ${vnDateTime(data.ngayHieuLucTu)}`)
  if ('ngayHieuLucDen' in data) rows.push(`Kết thúc hiệu lực: ${vnDateTime(typeof data.ngayHieuLucDen === 'string' ? data.ngayHieuLucDen : null)}`)
  return rows.join(' · ')
}

export function branchFromAssignments(items: AssignmentItem[]) {
  const branches = new Set<string>()
  for (const item of items) {
    if (item.loaiPhamVi === 'CAY_DON_VI' && item.loaiDonViGoc === 'CHI_BO' && item.tenDonViGoc) branches.add(item.tenDonViGoc)
    if (item.loaiPhamVi === 'DON_VI_CHI_DINH') {
      for (const unit of item.donViChiDinh ?? []) if (unit.loaiDonVi === 'CHI_BO' && unit.tenDonVi) branches.add(unit.tenDonVi)
    }
  }
  return [...branches].join(', ')
}
