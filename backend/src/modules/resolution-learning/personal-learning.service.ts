import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import type { LichHocCaNhanQueryDto, LichSuThamGiaCaNhanQueryDto } from './personal-learning.dto'

const permission = 'HOC_TAP_NGHI_QUYET_CA_NHAN_XEM'
const maLoiKhongThuocPhamVi = { maLoi: 'BUOI_KHONG_THUOC_PHAM_VI_CA_NHAN', thongBao: 'Không tìm thấy buổi học trong lịch cá nhân của bạn.' }

@Injectable()
export class HocTapCaNhanService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService) {}

  private async profile(actor: TaiKhoanDaXacThuc) {
    await this.permissions.kiemTraQuyenCaNhan(actor.maTaiKhoan, permission, actor.maPhien)
    const profiles = await this.prisma.hoSoDangVien.findMany({ where: { maTaiKhoan: actor.maTaiKhoan }, select: { ma: true }, take: 2 })
    const profile = profiles[0]
    if (profiles.length !== 1 || !profile) throw new ForbiddenException({ maLoi: profiles.length ? 'LIEN_KET_HO_SO_KHONG_HOP_LE' : 'TAI_KHOAN_CHUA_LIEN_KET_HO_SO', thongBao: profiles.length ? 'Liên kết hồ sơ của tài khoản không hợp lệ; vui lòng liên hệ quản trị viên.' : 'Tài khoản chưa được liên kết hồ sơ Đảng viên.' })
    return profile.ma
  }
  private validateQuery(query: { tuLuc?: string; denLuc?: string }) {
    for (const value of [query.tuLuc, query.denLuc]) if (value && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new BadRequestException({ maLoi: 'THIEU_MUI_GIO', thongBao: 'Bộ lọc thời gian phải dùng ISO-8601 kèm múi giờ.' })
    if (query.tuLuc && query.denLuc && new Date(query.tuLuc) > new Date(query.denLuc)) throw new BadRequestException({ maLoi: 'KHOANG_THOI_GIAN_KHONG_HOP_LE', thongBao: 'Thời điểm bắt đầu phải trước hoặc bằng thời điểm kết thúc.' })
  }
  private state(status: string) { return status === 'DA_HUY' ? 'DA_HUY' : status }
  private row(row: any) {
    return { maBuoi: row.ma, maBuoiNghiQuyet: row.maBuoi, tenBuoi: row.ten, maDot: row.maDot, tenDot: row.dotHoc.ten, maNamHoc: row.dotHoc.maNamHoc, tenNamHoc: row.dotHoc.namHoc.tenNamHoc, batDauLuc: row.batDauLuc, ketThucLuc: row.ketThucLuc, diaDiem: row.diaDiem, hinhThuc: row.hinhThuc, tenHinhThuc: row.giaTriHinhThuc?.tenHienThi ?? null, noiDung: row.noiDung, trangThaiBuoi: this.state(row.trangThai) }
  }
  private dateWhere(query: { tuLuc?: string; denLuc?: string }) {
    return { ...(query.tuLuc ? { ketThucLuc: { gte: new Date(query.tuLuc) } } : {}), ...(query.denLuc ? { batDauLuc: { lte: new Date(query.denLuc) } } : {}) }
  }
  private filterWhere(query: { maDot?: string; maNamHoc?: string }) {
    return { ...(query.maDot ? { maDot: query.maDot } : {}), ...(query.maNamHoc ? { dotHoc: { maNamHoc: query.maNamHoc } } : {}) }
  }
  private include: Prisma.BuoiHocNghiQuyetSelect = { dotHoc: { select: { ma: true, ten: true, maNamHoc: true, namHoc: { select: { tenNamHoc: true } } } }, giaTriHinhThuc: { select: { maGiaTri: true, tenHienThi: true } } }

  async lich(actor: TaiKhoanDaXacThuc, query: LichHocCaNhanQueryDto) {
    this.validateQuery(query)
    const maHoSo = await this.profile(actor)
    const now = new Date()
    const statusWhere: Prisma.BuoiHocNghiQuyetWhereInput = query.phanLoai === 'SAP_DIEN_RA' ? { trangThai: 'DA_LEN_LICH', batDauLuc: { gt: now } }
      : query.phanLoai === 'DANG_DIEN_RA' ? { trangThai: 'DANG_DIEN_RA' }
        : query.phanLoai === 'DA_KET_THUC' ? { trangThai: 'DA_KET_THUC' } : { trangThai: { in: ['DA_LEN_LICH', 'DANG_DIEN_RA', 'DA_KET_THUC'] } }
    const where: Prisma.BuoiHocNghiQuyetWhereInput = { ...this.filterWhere(query), ...this.dateWhere(query), AND: [statusWhere, { danhSachThamGia: { some: { maHoSo, trangThai: 'TRONG_DANH_SACH' } } }] }
    const [rows, total] = await this.prisma.$transaction([this.prisma.buoiHocNghiQuyet.findMany({ where, select: { ma: true, maBuoi: true, ten: true, maDot: true, batDauLuc: true, ketThucLuc: true, diaDiem: true, hinhThuc: true, noiDung: true, trangThai: true, ...this.include }, orderBy: [{ batDauLuc: 'asc' }, { ma: 'asc' }], skip: (query.trang - 1) * query.gioiHan, take: query.gioiHan }), this.prisma.buoiHocNghiQuyet.count({ where })])
    return { duLieu: rows.map(row => this.row(row)), phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo: total } }
  }

  async chiTiet(actor: TaiKhoanDaXacThuc, buoiId: string) {
    const maHoSo = await this.profile(actor)
    const row = await this.prisma.buoiHocNghiQuyet.findFirst({
      where: { ma: buoiId, AND: [
        { danhSachThamGia: { some: { maHoSo } } },
        { OR: [
          { danhSachThamGia: { some: { maHoSo, trangThai: 'TRONG_DANH_SACH' } } },
          { ketQuaDiemDanh: { some: { maHoSo } } },
          { lichSuDiemDanh: { some: { maHoSo } } },
        ] },
      ] },
      select: { ma: true, maBuoi: true, ten: true, maDot: true, batDauLuc: true, ketThucLuc: true, diaDiem: true, hinhThuc: true, noiDung: true, trangThai: true, dotHoc: this.include.dotHoc!, giaTriHinhThuc: this.include.giaTriHinhThuc!, ketQuaDiemDanh: { where: { maHoSo }, select: { trangThai: true } } },
    })
    if (!row) throw new NotFoundException(maLoiKhongThuocPhamVi)
    return { buoi: this.row(row), ketQuaDiemDanh: row.ketQuaDiemDanh[0]?.trangThai ?? 'CHUA_DIEM_DANH' }
  }

  async lichSu(actor: TaiKhoanDaXacThuc, query: LichSuThamGiaCaNhanQueryDto) {
    this.validateQuery(query)
    const maHoSo = await this.profile(actor)
    const where: Prisma.BuoiHocNghiQuyetWhereInput = { ...this.filterWhere(query), ...this.dateWhere(query), AND: [{ danhSachThamGia: { some: { maHoSo } } }, { OR: [{ danhSachThamGia: { some: { maHoSo, trangThai: 'TRONG_DANH_SACH' as const } } }, { ketQuaDiemDanh: { some: { maHoSo } } }, { lichSuDiemDanh: { some: { maHoSo } } }] }] }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.buoiHocNghiQuyet.findMany({
        where,
        select: {
          ma: true, maBuoi: true, ten: true, maDot: true, batDauLuc: true, ketThucLuc: true,
          diaDiem: true, hinhThuc: true, noiDung: true, trangThai: true,
          dotHoc: this.include.dotHoc!, giaTriHinhThuc: this.include.giaTriHinhThuc!,
          danhSachThamGia: { where: { maHoSo }, select: { trangThai: true } },
          ketQuaDiemDanh: { where: { maHoSo }, select: { trangThai: true } },
          lichSuDiemDanh: { where: { maHoSo }, select: { ma: true }, take: 1 },
        },
      }),
      this.prisma.buoiHocNghiQuyet.count({ where }),
    ])
    return { duLieu: rows.map(row => ({ ...this.row(row), ketQuaDiemDanh: row.ketQuaDiemDanh[0]?.trangThai ?? 'CHUA_DIEM_DANH', rosterHienHanh: row.danhSachThamGia[0]?.trangThai === 'TRONG_DANH_SACH', coLichSuDiemDanh: row.lichSuDiemDanh.length > 0 })), phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo: total } }
  }
}
