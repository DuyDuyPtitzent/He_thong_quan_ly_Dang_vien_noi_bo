import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberProfileDetailPage } from '@/features/accounts/MemberProfileDetailPage'

const mocks = vi.hoisted(() => ({
  detail: vi.fn(), membershipHistory: vi.fn(), partyProcess: vi.fn(), positionAssignments: vi.fn(), changeHistory: vi.fn(),
  permissions: ['HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', 'SINH_HOAT_XEM_HIEN_TAI', 'SINH_HOAT_XEM_LICH_SU', 'QUA_TRINH_DANG_XEM', 'PHAN_CONG_CHUC_VU_XEM', 'HO_SO_XEM_LICH_SU_THAY_DOI'],
}))

vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: mocks.permissions } }) }))
vi.mock('@/features/accounts/member-profiles.api', () => ({ memberProfilesApi: {
  detail: mocks.detail, membershipHistory: mocks.membershipHistory, partyProcess: mocks.partyProcess,
  positionAssignments: mocks.positionAssignments, changeHistory: mocks.changeHistory,
} }))

describe('MemberProfileDetailPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.permissions.splice(0, mocks.permissions.length, 'HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', 'SINH_HOAT_XEM_HIEN_TAI', 'SINH_HOAT_XEM_LICH_SU', 'QUA_TRINH_DANG_XEM', 'PHAN_CONG_CHUC_VU_XEM', 'HO_SO_XEM_LICH_SU_THAY_DOI')
    mocks.detail.mockResolvedValue({
      ma: 'profile-id', maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: '2024-01-01T00:00:00.000Z', ngayChinhThuc: null, soPhieuLyLich: 'PL-001', soTheDangVien: 'THE-001',
      thongTinCaNhan: null, thongTinSinhVien: null, diaChi: [], quaTrinh: [],
      lichSuDonVi: [{ maChiBo: 'branch-id', maTo: null, ngayHieuLucTu: '2024-02-01T00:00:00.000Z', chiBo: { maDinhDanh: 'CB-01', tenDonVi: [{ ten: 'Chi bộ 1' }] }, to: null }],
    })
    mocks.membershipHistory.mockResolvedValue({
      donViHienTai: { ma: 'membership-current', tenDangUy: 'Đảng ủy Học viện PTIT', tenChiBo: 'Chi bộ 1', tenTo: null, ngayHieuLucTu: '2024-02-01T00:00:00.000Z', ngayHieuLucDen: null, lyDoChuyen: null },
      lichSu: [
        { ma: 'membership-current', tenDangUy: 'Đảng ủy Học viện PTIT', tenChiBo: 'Chi bộ 1', tenTo: null, ngayHieuLucTu: '2024-02-01T00:00:00.000Z', ngayHieuLucDen: null, lyDoChuyen: null },
        { ma: 'membership-old', tenDangUy: 'Đảng ủy Học viện PTIT', tenChiBo: 'Chi bộ cũ', tenTo: 'Tổ 1', ngayHieuLucTu: '2023-02-01T00:00:00.000Z', ngayHieuLucDen: '2024-02-01T00:00:00.000Z', lyDoChuyen: 'Chuyển nơi sinh hoạt' },
      ],
    })
    mocks.partyProcess.mockResolvedValue([])
    mocks.positionAssignments.mockResolvedValue([])
    mocks.changeHistory.mockResolvedValue([])
  })

  const renderPage = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/profile-id']}><Routes><Route path="/:profileId" element={<MemberProfileDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>)
  }

  it('shows the approved five-field completion measure and loads membership history when opened', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Nguyễn An' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Mức độ hoàn thiện hồ sơ: 100%' })).toHaveAttribute('aria-valuenow', '100')
    await userEvent.click(screen.getByRole('tab', { name: 'Sinh hoạt Đảng' }))
    expect(await screen.findByRole('heading', { name: 'Sinh hoạt Đảng' })).toBeInTheDocument()
    expect(screen.getByText('Đảng ủy Học viện PTIT')).toBeInTheDocument()
    expect(screen.getAllByText('Chi bộ 1').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Chưa phân tổ')).toBeInTheDocument()
    expect(screen.getByText('Đang sinh hoạt')).toBeInTheDocument()
    expect(screen.getByText('Lịch sử chuyển sinh hoạt')).toBeInTheDocument()
    expect(screen.getByText('Chi bộ cũ · Tổ 1')).toBeInTheDocument()
    await waitFor(() => expect(mocks.membershipHistory).toHaveBeenCalledWith('profile-id'))
  })

  it('moves tabs into the more menu on narrow layouts and restores them when there is room', async () => {
    renderPage()
    const tabList = await screen.findByRole('tablist')
    const container = tabList.parentElement as HTMLDivElement
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 500 })
    const measuredTabs = [...container.querySelectorAll<HTMLElement>('[data-measure-tab]')]
    for (const node of measuredTabs) {
      Object.defineProperty(node, 'getBoundingClientRect', { configurable: true, value: () => ({ x: 0, y: 0, width: 150, height: 44, top: 0, right: 150, bottom: 44, left: 0, toJSON: () => ({}) }) })
    }
    Object.defineProperty(container.querySelector('[aria-hidden="true"] span:last-child') as HTMLElement, 'getBoundingClientRect', { configurable: true, value: () => ({ x: 0, y: 0, width: 40, height: 40, top: 0, right: 40, bottom: 40, left: 0, toJSON: () => ({}) }) })

    act(() => window.dispatchEvent(new Event('resize')))
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Mở các thẻ đang ẩn' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mở các thẻ đang ẩn' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Quá trình Đảng' }))
    expect(await screen.findByRole('heading', { name: 'Quá trình Đảng' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thẻ đang chọn: Quá trình Đảng. Mở danh sách thẻ khác' })).toHaveClass('bg-accent')

    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 1800 })
    act(() => window.dispatchEvent(new Event('resize')))
    expect(screen.getAllByRole('tab')).toHaveLength(7)
    expect(screen.queryByRole('button', { name: /Mở danh sách thẻ khác|Mở các thẻ đang ẩn/ })).not.toBeInTheDocument()
  })

  it('does not expose read tabs when the matching permissions are absent', async () => {
    mocks.permissions.splice(0, mocks.permissions.length, 'HO_SO_DANG_VIEN_XEM_TONG_QUAN')
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Nguyễn An' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Sinh hoạt Đảng' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Chức vụ & Nhiệm kỳ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Lịch sử thay đổi' })).not.toBeInTheDocument()
  })

  it('shows permitted addresses even when personal-information permission is absent', async () => {
    mocks.permissions.splice(0, mocks.permissions.length, 'HO_SO_DIA_CHI_XEM')
    mocks.detail.mockResolvedValueOnce({
      ma: 'profile-id', maHoSoNoiBo: 'HS-001', hoVaTen: 'Nguyễn An', trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: 'DU_BI',
      ngayVaoDang: null, ngayChinhThuc: null, soPhieuLyLich: null, soTheDangVien: null, thongTinCaNhan: null, thongTinSinhVien: null,
      diaChi: [{ loaiDiaChi: 'QUE_QUAN', phanLoaiNoiSinh: null, diaChiChiTiet: 'Quận 1', xaPhuong: null, quanHuyen: null, tinhThanhPho: 'Hà Nội', quocGia: 'Việt Nam' }],
      quaTrinh: [], lichSuDonVi: [],
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Nguyễn An' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Thông tin cá nhân' }))
    expect(await screen.findByText('Quận 1, Hà Nội, Việt Nam')).toBeInTheDocument()
    expect(screen.getByText('Bạn không có quyền xem thông tin cá nhân của hồ sơ này.')).toBeInTheDocument()
  })
})
