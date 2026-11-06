import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberProfileUpdatesPage } from '@/features/accounts/MemberProfileUpdatesPage'
import type { YeuCauCapNhatHoSo } from '@/features/accounts/member-profiles.api'

const mocks = vi.hoisted(() => ({ permissions: ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT'] as string[], updateWindows: vi.fn(), updateUnits: vi.fn(), createUpdateWindow: vi.fn(), createAndActivateUpdateWindow: vi.fn(), updateUpdateWindow: vi.fn(), activateUpdateWindow: vi.fn(), finishUpdateWindow: vi.fn(), deleteUpdateWindow: vi.fn(), updateWindowStats: vi.fn(), reviewRequests: vi.fn(), approveUpdateRequest: vi.fn(), rejectUpdateRequest: vi.fn() }))
vi.mock('@/core/auth/auth-context', () => ({ useAuth: () => ({ taiKhoan: { quyenDangHoatDong: mocks.permissions } }) }))
vi.mock('@/features/accounts/member-profiles.api', () => ({ memberProfilesApi: mocks }))
vi.mock('@/shared/components/RichTextEditor', () => ({ RichTextEditor: ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) => <label htmlFor={id}>{label}<textarea id={id} value={value} onChange={(event) => onChange(event.target.value)}/></label> }))
vi.mock('@/shared/components/RichTextContent', () => ({ RichTextContent: ({ html }: { html: string }) => <div>{html}</div> }))

const makeWindow = (id: string, name: string, start: Date, end: Date, trangThaiQuanLy: 'BAN_NHAP' | 'DA_KICH_HOAT' | 'KET_THUC_SOM' = 'DA_KICH_HOAT') => ({ ma: id, ten: name, moTa: null, maDonVi: null, tenDonVi: 'Toàn hệ thống', ngayBatDau: start.toISOString(), ngayKetThuc: end.toISOString(), cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'], trangThaiQuanLy, maNguoiTao: 'account-admin', nguoiTao: 'admin', ngayTao: start.toISOString(), maNguoiKichHoat: 'account-admin', nguoiKichHoat: 'admin', thoiDiemKichHoat: start.toISOString(), maNguoiKetThucSom: null, nguoiKetThucSom: null, thoiDiemKetThucSom: null, soYeuCau: 0 })
const makeQueueResponse = (duLieu: YeuCauCapNhatHoSo[], total = duLieu.length, trang = 1, gioiHan = 25) => ({ duLieu, phanTrang: { trang, gioiHan, tongSo: total, tongTrang: Math.ceil(total / gioiHan) }, thongKe: { tongYeuCau: total, choXuLy: total, daPheDuyet: 0, daTuChoi: 0, daHuy: 0 }, boLoc: { donVi: [{ ma: 'unit-a', ten: 'Chi bộ A' }], dotCapNhat: [{ ma: 'window-a', ten: 'Rà soát hồ sơ' }] } })
const localDateTimeInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemberProfileUpdatesPage/></QueryClientProvider>)
}

describe('MemberProfileUpdatesPage', () => {
  beforeEach(() => {
    mocks.permissions = ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT']
    const now = Date.now()
    mocks.updateWindows.mockResolvedValue([
      makeWindow('open', 'Đợt đang mở', new Date(now - 60_000), new Date(now + 60_000)),
      makeWindow('future', 'Đợt sắp tới', new Date(now + 3_600_000), new Date(now + 7_200_000)),
      makeWindow('closed', 'Đợt đã kết thúc', new Date(now - 7_200_000), new Date(now - 3_600_000)),
    ])
    mocks.updateUnits.mockResolvedValue({ donVi: [], coTheMoToanPhamVi: true })
    mocks.createUpdateWindow.mockResolvedValue({ ma: 'draft-campaign' })
    mocks.createAndActivateUpdateWindow.mockResolvedValue({ ma: 'active-campaign', trangThaiQuanLy: 'DA_KICH_HOAT' })
    mocks.reviewRequests.mockResolvedValue(makeQueueResponse([]))
    mocks.updateWindowStats.mockResolvedValue({ tongYeuCau: 0, choXuLy: 0, daPheDuyet: 0, daTuChoi: 0 })
  })
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('tính thống kê từ toàn bộ kết quả và lọc bảng khi chọn thẻ trạng thái', async () => {
    renderPage()
    expect(await screen.findByText('Đợt đang mở')).toBeInTheDocument()
    expect(screen.getByText('Đợt sắp tới')).toBeInTheDocument()
    expect(screen.getByText('Đợt đã kết thúc')).toBeInTheDocument()
    const openCard = screen.getByRole('button', { name: /Đang mở/ })
    expect(within(openCard).getByText('1')).toBeInTheDocument()
    fireEvent.click(openCard)
    expect(screen.getByText('Đợt đang mở')).toBeInTheDocument()
    expect(screen.queryByText('Đợt sắp tới')).not.toBeInTheDocument()
    expect(screen.queryByText('Đợt đã kết thúc')).not.toBeInTheDocument()
  })

  it('hiển thị chi tiết từ dữ liệu danh sách backend', async () => {
    mocks.permissions = ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT']
    renderPage()
    await screen.findByText('Đợt đang mở')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Thao tác: Đợt đang mở' }), { button: 0, pointerType: 'mouse' })
    fireEvent.click(await screen.findByText('Xem chi tiết'))
    expect(await screen.findByText('Chi tiết đợt cập nhật')).toBeInTheDocument()
    expect(screen.getByText('Số điện thoại')).toBeInTheDocument()
    expect(screen.getByText('Người tạo')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('Thời gian tạo')).toBeInTheDocument()
    expect(await screen.findByText('Thống kê yêu cầu')).toBeInTheDocument()
  })

  it('mở biểu mẫu và chỉ gửi khi xác nhận tạo', async () => {
    mocks.createUpdateWindow.mockResolvedValue({ ma: 'new-campaign' })
    renderPage()
    await screen.findByText('Đợt đang mở')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đợt cập nhật' }))
    fireEvent.change(screen.getByLabelText(/Tên đợt cập nhật/), { target: { value: 'Đợt rà soát mới' } })
    fireEvent.change(document.getElementById('campaign-start')!, { target: { value: '2027-02-01T09:00' } })
    fireEvent.change(document.getElementById('campaign-end')!, { target: { value: '2027-02-03T17:00' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cho phép đề nghị thay đổi Số điện thoại' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    expect(mocks.createUpdateWindow).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(mocks.createUpdateWindow).toHaveBeenCalledOnce())
    expect(mocks.createUpdateWindow).toHaveBeenCalledWith(expect.objectContaining({ ten: 'Đợt rà soát mới', cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'] }))
  })

  it('tạo và kích hoạt nguyên tử sau khi xác nhận từ cùng biểu mẫu', async () => {
    const now = Date.now()
    renderPage()
    await screen.findByText('Đợt đang mở')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đợt cập nhật' }))
    fireEvent.change(screen.getByLabelText(/Tên đợt cập nhật/), { target: { value: 'Đợt cần mở ngay' } })
    fireEvent.change(document.getElementById('campaign-start')!, { target: { value: localDateTimeInput(new Date(now + 60 * 60_000)) } })
    fireEvent.change(document.getElementById('campaign-end')!, { target: { value: localDateTimeInput(new Date(now + 2 * 60 * 60_000)) } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cho phép đề nghị thay đổi Số điện thoại' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và kích hoạt' }))
    expect(mocks.createAndActivateUpdateWindow).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu và kích hoạt' }))
    await waitFor(() => expect(mocks.createAndActivateUpdateWindow).toHaveBeenCalledOnce())
    expect(mocks.createUpdateWindow).not.toHaveBeenCalled()
    expect(mocks.createAndActivateUpdateWindow).toHaveBeenCalledWith(expect.objectContaining({ ten: 'Đợt cần mở ngay', cacTruongDuocPhep: ['thongTinCaNhan.soDienThoai'] }))
    await waitFor(() => expect(screen.queryByLabelText(/Tên đợt cập nhật/)).not.toBeInTheDocument())
  })

  it('keeps entered values when creating and activating fails', async () => {
    mocks.createAndActivateUpdateWindow.mockRejectedValue(new Error('Thời hạn bị trùng với đợt khác.'))
    const now = Date.now()
    renderPage()
    await screen.findByText('Đợt đang mở')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đợt cập nhật' }))
    fireEvent.change(screen.getByLabelText(/Tên đợt cập nhật/), { target: { value: 'Đợt không được mất dữ liệu' } })
    fireEvent.change(document.getElementById('campaign-start')!, { target: { value: localDateTimeInput(new Date(now + 60 * 60_000)) } })
    fireEvent.change(document.getElementById('campaign-end')!, { target: { value: localDateTimeInput(new Date(now + 2 * 60 * 60_000)) } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cho phép đề nghị thay đổi Số điện thoại' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và kích hoạt' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu và kích hoạt' }))
    await waitFor(() => expect(mocks.createAndActivateUpdateWindow).toHaveBeenCalledOnce())
    expect(screen.getByLabelText(/Tên đợt cập nhật/)).toHaveValue('Đợt không được mất dữ liệu')
    expect(mocks.createUpdateWindow).not.toHaveBeenCalled()
  })

  it('yêu cầu chọn Chi bộ nếu tài khoản không có phạm vi toàn hệ thống', async () => {
    mocks.updateUnits.mockResolvedValue({ donVi: [{ ma: 'branch-a', maDinhDanh: 'CB-A', ten: 'Chi bộ A' }], coTheMoToanPhamVi: false })
    renderPage()
    await screen.findByText('Đợt đang mở')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đợt cập nhật' }))
    expect(await screen.findByText('Tài khoản của bạn cần chọn một Chi bộ được giao quản lý.')).toBeInTheDocument()
    expect(screen.getByText('Chưa chọn Chi bộ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeDisabled()
  })

  it('activates a draft only after confirmation and refreshes campaign data', async () => {
    const now = Date.now()
    mocks.updateWindows.mockResolvedValue([makeWindow('draft', 'Bản nháp cần kích hoạt', new Date(now + 60_000), new Date(now + 3_600_000), 'BAN_NHAP')])
    mocks.activateUpdateWindow.mockResolvedValue({ trangThai: 'CHUA_BAT_DAU' })
    renderPage()
    await screen.findByText('Bản nháp cần kích hoạt')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Thao tác: Bản nháp cần kích hoạt' }), { button: 0, pointerType: 'mouse' })
    fireEvent.click(await screen.findByText('Kích hoạt đợt'))
    expect(mocks.activateUpdateWindow).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Kích hoạt đợt' }))
    await waitFor(() => expect(mocks.activateUpdateWindow).toHaveBeenCalledWith('draft'))
  })

  it('opens the review queue filtered by campaign and request status from campaign statistics', async () => {
    const now = Date.now()
    mocks.permissions = ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT']
    mocks.updateWindows.mockResolvedValue([makeWindow('window-a', 'Đợt có thống kê', new Date(now - 60_000), new Date(now + 60_000))])
    mocks.updateWindowStats.mockResolvedValue({ tongYeuCau: 3, choXuLy: 1, daPheDuyet: 1, daTuChoi: 1 })
    mocks.reviewRequests.mockResolvedValue(makeQueueResponse([{ ma: 'request-a', maHoSo: 'profile-a', maDonViDuyet: 'unit-a', maDotCapNhat: 'window-a', trangThai: 'CHO_DUYET', giaTriTruoc: {}, giaTriDeNghi: {}, coAnhDaiDienDuocDeNghi: false, tenChiBo: 'Chi bộ A', tenDotCapNhat: 'Đợt có thống kê', nguoiGui: 'an', hoSo: { maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An' }, ngayTao: new Date().toISOString(), thoiDiemXuLy: null, lyDoXuLy: null }]) as YeuCauCapNhatHoSo[])
    renderPage()
    await screen.findByText('Đợt có thống kê')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Thao tác: Đợt có thống kê' }), { button: 0, pointerType: 'mouse' })
    fireEvent.click(await screen.findByText('Xem chi tiết'))
    fireEvent.click(await screen.findByRole('button', { name: /Chờ xử lý/ }))
    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
    expect(mocks.reviewRequests).toHaveBeenCalledWith(expect.objectContaining({ maDotCapNhat: 'window-a', trangThai: 'CHO_DUYET', trang: 1, gioiHan: 25 }))
  })

  it('shows the actual queue API error instead of displaying zero counts when loading fails', async () => {
    mocks.permissions = ['HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT']
    mocks.reviewRequests.mockRejectedValue(new Error('Tài khoản không có quyền hoặc phạm vi xem yêu cầu này.'))
    renderPage()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Yêu cầu đang chờ xử lý' }), { button: 0 })
    expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản không có quyền hoặc phạm vi xem yêu cầu này.')
    expect(screen.getByRole('button', { name: /Tổng yêu cầu/ })).toHaveTextContent('—')
    expect(screen.getByRole('button', { name: 'Thử tải lại' })).toBeInTheDocument()
  })

  it('separates the review queue, filters by status, opens details and only approves after confirmation', async () => {
    mocks.permissions = ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT']
    const base = { maHoSo: 'profile-a', maDonViDuyet: 'unit-a', maDotCapNhat: 'window-a', giaTriTruoc: { 'thongTinCaNhan.soDienThoai': '0900000000' }, giaTriDeNghi: { 'thongTinCaNhan.soDienThoai': '0912345678' }, coAnhDaiDienDuocDeNghi: false, nguoiGui: 'nguyenan', tenChiBo: 'Chi bộ A', tenDotCapNhat: 'Rà soát hồ sơ', tenNguoiXuLy: null, hoSo: { maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An' }, ngayTao: new Date().toISOString(), thoiDiemXuLy: null, lyDoXuLy: null }
    const allRequests = [
      { ...base, ma: 'request-a', trangThai: 'CHO_DUYET' },
      { ...base, ma: 'request-b', maHoSo: 'profile-b', maDotCapNhat: 'window-b', tenDotCapNhat: 'Rà soát năm trước', trangThai: 'DA_DUYET', hoSo: { maHoSoNoiBo: 'HS-B', hoVaTen: 'Trần Bình' } },
      { ...base, ma: 'request-c', maHoSo: 'profile-c', trangThai: 'DA_TU_CHOI', hoSo: { maHoSoNoiBo: 'HS-C', hoVaTen: 'Lê Chi' } },
    ] as YeuCauCapNhatHoSo[]
    mocks.reviewRequests.mockImplementation(async (params: { trang?: number; gioiHan?: number; trangThai?: YeuCauCapNhatHoSo['trangThai'] }) => {
      const matches = params.trangThai ? allRequests.filter((item) => item.trangThai === params.trangThai) : allRequests
      const page = params.trang ?? 1
      const size = params.gioiHan ?? 25
      return { ...makeQueueResponse(matches.slice((page - 1) * size, page * size), matches.length, page, size), thongKe: { tongYeuCau: 3, choXuLy: 1, daPheDuyet: 1, daTuChoi: 1, daHuy: 0 } }
    })
    mocks.approveUpdateRequest.mockResolvedValue({ trangThai: 'DA_DUYET' })
    renderPage()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Yêu cầu đang chờ xử lý' }), { button: 0 })
    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.queryByText('Đợt đang mở')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chờ xử lý/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Trần Bình')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tổng yêu cầu/ }))
    expect(await screen.findByText('Trần Bình')).toBeInTheDocument()
    expect(screen.getByText('Lê Chi')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(8)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Thao tác yêu cầu của Nguyễn An' }), { button: 0, pointerType: 'mouse' })
    fireEvent.click(await screen.findByText('Xem chi tiết'))
    expect(await screen.findByText('Chi tiết yêu cầu cập nhật')).toBeInTheDocument()
    expect(screen.getAllByText('Rà soát hồ sơ').length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt' }))
    expect(mocks.approveUpdateRequest).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận phê duyệt' }))
    await waitFor(() => expect(mocks.approveUpdateRequest).toHaveBeenCalledWith('request-a'))
  })

  it('loads a 1,000-request queue in 25-row pages and applies search on the server', async () => {
    mocks.permissions = ['HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT']
    const makeRequest = (index: number): YeuCauCapNhatHoSo => ({ ma: `request-${index}`, maHoSo: `profile-${index}`, maDonViDuyet: 'unit-a', maDotCapNhat: 'window-a', trangThai: 'CHO_DUYET', giaTriTruoc: {}, giaTriDeNghi: {}, coAnhDaiDienDuocDeNghi: false, tenChiBo: 'Chi bộ A', tenDotCapNhat: 'Rà soát hồ sơ', nguoiGui: `user-${index}`, hoSo: { maHoSoNoiBo: `HS-${index}`, hoVaTen: `Đảng viên ${index}` }, ngayTao: new Date(Date.now() - index * 1000).toISOString(), thoiDiemXuLy: null, lyDoXuLy: null })
    mocks.reviewRequests.mockImplementation(async (params: { trang?: number; gioiHan?: number; tuKhoa?: string }) => {
      const page = params.trang ?? 1
      const size = params.gioiHan ?? 25
      const total = params.tuKhoa ? 1 : 1000
      const allRows = params.tuKhoa ? [makeRequest(777)] : Array.from({ length: size }, (_, index) => makeRequest((page - 1) * size + index + 1))
      return { ...makeQueueResponse(allRows.slice(0, size), total, page, size), thongKe: { tongYeuCau: 1000, choXuLy: 1000, daPheDuyet: 0, daTuChoi: 0, daHuy: 0 } }
    })
    renderPage()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Yêu cầu đang chờ xử lý' }), { button: 0 })
    expect(await screen.findByText('Trang 1/40')).toBeInTheDocument()
    expect(screen.getByText('1000 yêu cầu phù hợp · Chờ xử lý')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }))
    await waitFor(() => expect(mocks.reviewRequests).toHaveBeenCalledWith(expect.objectContaining({ trang: 2, gioiHan: 25 })))
    expect(await screen.findByText('Trang 2/40')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tìm theo họ tên hoặc mã hồ sơ'), { target: { value: 'Đảng viên 777' } })
    await waitFor(() => expect(mocks.reviewRequests).toHaveBeenCalledWith(expect.objectContaining({ tuKhoa: 'Đảng viên 777', trang: 1 })), { timeout: 2000 })
    expect(await screen.findByText('Đảng viên 777')).toBeInTheDocument()
    expect(screen.getByText('1 yêu cầu phù hợp · Chờ xử lý')).toBeInTheDocument()
  })

  it('requires a reason before rejecting and submits it through the existing review API', async () => {
    mocks.permissions = ['HO_SO_CA_NHAN_DUYET_CAP_NHAT']
    mocks.reviewRequests.mockResolvedValue(makeQueueResponse([{ ma: 'request-a', maHoSo: 'profile-a', maDonViDuyet: 'unit-a', maDotCapNhat: 'window-a', trangThai: 'CHO_DUYET', giaTriTruoc: {}, giaTriDeNghi: { hoVaTen: 'Nguyễn An' }, coAnhDaiDienDuocDeNghi: false, tenChiBo: 'Chi bộ A', tenDotCapNhat: 'Rà soát hồ sơ', nguoiGui: 'an', hoSo: { maHoSoNoiBo: 'HS-A', hoVaTen: 'Nguyễn An' }, ngayTao: new Date().toISOString(), thoiDiemXuLy: null, lyDoXuLy: null }]) as YeuCauCapNhatHoSo[])
    mocks.rejectUpdateRequest.mockResolvedValue({ trangThai: 'DA_TU_CHOI' })
    renderPage()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Yêu cầu đang chờ xử lý' }), { button: 0 })
    await screen.findByText('Nguyễn An')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Thao tác yêu cầu của Nguyễn An' }), { button: 0, pointerType: 'mouse' })
    fireEvent.click(await screen.findByText('Từ chối'))
    const reason = screen.getByRole('textbox', { name: 'Lý do từ chối' })
    expect(reason).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xác nhận từ chối' })).toBeDisabled()
    fireEvent.change(reason, { target: { value: '<p>Vui lòng bổ sung giấy tờ.</p>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }))
    await waitFor(() => expect(mocks.rejectUpdateRequest).toHaveBeenCalledWith('request-a', '<p>Vui lòng bổ sung giấy tờ.</p>'))
  })
})
