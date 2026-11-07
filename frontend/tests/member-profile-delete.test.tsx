import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberProfileDeleteDialog } from '@/features/member-profiles/components/MemberProfileDeleteDialog'
import type { HoSoRow } from '@/features/member-profiles/types/member-profiles.types'

const mocks = vi.hoisted(() => ({ deleteProfile: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/features/member-profiles/api/member-profiles.api', () => ({ memberProfilesApi: { deleteProfile: mocks.deleteProfile } }))
vi.mock('@/core/api/client', () => ({ normalizeApiError: () => ({ message: 'Hồ sơ có lịch sử cần được bảo lưu.' }) }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

const profile: HoSoRow = {
  stt: 1, maHoSo: 'profile-1', maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn Văn An', trangThai: 'DANG_HOAT_DONG',
  trangThaiDangVien: 'DU_BI', ngayVaoDang: null, ngaySinh: null, soCccd: null, coQuyenXemCaNhan: false,
  daLienKetTaiKhoan: true, chiBo: 'Chi bộ A', to: null,
}

function renderDialog(onDeleted = vi.fn(), onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
  render(<QueryClientProvider client={queryClient}><MemberProfileDeleteDialog profile={profile} onDeleted={onDeleted} onOpenChange={onOpenChange} /></QueryClientProvider>)
  return { onDeleted, onOpenChange, invalidateQueries }
}

describe('MemberProfileDeleteDialog', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('requires confirmation, identifies the profile and only closes after backend success', async () => {
    const callbacks = renderDialog()
    mocks.deleteProfile.mockResolvedValue({ daXoa: true, maHoSo: 'profile-1', taiKhoanLienKetDaKhoa: true })

    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByText('HS-001')).toBeInTheDocument()
    expect(screen.getByText('Chi bộ A')).toBeInTheDocument()
    expect(screen.getByText(/tạm khóa; mọi phân công vai trò/)).toBeInTheDocument()
    expect(mocks.deleteProfile).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('profile-1', expect.any(Object)))
    expect(callbacks.onDeleted).toHaveBeenCalledWith('profile-1')
    expect(callbacks.onOpenChange).toHaveBeenCalledWith(false)
    expect(callbacks.invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['member-profiles'] }))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Đã xóa hồ sơ Đảng viên. Nhật ký kiểm toán được giữ lại.')
  })

  it('keeps the confirmation open and displays the server failure through the error callback', async () => {
    const callbacks = renderDialog()
    mocks.deleteProfile.mockRejectedValue(new Error('blocked'))

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('profile-1', expect.any(Object)))
    expect(mocks.toastError).toHaveBeenCalledWith('Hồ sơ có lịch sử cần được bảo lưu.')
    expect(callbacks.onDeleted).not.toHaveBeenCalled()
    expect(callbacks.onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
