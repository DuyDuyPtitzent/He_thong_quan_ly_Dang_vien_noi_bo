import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/layouts/admin-layout/AdminLayout'

const mocks = vi.hoisted(() => ({ account: null as Record<string, unknown> | null, setTheme: vi.fn(), signOut: vi.fn(), chooseAssignment: vi.fn(), avatar: vi.fn() }))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'system', resolvedTheme: 'light', setTheme: mocks.setTheme }) }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: mocks.account, dangTaiPhien: false, loiTaiPhien: false, dangXuat: mocks.signOut, chonPhanCong: mocks.chooseAssignment }) }))
vi.mock('@/layouts/admin-layout/AppSidebar', () => ({ AppSidebar: () => <aside aria-label="Sidebar" /> }))
vi.mock('@/layouts/admin-layout/admin-header.api', () => ({ adminHeaderApi: { avatar: mocks.avatar } }))

const assignments = [
  { maPhanCong: 'assignment-a', maVaiTro: 'ROLE_CHI_BO', tenVaiTro: 'Bí thư Chi bộ', loaiPhamVi: 'CAY_DON_VI', maDonViGoc: 'unit-a', tenDonViGoc: 'Chi bộ A', donViChiDinh: [] },
  { maPhanCong: 'assignment-b', maVaiTro: 'ROLE_SYSTEM', tenVaiTro: 'Quản trị viên', loaiPhamVi: 'TOAN_HE_THONG', maDonViGoc: null, tenDonViGoc: null, donViChiDinh: [] },
  { maPhanCong: 'assignment-c', maVaiTro: 'ROLE_CUSTOM', tenVaiTro: 'Chánh văn phòng', loaiPhamVi: 'DON_VI_CHI_DINH', maDonViGoc: null, tenDonViGoc: null, donViChiDinh: ['Đơn vị 1', 'Đơn vị 2'] },
]

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/nam-hoc']}><Routes><Route element={<AdminLayout />}><Route path="/nam-hoc" handle={{ title: 'Quản lý năm học' }} element={<div>Nội dung trang</div>} /></Route></Routes></MemoryRouter></QueryClientProvider>)
}

describe('AdminLayout header', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, media: '', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:header-avatar') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    mocks.account = { maTaiKhoan: 'account-1', tenDangNhap: 'user', hoVaTen: 'Nguyễn Văn A', quyenDangHoatDong: [], maPhanCongVaiTroDangHoatDong: 'assignment-a', phanCongHopLe: assignments }
    mocks.setTheme.mockReset()
    mocks.avatar.mockReset()
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('shows the active assignment scope instead of the route title and follows assignment changes', () => {
    const view = renderLayout()
    expect(screen.getByLabelText('Phạm vi quản lý: Chi bộ A')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Bí thư Chi bộ')).toBeInTheDocument()
    expect(screen.queryByText('Quản lý năm học')).not.toBeInTheDocument()
    mocks.account = { ...mocks.account, maPhanCongVaiTroDangHoatDong: 'assignment-b' }
    view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/nam-hoc']}><Routes><Route element={<AdminLayout />}><Route path="/nam-hoc" handle={{ title: 'Quản lý năm học' }} element={<div>Nội dung trang</div>} /></Route></Routes></MemoryRouter></QueryClientProvider>)
    expect(screen.getByLabelText('Phạm vi quản lý: Toàn hệ thống')).toBeInTheDocument()
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument()
  })

  it('shows the number of designated units without selecting one representative', () => {
    mocks.account = { ...mocks.account, maPhanCongVaiTroDangHoatDong: 'assignment-c' }
    renderLayout()
    expect(screen.getByLabelText('Phạm vi quản lý: 2 đơn vị được phân quyền')).toBeInTheDocument()
    expect(screen.queryByText('Đơn vị 1')).not.toBeInTheDocument()
  })

  it('labels a personal Assignment explicitly', () => {
    mocks.account = {
      ...mocks.account,
      maPhanCongVaiTroDangHoatDong: 'personal',
      phanCongHopLe: [...assignments, { maPhanCong: 'personal', maVaiTro: 'ROLE_SELF', tenVaiTro: 'Đảng viên', loaiPhamVi: 'CA_NHAN', maDonViGoc: null, tenDonViGoc: null, donViChiDinh: [] }],
    }
    renderLayout()
    expect(screen.getByLabelText('Phạm vi quản lý: Phạm vi cá nhân')).toBeInTheDocument()
  })

  it('shows the Bell tooltip on keyboard focus and toggles the resolved theme immediately', async () => {
    renderLayout()
    const bell = screen.getByRole('button', { name: 'Thông báo' })
    const theme = screen.getByRole('button', { name: 'Chuyển sang giao diện tối' })
    const account = screen.getByRole('button', { name: 'Mở menu tài khoản' })
    expect(bell.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(theme.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.focus(bell)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Chức năng thông báo đang được phát triển.')
    expect(screen.getByRole('tooltip')).toHaveClass('bg-tooltip', 'text-tooltip-foreground')
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }))
    expect(mocks.setTheme).toHaveBeenCalledWith('dark')
  })

  it('requests the profile photo only when the active Assignment has profile-view Permission', async () => {
    mocks.account = { ...mocks.account, quyenDangHoatDong: ['HO_SO_DANG_VIEN_XEM_TONG_QUAN'] }
    mocks.avatar.mockResolvedValue(new Blob(['avatar'], { type: 'image/png' }))
    renderLayout()
    await waitFor(() => expect(mocks.avatar).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob)))
  })
})
