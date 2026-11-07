import type { TaiKhoan } from '../api/accounts.api'
import type { AccountRecord, AccountStatus, MemberProfile } from '../types/accounts.models'

export function toMemberProfile(profile: NonNullable<TaiKhoan['hoSoDangVien']>): MemberProfile {
  return {
    id: profile.ma,
    code: profile.maHoSoNoiBo,
    name: profile.hoVaTen,
    cccd: profile.cccd,
    birthDate: profile.ngaySinh ?? null,
    partyBranch: profile.chiBoHienTai ?? 'Chưa ghi nhận Chi bộ',
    branchId: profile.maChiBoHienTai,
    group: profile.toHienTai ?? null,
    status: profile.trangThai,
  }
}

export function toAccountRecord(row: TaiKhoan): AccountRecord {
  return {
    id: row.maTaiKhoan,
    login: row.tenDangNhap,
    email: row.email ?? '',
    status: row.trangThai as AccountStatus,
    createdAt: row.ngayTao,
    updatedAt: row.ngayCapNhat,
    lastLogin: row.dangNhapCuoiLuc,
    lockedUntil: row.khoaDen,
    passwordResetRequired: row.doiMatKhauLanDau,
    profile: row.hoSoDangVien ? toMemberProfile(row.hoSoDangVien) : null,
    assignments: row.phamViPhanCong.map((item) => ({
      role: item.tenVaiTro,
      scope: item.loaiPhamVi === 'TOAN_HE_THONG' ? 'Toàn hệ thống'
        : item.loaiPhamVi === 'CAY_DON_VI' ? `Cây đơn vị: ${item.tenDonViGoc ?? ''}`
          : item.loaiPhamVi === 'DON_VI_CHI_DINH' ? `Đơn vị: ${item.donViChiDinh.join(', ')}`
            : 'Cá nhân',
      expiresAt: item.ngayHieuLucDen,
      active: true,
    })),
    sessions: [],
    audit: [],
    deletable: true,
  }
}
