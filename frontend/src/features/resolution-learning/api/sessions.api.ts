import { apiClient } from '@/core/api/client'
import type { Campaign, PageResult, SessionSummary } from '../types/campaign'

export type SessionDetail = SessionSummary & {
  maDot: string; noiDung?: string | null; phamVi: Array<{ maDonVi: string }>
  dotHoc: Campaign; cauHinhDiemDanh?: Record<string, unknown> | null
  tepDinhKem?: Array<{ ma: string; tenTepGoc: string; kichThuoc: number; kieuNoiDung: string; ngayTao: string }>
  danhSachDuKien?: { trangThai: string; phienBan: number; phienBanDaXacNhan: number }
}

export type RosterEntry = { ma: string; maHoSo: string; maHoSoNoiBo: string; hoVaTen: string; tenChiBoSnapshot?: string | null; tenToSnapshot?: string | null; trangThai: 'TRONG_DANH_SACH' | 'DA_LOAI' }
export type AttendanceEntry = { maHoSo: string; maHoSoNoiBo: string; hoVaTen: string; ketQua: string | null; phienBan: number }

export const sessionsApi = {
  campaigns: (params: Record<string, unknown>) => apiClient.get<PageResult<Campaign>>('/dot', { params }).then(r => r.data),
  sessions: (id: string, params: Record<string, unknown>) => apiClient.get<PageResult<SessionSummary>>(`/dot/${id}/buoi`, { params }).then(r => r.data),
  detail: (id: string) => apiClient.get<SessionDetail>(`/buoi/${id}`).then(r => r.data),
  create: (dotId: string, data: Record<string, unknown>) => apiClient.post(`/dot/${dotId}/buoi`, data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/buoi/${id}`, data).then(r => r.data),
  changeStatus: (id: string, trangThai: string) => apiClient.post(`/buoi/${id}/trang-thai`, { trangThai }).then(r => r.data),
  roster: (id: string, params: Record<string, unknown>) => apiClient.get<PageResult<RosterEntry>>(`/buoi/${id}/danh-sach`, { params }).then(r => r.data),
  initializeRoster: (id: string) => apiClient.post(`/buoi/${id}/danh-sach/khoi-tao`).then(r => r.data),
  removeFromRoster: (id: string, profileId: string) => apiClient.delete(`/buoi/${id}/danh-sach/${profileId}`).then(r => r.data),
  restoreRoster: (id: string, profileId: string) => apiClient.post(`/buoi/${id}/danh-sach/${profileId}/khoi-phuc`).then(r => r.data),
  confirmRoster: (id: string, version: number) => apiClient.post(`/buoi/${id}/danh-sach/xac-nhan-du-kien`, { phienBanDanhSach: version }).then(r => r.data),
  results: (id: string, params: Record<string, unknown>) => apiClient.get<PageResult<AttendanceEntry>>(`/buoi/${id}/ket-qua`, { params }).then(r => r.data),
  setResult: (id: string, profileId: string, data: Record<string, unknown>) => apiClient.put(`/buoi/${id}/ket-qua/${profileId}`, data).then(r => r.data),
  openWindow: (id: string) => apiClient.post(`/buoi/${id}/cua-so/mo`).then(r => r.data),
  closeWindow: (id: string) => apiClient.post(`/buoi/${id}/cua-so/dong`).then(r => r.data),
  window: (id: string) => apiClient.get(`/buoi/${id}/cua-so`).then(r => r.data),
  qr: (id: string) => apiClient.get(`/buoi/${id}/qr`, { headers: { 'Cache-Control': 'no-store' } }).then(r => r.data),
  finalizationCheck: (id: string) => apiClient.get(`/buoi/${id}/chot/kiem-tra`).then(r => r.data),
  finalize: (id: string, data: Record<string, unknown>) => apiClient.post(`/buoi/${id}/chot`, data).then(r => r.data),
  finalization: (id: string) => apiClient.get(`/buoi/${id}/chot`).then(r => r.data),
  exportConfig: () => apiClient.get('/xuat/cau-hinh').then(r => r.data),
  export: (data: Record<string, unknown>) => apiClient.post('/xuat', data, { responseType: 'blob' }).then(r => r.data as Blob),
}
