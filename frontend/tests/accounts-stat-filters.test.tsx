import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountsPage } from '../src/features/accounts/pages/AccountsPage'

const api = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('../src/features/accounts/api/accounts.api', () => ({ accountsApi: { list: api.list } }))
vi.mock('../src/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: ['TAI_KHOAN_TAO', 'TAI_KHOAN_XEM'] } }) }))
vi.mock('../src/core/auth/system-log-access', () => ({ coQuyenTruyCapNhatKyToanHeThong: () => false }))
vi.mock('../src/features/accounts/components/AccountSheets', () => ({
  AccountConfirmDialog: () => null, AccountDetailSheet: () => null, AccountFormSheet: () => null,
  AccountHistorySheet: () => null, ProfileLinkSheet: () => null, ResetPasswordSheet: () => null, StatusBadge: () => null,
}))

describe('AccountsPage statistic filters', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    vi.clearAllMocks()
    api.list.mockResolvedValue({ duLieu: [], phanTrang: { trang: 1, gioiHan: 10, tongSo: 0 }, thongKe: { tongTaiKhoan: 17, dangHoatDong: 12, khoaHoacVoHieuHoa: 5, chuaLienKetHoSo: 4 }, thongKePhanQuyen: {}, danhMucChiBo: [] })
  })

  it('filters by the combined blocked and inactive states when that card is selected', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><AccountsPage /></MemoryRouter>)
    await waitFor(() => expect(api.list).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /Lọc danh sách: Bị khóa \/ ngừng/ }))
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ trangThai: 'TAM_KHOA_HOAC_NGUNG_HOAT_DONG', trang: 1 })))
  })

  it('resets list filters when the total card is selected', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><AccountsPage /></MemoryRouter>)
    await waitFor(() => expect(api.list).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /Lọc danh sách: Tổng tài khoản/ }))
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ tuKhoa: '', trang: 1 })))
    expect(api.list.mock.lastCall?.[0]).not.toHaveProperty('trangThai')
  })
})
