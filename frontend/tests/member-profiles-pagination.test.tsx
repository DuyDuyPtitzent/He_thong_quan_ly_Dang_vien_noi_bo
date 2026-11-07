import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberProfilesPage } from '@/features/member-profiles/pages/MemberProfilesPage'

const mocks = vi.hoisted(() => ({ total: 179, list: vi.fn(), units: vi.fn() }))

vi.mock('@/core/auth/auth-context', () => ({
  useAuth: () => ({ taiKhoan: { quyenDangHoatDong: ['HO_SO_DANG_VIEN_XEM_DANH_SACH', 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', 'HO_SO_CA_NHAN_XEM'], maPhanCongVaiTroDangHoatDong: 'assignment-1', phanCongHopLe: [] } }),
}))
vi.mock('@/features/member-profiles/api/member-profiles.api', () => ({
  memberProfilesApi: { list: mocks.list, units: mocks.units },
}))

function response(trang: number, gioiHan: number) {
  return {
    duLieu: [],
    phanTrang: { trang, gioiHan, tongSo: mocks.total },
    thongKe: { tongSo: mocks.total, chinhThuc: 0, duBi: 0, dangSinhHoat: mocks.total },
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<MemoryRouter><QueryClientProvider client={client}><MemberProfilesPage /></QueryClientProvider></MemoryRouter>)
}

async function choosePageSize(user: ReturnType<typeof userEvent.setup>, size: number) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }), { key: 'Enter' })
  await screen.findByRole('listbox')
  await user.keyboard('{Home}' + '{ArrowDown}'.repeat([10, 20, 50, 100].indexOf(size)) + '{Enter}')
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 1, gioiHan: size })))
  await waitFor(() => expect(screen.getByText(`Trang 1 / ${Math.max(1, Math.ceil(mocks.total / size))}`)).toBeInTheDocument())
}

describe('MemberProfilesPage pagination', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    mocks.total = 179
    mocks.list.mockImplementation(async (params: { trang: number; gioiHan: number }) => response(params.trang, params.gioiHan))
    mocks.units.mockResolvedValue([])
  })
  afterEach(() => cleanup())

  it('requests 10, 20, 50 and 100 rows from the backend and resets to page one when size changes', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 1, gioiHan: 10 })))
    await screen.findByText('Tổng số 179 kết quả')
    expect(screen.getByText('Trang 1 / 18')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 2, gioiHan: 10 })))
    await screen.findByText('Trang 2 / 18')

    await choosePageSize(user, 20)
    expect(screen.getByText('Trang 1 / 9')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 2, gioiHan: 20 })))
    await screen.findByText('Trang 2 / 9')

    await choosePageSize(user, 50)
    expect(screen.getByText('Trang 1 / 4')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 2, gioiHan: 50 })))
    await screen.findByText('Trang 2 / 4')

    await choosePageSize(user, 100)
    expect(screen.getByText('Trang 1 / 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 2, gioiHan: 100 })))
    await screen.findByText('Trang 2 / 2')
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()

    await choosePageSize(user, 10)
    expect(screen.getByText('Trang 1 / 18')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  })

  it('keeps the active search filter when page size changes', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(mocks.list).toHaveBeenCalled())
    await screen.findByText('Tổng số 179 kết quả')
    fireEvent.change(screen.getByPlaceholderText('Tìm họ tên, mã hồ sơ hoặc số CCCD'), { target: { value: 'Bùi An' } })

    await choosePageSize(user, 50)

    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trang: 1, gioiHan: 50, tuKhoa: 'Bùi An' }))
  })

  it.each([0, 5])('shows one page and disables both directions when the filtered result total is %i', async (total) => {
    mocks.total = total
    renderPage()

    await waitFor(() => expect(screen.queryByText('Đang tải danh sách hồ sơ…')).not.toBeInTheDocument())
    expect(await screen.findByText(`Tổng số ${total} kết quả`)).toBeInTheDocument()
    expect(screen.getByText('Trang 1 / 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
  })
})
