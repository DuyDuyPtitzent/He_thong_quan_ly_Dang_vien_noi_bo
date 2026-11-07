import { apiClient } from '@/core/api/client'
import type { HoSoChiTiet } from '@/features/member-profiles/types/member-profiles.types'
import type { DotCapNhatHoSo, YeuCauCapNhatHoSo } from '@/features/profile-updates/types/profile-updates.types'

export const myProfileApi = {
  profile: async () => (await apiClient.get<{ hoSo: HoSoChiTiet | null }>('/ho-so-dang-vien/cua-toi')).data,
  updateWindow: async () => (await apiClient.get<{ hoSoLienKet: boolean; dotCapNhat: DotCapNhatHoSo | null }>('/ho-so-dang-vien/cua-toi/dot-cap-nhat')).data,
  updateRequests: async () => (await apiClient.get<YeuCauCapNhatHoSo[]>('/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat')).data,
  submitUpdateRequest: async (changes: Record<string, unknown>, image?: File) => {
    if (!image) return (await apiClient.post('/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat', { thayDoi: changes })).data
    const body = new FormData()
    body.append('thayDoi', JSON.stringify(changes))
    body.append('anhDaiDien', image)
    return (await apiClient.post('/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat', body, { headers: { 'Content-Type': undefined } })).data
  },
  cancelUpdateRequest: async (id: string) => (await apiClient.post(`/ho-so-dang-vien/cua-toi/yeu-cau-cap-nhat/${id}/huy`)).data,
  avatar: async () => (await apiClient.get<Blob>('/ho-so-dang-vien/cua-toi/anh-dai-dien', { responseType: 'blob' })).data,
}
