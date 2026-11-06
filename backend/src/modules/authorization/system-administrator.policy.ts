import { ConflictException } from '@nestjs/common'
import type { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { permissionCatalog, type MaPermission } from './permission-catalog'

export const systemAdministratorRoleCode = 'QUAN_TRI_VIEN_TOAN_HE_THONG'
export const systemAdministratorRoleDescription = 'Được cấp toàn bộ Permission trong danh mục hệ thống; thao tác vẫn ghi nhật ký và tuân thủ ràng buộc an toàn.'

/** The full-system administrator receives every Permission defined by the system catalog. */
export const systemAdministratorPermissionCodes: readonly MaPermission[] = permissionCatalog

export async function demQuanTriVienToanHeThongHopLe(
  tx: Prisma.TransactionClient,
  now = new Date(),
  excluding?: { maTaiKhoan?: string; maPhanCong?: string },
) {
  const assignments = await tx.phanCongVaiTro.findMany({
    where: {
      ...(excluding?.maTaiKhoan ? { maTaiKhoan: { not: excluding.maTaiKhoan } } : {}),
      ...(excluding?.maPhanCong ? { ma: { not: excluding.maPhanCong } } : {}),
      loaiPhamVi: 'TOAN_HE_THONG',
      ngayHieuLucTu: { lte: now },
      OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
      thuHoiLuc: null,
      taiKhoan: { trangThai: 'DANG_HOAT_DONG' },
      vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true, trangThai: 'DANG_HOAT_DONG' },
    },
    select: { maTaiKhoan: true },
  })
  return new Set(assignments.map(({ maTaiKhoan }) => maTaiKhoan)).size
}

export async function khoaKiemTraQuanTriVienCuoi(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`LOCK TABLE "tai_khoan_nguoi_dung", "vai_tro", "phan_cong_vai_tro" IN EXCLUSIVE MODE`
}

export async function yeuCauConQuanTriVienHopLe(
  tx: Prisma.TransactionClient,
  excluding?: { maTaiKhoan?: string; maPhanCong?: string },
) {
  if (await demQuanTriVienToanHeThongHopLe(tx, new Date(), excluding) === 0) {
    throw new ConflictException({
      maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG',
      thongBao: 'Không thể thực hiện thao tác vì hệ thống phải còn ít nhất một Quản trị viên toàn hệ thống hợp lệ.',
    })
  }
}
