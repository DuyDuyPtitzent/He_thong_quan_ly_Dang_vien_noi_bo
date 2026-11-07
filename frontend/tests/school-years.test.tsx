import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SchoolYearsPage } from '@/features/school-years/SchoolYearsPage'

const mocks = vi.hoisted(() => ({ permissions: ['NAM_HOC_XEM'] as string[], scope: 'CAY_DON_VI', list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), detail: vi.fn() }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: mocks.permissions, maPhanCongVaiTroDangHoatDong: 'assignment-active', phanCongHopLe: [{ maPhanCong: 'assignment-active', loaiPhamVi: mocks.scope }] } }) }))
vi.mock('@/features/school-years/school-years.api', () => ({ schoolYearsApi: mocks }))

const response = { duLieu: [{ ma: 'year-1', maNamHoc: '2026-2027', tenNamHoc: '2026–2027', ngayBatDau: '2026-09-01T00:00:00.000Z', ngayKetThuc: '2027-08-31T00:00:00.000Z', trangThai: 'DANG_HOAT_DONG', trangThaiThoiGian: 'DANG_DIEN_RA' }], phanTrang: { trang: 1, gioiHan: 10, tongSo: 1 }, thongKe: { tongSo: 1, dangDienRa: 1, sapDienRa: 0, daKetThuc: 0 } }
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><SchoolYearsPage /></QueryClientProvider>) }

describe('SchoolYearsPage', () => {
  beforeEach(() => { mocks.permissions = ['NAM_HOC_XEM']; mocks.scope = 'CAY_DON_VI'; mocks.list.mockResolvedValue(response); mocks.create.mockReset(); mocks.update.mockReset(); mocks.remove.mockReset(); mocks.detail.mockReset() })
  afterEach(() => cleanup())

  it('loads real API rows, formats dates in Vietnamese and filters by a statistic card', async () => {
    renderPage()
    expect(await screen.findByText('2026–2027')).toBeInTheDocument()
    expect(screen.getByText(new Date('2026-09-01T00:00:00.000Z').toLocaleDateString('vi-VN', { timeZone: 'UTC' }))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Đang diễn ra/ }))
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ trangThai: 'DANG_DIEN_RA' })))
  })

  it('does not show create action for an organizational tree scope, even with the Permission', async () => {
    mocks.permissions = ['NAM_HOC_XEM', 'NAM_HOC_TAO']
    renderPage()
    await screen.findByText('2026–2027')
    expect(screen.queryByRole('button', { name: 'Tạo năm học' })).not.toBeInTheDocument()
  })

  it('shows create action when the active Assignment has Permission and TOAN_HE_THONG', async () => {
    mocks.permissions = ['NAM_HOC_XEM', 'NAM_HOC_TAO']
    mocks.scope = 'TOAN_HE_THONG'
    renderPage()
    await screen.findByText('2026–2027')
    expect(screen.getByRole('button', { name: 'Tạo năm học' })).toBeInTheDocument()
  })

  it('saves school-year dates as date-only values across the year boundary', async () => {
    mocks.permissions = ['NAM_HOC_XEM', 'NAM_HOC_TAO']
    mocks.scope = 'TOAN_HE_THONG'
    mocks.create.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('2026–2027')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo năm học' }))
    fireEvent.change(screen.getByLabelText('Mã năm học'), { target: { value: '2026-2027' } })
    fireEvent.change(screen.getByLabelText('Tên năm học'), { target: { value: '2026–2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ngày bắt đầu năm học' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '01/09/2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ngày kết thúc năm học' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '31/08/2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu năm học' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ ngayBatDau: '2026-09-01', ngayKetThuc: '2027-08-31' })))
  })

  it('keeps the save action disabled when the school-year start date is after the end date', async () => {
    mocks.permissions = ['NAM_HOC_XEM', 'NAM_HOC_TAO']
    mocks.scope = 'TOAN_HE_THONG'
    renderPage()
    await screen.findByText('2026–2027')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo năm học' }))
    fireEvent.change(screen.getByLabelText('Mã năm học'), { target: { value: 'invalid-range' } })
    fireEvent.change(screen.getByLabelText('Tên năm học'), { target: { value: 'Khoảng ngày sai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ngày bắt đầu năm học' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '01/09/2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ngày kết thúc năm học' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '31/08/2027' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(screen.getByRole('button', { name: 'Lưu năm học' })).toBeDisabled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
