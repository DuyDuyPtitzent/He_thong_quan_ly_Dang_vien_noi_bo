import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { memberProfilesApi } from '../api/member-profiles.api'

export function useDeleteMemberProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: memberProfilesApi.deleteProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['member-profiles'] })
      await queryClient.invalidateQueries({ queryKey: ['member-profile-detail'] })
      toast.success('Đã xóa hồ sơ Đảng viên. Nhật ký kiểm toán được giữ lại.')
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message || 'Không thể xóa hồ sơ Đảng viên.')
    },
  })
}
