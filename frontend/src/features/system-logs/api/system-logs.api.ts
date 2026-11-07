import { apiClient } from '@/core/api/client'
import type { LogFilters, LogPage, LogStats, LogType, LogUnit, RemovalPreview, RemovalPreviewInput, SystemLog } from '../types/system-logs'

export const systemLogsApi = {
  async list(type: LogType, filters: LogFilters) { const { data } = await apiClient.get<LogPage>(`/nhat-ky-he-thong/${type}`, { params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')) }); return data },
  async stats(type: LogType, maDonVi: string) { const { data } = await apiClient.get<LogStats>(`/nhat-ky-he-thong/${type}/thong-ke`, { params: maDonVi ? { maDonVi } : undefined }); return data },
  async actions(type: LogType, maDonVi: string) { const { data } = await apiClient.get<{ ma: string; ten: string }[]>(`/nhat-ky-he-thong/${type}/hanh-dong`, { params: maDonVi ? { maDonVi } : undefined }); return data },
  async units(type: LogType) { const { data } = await apiClient.get<LogUnit[]>(`/nhat-ky-he-thong/${type}/don-vi`); return data },
  async previewRemoval(type: LogType, input: RemovalPreviewInput) { const { data } = await apiClient.post<RemovalPreview>(`/nhat-ky-he-thong/${type}/xoa/xem-truoc`, input); return data },
  async detail(type: LogType, id: string) { const { data } = await apiClient.get<SystemLog & { duLieuThayDoi: null }>(`/nhat-ky-he-thong/${type}/ban-ghi/${id}`); return data },
}
