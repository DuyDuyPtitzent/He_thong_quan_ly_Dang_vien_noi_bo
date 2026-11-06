import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from '@/layouts/admin-layout/AppSidebar'
import { SidebarProvider } from '@/shared/components/ui/sidebar'

vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/core/auth/auth-context', () => ({
  useAuth: () => ({
    taiKhoan: { quyenDangHoatDong: [], maPhanCongVaiTroDangHoatDong: null, phanCongHopLe: [] },
    chonPhanCong: vi.fn(),
  }),
}))

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderSidebar(path = '/', theme = '') {
  return render(
    <div className={theme}>
      <MemoryRouter initialEntries={[path]}>
        <SidebarProvider>
          <AppSidebar />
          <CurrentPath />
        </SidebarProvider>
      </MemoryRouter>
    </div>,
  )
}

describe('Sidebar collapsible parent rows', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })
  afterEach(() => cleanup())

  it.each(['', 'dark'] as const)('toggles the full parent row by icon, label and arrow (%s theme)', async (theme) => {
    renderSidebar('/settings/appearance', theme)
    const parent = screen.getByRole('button', { name: 'Cài đặt hệ thống' })

    await waitFor(() => expect(parent).toHaveAttribute('aria-expanded', 'true'))
    expect(screen.getByRole('link', { name: 'Giao diện' })).toHaveAttribute('data-active', 'true')

    fireEvent.click(parent.querySelector('svg')!)
    expect(parent).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByText('Cài đặt hệ thống'))
    expect(parent).toHaveAttribute('aria-expanded', 'true')

    const arrow = parent.querySelector('span[aria-hidden="true"] svg')
    expect(arrow).toBeInTheDocument()
    fireEvent.click(arrow!)
    expect(parent).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(parent)
    expect(parent).toHaveAttribute('aria-expanded', 'true')
  })

  it('supports keyboard activation, preserves child navigation, and opens the parent on a direct child route', async () => {
    const user = userEvent.setup()
    renderSidebar('/settings/profile')
    const parent = screen.getByRole('button', { name: 'Cài đặt hệ thống' })
    await waitFor(() => expect(parent).toHaveAttribute('aria-expanded', 'true'))

    parent.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(parent).toHaveAttribute('aria-expanded', 'false'))

    await user.click(parent)
    await user.click(screen.getByRole('link', { name: 'Hồ sơ' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/settings/profile')
    expect(screen.getByRole('link', { name: 'Hồ sơ' })).toHaveAttribute('data-active', 'true')
  })
})
