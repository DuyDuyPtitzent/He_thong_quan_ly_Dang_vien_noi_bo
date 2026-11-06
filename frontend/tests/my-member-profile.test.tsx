import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MyMemberProfilePage } from '@/features/accounts/MyMemberProfilePage'

const mocks = vi.hoisted(() => ({ permissions: ['SINH_HOAT_XEM_HIEN_TAI'] as string[], myProfile: vi.fn(), myUpdateWindow: vi.fn(), myUpdateRequests: vi.fn(), submitUpdateRequest: vi.fn(), myAvatar: vi.fn(), membershipHistory: vi.fn(), partyProcess: vi.fn(), positionAssignments: vi.fn() }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { maTaiKhoan: 'account-a', quyenDangHoatDong: mocks.permissions } }) }))
vi.mock('@/features/accounts/member-profiles.api', () => ({ memberProfilesApi: mocks }))
vi.mock('@/features/accounts/MemberProfileAvatar', () => ({ MemberProfileAvatar: () => <div aria-label="Ảnh đại diện"/> }))

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<MemoryRouter><QueryClientProvider client={queryClient}><MyMemberProfilePage/></QueryClientProvider></MemoryRouter>)
}

describe('MyMemberProfilePage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('shows the explicit unlinked-account state without asking the user to choose a profile', async () => {
    mocks.myProfile.mockResolvedValue({ hoSo: null })
    renderPage()
    expect(await screen.findByText('Tài khoản của bạn chưa được liên kết với hồ sơ Đảng viên. Vui lòng liên hệ người quản trị để được hỗ trợ.')).toBeInTheDocument()
  })

  it('shows profile data and approved completion fields as read-only', async () => {
    mocks.myProfile.mockResolvedValue({ hoSo: {
      ma: 'profile-a', maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: null, ngayChinhThuc: null, soPhieuLyLich: null, soTheDangVien: null, khoaDangVien: 'D25', thongTinCaNhan: null,
      diaChi: [], thongTinSinhVien: null, quaTrinh: [], lichSuDonVi: [],
    } })
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Nguyễn An' })).toBeInTheDocument()
    expect(screen.getByText('HS-A')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Thông tin cá nhân' }), { key: 'ArrowRight' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Thông tin sinh viên' }), { key: 'ArrowRight' })
    expect(await screen.findByText('D25')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Mức độ hoàn thiện hồ sơ 60%' })).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText('Bạn chưa được cấp quyền gửi đề nghị cập nhật hồ sơ.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Cập nhật hồ sơ' })).not.toBeInTheDocument()
    expect(screen.queryByText('Yêu cầu cập nhật hồ sơ')).not.toBeInTheDocument()
  })

  it('edits only fields opened by the current campaign, keeps the official value and submits a confirmed request', async () => {
    mocks.permissions = ['SINH_HOAT_XEM_HIEN_TAI', 'HO_SO_CA_NHAN_TU_CAP_NHAT', 'HO_SO_CA_NHAN_XEM']
    mocks.myProfile.mockResolvedValue({ hoSo: {
      ma: 'profile-a', maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: null, ngayChinhThuc: null, soPhieuLyLich: null, soTheDangVien: null,
      thongTinCaNhan: { soDienThoai: '0900000000', emailLienHe: 'an@example.vn' }, diaChi: [], thongTinSinhVien: null, quaTrinh: [], lichSuDonVi: [],
    } })
    mocks.myUpdateWindow.mockResolvedValue({ hoSoLienKet: true, dotCapNhat: { ma: 'window-a', ten: 'Rà soát hồ sơ', maDonVi: 'unit-a', tenDonVi: 'Chi bộ A', ngayBatDau: '2026-11-04T00:00:00Z', ngayKetThuc: '2026-11-10T00:00:00Z', cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'], trangThai: 'DANG_MO' } })
    mocks.myUpdateRequests.mockResolvedValue([])
    mocks.submitUpdateRequest.mockRejectedValueOnce(new Error('Trường 0 không được mở trong đợt cập nhật này.'))
    renderPage()
    const campaignNotice = await screen.findByText('Đang mở cập nhật hồ sơ · Rà soát hồ sơ')
    const campaignAlert = campaignNotice.closest('[data-slot="alert"]')!
    const tabList = screen.getByRole('tablist')
    expect(campaignAlert).toHaveClass('border-success/40')
    expect(campaignAlert.compareDocumentPosition(tabList) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(screen.getByRole('button', { name: 'Sửa Số điện thoại' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa Thư điện tử' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Số điện thoại' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Giá trị đề nghị: Số điện thoại' }), { target: { value: '0912345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận đề nghị' }))
    expect(screen.getByText('Giá trị đề nghị:')).toBeInTheDocument()
    expect(screen.getByText('Giá trị hiện tại: 0900000000')).toBeInTheDocument()
    expect(screen.getByText('Chưa gửi')).toBeInTheDocument()
    expect(screen.getByText('0900000000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('1 trường')).toBeInTheDocument()
    expect(screen.getAllByText('Số điện thoại').length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi' }))
    await waitFor(() => expect(mocks.submitUpdateRequest).toHaveBeenCalledWith({ 'thongTinCaNhan.soDienThoai': '0912345678' }))
    const error = await screen.findByText('Trường 0 không được mở trong đợt cập nhật này.')
    const errorTabList = screen.getByRole('tablist')
    expect(errorTabList.nextElementSibling).toContainElement(error)
  })

  it('restores a pending request from the server after page reload and prevents a duplicate request', async () => {
    mocks.permissions = ['SINH_HOAT_XEM_HIEN_TAI', 'HO_SO_CA_NHAN_TU_CAP_NHAT', 'HO_SO_CA_NHAN_XEM']
    mocks.myProfile.mockResolvedValue({ hoSo: {
      ma: 'profile-a', maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: null, ngayChinhThuc: null, soPhieuLyLich: null, soTheDangVien: null,
      thongTinCaNhan: { soDienThoai: '0900000000' }, diaChi: [], thongTinSinhVien: null, quaTrinh: [], lichSuDonVi: [],
    } })
    mocks.myUpdateWindow.mockResolvedValue({ hoSoLienKet: true, dotCapNhat: { ma: 'window-a', ten: 'Rà soát hồ sơ', maDonVi: 'unit-a', tenDonVi: 'Chi bộ A', ngayBatDau: '2026-11-04T00:00:00Z', ngayKetThuc: '2026-11-10T00:00:00Z', cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'], trangThai: 'DANG_MO' } })
    mocks.myUpdateRequests.mockResolvedValue([{ ma: 'request-a', maHoSo: 'profile-a', maDotCapNhat: 'window-a', maDonViDuyet: 'unit-a', trangThai: 'CHO_DUYET', giaTriTruoc: { 'thongTinCaNhan.soDienThoai': '0900000000' }, giaTriDeNghi: { 'thongTinCaNhan.soDienThoai': '0912345678' }, coAnhDaiDienDuocDeNghi: false, tenChiBo: 'Chi bộ A', ngayTao: '2026-11-04T00:00:00Z', thoiDiemXuLy: null, lyDoXuLy: null }])
    renderPage()
    expect(await screen.findByText('Yêu cầu đang chờ Chi bộ phê duyệt')).toBeInTheDocument()
    expect(screen.getByText('Giá trị hiện tại: 0900000000')).toBeInTheDocument()
    expect(screen.getByText('0912345678')).toBeInTheDocument()
    expect(screen.getByText('Chờ phê duyệt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa Số điện thoại' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi yêu cầu cập nhật' })).not.toBeInTheDocument()
  })
})
