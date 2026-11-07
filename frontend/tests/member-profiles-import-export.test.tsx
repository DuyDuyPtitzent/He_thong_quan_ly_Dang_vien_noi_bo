import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberProfilesImportExport } from '@/features/member-profiles/components/import-export/MemberProfilesImportExport'

const mocks = vi.hoisted(() => ({ validateImport: vi.fn(), configureImportDates: vi.fn(), confirmImport: vi.fn(), template: vi.fn(), exportExcel: vi.fn(), exportConfiguration: vi.fn(), importErrorReport: vi.fn() }))

vi.mock('@/features/member-profiles/api/member-profiles.api', () => ({ memberProfilesApi: mocks }))
vi.mock('@/core/api/client', () => ({ normalizeApiError: () => ({ message: 'Lỗi' }) }))

describe('MemberProfilesImportExport', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('requires an explicit membership start date before import confirmation', async () => {
    const user = userEvent.setup()
    mocks.validateImport.mockResolvedValue({
      maPhienNhap: 'session-1', hetHanSauGiay: 600, tongSo: 1, hopLe: 1, coLoi: 0, chuaCoNgay: 1, canXacNhan: false, taoTaiKhoan: 0, loi: [],
      duLieu: [{ dong: 3, maHoSoNoiBo: 'HS-01', hoVaTen: 'Nguyễn An', ngaySinh: '2000-01-01', soCccd: '012345678901', gioiTinh: 'NAM', ngayVaoDang: '2020-01-01', khoaDangVien: 'D23', ngaySinhHoatTu: null, maChiBo: 'CB-01', maTo: null, trangThaiDangVien: 'DU_BI', taoTaiKhoan: false, hopLe: true }],
    })
    mocks.configureImportDates.mockResolvedValue({ ngaySinhHoat: [{ dong: 3, ngaySinhHoatTu: '2020-02-01' }], chuaCoNgay: 0, canXacNhan: true })
    mocks.confirmImport.mockResolvedValue({ tongSo: 1, matKhauBanDau: [], duLieu: [] })
    render(<MemberProfilesImportExport canImport canExport={false} filters={{}} />)

    await user.click(screen.getByRole('button', { name: 'Nhập dữ liệu' }))
    const file = new File(['excel'], 'members.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    expect(await screen.findByText(/1 hồ sơ còn thiếu ngày/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tiếp tục xác nhận/ })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Xem chi tiết' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ngày bắt đầu sinh hoạt dòng 3' }))
    fireEvent.change(screen.getByPlaceholderText('dd/MM/yyyy'), { target: { value: '01/02/2020' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(mocks.configureImportDates).toHaveBeenCalledWith('session-1', [{ dong: 3, ngaySinhHoatTu: '2020-02-01' }]))
    await user.click(screen.getByRole('button', { name: /Tiếp tục xác nhận/ }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /Xác nhận nhập/ }))
    await waitFor(() => expect(mocks.confirmImport).toHaveBeenCalledWith('session-1'))
  })

  it('exports the selected scope through the configured API', async () => {
    const user = userEvent.setup()
    mocks.exportExcel.mockResolvedValue(new Blob(['xlsx']))
    mocks.exportConfiguration.mockResolvedValue({ truong: [{ key: 'maHoSoNoiBo', label: 'Mã hồ sơ nội bộ', group: 'Thông tin hồ sơ' }], donVi: [] })
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:export'), revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<MemberProfilesImportExport canImport={false} canExport filters={{ tuKhoa: 'Nguyễn' }} />)

    await user.click(screen.getByRole('button', { name: 'Xuất dữ liệu' }))
    await user.click(screen.getByRole('radio', { name: /Tất cả Đảng viên trong phạm vi quản lý/ }))
    await user.click(screen.getByRole('button', { name: 'Xuất Excel' }))
    await waitFor(() => expect(mocks.exportExcel).toHaveBeenCalledWith({ cheDo: 'all', truong: ['maHoSoNoiBo'] }))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })

  it('keeps selected summary filters active, filters persisted matches and preserves search and validation filters', async () => {
    const user = userEvent.setup()
    mocks.validateImport.mockResolvedValue({
      maPhienNhap: null, hetHanSauGiay: 0, tongSo: 3, hopLe: 2, coLoi: 1, soDaTonTai: 1, chuaCoNgay: 0, canXacNhan: false, taoTaiKhoan: 1, loi: [],
      duLieu: [
        { dong: 3, maHoSoNoiBo: 'HS-01', hoVaTen: 'Nguyễn An', ngaySinh: '2000-01-01', soCccd: '012345678901', gioiTinh: 'NAM', ngayVaoDang: '2020-01-01', khoaDangVien: 'D23', ngaySinhHoatTu: '2020-02-01', maChiBo: 'CB-01', maTo: null, trangThaiDangVien: 'DU_BI', taoTaiKhoan: true, hopLe: true },
        { dong: 4, maHoSoNoiBo: 'HS-02', hoVaTen: 'Trần Bình', ngaySinh: '2000-02-01', soCccd: '012345678902', gioiTinh: 'NU', ngayVaoDang: '2020-03-01', khoaDangVien: 'D24', ngaySinhHoatTu: '2020-04-01', maChiBo: 'CB-01', maTo: null, trangThaiDangVien: 'CHINH_THUC', taoTaiKhoan: false, hopLe: false, daTonTai: true },
        { dong: 5, maHoSoNoiBo: 'HS-03', hoVaTen: 'Lê Chi', ngaySinh: '2000-05-01', soCccd: '012345678903', gioiTinh: 'NU', ngayVaoDang: '2020-06-01', khoaDangVien: 'D25', ngaySinhHoatTu: '2020-07-01', maChiBo: 'CB-02', maTo: null, trangThaiDangVien: 'CHINH_THUC', taoTaiKhoan: false, hopLe: true },
      ],
    })
    render(<MemberProfilesImportExport canImport canExport={false} filters={{}} />)
    await user.click(screen.getByRole('button', { name: 'Nhập dữ liệu' }))
    const file = new File(['excel'], 'members.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()

    const validCard = screen.getByRole('button', { name: /Lọc danh sách: Hồ sơ hợp lệ, 2/ })
    expect(validCard.querySelector('[data-slot="card"]')?.className).not.toMatch(/\bscale-/)
    expect(validCard).not.toHaveTextContent('Nhấn để lọc')
    expect(validCard).toHaveAttribute('aria-pressed', 'false')
    await user.click(validCard)
    expect(validCard).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.getByText('Lê Chi')).toBeInTheDocument()
    expect(screen.queryByText('Trần Bình')).not.toBeInTheDocument()
    await user.click(validCard)
    expect(validCard).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Trần Bình')).not.toBeInTheDocument()

    const existingCard = screen.getByRole('button', { name: /Lọc danh sách: Hồ sơ đã tồn tại, 1/ })
    await user.click(existingCard)
    expect(screen.getByText('Trần Bình')).toBeInTheDocument()
    expect(screen.getByText('Đã tồn tại')).toBeInTheDocument()
    expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
    await user.click(existingCard)
    expect(existingCard).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Lọc danh sách: Tổng số hồ sơ, 3/ }))
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Lọc danh sách: Tạo tài khoản, 1/ }))
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.queryByText('Trần Bình')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tìm hồ sơ'), { target: { value: 'HS-03' } })
    expect(screen.queryByText('Nguyễn An')).not.toBeInTheDocument()
    expect(screen.getByText('Không có hồ sơ khớp bộ lọc.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lọc danh sách: Tạo tài khoản, 1/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Nhấn để lọc')).not.toBeInTheDocument()
  })
})
