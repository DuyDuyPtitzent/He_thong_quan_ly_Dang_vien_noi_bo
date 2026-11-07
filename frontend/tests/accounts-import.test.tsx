import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountImportDialog } from '../src/features/accounts/components/AccountImportDialog'
import { AccountImportRowsTable } from '../src/features/accounts/components/AccountImportRowsTable'
import type { AccountImportRow } from '../src/features/accounts/api/accounts.api'

const api = vi.hoisted(() => ({ importTemplate: vi.fn(), validateImport: vi.fn(), confirmImport: vi.fn(), importErrorReport: vi.fn() }))
vi.mock('../src/features/accounts/api/accounts.api', () => ({ accountsApi: api }))
vi.mock('../src/core/api/client', () => ({ normalizeApiError: (cause: unknown) => ({ message: cause instanceof Error ? cause.message : 'Lỗi', correlationId: null }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

describe('AccountImportDialog', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('validates a workbook, confirms creation and uses result cards as list filters', async () => {
    const user = userEvent.setup()
    const onImported = vi.fn(), onFilter = vi.fn(), onOpenChange = vi.fn()
    api.validateImport.mockResolvedValue({ maPhienNhap: 'session', hetHanSauGiay: 600, tongSo: 2, hopLe: 2, coLoi: 0, soDaTonTai: 0, soTaiKhoanLienKet: 1, soTaiKhoanDocLap: 1, loi: [], duLieu: [{ dong: 2, tenDangNhap: 'account01', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: true, hopLe: true, daTonTai: false, trangThaiTonTai: 'CHUA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] }, { dong: 3, tenDangNhap: 'account02', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: false, hopLe: true, daTonTai: false, trangThaiTonTai: 'CHUA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] }] })
    api.confirmImport.mockResolvedValue({ tongSo: 2, soTaiKhoanLienKet: 1, soTaiKhoanDocLap: 1, duLieu: [
      { dong: 2, tenDangNhap: 'account01', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: true, hopLe: true, daTonTai: true, trangThaiTonTai: 'DA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] },
      { dong: 3, tenDangNhap: 'account02', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: false, hopLe: true, daTonTai: true, trangThaiTonTai: 'DA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] },
    ] })
    render(<AccountImportDialog open onOpenChange={onOpenChange} canLinkProfiles onImported={onImported} onFilter={onFilter} />)
    const dialog = screen.getByRole('dialog')
    const file = new File(['xlsx'], 'accounts.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await user.upload(within(dialog).getByLabelText(/Chọn tệp Excel để tải lên/), file)
    await user.click(within(dialog).getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(api.validateImport).toHaveBeenCalledWith(file, 'DOC_LAP'))
    expect(await within(dialog).findByText('account01')).toBeInTheDocument()
    expect(within(dialog).queryByText(/Mật khẩu khởi tạo.*correct/i)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Tiếp tục xác nhận/ }))
    expect(within(dialog).getByRole('region', { name: 'Danh sách tài khoản xác nhận nhập' })).toBeInTheDocument()
    await user.click(within(dialog).getByLabelText(/Tôi xác nhận tạo các tài khoản/))
    await user.click(within(dialog).getByRole('button', { name: /Xác nhận nhập/ }))
    await waitFor(() => expect(api.confirmImport).toHaveBeenCalledWith('session'))
    expect(await within(dialog).findByRole('region', { name: 'Kết quả nhập tài khoản' })).toBeInTheDocument()
    expect(within(dialog).getAllByText('Đã tồn tại')).toHaveLength(2)
    expect(onImported).toHaveBeenCalledOnce()
    await user.click(within(dialog).getByRole('button', { name: /Tài khoản độc lập, 1/ }))
    expect(onFilter).toHaveBeenCalledWith('unlinked')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('filters preview rows by their own validation status and account type', async () => {
    const user = userEvent.setup()
    api.validateImport.mockResolvedValue({
      maPhienNhap: null, hetHanSauGiay: 0, tongSo: 3, hopLe: 2, coLoi: 1, soDongChuaKiemTra: 0,
      soTaiKhoanLienKet: 0, soTaiKhoanDocLap: 3, soDaTonTai: 1, loi: [{ row: 3, field: 'Tên đăng nhập', message: 'Tên đăng nhập đã tồn tại trong hệ thống.' }, { row: 3, field: 'Email', message: 'Email không đúng định dạng.' }, { row: 3, field: 'Mật khẩu khởi tạo', message: 'Mật khẩu phải đủ độ dài.' }],
      duLieu: [
        { dong: 2, tenDangNhap: 'valid-one', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: false, hopLe: true, daTonTai: false, trangThaiTonTai: 'CHUA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] },
        { dong: 3, tenDangNhap: 'invalid-two', email: 'bad-email', trangThai: 'DANG_HOAT_DONG', lienKetHoSo: false, hopLe: false, daTonTai: true, trangThaiTonTai: 'DA_TON_TAI', trangThaiKiemTra: 'CO_LOI', loi: [{ row: 3, field: 'Tên đăng nhập', message: 'Tên đăng nhập đã tồn tại trong hệ thống.' }, { row: 3, field: 'Email', message: 'Email không đúng định dạng.' }, { row: 3, field: 'Mật khẩu khởi tạo', message: 'Mật khẩu phải đủ độ dài.' }] },
        { dong: 4, tenDangNhap: 'valid-three', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: false, hopLe: true, daTonTai: false, trangThaiTonTai: 'CHUA_TON_TAI', trangThaiKiemTra: 'HOP_LE', loi: [] },
      ],
    })
    render(<AccountImportDialog open onOpenChange={vi.fn()} canLinkProfiles onImported={vi.fn()} onFilter={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const file = new File(['xlsx'], 'accounts.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await user.upload(within(dialog).getByLabelText('Tệp Excel cần nhập'), file)
    await user.click(within(dialog).getByRole('button', { name: /Tiếp tục kiểm tra/ }))

    expect(await within(dialog).findByText('valid-one')).toBeInTheDocument()
    expect(within(dialog).getByRole('columnheader', { name: 'Trạng thái tồn tại' })).toBeInTheDocument()
    expect(within(dialog).getByRole('columnheader', { name: 'Lỗi chi tiết' })).toBeInTheDocument()
    expect(within(dialog).getByText('Tên đăng nhập: Tên đăng nhập đã tồn tại trong hệ thống.')).toBeInTheDocument()
    expect(within(dialog).queryByText('Mật khẩu khởi tạo: Mật khẩu phải đủ độ dài.')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Xem thêm (1)' }))
    expect(within(dialog).getByText('Mật khẩu khởi tạo: Mật khẩu phải đủ độ dài.')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Hợp lệ', { selector: '[data-slot="badge"]' })).toHaveLength(2)
    await user.click(within(dialog).getByRole('button', { name: /Lọc danh sách: Hợp lệ, 2/ }))
    expect(within(dialog).getByText('valid-one')).toBeInTheDocument()
    expect(within(dialog).getByText('valid-three')).toBeInTheDocument()
    expect(within(dialog).queryByText('invalid-two')).not.toBeInTheDocument()
    const validCard = within(dialog).getByRole('button', { name: /Lọc danh sách: Hợp lệ, 2/ })
    expect(validCard.querySelector('[data-slot="card"]')?.className).not.toMatch(/\bscale-/)
    expect(validCard).not.toHaveTextContent('Đang lọc · nhấn để bỏ lọc')
    expect(validCard).toHaveAttribute('aria-pressed', 'true')
    await user.click(validCard)
    expect(validCard).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).queryByText('invalid-two')).not.toBeInTheDocument()
    const existingCard = within(dialog).getByRole('button', { name: /Lọc danh sách: Tài khoản đã tồn tại, 1/ })
    await user.click(existingCard)
    expect(within(dialog).getByText('invalid-two')).toBeInTheDocument()
    expect(within(dialog).getByText('Đã tồn tại')).toBeInTheDocument()
    await user.click(existingCard)
    expect(existingCard).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).queryByText('valid-one')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Lọc danh sách: Tổng số dòng, 3/ }))
    expect(within(dialog).getByText('valid-one')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Lọc danh sách: Có lỗi, 1/ }))
    expect(within(dialog).getByText('invalid-two')).toBeInTheDocument()
    expect(within(dialog).queryByText('valid-one')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Tài khoản độc lập', { selector: 'p' })).toBeInTheDocument()
  })

  it('shows an explicit unverified existence status when Backend has not completed that check', () => {
    const row: AccountImportRow = { dong: 2, tenDangNhap: 'pending-account', email: null, trangThai: 'DANG_HOAT_DONG', lienKetHoSo: false, hopLe: false, daTonTai: false, trangThaiTonTai: 'CHUA_KIEM_TRA', trangThaiKiemTra: 'CHUA_KIEM_TRA_DUOC', loi: [] }
    render(<AccountImportRowsTable rows={[row]} label="Bản xem trước" />)

    const table = within(screen.getByRole('region', { name: 'Bản xem trước' }))
    expect(table.getByText('Chưa kiểm tra')).toBeInTheDocument()
    expect(table.getByText('Có lỗi', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
  })

})
