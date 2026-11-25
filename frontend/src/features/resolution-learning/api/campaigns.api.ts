import { apiClient } from '@/core/api/client'
import axios from 'axios'
import type { Attachment, Campaign, CampaignInput, PageResult, SchoolYear, SessionSummary, UnitNode } from '../types/campaign'

export const campaignsApi = {
  async list(params: Record<string, unknown>) { return (await apiClient.get<PageResult<Campaign>>('/dot', { params })).data },
  async detail(id: string) { return (await apiClient.get<Campaign>(`/dot/${id}`)).data },
  async create(input: CampaignInput) { return (await apiClient.post<Campaign>('/dot', input)).data },
  async update(id: string, input: CampaignInput) { return (await apiClient.patch<Campaign>(`/dot/${id}`, input)).data },
  async end(id: string) { return (await apiClient.post<Campaign>(`/dot/${id}/ket-thuc`)).data },
  async cancel(id: string) { return (await apiClient.post<Campaign>(`/dot/${id}/huy`)).data },
  async sessions(id: string, params: { trang?: number; gioiHan?: number; trangThai?: string } = {}) { return (await apiClient.get<PageResult<SessionSummary>>(`/dot/${id}/buoi`, { params: { trang: 1, gioiHan: 10, sapXep: 'batDauLuc', thuTu: 'asc', ...params } })).data },
  async statistics(id: string) { return (await apiClient.get<CampaignStatistics>(`/thong-ke/dot/${id}`)).data },
  async sessionTypeCatalog() { return (await apiClient.get<BusinessCatalog>('/cau-hinh/danh-muc/HINH_THUC_BUOI_HOC_NGHI_QUYET')).data },
  async years() { return (await apiClient.get<PageResult<SchoolYear>>('/nam-hoc', { params: { trang: 1, gioiHan: 100 } })).data },
  async units() { return (await apiClient.get<UnitNode[]>('/to-chuc/cay')).data },
  async upload(id: string, file: File) { const data = new FormData(); data.append('tep', file); return (await apiClient.post<Attachment>(`/dot/${id}/tep`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data },
  async download(id: string) {
    try { return (await apiClient.get<Blob>(`/tep/${id}`, { responseType: 'blob' })).data }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try { const body = JSON.parse(await error.response.data.text()) as { thongBao?: string }; if (body.thongBao) throw new Error(body.thongBao) } catch (parseError) { if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError }
      }
      throw error
    }
  },
  async removeAttachment(id: string) { return (await apiClient.delete(`/tep/${id}`)).data },
}

export type CampaignStatistics = { tongSoBuoi: number; soDangVienDuyNhat: number; tongLuot: number; coMat: number; vangCoPhep: number; vangKhongPhep: number; chuaDiemDanh: number; tyLeThamGia: number | null; trangThaiDuLieu: string }
export type BusinessCatalog = { giaTri: Array<{ maGiaTri: string; tenHienThi: string; trangThai: string }> }
