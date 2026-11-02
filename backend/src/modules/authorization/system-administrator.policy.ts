import { ConflictException } from '@nestjs/common'
import type { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { permissionCatalog } from './permission-catalog'

export const systemAdministratorRoleCode = 'QUAN_TRI_VIEN_TOAN_HE_THONG'

export const systemAdministratorPermissionCodes = [
  'TO_CHUC_XEM', 'TO_CHUC_TAO', 'TO_CHUC_SUA_THONG_TIN', 'TO_CHUC_SUA_LOAI',
  'TO_CHUC_DOI_DON_VI_CHA', 'TO_CHUC_XEM_LICH_SU', 'TO_CHUC_SUA_LICH_SU',
  'TO_CHUC_DOI_TRANG_THAI', 'TO_CHUC_KHOI_PHUC', 'TO_CHUC_XOA',
  'TAI_KHOAN_XEM', 'TAI_KHOAN_TAO', 'TAI_KHOAN_SUA_THONG_TIN', 'TAI_KHOAN_KHOA_MO_KHOA',
  'TAI_KHOAN_THU_HOI_PHIEN', 'TAI_KHOAN_LIEN_KET_HO_SO',
  'VAI_TRO_XEM', 'VAI_TRO_TAO', 'VAI_TRO_SUA', 'VAI_TRO_XOA', 'VAI_TRO_GAN_QUYEN',
  'PHAN_CONG_VAI_TRO_XEM', 'PHAN_CONG_VAI_TRO_TAO', 'PHAN_CONG_VAI_TRO_SUA', 'PHAN_CONG_VAI_TRO_THU_HOI',
  'QUYEN_XEM_DANH_MUC', 'NHAT_KY_KIEM_TOAN_XEM', 'NHAT_KY_BAO_MAT_XEM', 'NHAT_KY_KIEM_TOAN_XUAT',
  'CAU_HINH_HE_THONG_XEM', 'CAU_HINH_HE_THONG_SUA', 'VAN_HANH_HE_THONG',
] as const

const catalog = new Set<string>(permissionCatalog)
for (const code of systemAdministratorPermissionCodes) {
  if (!catalog.has(code)) throw new Error(`Permission quản trị hệ thống chưa có trong danh mục: ${code}`)
}

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
