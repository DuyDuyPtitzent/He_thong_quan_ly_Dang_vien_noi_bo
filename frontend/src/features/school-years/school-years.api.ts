import { apiClient } from '@/core/api/client'

export type NamHoc = { ma: string; maNamHoc: string; tenNamHoc: string; ngayBatDau: string; ngayKetThuc: string; trangThai: 'DANG_HOAT_DONG' | 'NGUNG_HOAT_DONG'; trangThaiThoiGian?: string; ngayTao?: string; ngayCapNhat?: string }
export type DanhSachNamHoc = { duLieu: NamHoc[]; phanTrang: { trang: number; gioiHan: number; tongSo: number }; thongKe: { tongSo: number; dangDienRa: number; sapDienRa: number; daKetThuc: number } }
export type NamHocInput = Pick<NamHoc, 'maNamHoc' | 'tenNamHoc' | 'ngayBatDau' | 'ngayKetThuc' | 'trangThai'>

export const schoolYearsApi = {
  list: async (params: Record<string, unknown>) => (await apiClient.get<DanhSachNamHoc>('/nam-hoc', { params })).data,
  detail: async (id: string) => (await apiClient.get<NamHoc>(`/nam-hoc/${id}`)).data,
  create: async (body: NamHocInput) => (await apiClient.post<NamHoc>('/nam-hoc', body)).data,
  update: async (id: string, body: Partial<NamHocInput>) => (await apiClient.patch<NamHoc>(`/nam-hoc/${id}`, body)).data,
  remove: async (id: string) => (await apiClient.delete(`/nam-hoc/${id}`)).data,
}
