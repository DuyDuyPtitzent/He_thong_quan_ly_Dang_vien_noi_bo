import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from '@/layouts/admin-layout/AppSidebar'
import { SidebarProvider } from '@/shared/components/ui/sidebar'
import { StatisticsPlaceholderPage } from '@/features/resolution-learning/pages/StatisticsPlaceholderPage'
import { SessionsPlaceholderPage } from '@/features/resolution-learning/pages/SessionsPlaceholderPage'

const auth = vi.hoisted(() => ({ permissions: ['HOC_TAP_NGHI_QUYET_DOT_XEM', 'HOC_TAP_NGHI_QUYET_BUOI_XEM', 'HOC_TAP_NGHI_QUYET_THONG_KE_XEM'] as string[] }))
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: auth.permissions, maPhanCongVaiTroDangHoatDong: 'assignment-current', phanCongHopLe: [{ maPhanCong: 'assignment-current', tenVaiTro: 'Vai trò kiểm thử', loaiPhamVi: 'CAY_DON_VI', donViChiDinh: [] }] }, chonPhanCong: vi.fn() }) }))
function CurrentPath() { const location = useLocation(); return <output data-testid="current-path">{location.pathname}</output> }

describe('resolution learning sidebar groups', () => {
  afterEach(() => cleanup())

  it('opens the learning group and links campaign, sessions, and reports pages', async () => {
    render(<MemoryRouter initialEntries={['/']}><SidebarProvider><AppSidebar /><CurrentPath /></SidebarProvider></MemoryRouter>)
    const group = screen.getByRole('button', { name: 'Học tập nghị quyết' })
    await waitFor(() => expect(group).toHaveAttribute('aria-expanded', 'false'))
    fireEvent.click(group)
    expect(await screen.findByRole('link', { name: 'Quản lý đợt học' })).toHaveAttribute('href', '/hoc-tap-nghi-quyet/dot')
    expect(screen.getByRole('link', { name: 'Quản lý buổi học (Đang phát triển)' })).toHaveAttribute('href', '/hoc-tap-nghi-quyet/buoi')
    expect(screen.getByRole('link', { name: 'Thống kê và báo cáo' })).toHaveAttribute('href', '/hoc-tap-nghi-quyet/thong-ke')
    expect(screen.getByRole('button', { name: 'Học tập của tôi' })).toBeInTheDocument()
  })

  it('serves the reports placeholder at its real route', () => {
    render(<MemoryRouter initialEntries={['/hoc-tap-nghi-quyet/thong-ke']}><SidebarProvider><AppSidebar /><Routes><Route path="/hoc-tap-nghi-quyet/thong-ke" element={<StatisticsPlaceholderPage />} /></Routes></SidebarProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Thống kê và báo cáo', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Đang phát triển')).toBeInTheDocument()
    expect(screen.getByText('Chức năng thống kê và báo cáo học tập nghị quyết sẽ được cập nhật trong thời gian tới.')).toBeInTheDocument()
  })

  it('opens the sessions route and explains that the session workspace is in progress', () => {
    render(<MemoryRouter initialEntries={['/hoc-tap-nghi-quyet/buoi']}><SidebarProvider><AppSidebar /><Routes><Route path="/hoc-tap-nghi-quyet/buoi" element={<SessionsPlaceholderPage />} /></Routes></SidebarProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Giao diện Quản lý buổi học chưa hoàn tất', level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/Danh sách buổi học và các nghiệp vụ điểm danh sẽ được bổ sung ở giai đoạn tiếp theo/)).toBeInTheDocument()
  })
})
