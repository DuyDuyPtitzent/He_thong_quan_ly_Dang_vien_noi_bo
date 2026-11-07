import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SystemLogsPage } from '@/features/system-logs/pages/SystemLogsPage'

const mocks = vi.hoisted(() => ({ permissions: [] as string[], role: 'QUAN_TRI_VIEN_TOAN_HE_THONG', scope: 'TOAN_HE_THONG', previewRemoval: vi.fn(), queryClient: { cancelQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() } }))
vi.mock('@/features/system-logs/api/system-logs.api', () => ({ systemLogsApi: { previewRemoval: mocks.previewRemoval } }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { maPhanCongVaiTroDangHoatDong: 'assignment-active', phanCongHopLe: [{ maPhanCong: 'assignment-active', maVaiTro: mocks.role, loaiPhamVi: mocks.scope }], quyenDangHoatDong: mocks.permissions } }) }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => mocks.queryClient }))
vi.mock('@/features/system-logs/hooks/useSystemLogs', () => ({
  useSystemLogs: () => ({ list: { data: { items: [], tongSo: 0 }, isPending: false, isError: false, isFetching: false, refetch: vi.fn() }, stats: { data: { tong: 0, thanhCong: 0, thatBai: 0, baoMat: 0 } }, actions: { data: [] }, units: { data: [] } }),
  useSystemLogDetail: () => ({ data: null, isPending: false, isError: false }),
}))

afterEach(() => { cleanup(); mocks.permissions = []; mocks.role = 'QUAN_TRI_VIEN_TOAN_HE_THONG'; mocks.scope = 'TOAN_HE_THONG'; mocks.previewRemoval.mockReset(); mocks.queryClient.cancelQueries.mockClear(); mocks.queryClient.removeQueries.mockClear() })

describe('SystemLogsPage permissions', () => {
  it('shows only the audit tab when the current assignment has audit view permission', () => {
    mocks.permissions = ['NHAT_KY_KIEM_TOAN_XEM']
    render(<SystemLogsPage />)
    expect(screen.getByRole('tab', { name: 'Nhật ký thao tác' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Nhật ký bảo mật' })).toBeNull()
  })

  it('shows only the security tab when the current assignment has security view permission', () => {
    mocks.permissions = ['NHAT_KY_BAO_MAT_XEM']
    render(<SystemLogsPage />)
    expect(screen.queryByRole('tab', { name: 'Nhật ký thao tác' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Nhật ký bảo mật' })).toBeTruthy()
  })

  it('denies access when neither permission is present', () => {
    render(<SystemLogsPage />)
    expect(screen.getByText('Bạn không có quyền truy cập Nhật ký hệ thống.')).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it.each([
    ['ordinary permission administrator', 'QUAN_TRI_PHAN_QUYEN', 'TOAN_HE_THONG'],
    ['organization manager', 'QUAN_TRI_VIEN_TOAN_HE_THONG', 'CAY_DON_VI'],
    ['no role assignment', 'ROLE_THUONG', 'TOAN_HE_THONG'],
  ])('blocks direct page access for %s even when log Permission is present', (_label, role, scope) => {
    mocks.permissions = ['NHAT_KY_KIEM_TOAN_XEM', 'NHAT_KY_BAO_MAT_XEM']
    mocks.role = role
    mocks.scope = scope
    render(<SystemLogsPage />)
    expect(screen.getByText('Bạn không có quyền truy cập Nhật ký hệ thống.')).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('shows deletion controls as locked when the administrator lacks the separate delete Permission', () => {
    mocks.permissions = ['NHAT_KY_KIEM_TOAN_XEM']
    render(<SystemLogsPage />)
    expect(screen.getByRole('button', { name: /Xóa nhật ký/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('checkbox', { name: 'Chọn nhật ký trên trang này' })).toHaveProperty('disabled', true)
    expect(screen.getByText(/chưa được cấp Permission NHAT_KY_XOA/)).toBeTruthy()
  })

  it('shows a gated preview dialog to a user with the separate delete permission', async () => {
    mocks.permissions = ['NHAT_KY_KIEM_TOAN_XEM', 'NHAT_KY_XOA']
    mocks.previewRemoval.mockResolvedValue({ soBanGhiKhopTrongPhamVi: 12, soBanGhiDuDieuKienXoa: null, coTheXoa: false, lyDoKhongTheXoa: 'Chưa có chính sách lưu trữ.' })
    render(<SystemLogsPage />)
    expect(screen.getByRole('checkbox', { name: 'Chọn nhật ký trên trang này' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Xóa nhật ký/ }))
    expect(screen.getByRole('heading', { name: 'Xem trước xóa nhật ký' })).toBeTruthy()
    expect(screen.getByText(/không thể khôi phục/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xóa nhật ký' })).toHaveProperty('disabled', true)
    expect(mocks.previewRemoval).not.toHaveBeenCalled()
    const dialog = within(screen.getByRole('alertdialog'))
    fireEvent.click(dialog.getByRole('button', { name: 'Khoảng ngày nhật ký cần xem trước' }))
    fireEvent.click(screen.getAllByRole('button', { name: /ngày 8 tháng 11 năm 2026/i }).at(-1)!)
    fireEvent.click(screen.getAllByRole('button', { name: /ngày 10 tháng 11 năm 2026/i }).at(-1)!)
    fireEvent.change(dialog.getByPlaceholderText('Nhập lý do cho yêu cầu kiểm tra'), { target: { value: 'Kiểm tra lưu trữ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra số lượng' }))
    await waitFor(() => expect(screen.getByText(/Bản ghi khớp trong Scope:/).parentElement?.textContent).toContain('12'))
    expect(mocks.previewRemoval).toHaveBeenCalledWith('thao-tac', expect.objectContaining({ tuNgay: '2026-11-08', denNgay: '2026-11-10', lyDo: 'Kiểm tra lưu trữ' }))
    expect(screen.getByRole('button', { name: 'Xóa nhật ký' })).toHaveProperty('disabled', true)
  })

  it('clears cached log data as soon as the active role is no longer the system administrator', async () => {
    mocks.permissions = ['NHAT_KY_KIEM_TOAN_XEM']
    const view = render(<SystemLogsPage />)
    mocks.role = 'QUAN_TRI_PHAN_QUYEN'
    view.rerender(<SystemLogsPage />)
    expect(await screen.findByText('Bạn không có quyền truy cập Nhật ký hệ thống.')).toBeTruthy()
    await waitFor(() => expect(mocks.queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['system-logs'] }))
  })
})
