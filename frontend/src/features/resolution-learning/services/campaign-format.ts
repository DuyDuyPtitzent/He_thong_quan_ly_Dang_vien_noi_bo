import type { CampaignStatus, UnitNode } from '../types/campaign'

export type FlatUnit = { id: string; name: string; level: number; active: boolean }
export function flattenUnits(nodes: UnitNode[], level = 0): FlatUnit[] {
  return nodes.flatMap((node) => [{ id: node.maDonVi, name: node.tenDonVi ?? 'Đơn vị chưa có tên', level, active: node.trangThai === 'DANG_HOAT_DONG' }, ...flattenUnits(node.donViCon ?? [], level + 1)])
}

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  NHAP: 'Bản nháp', SAP_DIEN_RA: 'Sắp diễn ra', DANG_DIEN_RA: 'Đang diễn ra', DA_KET_THUC: 'Đã kết thúc', DA_HUY: 'Đã hủy',
}
export function formatDate(value?: string | null) { return value ? new Date(value).toLocaleDateString('vi-VN') : '—' }
export function formatDateTime(value?: string | null) { return value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—' }
/** Keep calendar dates in the browser's local timezone while satisfying the API's zoned ISO-8601 contract. */
export function toLocalDateTimeIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ngày phải theo định dạng yyyy-MM-dd.')
  const local = new Date(`${value}T00:00:00`)
  if (!Number.isFinite(local.getTime()) || local.getFullYear() !== Number(value.slice(0, 4)) || local.getMonth() + 1 !== Number(value.slice(5, 7)) || local.getDate() !== Number(value.slice(8, 10))) throw new Error('Ngày không hợp lệ.')
  const offset = -local.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${value}T00:00:00${sign}${hours}:${minutes}`
}
export function toLocalDateInput(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB` }
export function safeErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}
