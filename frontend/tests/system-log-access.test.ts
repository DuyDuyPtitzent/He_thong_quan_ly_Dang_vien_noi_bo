import { describe, expect, it } from 'vitest'
import { coQuyenTruyCapNhatKyToanHeThong } from '@/core/auth/system-log-access'
import type { TaiKhoanPhien } from '@/core/auth/auth.types'

const account = (maVaiTro: string, loaiPhamVi: string): TaiKhoanPhien => ({
  maTaiKhoan: 'account-1', tenDangNhap: 'admin', doiMatKhauLanDau: false,
  maPhanCongVaiTroDangHoatDong: 'assignment-current',
  phanCongHopLe: [{ maPhanCong: 'assignment-current', maVaiTro, tenVaiTro: 'Tên hiển thị bất kỳ', loaiPhamVi, maDonViGoc: null, tenDonViGoc: null, donViChiDinh: [] }],
  quyenDangHoatDong: ['NHAT_KY_KIEM_TOAN_XEM'],
})

describe('system log access UI policy', () => {
  it('allows the active full-system administrator assignment with a log view Permission', () => {
    expect(coQuyenTruyCapNhatKyToanHeThong(account('QUAN_TRI_VIEN_TOAN_HE_THONG', 'TOAN_HE_THONG'))).toBe(true)
  })

  it('does not trust a display name or an ordinary permission-administration role', () => {
    expect(coQuyenTruyCapNhatKyToanHeThong(account('QUAN_TRI_PHAN_QUYEN', 'TOAN_HE_THONG'))).toBe(false)
  })

  it('does not allow a system administrator Role assigned only an organization tree', () => {
    expect(coQuyenTruyCapNhatKyToanHeThong(account('QUAN_TRI_VIEN_TOAN_HE_THONG', 'CAY_DON_VI'))).toBe(false)
  })

  it('requires a matching active assignment and at least one log view Permission', () => {
    const inactive = account('QUAN_TRI_VIEN_TOAN_HE_THONG', 'TOAN_HE_THONG')
    inactive.maPhanCongVaiTroDangHoatDong = 'another-assignment'
    expect(coQuyenTruyCapNhatKyToanHeThong(inactive)).toBe(false)
    const noPermission = account('QUAN_TRI_VIEN_TOAN_HE_THONG', 'TOAN_HE_THONG')
    noPermission.quyenDangHoatDong = []
    expect(coQuyenTruyCapNhatKyToanHeThong(noPermission)).toBe(false)
  })
})
