import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MyMemberProfileUpdatePage } from '@/features/my-profile/pages/MyMemberProfileUpdatePage'

const mocks = vi.hoisted(() => ({ permissions: ['HO_SO_CA_NHAN_TU_CAP_NHAT', 'HO_SO_CA_NHAN_XEM'] as string[], profile: vi.fn(), updateWindow: vi.fn(), updateRequests: vi.fn(), submitUpdateRequest: vi.fn(), cancelUpdateRequest: vi.fn() }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: mocks.permissions } }) }))
vi.mock('@/features/my-profile/api/my-profile.api', () => ({ myProfileApi: { profile: mocks.profile, updateWindow: mocks.updateWindow, updateRequests: mocks.updateRequests, submitUpdateRequest: mocks.submitUpdateRequest, cancelUpdateRequest: mocks.cancelUpdateRequest } }))
vi.mock('@/shared/components/MyProfileAvatar', () => ({ MyProfileAvatar: () => <div aria-label="Ảnh đại diện" /> }))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<MemoryRouter><QueryClientProvider client={queryClient}><MyMemberProfileUpdatePage /></QueryClientProvider></MemoryRouter>)
}

describe('MyMemberProfileUpdatePage date fields', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('saves a selected date-only value from the shared picker', async () => {
    mocks.profile.mockResolvedValue({ hoSo: {
      ma: 'profile-a', maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: null, ngayChinhThuc: null, soPhieuLyLich: null, soTheDangVien: null, khoaDangVien: null,
      thongTinCaNhan: { ngaySinh: '1990-01-15' }, diaChi: [], thongTinSinhVien: null, quaTrinh: [], lichSuDonVi: [],
    } })
    mocks.updateWindow.mockResolvedValue({ hoSoLienKet: true, dotCapNhat: {
      ma: 'window-a', ten: 'Rà soát hồ sơ', maDonVi: 'unit-a', tenDonVi: 'Chi bộ A', ngayBatDau: '2026-11-04T00:00:00Z', ngayKetThuc: '2026-11-10T00:00:00Z',
      cacTruongDuocPhep: ['thongTinCaNhan.ngaySinh'], trangThai: 'DANG_MO',
    } })
    mocks.updateRequests.mockResolvedValue([])
    mocks.submitUpdateRequest.mockResolvedValue(undefined)
    renderPage()

    expect(await screen.findByText('Đang mở')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ngày sinh' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '02/03/1991' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu cập nhật' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi yêu cầu' }))

    await waitFor(() => expect(mocks.submitUpdateRequest).toHaveBeenCalledWith({ 'thongTinCaNhan.ngaySinh': '1991-03-02' }, undefined))
  })
})
