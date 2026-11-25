import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import type { MucDoThamGiaQueryDto, ThongKeDotQueryDto, ThongKeHocTapQueryDto } from './statistics.dto'

const permission = 'HOC_TAP_NGHI_QUYET_THONG_KE_XEM'
type Filter = ThongKeHocTapQueryDto & { maDot?: string; maBuoiId?: string }
type Access = { coQuyen: boolean; toanHeThong: boolean; maDonVi: string[] }
type Aggregate = { khoa: string | null; ten?: string | null; tongLuot: number; coMat: number; vangCoPhep: number; vangKhongPhep: number; chuaDiemDanh: number; soNguoiDuyNhat: number; soBuoi: number }

@Injectable()
export class ThongKeHocTapNghiQuyetService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService) {}

  private async access(actor: TaiKhoanDaXacThuc): Promise<Access> {
    const value = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!value.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_CO_QUYEN_THONG_KE', thongBao: 'Bạn chưa được cấp quyền xem thống kê trong Assignment đang hoạt động.' })
    if (!value.toanHeThong && !value.maDonVi.length) throw new ForbiddenException({ maLoi: 'SCOPE_KHONG_HO_TRO_THONG_KE', thongBao: 'Scope hiện tại không được phép xem thống kê tổ chức.' })
    return value
  }
  private assertFilterScope(access: Access, maChiBo?: string) {
    if (maChiBo && !access.toanHeThong && !access.maDonVi.includes(maChiBo)) throw new ForbiddenException({ maLoi: 'CHI_BO_NGOAI_PHAM_VI', thongBao: 'Chi bộ lọc nằm ngoài Scope của Assignment đang hoạt động.' })
  }
  private validateRange(query: { tuLuc?: string; denLuc?: string }) {
    for (const value of [query.tuLuc, query.denLuc]) if (value && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new BadRequestException({ maLoi: 'THIEU_MUI_GIO', thongBao: 'Bộ lọc thời gian phải dùng ISO-8601 kèm múi giờ.' })
    if (query.tuLuc && query.denLuc && new Date(query.tuLuc) > new Date(query.denLuc)) throw new BadRequestException({ maLoi: 'KHOANG_THOI_GIAN_KHONG_HOP_LE', thongBao: 'Thời điểm bắt đầu phải trước hoặc bằng thời điểm kết thúc.' })
  }
  private scopeSql(access: Access, column: Prisma.Sql) { return access.toanHeThong ? Prisma.sql`` : Prisma.sql`AND ${column} IN (${Prisma.join(access.maDonVi)})` }
  private filterSql(query: Filter, alias = 'b') {
    const b = Prisma.raw(alias)
    const parts: Prisma.Sql[] = []
    if (query.maDot) parts.push(Prisma.sql`${b}.ma_dot = ${query.maDot}::uuid`)
    if (query.maBuoiId) parts.push(Prisma.sql`${b}.ma_buoi = ${query.maBuoiId}::uuid`)
    if (query.maNamHoc) parts.push(Prisma.sql`d.ma_nam_hoc = ${query.maNamHoc}::uuid`)
    if (query.tuLuc) parts.push(Prisma.sql`${b}.ket_thuc_luc >= ${new Date(query.tuLuc)}`)
    if (query.denLuc) parts.push(Prisma.sql`${b}.bat_dau_luc <= ${new Date(query.denLuc)}`)
    return parts.length ? Prisma.sql`AND ${Prisma.join(parts, ' AND ')}` : Prisma.sql``
  }
  private async aggregate(access: Access, query: Filter, dimension?: 'DOT' | 'BUOI' | 'CHI_BO') {
    this.assertFilterScope(access, query.maChiBo)
    const unitScope = this.scopeSql(access, Prisma.raw('r.ma_chi_bo_snapshot'))
    const unitFilter = query.maChiBo ? Prisma.sql`AND r.ma_chi_bo_snapshot = ${query.maChiBo}::uuid` : Prisma.sql``
    const groupColumn = dimension === 'DOT' ? Prisma.raw('b.ma_dot::text') : dimension === 'BUOI' ? Prisma.raw('b.ma_buoi::text') : dimension === 'CHI_BO' ? Prisma.raw('r.ma_chi_bo_snapshot::text') : null
    const selectGroup = groupColumn ? Prisma.sql`${groupColumn} AS "khoa", ${dimension === 'CHI_BO' ? Prisma.raw('MAX(r.ten_chi_bo_snapshot)') : Prisma.raw('NULL::text')} AS "ten",` : Prisma.sql`NULL::text AS "khoa", NULL::text AS "ten",`
    const groupBy = groupColumn ? Prisma.sql`GROUP BY ${groupColumn}${dimension === 'CHI_BO' ? Prisma.sql`, r.ten_chi_bo_snapshot` : Prisma.sql``}` : Prisma.sql``
    return this.prisma.$queryRaw<Aggregate[]>`
      SELECT ${selectGroup}
        COUNT(*)::int AS "tongLuot",
        COUNT(*) FILTER (WHERE k.trang_thai = 'CO_MAT')::int AS "coMat",
        COUNT(*) FILTER (WHERE k.trang_thai = 'VANG_CO_PHEP')::int AS "vangCoPhep",
        COUNT(*) FILTER (WHERE k.trang_thai = 'VANG_KHONG_PHEP')::int AS "vangKhongPhep",
        COUNT(*) FILTER (WHERE k.ma_ket_qua IS NULL OR k.trang_thai IS NULL)::int AS "chuaDiemDanh",
        COUNT(DISTINCT r.ma_ho_so)::int AS "soNguoiDuyNhat",
        COUNT(DISTINCT b.ma_buoi)::int AS "soBuoi"
      FROM buoi_hoc_nghi_quyet b
      JOIN dot_hoc_nghi_quyet d ON d.ma_dot = b.ma_dot
      JOIN danh_sach_tham_gia_buoi_hoc r ON r.ma_buoi = b.ma_buoi AND r.trang_thai = 'TRONG_DANH_SACH'
      LEFT JOIN ket_qua_diem_danh k ON k.ma_buoi = b.ma_buoi AND k.ma_ho_so = r.ma_ho_so
      WHERE b.trang_thai <> 'DA_HUY' ${unitScope} ${unitFilter} ${this.filterSql(query)}
      ${groupBy}
    `
  }
  private emptyAggregate(): Aggregate { return { khoa: null, tongLuot: 0, coMat: 0, vangCoPhep: 0, vangKhongPhep: 0, chuaDiemDanh: 0, soNguoiDuyNhat: 0, soBuoi: 0 } }
  private rate(coMat: number, tongLuot: number) { return tongLuot === 0 ? null : Math.round(coMat * 10_000 / tongLuot) / 100 }
  private state(tongLuot: number) { return tongLuot === 0 ? 'CHUA_CO_DU_LIEU' : 'CO_DU_LIEU' }

  async theoDot(actor: TaiKhoanDaXacThuc, id: string, query: ThongKeDotQueryDto) {
    const access = await this.access(actor)
    this.validateRange(query)
    const dot = await this.prisma.dotHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, maDot: true, ten: true, maNamHoc: true, ngayBatDau: true, ngayKetThuc: true, trangThai: true, phamVi: { select: { maDonVi: true } }, namHoc: { select: { tenNamHoc: true } } } })
    if (!dot) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT', thongBao: 'Không tìm thấy đợt học.' })
    if (!access.toanHeThong && !dot.phamVi.some(unit => access.maDonVi.includes(unit.maDonVi))) throw new ForbiddenException({ maLoi: 'DOT_NGOAI_PHAM_VI', thongBao: 'Đợt học không có đơn vị thuộc Scope của Assignment đang hoạt động.' })
    const filters = { ...query, maDot: id }
    const [aggregates, sessions] = await Promise.all([
      this.aggregate(access, filters),
      this.prisma.buoiHocNghiQuyet.count({ where: { maDot: id, trangThai: { not: 'DA_HUY' }, ...(query.tuLuc ? { ketThucLuc: { gte: new Date(query.tuLuc) } } : {}), ...(query.denLuc ? { batDauLuc: { lte: new Date(query.denLuc) } } : {}), phamVi: { some: { maDonVi: query.maChiBo ?? (access.toanHeThong ? undefined : { in: access.maDonVi }) } }, ...(query.maChiBo ? { danhSachThamGia: { some: { trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: query.maChiBo } } } : {}) } }),
    ])
    const totals = aggregates[0] ?? this.emptyAggregate()
    return { dot: { ma: dot.ma, maDot: dot.maDot, ten: dot.ten, maNamHoc: dot.maNamHoc, tenNamHoc: dot.namHoc.tenNamHoc, trangThai: dot.trangThai, ngayBatDau: dot.ngayBatDau, ngayKetThuc: dot.ngayKetThuc }, tongSoBuoi: sessions, soDangVienDuyNhat: totals.soNguoiDuyNhat, tongLuot: totals.tongLuot, coMat: totals.coMat, vangCoPhep: totals.vangCoPhep, vangKhongPhep: totals.vangKhongPhep, chuaDiemDanh: totals.chuaDiemDanh, tyLeThamGia: this.rate(totals.coMat, totals.tongLuot), trangThaiDuLieu: this.state(totals.tongLuot) }
  }

  async theoBuoi(actor: TaiKhoanDaXacThuc, id: string) {
    const access = await this.access(actor)
    const buoi = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, maBuoi: true, ten: true, maDot: true, batDauLuc: true, ketThucLuc: true, trangThai: true, phamVi: { select: { maDonVi: true } } } })
    if (!buoi) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    if (!access.toanHeThong && !buoi.phamVi.some(unit => access.maDonVi.includes(unit.maDonVi))) throw new ForbiddenException({ maLoi: 'BUOI_NGOAI_PHAM_VI', thongBao: 'Buổi học không có đơn vị thuộc Scope của Assignment đang hoạt động.' })
    const totals = buoi.trangThai === 'DA_HUY' ? this.emptyAggregate() : (await this.aggregate(access, { maBuoiId: id }))[0] ?? this.emptyAggregate()
    return { buoi: { ma: buoi.ma, maBuoi: buoi.maBuoi, ten: buoi.ten, maDot: buoi.maDot, trangThai: buoi.trangThai, batDauLuc: buoi.batDauLuc, ketThucLuc: buoi.ketThucLuc }, tongThuocDien: totals.tongLuot, coMat: totals.coMat, vangCoPhep: totals.vangCoPhep, vangKhongPhep: totals.vangKhongPhep, chuaDiemDanh: totals.chuaDiemDanh, tyLeThamGia: this.rate(totals.coMat, totals.tongLuot), trangThaiDuLieu: this.state(totals.tongLuot) }
  }

  async theoChiBo(actor: TaiKhoanDaXacThuc, query: ThongKeHocTapQueryDto) {
    const access = await this.access(actor); this.validateRange(query)
    const groups = await this.aggregate(access, query, 'CHI_BO')
    return { duLieu: groups.map(row => ({ maChiBo: row.khoa, tenChiBo: row.ten, tongLuot: row.tongLuot, coMat: row.coMat, vangCoPhep: row.vangCoPhep, vangKhongPhep: row.vangKhongPhep, chuaDiemDanh: row.chuaDiemDanh, tyLeThamGia: this.rate(row.coMat, row.tongLuot), trangThaiDuLieu: this.state(row.tongLuot) })).sort((a, b) => (a.tenChiBo ?? '').localeCompare(b.tenChiBo ?? '', 'vi')) }
  }

  async xuHuong(actor: TaiKhoanDaXacThuc, query: ThongKeHocTapQueryDto) {
    const access = await this.access(actor); this.validateRange(query)
    const grouped = await this.aggregate(access, query, 'DOT')
    const visibleUnits = access.toanHeThong ? undefined : (query.maChiBo ? [query.maChiBo] : access.maDonVi)
    const dots = await this.prisma.dotHocNghiQuyet.findMany({ where: { ...(query.maDot ? { ma: query.maDot } : {}), ...(query.maNamHoc ? { maNamHoc: query.maNamHoc } : {}), ...(visibleUnits ? { phamVi: { some: { maDonVi: { in: visibleUnits } } } } : {}), ...(query.tuLuc ? { ngayKetThuc: { gte: new Date(query.tuLuc) } } : {}), ...(query.denLuc ? { ngayBatDau: { lte: new Date(query.denLuc) } } : {}) }, select: { ma: true, maDot: true, ten: true, maNamHoc: true, ngayBatDau: true, namHoc: { select: { tenNamHoc: true } } }, orderBy: { ngayBatDau: 'asc' } })
    const byCampaign = new Map(grouped.map(row => [row.khoa, row]))
    return { duLieu: dots.map(dot => { const totals = byCampaign.get(dot.ma) ?? this.emptyAggregate(); return { maDot: dot.ma, maDotNghiQuyet: dot.maDot, tenDot: dot.ten, maNamHoc: dot.maNamHoc, tenNamHoc: dot.namHoc.tenNamHoc, ngayBatDau: dot.ngayBatDau, tongLuotDuKien: totals.tongLuot, tongLuotCoMat: totals.coMat, tyLeThamGia: this.rate(totals.coMat, totals.tongLuot), trangThaiDuLieu: this.state(totals.tongLuot) } }) }
  }

  async mucDoThamGia(actor: TaiKhoanDaXacThuc, query: MucDoThamGiaQueryDto) {
    const access = await this.access(actor); this.assertFilterScope(access, query.maChiBo)
    const dot = await this.prisma.dotHocNghiQuyet.findUnique({ where: { ma: query.maDot }, select: { ma: true, maDot: true, ten: true, phamVi: { select: { maDonVi: true } } } })
    if (!dot) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT', thongBao: 'Không tìm thấy đợt học.' })
    if (!access.toanHeThong && !dot.phamVi.some(unit => access.maDonVi.includes(unit.maDonVi))) throw new ForbiddenException({ maLoi: 'DOT_NGOAI_PHAM_VI', thongBao: 'Đợt học không có đơn vị thuộc Scope của Assignment đang hoạt động.' })
    const unitScope = this.scopeSql(access, Prisma.raw('r.ma_chi_bo_snapshot'))
    const unitFilter = query.maChiBo ? Prisma.sql`AND r.ma_chi_bo_snapshot = ${query.maChiBo}::uuid` : Prisma.sql``
    const [result] = await this.prisma.$queryRaw<Array<{ thamGiaDayDu: number; thamGiaMotPhan: number; chuaThamGia: number; tong: number }>>`
      WITH theo_ho_so AS (
        SELECT r.ma_ho_so, COUNT(*)::int AS tong_buoi,
          COUNT(*) FILTER (WHERE k.trang_thai = 'CO_MAT')::int AS so_buoi_co_mat
        FROM buoi_hoc_nghi_quyet b
        JOIN dot_hoc_nghi_quyet d ON d.ma_dot = b.ma_dot
        JOIN danh_sach_tham_gia_buoi_hoc r ON r.ma_buoi = b.ma_buoi AND r.trang_thai = 'TRONG_DANH_SACH'
        LEFT JOIN ket_qua_diem_danh k ON k.ma_buoi = b.ma_buoi AND k.ma_ho_so = r.ma_ho_so
        WHERE b.trang_thai <> 'DA_HUY' AND b.ma_dot = ${query.maDot}::uuid ${unitScope} ${unitFilter}
        GROUP BY r.ma_ho_so
      )
      SELECT COUNT(*) FILTER (WHERE so_buoi_co_mat = tong_buoi)::int AS "thamGiaDayDu",
        COUNT(*) FILTER (WHERE so_buoi_co_mat > 0 AND so_buoi_co_mat < tong_buoi)::int AS "thamGiaMotPhan",
        COUNT(*) FILTER (WHERE so_buoi_co_mat = 0)::int AS "chuaThamGia",
        COUNT(*)::int AS "tong" FROM theo_ho_so
    `
    const total = result?.tong ?? 0
    return { dot: { ma: dot.ma, maDot: dot.maDot, ten: dot.ten }, tongDangVienTrongTapApDung: total, thamGiaDayDu: result?.thamGiaDayDu ?? 0, thamGiaMotPhan: result?.thamGiaMotPhan ?? 0, chuaThamGia: result?.chuaThamGia ?? 0, trangThaiDuLieu: this.state(total) }
  }
}
