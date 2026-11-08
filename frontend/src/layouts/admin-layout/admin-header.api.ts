import { apiClient } from '@/core/api/client'

export const adminHeaderApi = {
  avatar: async () => (await apiClient.get<Blob>('/ho-so-dang-vien/cua-toi/anh-dai-dien', { responseType: 'blob' })).data,
}
