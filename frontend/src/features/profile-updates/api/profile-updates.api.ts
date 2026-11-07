import { apiClient } from '@/core/api/client'
import { sanitizeRichTextHtml } from '@/shared/lib/rich-text'

import type { DanhSachYeuCauCapNhat, DonViMoDot, DotCapNhatHoSo, ThongKeDotCapNhat, YeuCauCapNhatHoSo } from '../types/profile-updates.types'

export const profileUpdatesApi = {
  updateUnits: async () => (await apiClient.get<{ donVi: DonViMoDot[]; coTheMoToanPhamVi: boolean }>('/ho-so-dang-vien/dot-cap-nhat/don-vi')).data,
  updateWindows: async () => (await apiClient.get<DotCapNhatHoSo[]>('/ho-so-dang-vien/dot-cap-nhat')).data,
  createUpdateWindow: async (body: { ten: string; moTa?: string | null; maDonVi?: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[] }) => (await apiClient.post('/ho-so-dang-vien/dot-cap-nhat', body)).data,
  createAndActivateUpdateWindow: async (body: { ten: string; moTa?: string | null; maDonVi?: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[] }) => (await apiClient.post('/ho-so-dang-vien/dot-cap-nhat/tao-va-kich-hoat', body)).data,
  updateUpdateWindow: async (id: string, body: Partial<{ ten: string; moTa: string | null; maDonVi: string | null; ngayBatDau: string; ngayKetThuc: string; cacTruongDuocPhep: string[] }>) => (await apiClient.patch(`/ho-so-dang-vien/dot-cap-nhat/${id}`, body)).data,
  activateUpdateWindow: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/dot-cap-nhat/${id}/kich-hoat`)).data,
  finishUpdateWindow: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/dot-cap-nhat/${id}/ket-thuc`)).data,
  deleteUpdateWindow: async (id: string) => (await apiClient.delete(`/ho-so-dang-vien/dot-cap-nhat/${id}`)).data,
  updateWindowStats: async (id: string) => (await apiClient.get<ThongKeDotCapNhat>(`/ho-so-dang-vien/dot-cap-nhat/${id}/thong-ke`)).data,
  reviewRequests: async (params: { maDotCapNhat?: string; maDonViDuyet?: string; trangThai?: YeuCauCapNhatHoSo['trangThai']; tuKhoa?: string; tuNgay?: string; denNgay?: string; trang?: number; gioiHan?: number }) => (await apiClient.get<DanhSachYeuCauCapNhat>('/ho-so-dang-vien/yeu-cau-cap-nhat', { params })).data,
  approveUpdateRequest: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/yeu-cau-cap-nhat/${id}/duyet`)).data,
  rejectUpdateRequest: async (id: string, lyDo: string) => (await apiClient.post(`/ho-so-dang-vien/yeu-cau-cap-nhat/${id}/tu-choi`, { lyDo: sanitizeRichTextHtml(lyDo) })).data,
}
