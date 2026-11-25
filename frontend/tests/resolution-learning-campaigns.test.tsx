import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CampaignsPage } from '@/features/resolution-learning/pages/CampaignsPage'
import { CampaignDetailPage } from '@/features/resolution-learning/pages/CampaignDetailPage'

const mocks = vi.hoisted(() => ({ permissions: ['HOC_TAP_NGHI_QUYET_DOT_XEM'] as string[], list: vi.fn(), years: vi.fn(), units: vi.fn(), detail: vi.fn(), sessions: vi.fn(), statistics: vi.fn(), sessionTypeCatalog: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn() }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: mocks.permissions, maPhanCongVaiTroDangHoatDong: 'assignment-current', phanCongHopLe: [] } }) }))
vi.mock('@/features/resolution-learning/api/campaigns.api', () => ({ campaignsApi: { list: mocks.list, years: mocks.years, units: mocks.units, detail: mocks.detail, sessions: mocks.sessions, statistics: mocks.statistics, sessionTypeCatalog: mocks.sessionTypeCatalog, upload: mocks.upload, download: mocks.download, removeAttachment: mocks.remove, update: vi.fn(), end: vi.fn(), cancel: vi.fn() } }))

const campaign = { ma: 'campaign-id', maDot: 'ND-1234', ten: 'Học tập nghị quyết năm 2026', moTa: null, maNamHoc: 'year-id', maDonViToChuc: 'org-id', maNguoiPhuTrach: null, ngayBatDau: '2026-11-01T00:00:00.000Z', ngayKetThuc: '2026-12-01T00:00:00.000Z', trangThai: 'SAP_DIEN_RA' as const, ngayTao: '2026-10-01T00:00:00.000Z', ngayCapNhat: '2026-10-01T00:00:00.000Z', namHoc: { ma: 'year-id', maNamHoc: '2026-2027', tenNamHoc: 'Năm học 2026–2027' }, phamVi: [{ maDonVi: 'org-id' }] }
const response = { duLieu: [campaign], phanTrang: { trang: 1, gioiHan: 10, tongSo: 21 } }
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter><CampaignsPage /></MemoryRouter></QueryClientProvider>) }
function renderDetail() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/hoc-tap-nghi-quyet/dot/campaign-id']}><Routes><Route path="/hoc-tap-nghi-quyet/dot/:id" element={<CampaignDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>) }

describe('Resolution learning campaign page', () => {
  beforeEach(() => { mocks.permissions = ['HOC_TAP_NGHI_QUYET_DOT_XEM']; for (const mock of [mocks.list, mocks.years, mocks.units, mocks.detail, mocks.sessions, mocks.statistics, mocks.sessionTypeCatalog, mocks.upload, mocks.download, mocks.remove]) mock.mockReset(); mocks.list.mockImplementation(async () => response); mocks.years.mockResolvedValue({ duLieu: [], phanTrang: { trang: 1, gioiHan: 10, tongSo: 0 } }); mocks.units.mockResolvedValue([]) })
  afterEach(() => cleanup())

  it('shows the server-backed list and moves between server pages', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: 'Học tập nghị quyết năm 2026' })).toBeInTheDocument()
    expect(screen.queryByText('ND-1234')).not.toBeInTheDocument()
    expect(screen.getByText('Năm học 2026–2027')).toBeInTheDocument()
    expect(screen.getByText('Đang xem 1–10 trong 21 đợt học')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }))
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ trang: 2, gioiHan: 10, sapXep: 'ngayTao' })))
  })

  it('debounces the keyword and sends it as the Backend search filter', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Học tập nghị quyết năm 2026' })
    fireEvent.change(screen.getByLabelText('Tìm tên hoặc mã đợt'), { target: { value: 'nghị quyết' } })
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ tuKhoa: 'nghị quyết' })), { timeout: 1500 })
  })

  it('shows only actions granted by the active session Permission set', async () => {
    mocks.permissions = ['HOC_TAP_NGHI_QUYET_DOT_XEM']
    renderPage()
    await screen.findByRole('button', { name: 'Học tập nghị quyết năm 2026' })
    expect(screen.queryByRole('button', { name: 'Tạo đợt học' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thao tác đợt học' })).toBeInTheDocument()
  })

  it('shows an explicit access state when the active Assignment lacks list Permission', () => {
    mocks.permissions = []
    renderPage()
    expect(screen.getByText('Bạn chưa được cấp quyền xem đợt học.')).toBeInTheDocument()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('loads the detail summary and file list, with mutations gated by the active Permissions', async () => {
    mocks.permissions = ['HOC_TAP_NGHI_QUYET_DOT_XEM', 'HOC_TAP_NGHI_QUYET_BUOI_XEM', 'CAU_HINH_DANH_MUC_XEM', 'HOC_TAP_TEP_TAI_LEN', 'HOC_TAP_TEP_TAI_XUONG', 'HOC_TAP_TEP_XOA']
    mocks.detail.mockResolvedValue({ ...campaign, tepDinhKem: [{ ma: 'file-id', tenTepGoc: 'tai-lieu.pdf', kieuNoiDung: 'application/pdf', kichThuoc: 2048, ngayTao: '2026-10-01T00:00:00.000Z' }] })
    mocks.sessions.mockResolvedValue({ duLieu: [{ ma: 'session-id', maBuoi: 'BH-01', ten: 'Buổi khai mạc', hinhThuc: 'TRUC_TIEP', batDauLuc: '2026-11-01T08:00:00.000Z', ketThucLuc: '2026-11-01T09:00:00.000Z', trangThai: 'DA_LEN_LICH' }], phanTrang: { trang: 1, gioiHan: 100, tongSo: 1 } })
    mocks.sessionTypeCatalog.mockResolvedValue({ giaTri: [{ maGiaTri: 'TRUC_TIEP', tenHienThi: 'Trực tiếp', trangThai: 'DANG_HOAT_DONG' }] })
    mocks.upload.mockResolvedValue({ tenTepGoc: 'upload.pdf' })
    mocks.download.mockResolvedValue(new Blob(['test']))
    mocks.remove.mockResolvedValue({ daXoa: true })
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Học tập nghị quyết năm 2026' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Buổi học' }))
    expect(await screen.findByText('Buổi khai mạc')).toBeInTheDocument()
    expect(await screen.findByText('Trực tiếp')).toBeInTheDocument()
    expect(screen.queryByText('TRUC_TIEP')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Tệp đính kèm' }))
    expect(await screen.findByText('PDF, JPG/JPEG hoặc PNG; tối đa 10 MB mỗi tệp.')).toBeInTheDocument()
    expect(await screen.findByText('tai-lieu.pdf')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tải tệp lên' })).toBeInTheDocument()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'upload.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('campaign-id', expect.objectContaining({ name: 'upload.pdf' })))
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
    fireEvent.click(screen.getByRole('button', { name: 'Tải xuống tai-lieu.pdf' }))
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith('file-id'))
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tai-lieu.pdf' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Đánh dấu xóa' }))
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('file-id'))
  })

  it('does not expose upload, download, or delete controls without their Permissions', async () => {
    mocks.detail.mockResolvedValue({ ...campaign, tepDinhKem: [] })
    renderDetail()
    await screen.findByRole('heading', { name: 'Học tập nghị quyết năm 2026' })
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Tệp đính kèm' }))
    await screen.findByText('PDF, JPG/JPEG hoặc PNG; tối đa 10 MB mỗi tệp.')
    expect(await screen.findByText('Danh sách tệp chỉ hiển thị khi Permission tải xuống được cấp.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tải tệp lên' })).not.toBeInTheDocument()
  })
})
