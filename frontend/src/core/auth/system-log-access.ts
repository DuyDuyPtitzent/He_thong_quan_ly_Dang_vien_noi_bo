import type { TaiKhoanPhien } from './auth.types'

export const SYSTEM_ADMINISTRATOR_ROLE_CODE = 'QUAN_TRI_VIEN_TOAN_HE_THONG'

/** UI gate only. Backend independently validates the current session Assignment and Permission. */
export function coQuyenTruyCapNhatKyToanHeThong(account: TaiKhoanPhien | null | undefined) {
  if (!account) return false
  const activeAssignment = account.phanCongHopLe.find(
    ({ maPhanCong }) => maPhanCong === account.maPhanCongVaiTroDangHoatDong,
  )
  return activeAssignment?.maVaiTro === SYSTEM_ADMINISTRATOR_ROLE_CODE &&
    activeAssignment.loaiPhamVi === 'TOAN_HE_THONG' &&
    (account.quyenDangHoatDong.includes('NHAT_KY_KIEM_TOAN_XEM') ||
      account.quyenDangHoatDong.includes('NHAT_KY_BAO_MAT_XEM'))
}

/** UI gate only. The API separately enforces this system role, global Scope, and VAI_TRO_GAN_QUYEN. */
export function coTheSuaMaTranVaiTroHeThong(account: TaiKhoanPhien | null | undefined) {
  if (!account) return false
  const activeAssignment = account.phanCongHopLe.find(
    ({ maPhanCong }) => maPhanCong === account.maPhanCongVaiTroDangHoatDong,
  )
  return activeAssignment?.maVaiTro === SYSTEM_ADMINISTRATOR_ROLE_CODE &&
    activeAssignment.loaiPhamVi === 'TOAN_HE_THONG' &&
    account.quyenDangHoatDong.includes('VAI_TRO_GAN_QUYEN')
}
