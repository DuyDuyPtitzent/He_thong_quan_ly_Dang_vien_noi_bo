import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { YeuCauPhamVi } from './authorization.types'

const trangThaiHoatDong = 'DANG_HOAT_DONG'

@Injectable()
export class PhanQuyenService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma) {}

  async kiemTra(
    maTaiKhoan: string,
    maQuyen: string,
    phamViYeuCau: YeuCauPhamVi = {},
  ): Promise<void> {
    const assignments = await this.layAssignments(maTaiKhoan)

    for (const assignment of assignments) {
      // Permission and Scope are deliberately evaluated on the same Assignment.
      if (!assignment.vaiTro.quyen.some(({ quyen }) => quyen.maDinhDanh === maQuyen)) continue
      if (await this.assignmentBaoPhu(assignment, maTaiKhoan, phamViYeuCau)) return
    }

    throw new ForbiddenException({
      maLoi: 'KHONG_DU_QUYEN',
      thongBao: 'Tài khoản không có Permission và phạm vi phù hợp để thực hiện thao tác này.',
    })
  }

  async layDonViTrongPhamVi(maTaiKhoan: string, maQuyen: string) {
    const assignments = await this.layAssignments(maTaiKhoan)
    const phuHop = assignments.filter((assignment) =>
      assignment.vaiTro.quyen.some(({ quyen }) => quyen.maDinhDanh === maQuyen),
    )
    if (phuHop.some(({ loaiPhamVi }) => loaiPhamVi === 'TOAN_HE_THONG')) {
      return { coQuyen: phuHop.length > 0, toanHeThong: true, maDonVi: [] as string[] }
    }
    const ids = new Set<string>()
    for (const assignment of phuHop) {
      if (assignment.loaiPhamVi === 'DON_VI_CHI_DINH') {
        for (const { maDonVi } of assignment.phamViDonViChiDinh) ids.add(maDonVi)
      }
      if (assignment.loaiPhamVi === 'CAY_DON_VI' && assignment.maDonViGoc) {
        const children = await this.prisma.$queryRaw<Array<{ maDonVi: string }>>`
          WITH RECURSIVE cay(ma_don_vi) AS (
            SELECT ${assignment.maDonViGoc}::uuid
            UNION
            SELECT q.ma_don_vi_con
            FROM lich_su_quan_he_don_vi q
            JOIN cay c ON q.ma_don_vi_cha = c.ma_don_vi
            WHERE q.ngay_hieu_luc_tu <= NOW()
              AND (q.ngay_hieu_luc_den IS NULL OR q.ngay_hieu_luc_den > NOW())
          )
          SELECT ma_don_vi AS "maDonVi" FROM cay
        `
        for (const { maDonVi } of children) ids.add(maDonVi)
      }
    }
    return { coQuyen: phuHop.length > 0, toanHeThong: false, maDonVi: [...ids] }
  }

  private async layAssignments(maTaiKhoan: string) {
    const hienTai = new Date()
    return this.prisma.phanCongVaiTro.findMany({
      where: {
        maTaiKhoan,
        ngayHieuLucTu: { lte: hienTai },
        OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: hienTai } }],
        thuHoiLuc: null,
        vaiTro: { trangThai: trangThaiHoatDong },
      },
      include: {
        vaiTro: { include: { quyen: { include: { quyen: true } } } },
        phamViDonViChiDinh: { select: { maDonVi: true } },
      },
    })
  }

  private async assignmentBaoPhu(
    assignment: {
      maTaiKhoan: string
      loaiPhamVi: string
      maDonViGoc: string | null
      phamViDonViChiDinh: { maDonVi: string }[]
    },
    maTaiKhoan: string,
    target: YeuCauPhamVi,
  ) {
    const donViDich = target.maDonVi
      ? [target.maDonVi]
      : target.maHoSo
        ? await this.layDonViSinhHoatHienTai(target.maHoSo)
        : []
    switch (assignment.loaiPhamVi) {
      case 'TOAN_HE_THONG':
        return true
      case 'CA_NHAN':
        if (!target.maHoSo) return false
        return Boolean(
          await this.prisma.hoSoDangVien.findFirst({
            where: { ma: target.maHoSo, maTaiKhoan },
            select: { ma: true },
          }),
        )
      case 'DON_VI_CHI_DINH':
        return donViDich.some((maDonVi) =>
          assignment.phamViDonViChiDinh.some((phamVi) => phamVi.maDonVi === maDonVi),
        )
      case 'CAY_DON_VI':
        if (!assignment.maDonViGoc || donViDich.length === 0) return false
        for (const maDonVi of donViDich) {
          if (await this.namTrongCay(maDonVi, assignment.maDonViGoc)) return true
        }
        return false
      default:
        return false
    }
  }

  private async layDonViSinhHoatHienTai(maHoSo: string) {
    const hienTai = new Date()
    const sinhHoat = await this.prisma.lichSuDonViDangVien.findFirst({
      where: {
        maHoSo,
        ngayHieuLucTu: { lte: hienTai },
        OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: hienTai } }],
      },
      select: { maTo: true, maChiBo: true },
    })
    return sinhHoat ? [sinhHoat.maChiBo, ...(sinhHoat.maTo ? [sinhHoat.maTo] : [])] : []
  }

  private async namTrongCay(maDonViDich: string, maDonViGoc: string) {
    if (maDonViDich === maDonViGoc) return true
    const ketQua = await this.prisma.$queryRaw<Array<{ found: boolean }>>`
      WITH RECURSIVE to_tien(ma_don_vi) AS (
        SELECT ${maDonViDich}::uuid
        UNION
        SELECT q.ma_don_vi_cha
        FROM lich_su_quan_he_don_vi q
        JOIN to_tien t ON q.ma_don_vi_con = t.ma_don_vi
        WHERE q.ngay_hieu_luc_tu <= NOW()
          AND (q.ngay_hieu_luc_den IS NULL OR q.ngay_hieu_luc_den > NOW())
      )
      SELECT EXISTS (SELECT 1 FROM to_tien WHERE ma_don_vi = ${maDonViGoc}::uuid) AS found
    `
    return ketQua[0]?.found === true
  }
}
