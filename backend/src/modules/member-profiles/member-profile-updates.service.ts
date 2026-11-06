import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, resolve } from 'node:path'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import { editableProfileFields, type DanhSachYeuCauCapNhatDto, type GuiYeuCauCapNhatDto, type SuaDotCapNhatDto, type TaoDotCapNhatDto, type TuChoiYeuCauDto } from './member-profile-updates.dto'
import { sanitizeRejectionHtml } from './rich-text-sanitizer'

const permission = {
  open: 'HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', submit: 'HO_SO_CA_NHAN_TU_CAP_NHAT',
  list: 'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', decide: 'HO_SO_CA_NHAN_DUYET_CAP_NHAT',
} as const
const personalFieldMap = {
  'thongTinCaNhan.ngaySinh': 'ngaySinh', 'thongTinCaNhan.gioiTinh': 'gioiTinh',
  'thongTinCaNhan.soCccd': 'soCccd', 'thongTinCaNhan.ngayCapCccd': 'ngayCapCccd',
  'thongTinCaNhan.noiCapCccd': 'noiCapCccd', 'thongTinCaNhan.quocTich': 'quocTich',
  'thongTinCaNhan.danToc': 'danToc', 'thongTinCaNhan.tonGiao': 'tonGiao',
  'thongTinCaNhan.soDienThoai': 'soDienThoai', 'thongTinCaNhan.emailLienHe': 'emailLienHe',
} as const
const addressKeys = ['phanLoaiNoiSinh', 'quocGia', 'tinhThanhPho', 'quanHuyen', 'xaPhuong', 'diaChiChiTiet'] as const
type Upload = { buffer: Buffer; mimetype: string; size: number }
type Snapshot = Record<string, unknown>

@Injectable()
export class YeuCauCapNhatHoSoService {
  private readonly storageRoot: string
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    const configured = config.get<string>('KHO_TEP_RIENG', './storage/private')
    this.storageRoot = isAbsolute(configured) ? configured : resolve(process.cwd(), configured)
  }

  async danhSachDonViMoDot(actor: TaiKhoanDaXacThuc) {
    const access = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission.open, actor.maPhien)
    if (!access.coQuyen) throw this.forbidden()
    const donVi = await this.prisma.donViToChuc.findMany({
      where: { loaiDonVi: 'CHI_BO', trangThai: 'DANG_HOAT_DONG', ...(access.toanHeThong ? {} : { ma: { in: access.maDonVi } }) },
      orderBy: { maDinhDanh: 'asc' }, select: { ma: true, maDinhDanh: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } },
    })
    return {
      donVi: donVi.map((row) => ({ ma: row.ma, maDinhDanh: row.maDinhDanh, ten: row.tenDonVi[0]?.ten ?? row.maDinhDanh })),
      coTheMoToanPhamVi: access.toanHeThong,
    }
  }

  async danhSachDot(actor: TaiKhoanDaXacThuc) {
    const access = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission.open, actor.maPhien)
    if (!access.coQuyen) throw this.forbidden()
    return this.prisma.dotCapNhatHoSo.findMany({
      where: access.toanHeThong ? {} : { maDonVi: { in: access.maDonVi } },
      orderBy: [{ ngayBatDau: 'desc' }, { ngayTao: 'desc' }], take: 100,
      include: {
        donVi: { select: { maDinhDanh: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } },
        nguoiTao: { select: { tenDangNhap: true } },
        nguoiKichHoat: { select: { tenDangNhap: true } },
        nguoiKetThucSom: { select: { tenDangNhap: true } },
        _count: { select: { yeuCau: true } },
      },
    }).then((rows) => rows.map((row) => ({
      ...row,
      tenDonVi: row.donVi?.tenDonVi[0]?.ten ?? (row.maDonVi ? row.donVi?.maDinhDanh : 'Toàn hệ thống'),
      nguoiTao: row.nguoiTao.tenDangNhap,
      nguoiKichHoat: row.nguoiKichHoat?.tenDangNhap ?? null,
      nguoiKetThucSom: row.nguoiKetThucSom?.tenDangNhap ?? null,
      soYeuCau: row._count.yeuCau,
      trangThai: this.trangThaiHienTai(row),
      donVi: undefined,
      _count: undefined,
    })))
  }

  async taoDot(actor: TaiKhoanDaXacThuc, dto: TaoDotCapNhatDto, ip: string | null) {
    const start = new Date(dto.ngayBatDau), end = new Date(dto.ngayKetThuc)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw this.badRequest('Thời điểm kết thúc phải sau thời điểm bắt đầu.')
    if (new Set(dto.cacTruongDuocPhep).size !== dto.cacTruongDuocPhep.length || dto.cacTruongDuocPhep.some((field) => !editableProfileFields.includes(field as never))) throw this.badRequest('Danh sách trường được phép không hợp lệ.')
    if (dto.maDonVi) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: dto.maDonVi }, actor.maPhien)
      const unit = await this.prisma.donViToChuc.findUnique({ where: { ma: dto.maDonVi }, select: { ma: true, loaiDonVi: true, trangThai: true } })
      if (!unit || unit.loaiDonVi !== 'CHI_BO' || unit.trangThai !== 'DANG_HOAT_DONG') throw this.badRequest('Đợt cập nhật chỉ được mở cho Chi bộ đang hoạt động.')
    } else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
    const id = randomUUID()
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Prisma cannot decode PostgreSQL's `void` result from advisory locks.
        // Cast the result to text while retaining the transaction-scoped lock.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('dot-cap-nhat-ho-so'))::text AS da_khoa`
        const row = await tx.dotCapNhatHoSo.create({ data: { ma: id, ten: dto.ten.trim(), moTa: dto.moTa?.trim() || null, maDonVi: dto.maDonVi ?? null, ngayBatDau: start, ngayKetThuc: end, cacTruongDuocPhep: dto.cacTruongDuocPhep, trangThaiQuanLy: 'BAN_NHAP', maNguoiTao: actor.maTaiKhoan } })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_TAO_NHAP_DOT', undefined, { ten: row.ten, maDonVi: row.maDonVi, ngayBatDau: row.ngayBatDau, ngayKetThuc: row.ngayKetThuc, cacTruongDuocPhep: row.cacTruongDuocPhep }, ip, 'DOT_CAP_NHAT_HO_SO')
        return row
      })
    } catch (error) { this.mapError(error) }
  }

  async taoVaKichHoatDot(actor: TaiKhoanDaXacThuc, dto: TaoDotCapNhatDto, ip: string | null) {
    const start = new Date(dto.ngayBatDau), end = new Date(dto.ngayKetThuc), instant = new Date()
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw this.badRequest('Thời điểm kết thúc phải sau thời điểm bắt đầu.')
    if (end <= instant) throw this.badRequest('Thời gian đợt đã kết thúc. Hãy chọn thời hạn trong tương lai để kích hoạt.')
    if (new Set(dto.cacTruongDuocPhep).size !== dto.cacTruongDuocPhep.length || dto.cacTruongDuocPhep.some((field) => !editableProfileFields.includes(field as never))) throw this.badRequest('Danh sách trường được phép không hợp lệ.')
    if (dto.maDonVi) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: dto.maDonVi }, actor.maPhien)
      await this.kiemTraDonViApDung(dto.maDonVi)
    } else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
    const id = randomUUID()
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('dot-cap-nhat-ho-so'))::text AS da_khoa`
        await this.kiemTraKhongChongLan(tx, dto.maDonVi ?? null, start, end)
        const row = await tx.dotCapNhatHoSo.create({ data: {
          ma: id, ten: dto.ten.trim(), moTa: dto.moTa?.trim() || null, maDonVi: dto.maDonVi ?? null,
          ngayBatDau: start, ngayKetThuc: end, cacTruongDuocPhep: dto.cacTruongDuocPhep,
          trangThaiQuanLy: 'DA_KICH_HOAT', maNguoiTao: actor.maTaiKhoan,
          maNguoiKichHoat: actor.maTaiKhoan, thoiDiemKichHoat: instant,
        } })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_TAO_VA_KICH_HOAT_DOT', undefined, {
          ten: row.ten, maDonVi: row.maDonVi, ngayBatDau: row.ngayBatDau, ngayKetThuc: row.ngayKetThuc,
          trangThaiQuanLy: row.trangThaiQuanLy, thoiDiemKichHoat: instant, cacTruongDuocPhep: row.cacTruongDuocPhep,
        }, ip, 'DOT_CAP_NHAT_HO_SO')
        return row
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { this.mapError(error) }
  }

  async thongKeDot(actor: TaiKhoanDaXacThuc, id: string) {
    const dot = await this.prisma.dotCapNhatHoSo.findUnique({ where: { ma: id } })
    if (!dot) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT_CAP_NHAT', thongBao: 'Không tìm thấy đợt cập nhật.' })
    const [listAccess, decisionAccess] = await Promise.all([
      this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission.list, actor.maPhien),
      this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission.decide, actor.maPhien),
    ])
    const hasGlobalAccess = listAccess.toanHeThong || decisionAccess.toanHeThong
    const allowedUnits = [...new Set([...listAccess.maDonVi, ...decisionAccess.maDonVi])]
    const canAccessCampaign = dot.maDonVi === null ? hasGlobalAccess || allowedUnits.length > 0 : hasGlobalAccess || allowedUnits.includes(dot.maDonVi)
    if ((!listAccess.coQuyen && !decisionAccess.coQuyen) || !canAccessCampaign) throw this.forbidden()
    const where = {
      maDotCapNhat: id,
      trangThai: { in: ['CHO_DUYET', 'DA_DUYET', 'DA_TU_CHOI'] },
      ...(dot.maDonVi === null && !hasGlobalAccess ? { maDonViDuyet: { in: allowedUnits } } : {}),
    }
    const groups = await this.prisma.yeuCauCapNhatHoSo.groupBy({ by: ['trangThai'], where, _count: { _all: true } })
    const counts = Object.fromEntries(groups.map((group) => [group.trangThai, group._count._all]))
    const choXuLy = counts.CHO_DUYET ?? 0
    const daPheDuyet = counts.DA_DUYET ?? 0
    const daTuChoi = counts.DA_TU_CHOI ?? 0
    return { tongYeuCau: choXuLy + daPheDuyet + daTuChoi, choXuLy, daPheDuyet, daTuChoi }
  }

  async suaDot(actor: TaiKhoanDaXacThuc, id: string, dto: SuaDotCapNhatDto, ip: string | null) {
    const initial = await this.layDotQuanLy(actor, id)
    if (dto.maDonVi !== undefined && dto.maDonVi !== initial.maDonVi) {
      if (dto.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: dto.maDonVi }, actor.maPhien)
      else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
    }
    const nextUnit = dto.maDonVi === undefined ? initial.maDonVi : dto.maDonVi
    if (nextUnit) await this.kiemTraDonViApDung(nextUnit)
    const start = dto.ngayBatDau === undefined ? initial.ngayBatDau : new Date(dto.ngayBatDau)
    const end = dto.ngayKetThuc === undefined ? initial.ngayKetThuc : new Date(dto.ngayKetThuc)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw this.badRequest('Thời điểm kết thúc phải sau thời điểm bắt đầu.')
    const fields = dto.cacTruongDuocPhep ?? initial.cacTruongDuocPhep
    if (new Set(fields).size !== fields.length || fields.some((field) => !editableProfileFields.includes(field as never))) throw this.badRequest('Danh sách trường được phép không hợp lệ.')
    const safeUpdate = async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT "ma_dot_cap_nhat" FROM "dot_cap_nhat_ho_so" WHERE "ma_dot_cap_nhat" = ${id}::uuid FOR UPDATE`
      const current = await tx.dotCapNhatHoSo.findUnique({ where: { ma: id } })
      if (!current) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT_CAP_NHAT', thongBao: 'Không tìm thấy đợt cập nhật.' })
      await this.kiemTraTrangThaiSua(current, dto)
      if (current.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: current.maDonVi }, actor.maPhien)
      else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
      const hasRequests = await tx.yeuCauCapNhatHoSo.count({ where: { maDotCapNhat: id } }) > 0
      if (current.trangThaiQuanLy === 'DA_KICH_HOAT' && current.ngayBatDau > new Date() && hasRequests) throw new ConflictException({ maLoi: 'DOT_DA_PHAT_SINH_YEU_CAU', thongBao: 'Không thể chỉnh sửa đợt sắp diễn ra vì đã có yêu cầu cập nhật được gửi.' })
      if (dto.maDonVi !== undefined && dto.maDonVi !== current.maDonVi) {
        if (hasRequests) throw new ConflictException({ maLoi: 'DOT_DA_PHAT_SINH_YEU_CAU', thongBao: 'Không thể đổi phạm vi vì đợt đã có yêu cầu cập nhật.' })
        if (dto.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: dto.maDonVi }, actor.maPhien)
        else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
      }
      const scopeAfterEdit = dto.maDonVi === undefined ? current.maDonVi : dto.maDonVi
      if ((dto.ngayBatDau !== undefined || dto.ngayKetThuc !== undefined || dto.maDonVi !== undefined) && current.trangThaiQuanLy === 'DA_KICH_HOAT' && current.ngayBatDau > new Date()) await this.kiemTraKhongChongLan(tx, scopeAfterEdit, start, end, id)
      const row = await tx.dotCapNhatHoSo.update({ where: { ma: id }, data: {
        ten: dto.ten?.trim(), moTa: dto.moTa === undefined ? undefined : dto.moTa?.trim() || null,
        maDonVi: dto.maDonVi === undefined ? undefined : dto.maDonVi,
        ngayBatDau: dto.ngayBatDau === undefined ? undefined : start,
        ngayKetThuc: dto.ngayKetThuc === undefined ? undefined : end,
        cacTruongDuocPhep: dto.cacTruongDuocPhep,
      } })
      await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_SUA_DOT', { ten: current.ten, maDonVi: current.maDonVi, ngayBatDau: current.ngayBatDau, ngayKetThuc: current.ngayKetThuc, cacTruongDuocPhep: current.cacTruongDuocPhep }, { ten: row.ten, maDonVi: row.maDonVi, ngayBatDau: row.ngayBatDau, ngayKetThuc: row.ngayKetThuc, cacTruongDuocPhep: row.cacTruongDuocPhep }, ip, 'DOT_CAP_NHAT_HO_SO')
      return row
    }
    try { return await this.prisma.$transaction(safeUpdate, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) { this.mapError(error) }
  }

  async kichHoatDot(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    const initial = await this.layDotQuanLy(actor, id)
    if (initial.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: initial.maDonVi }, actor.maPhien)
    else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
    if (initial.maDonVi) await this.kiemTraDonViApDung(initial.maDonVi)
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('dot-cap-nhat-ho-so'))::text AS da_khoa`
        await tx.$queryRaw`SELECT "ma_dot_cap_nhat" FROM "dot_cap_nhat_ho_so" WHERE "ma_dot_cap_nhat" = ${id}::uuid FOR UPDATE`
        const current = await tx.dotCapNhatHoSo.findUnique({ where: { ma: id } })
        if (!current) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT_CAP_NHAT', thongBao: 'Không tìm thấy đợt cập nhật.' })
        if (current.trangThaiQuanLy !== 'BAN_NHAP') throw new ConflictException({ maLoi: 'DOT_KHONG_O_TRANG_THAI_BAN_NHAP', thongBao: 'Chỉ có thể kích hoạt đợt đang ở trạng thái Bản nháp.' })
        const instant = new Date()
        if (!current.ten.trim() || !current.cacTruongDuocPhep.length || current.ngayKetThuc <= current.ngayBatDau) throw this.badRequest('Đợt chưa đủ thông tin hợp lệ để kích hoạt.')
        if (current.ngayKetThuc <= instant) throw this.badRequest('Thời gian đợt đã kết thúc. Hãy chỉnh sửa thời hạn trước khi kích hoạt.')
        if (current.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: current.maDonVi }, actor.maPhien)
        else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
        await this.kiemTraKhongChongLan(tx, current.maDonVi, current.ngayBatDau, current.ngayKetThuc, id)
        const row = await tx.dotCapNhatHoSo.update({ where: { ma: id }, data: { trangThaiQuanLy: 'DA_KICH_HOAT', maNguoiKichHoat: actor.maTaiKhoan, thoiDiemKichHoat: instant } })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_KICH_HOAT_DOT', { trangThaiQuanLy: current.trangThaiQuanLy }, { trangThaiQuanLy: row.trangThaiQuanLy, thoiDiemKichHoat: instant }, ip, 'DOT_CAP_NHAT_HO_SO')
        return row
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { this.mapError(error) }
  }

  async ketThucDot(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    const initial = await this.layDotQuanLy(actor, id)
    if (initial.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: initial.maDonVi }, actor.maPhien)
    else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "ma_dot_cap_nhat" FROM "dot_cap_nhat_ho_so" WHERE "ma_dot_cap_nhat" = ${id}::uuid FOR UPDATE`
        const current = await tx.dotCapNhatHoSo.findUnique({ where: { ma: id } })
        if (!current) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT_CAP_NHAT', thongBao: 'Không tìm thấy đợt cập nhật.' })
        const instant = new Date()
        if (current.trangThaiQuanLy !== 'DA_KICH_HOAT' || current.ngayKetThuc <= instant) throw new ConflictException({ maLoi: 'DOT_KHONG_THE_KET_THUC', thongBao: 'Chỉ có thể kết thúc đợt sắp diễn ra hoặc đang mở.' })
        const row = await tx.dotCapNhatHoSo.update({ where: { ma: id }, data: { trangThaiQuanLy: 'KET_THUC_SOM', maNguoiKetThucSom: actor.maTaiKhoan, thoiDiemKetThucSom: instant } })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_KET_THUC_SOM_DOT', { trangThaiQuanLy: current.trangThaiQuanLy, ngayKetThuc: current.ngayKetThuc }, { trangThaiQuanLy: row.trangThaiQuanLy, thoiDiemKetThucSom: instant }, ip, 'DOT_CAP_NHAT_HO_SO')
        return row
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { this.mapError(error) }
  }

  async xoaDot(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    const initial = await this.layDotQuanLy(actor, id)
    if (initial.maDonVi) await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, { maDonVi: initial.maDonVi }, actor.maPhien)
    else await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.open, {}, actor.maPhien)
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "ma_dot_cap_nhat" FROM "dot_cap_nhat_ho_so" WHERE "ma_dot_cap_nhat" = ${id}::uuid FOR UPDATE`
        const current = await tx.dotCapNhatHoSo.findUnique({ where: { ma: id } })
        if (!current) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT_CAP_NHAT', thongBao: 'Không tìm thấy đợt cập nhật.' })
        if (current.trangThaiQuanLy !== 'BAN_NHAP') throw new ConflictException({ maLoi: 'CHI_DUOC_XOA_BAN_NHAP', thongBao: 'Chỉ có thể xóa đợt ở trạng thái Bản nháp.' })
        if (await tx.yeuCauCapNhatHoSo.count({ where: { maDotCapNhat: id } })) throw new ConflictException({ maLoi: 'DOT_DA_PHAT_SINH_YEU_CAU', thongBao: 'Không thể xóa vì đợt đã phát sinh yêu cầu cập nhật.' })
        const retainedHistory = await tx.nhatKyKiemToan.count({ where: { loaiDoiTuong: 'DOT_CAP_NHAT_HO_SO', maDoiTuong: id, hanhDong: { notIn: ['HO_SO_CA_NHAN_TAO_NHAP_DOT', 'HO_SO_CA_NHAN_SUA_DOT'] } } })
        if (retainedHistory) throw new ConflictException({ maLoi: 'DOT_CO_LICH_SU_CAN_BAO_TOAN', thongBao: 'Không thể xóa vì đợt có lịch sử nghiệp vụ cần bảo toàn.' })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_XOA_DOT', { ten: current.ten, maDonVi: current.maDonVi, ngayBatDau: current.ngayBatDau, ngayKetThuc: current.ngayKetThuc }, undefined, ip, 'DOT_CAP_NHAT_HO_SO')
        await tx.dotCapNhatHoSo.delete({ where: { ma: id } })
        return { ma: id }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { this.mapError(error) }
  }

  private async layDotQuanLy(actor: TaiKhoanDaXacThuc, id: string, requiredPermission: string = permission.open) {
    const dot = await this.prisma.dotCapNhatHoSo.findUnique({ where: { ma: id } })
    if (!dot) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT_CAP_NHAT', thongBao: 'Không tìm thấy đợt cập nhật.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, requiredPermission, dot.maDonVi ? { maDonVi: dot.maDonVi } : {}, actor.maPhien)
    return dot
  }

  private trangThaiHienTai(dot: { trangThaiQuanLy: string; ngayBatDau: Date; ngayKetThuc: Date }, now = new Date()) {
    if (dot.trangThaiQuanLy === 'BAN_NHAP') return 'BAN_NHAP'
    if (dot.trangThaiQuanLy === 'KET_THUC_SOM' || dot.ngayKetThuc <= now) return 'DA_KET_THUC'
    return dot.ngayBatDau > now ? 'CHUA_BAT_DAU' : 'DANG_MO'
  }

  private async kiemTraDonViApDung(maDonVi: string) {
    const unit = await this.prisma.donViToChuc.findUnique({ where: { ma: maDonVi }, select: { ma: true, loaiDonVi: true, trangThai: true } })
    if (!unit || unit.loaiDonVi !== 'CHI_BO' || unit.trangThai !== 'DANG_HOAT_DONG') throw this.badRequest('Đợt cập nhật chỉ được mở cho Chi bộ đang hoạt động.')
  }

  private async kiemTraKhongChongLan(tx: Prisma.TransactionClient, maDonVi: string | null, start: Date, end: Date, excludedId?: string) {
    const overlap = await tx.dotCapNhatHoSo.findFirst({ where: {
      trangThaiQuanLy: 'DA_KICH_HOAT', ...(excludedId ? { ma: { not: excludedId } } : {}),
      ngayBatDau: { lt: end }, ngayKetThuc: { gt: start },
      ...(maDonVi ? { OR: [{ maDonVi: null }, { maDonVi }] } : {}),
    }, select: { ma: true } })
    if (overlap) throw new ConflictException({ maLoi: 'DOT_CAP_NHAT_BI_CHONG_LAN', thongBao: 'Thời gian đợt cập nhật bị trùng với một đợt đã kích hoạt trong cùng phạm vi.' })
  }

  private async kiemTraTrangThaiSua(current: { trangThaiQuanLy: string; ngayBatDau: Date; ngayKetThuc: Date }, dto: SuaDotCapNhatDto) {
    const now = new Date()
    if (current.trangThaiQuanLy === 'BAN_NHAP') return
    if (current.trangThaiQuanLy !== 'DA_KICH_HOAT' || current.ngayKetThuc <= now) throw new ConflictException({ maLoi: 'DOT_KHONG_THE_CHINH_SUA', thongBao: 'Không thể chỉnh sửa đợt đã kết thúc.' })
    if (current.ngayBatDau <= now) {
      const disallowed = Object.keys(dto).filter((key) => key !== 'ten' && key !== 'moTa')
      if (disallowed.length) throw new ConflictException({ maLoi: 'DOT_DANG_MO_CHI_DUOC_SUA_TEN', thongBao: 'Khi đợt đang mở, chỉ có thể thay đổi tên và mô tả để không ảnh hưởng các yêu cầu đã gửi.' })
    }
  }

  async dotHienHanhCuaToi(actor: TaiKhoanDaXacThuc) {
    const profile = await this.hoSoCuaTaiKhoan(actor)
    if (!profile) return { hoSoLienKet: false, dotCapNhat: null }
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.submit, { maHoSo: profile.ma }, actor.maPhien)
    const branch = await this.chiBoHienTai(profile.ma)
    if (!branch) return { hoSoLienKet: true, dotCapNhat: null }
    const now = new Date()
    const rows = await this.prisma.dotCapNhatHoSo.findMany({ where: { trangThaiQuanLy: 'DA_KICH_HOAT', OR: [{ maDonVi: branch }, { maDonVi: null }] }, orderBy: { ngayBatDau: 'desc' } })
    const row = rows.find((item) => item.maDonVi === branch && item.ngayBatDau <= now && item.ngayKetThuc > now)
      ?? rows.find((item) => item.maDonVi === null && item.ngayBatDau <= now && item.ngayKetThuc > now)
      ?? rows.find((item) => item.maDonVi === branch && item.ngayBatDau > now)
      ?? rows.find((item) => item.maDonVi === null && item.ngayBatDau > now)
      ?? rows.find((item) => item.maDonVi === branch)
      ?? rows.find((item) => item.maDonVi === null)
    if (!row) return { hoSoLienKet: true, dotCapNhat: null }
    return { hoSoLienKet: true, dotCapNhat: { ma: row.ma, ten: row.ten, ngayBatDau: row.ngayBatDau, ngayKetThuc: row.ngayKetThuc, cacTruongDuocPhep: row.cacTruongDuocPhep, trangThai: this.trangThaiHienTai(row) } }
  }

  async guiYeuCau(actor: TaiKhoanDaXacThuc, dto: GuiYeuCauCapNhatDto, file: Upload | undefined, ip: string | null) {
    const profile = await this.hoSoCuaTaiKhoan(actor)
    if (!profile) throw new NotFoundException({ maLoi: 'CHUA_LIEN_KET_HO_SO', thongBao: 'Tài khoản chưa được liên kết với hồ sơ Đảng viên.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.submit, { maHoSo: profile.ma }, actor.maPhien)
    const branch = await this.chiBoHienTai(profile.ma)
    if (!branch) throw this.badRequest('Hồ sơ chưa có Chi bộ sinh hoạt hiện tại hợp lệ.')
    const now = new Date()
    const dot = await this.prisma.dotCapNhatHoSo.findFirst({ where: { trangThaiQuanLy: 'DA_KICH_HOAT', ngayBatDau: { lte: now }, ngayKetThuc: { gt: now }, OR: [{ maDonVi: branch }, { maDonVi: null }] }, orderBy: { maDonVi: 'desc' } })
    if (!dot) throw new ConflictException({ maLoi: 'KHONG_TRONG_DOT_CAP_NHAT', thongBao: 'Hiện không có đợt cập nhật hồ sơ đang mở cho Chi bộ của bạn.' })
    if (file) this.validateImage(file)
    if (file && !dot.cacTruongDuocPhep.includes('anhDaiDien')) throw this.badRequest('Đợt cập nhật này chưa mở quyền đề nghị đổi ảnh đại diện.')
    const normalized = this.chuanHoaThayDoi(dto.thayDoi ?? {}, dot.cacTruongDuocPhep)
    if (Object.keys(normalized).length === 0 && !file) throw this.badRequest('Hãy nhập ít nhất một thay đổi hoặc chọn ảnh đại diện mới.')
    const id = randomUUID()
    const photoKey = file ? await this.luuAnhTam(id, file) : null
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "ma_dot_cap_nhat" FROM "dot_cap_nhat_ho_so" WHERE "ma_dot_cap_nhat" = ${dot.ma}::uuid FOR UPDATE`
        const currentDot = await tx.dotCapNhatHoSo.findUnique({ where: { ma: dot.ma } })
        const instant = new Date()
        if (!currentDot || currentDot.trangThaiQuanLy !== 'DA_KICH_HOAT' || currentDot.ngayBatDau > instant || currentDot.ngayKetThuc <= instant) throw new ConflictException({ maLoi: 'KHONG_TRONG_DOT_CAP_NHAT', thongBao: 'Đợt cập nhật vừa kết thúc hoặc không còn tiếp nhận yêu cầu.' })
        const freshChanges = this.chuanHoaThayDoi(dto.thayDoi ?? {}, currentDot.cacTruongDuocPhep)
        if (Object.keys(freshChanges).length === 0 && !file) throw this.badRequest('Hãy nhập ít nhất một thay đổi hoặc chọn ảnh đại diện mới.')
        await tx.$queryRaw`SELECT "ma_ho_so" FROM "ho_so_dang_vien" WHERE "ma_ho_so" = ${profile.ma}::uuid FOR UPDATE`
        const pending = await tx.yeuCauCapNhatHoSo.findFirst({ where: { maHoSo: profile.ma, trangThai: 'CHO_DUYET' }, select: { ma: true } })
        if (pending) throw new ConflictException({ maLoi: 'DA_CO_YEU_CAU_CHO_DUYET', thongBao: 'Bạn đang có một yêu cầu cập nhật chờ xử lý.' })
        const fresh = await this.laySnapshot(tx, profile.ma, Object.keys(freshChanges))
        const request = await tx.yeuCauCapNhatHoSo.create({ data: {
          ma: id, maHoSo: profile.ma, maDotCapNhat: dot.ma, maDonViDuyet: branch,
          maNguoiGui: actor.maTaiKhoan, trangThai: 'CHO_DUYET', giaTriTruoc: fresh as Prisma.InputJsonValue,
          giaTriDeNghi: freshChanges as Prisma.InputJsonValue, anhDaiDienTamKhoa: photoKey,
        } })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_GUI_YEU_CAU', undefined, { maHoSo: profile.ma, truongThayDoi: Object.keys(freshChanges), coAnhDaiDien: Boolean(photoKey) }, ip)
        return { ma: request.ma, trangThai: request.trangThai, ngayTao: request.ngayTao }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) { if (photoKey) await this.xoaAnh(photoKey); this.mapError(error) }
  }

  async yeuCauCuaToi(actor: TaiKhoanDaXacThuc) {
    const profile = await this.hoSoCuaTaiKhoan(actor)
    if (!profile) return []
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.submit, { maHoSo: profile.ma }, actor.maPhien)
    const rows = await this.prisma.yeuCauCapNhatHoSo.findMany({ where: { maHoSo: profile.ma, maNguoiGui: actor.maTaiKhoan }, orderBy: { ngayTao: 'desc' }, take: 50, include: { donViDuyet: { select: { maDinhDanh: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } } } })
    return rows.map(({ donViDuyet, anhDaiDienTamKhoa, ...row }) => ({ ...row, lyDoXuLy: row.lyDoXuLy ? sanitizeRejectionHtml(row.lyDoXuLy) : null, coAnhDaiDienDuocDeNghi: Boolean(anhDaiDienTamKhoa), tenChiBo: donViDuyet.tenDonVi[0]?.ten ?? donViDuyet.maDinhDanh }))
  }

  async danhSachYeuCau(actor: TaiKhoanDaXacThuc, query: DanhSachYeuCauCapNhatDto) {
    const [listAccess, decisionAccess] = await Promise.all([
      this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission.list, actor.maPhien),
      this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission.decide, actor.maPhien),
    ])
    if (!listAccess.coQuyen && !decisionAccess.coQuyen) throw this.forbidden()
    const allUnits = listAccess.toanHeThong || decisionAccess.toanHeThong
    const allowedUnits = [...new Set([...listAccess.maDonVi, ...decisionAccess.maDonVi])]
    const start = query.tuNgay ? new Date(query.tuNgay) : undefined
    const end = query.denNgay ? new Date(query.denNgay) : undefined
    if (start && end && start > end) throw this.badRequest('Ngày bắt đầu lọc phải trước hoặc bằng ngày kết thúc.')
    const scopeWhere: Prisma.YeuCauCapNhatHoSoWhereInput = allUnits ? {} : { maDonViDuyet: { in: allowedUnits } }
    const search = query.tuKhoa?.trim()
    const filters: Prisma.YeuCauCapNhatHoSoWhereInput = {
      ...scopeWhere,
      ...(query.maHoSo ? { maHoSo: query.maHoSo } : {}),
      ...(query.maDotCapNhat ? { maDotCapNhat: query.maDotCapNhat } : {}),
      ...(query.maDonViDuyet ? { maDonViDuyet: query.maDonViDuyet } : {}),
      ...(query.trangThai ? { trangThai: query.trangThai } : {}),
      ...(search ? { hoSo: { is: { OR: [
        { hoVaTen: { contains: search, mode: 'insensitive' } },
        { maHoSoNoiBo: { contains: search, mode: 'insensitive' } },
      ] } } } : {}),
      ...(start || end ? { ngayTao: { ...(start ? { gte: start } : {}), ...(end ? { lt: new Date(end.getTime() + 24 * 60 * 60 * 1000) } : {}) } } : {}),
    }
    const statusWhere: Prisma.YeuCauCapNhatHoSoWhereInput = { ...filters, ...(query.trangThai ? { trangThai: query.trangThai } : {}) }
    // HTTP query parameters are strings. Keep pagination safe even if a caller
    // reaches the service without class-transformer's DTO conversion.
    const page = Number(query.trang ?? 1)
    const pageSize = Number(query.gioiHan ?? 25)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw this.badRequest('Thông tin phân trang không hợp lệ.')
    }
    const [items, total, statusGroups, unitGroups, campaignGroups] = await this.prisma.$transaction(async (tx) => Promise.all([
      tx.yeuCauCapNhatHoSo.findMany({
        where: statusWhere, orderBy: [{ ngayTao: 'desc' }, { ma: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
        include: { hoSo: { select: { maHoSoNoiBo: true, hoVaTen: true } }, dotCapNhat: { select: { ten: true } }, nguoiGui: { select: { tenDangNhap: true } }, nguoiXuLy: { select: { tenDangNhap: true } }, donViDuyet: { select: { maDinhDanh: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } } },
      }),
      tx.yeuCauCapNhatHoSo.count({ where: statusWhere }),
      tx.yeuCauCapNhatHoSo.groupBy({ by: ['trangThai'], where: { ...filters, trangThai: { in: ['CHO_DUYET', 'DA_DUYET', 'DA_TU_CHOI', 'DA_HUY'] } }, _count: { _all: true } }),
      tx.yeuCauCapNhatHoSo.groupBy({ by: ['maDonViDuyet'], where: scopeWhere }),
      tx.yeuCauCapNhatHoSo.groupBy({ by: ['maDotCapNhat'], where: scopeWhere }),
    ]), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    const [units, campaigns] = await Promise.all([
      unitGroups.length ? this.prisma.donViToChuc.findMany({ where: { ma: { in: unitGroups.map((group) => group.maDonViDuyet) } }, select: { ma: true, maDinhDanh: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } }, orderBy: { maDinhDanh: 'asc' } }) : [],
      campaignGroups.length ? this.prisma.dotCapNhatHoSo.findMany({ where: { ma: { in: campaignGroups.map((group) => group.maDotCapNhat) } }, select: { ma: true, ten: true }, orderBy: { ngayBatDau: 'desc' } }) : [],
    ])
    const rows = await Promise.all(items.map(async ({ anhDaiDienTamKhoa, dotCapNhat, nguoiXuLy, ...row }) => {
      const [coQuyenXemCaNhan, coQuyenXemDiaChi] = await Promise.all([
        this.coQuyenXemYeuCau(actor, ['HO_SO_CA_NHAN_XEM', 'HO_SO_CA_NHAN_SUA'], row.maHoSo),
        this.coQuyenXemYeuCau(actor, ['HO_SO_DIA_CHI_XEM', 'HO_SO_DIA_CHI_SUA'], row.maHoSo),
      ])
      const redact = (values: Prisma.JsonValue) => {
        if (!values || typeof values !== 'object' || Array.isArray(values)) return values
        return Object.fromEntries(Object.entries(values).map(([key, value]) => [key,
          (key.startsWith('thongTinCaNhan.') && !coQuyenXemCaNhan) || (key.startsWith('diaChi.') && !coQuyenXemDiaChi)
            ? '[Thông tin được giới hạn theo quyền xem]' : value,
        ]))
      }
      return {
        ...row,
        giaTriTruoc: redact(row.giaTriTruoc),
        giaTriDeNghi: redact(row.giaTriDeNghi),
        lyDoXuLy: row.lyDoXuLy ? sanitizeRejectionHtml(row.lyDoXuLy) : null,
        coAnhDaiDienDuocDeNghi: Boolean(anhDaiDienTamKhoa), tenChiBo: row.donViDuyet.tenDonVi[0]?.ten ?? row.donViDuyet.maDinhDanh,
        tenDotCapNhat: dotCapNhat.ten, tenNguoiXuLy: nguoiXuLy?.tenDangNhap ?? null,
        hoSo: row.hoSo, nguoiGui: row.nguoiGui.tenDangNhap, donViDuyet: undefined,
      }
    }))
    const counts = Object.fromEntries(statusGroups.map((group) => [group.trangThai, group._count._all]))
    return {
      duLieu: rows,
      phanTrang: { trang: page, gioiHan: pageSize, tongSo: total, tongTrang: Math.ceil(total / pageSize) },
      thongKe: {
        tongYeuCau: Object.values(counts).reduce((sum, count) => sum + count, 0),
        choXuLy: counts.CHO_DUYET ?? 0, daPheDuyet: counts.DA_DUYET ?? 0,
        daTuChoi: counts.DA_TU_CHOI ?? 0, daHuy: counts.DA_HUY ?? 0,
      },
      boLoc: {
        donVi: units.map((unit) => ({ ma: unit.ma, ten: unit.tenDonVi[0]?.ten ?? unit.maDinhDanh ?? 'Đơn vị chưa có tên' })),
        dotCapNhat: campaigns.map((campaign) => ({ ma: campaign.ma, ten: campaign.ten })),
      },
    }
  }

  private async coQuyenXemYeuCau(actor: TaiKhoanDaXacThuc, permissionCodes: string[], maHoSo: string) {
    for (const permissionCode of permissionCodes) {
      try {
        await this.phanQuyen.kiemTra(actor.maTaiKhoan, permissionCode, { maHoSo }, actor.maPhien)
        return true
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error
      }
    }
    return false
  }

  async duyet(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    const request = await this.layYeuCauTrongPhamVi(actor, id)
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.decide, { maDonVi: request.maDonViDuyet }, actor.maPhien)
    const finalPhoto = request.anhDaiDienTamKhoa ? `chinh-thuc/${request.ma}${extname(request.anhDaiDienTamKhoa)}` : null
    if (finalPhoto && request.anhDaiDienTamKhoa) await this.saoChepAnh(request.anhDaiDienTamKhoa, finalPhoto)
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "ma_yeu_cau" FROM "yeu_cau_cap_nhat_ho_so" WHERE "ma_yeu_cau" = ${id}::uuid FOR UPDATE`
        const current = await tx.yeuCauCapNhatHoSo.findUnique({ where: { ma: id } })
        if (!current || current.trangThai !== 'CHO_DUYET') throw new ConflictException({ maLoi: 'YEU_CAU_DA_DUOC_XU_LY', thongBao: 'Yêu cầu này đã được xử lý.' })
        await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.decide, { maDonVi: current.maDonViDuyet }, actor.maPhien)
        await this.apDungThayDoi(tx, current.maHoSo, current.giaTriTruoc as Snapshot, current.giaTriDeNghi as Snapshot)
        const beforePhoto = await tx.hoSoDangVien.findUnique({ where: { ma: current.maHoSo }, select: { anhDaiDienKhoa: true } })
        if (finalPhoto) await tx.hoSoDangVien.update({ where: { ma: current.maHoSo }, data: { anhDaiDienKhoa: finalPhoto } })
        const saved = await tx.yeuCauCapNhatHoSo.update({ where: { ma: id }, data: { trangThai: 'DA_DUYET', maNguoiXuLy: actor.maTaiKhoan, thoiDiemXuLy: new Date() } })
        await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_DUYET_YEU_CAU', { trangThai: current.trangThai }, { trangThai: saved.trangThai, truongThayDoi: Object.keys(current.giaTriDeNghi as object), coAnhDaiDien: Boolean(finalPhoto) }, ip)
        await this.audit(tx, actor, current.maHoSo, 'HO_SO_CA_NHAN_AP_DUNG_YEU_CAU', this.lamMoGiaTri(current.giaTriTruoc as Snapshot), this.lamMoGiaTri(current.giaTriDeNghi as Snapshot), ip, 'HO_SO_DANG_VIEN')
        return { saved, oldPhoto: beforePhoto?.anhDaiDienKhoa, pendingPhoto: current.anhDaiDienTamKhoa }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      if (result.pendingPhoto) await this.xoaAnh(result.pendingPhoto)
      if (result.oldPhoto && result.oldPhoto !== finalPhoto) await this.xoaAnh(result.oldPhoto)
      return { ma: result.saved.ma, trangThai: result.saved.trangThai, thoiDiemXuLy: result.saved.thoiDiemXuLy }
    } catch (error) { if (finalPhoto) await this.xoaAnh(finalPhoto); this.mapError(error) }
  }

  async tuChoi(actor: TaiKhoanDaXacThuc, id: string, dto: TuChoiYeuCauDto, ip: string | null) {
    const lyDo = sanitizeRejectionHtml(dto.lyDo)
    if (!lyDo || lyDo.length > 1000) throw this.badRequest('Lý do từ chối phải có nội dung và không vượt quá 1.000 ký tự sau khi làm sạch.')
    const request = await this.layYeuCauTrongPhamVi(actor, id)
    if (request.maNguoiGui === actor.maTaiKhoan) throw this.forbidden('Người gửi không được tự xử lý yêu cầu của mình.')
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.decide, { maDonVi: request.maDonViDuyet }, actor.maPhien)
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "ma_yeu_cau" FROM "yeu_cau_cap_nhat_ho_so" WHERE "ma_yeu_cau" = ${id}::uuid FOR UPDATE`
      const current = await tx.yeuCauCapNhatHoSo.findUnique({ where: { ma: id } })
      if (!current || current.trangThai !== 'CHO_DUYET') throw new ConflictException({ maLoi: 'YEU_CAU_DA_DUOC_XU_LY', thongBao: 'Yêu cầu này đã được xử lý.' })
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.decide, { maDonVi: current.maDonViDuyet }, actor.maPhien)
      const row = await tx.yeuCauCapNhatHoSo.update({ where: { ma: id }, data: { trangThai: 'DA_TU_CHOI', maNguoiXuLy: actor.maTaiKhoan, thoiDiemXuLy: new Date(), lyDoXuLy: lyDo } })
      await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_TU_CHOI_YEU_CAU', { trangThai: current.trangThai }, { trangThai: row.trangThai, lyDo }, ip)
      return row
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if (updated.anhDaiDienTamKhoa) await this.xoaAnh(updated.anhDaiDienTamKhoa)
    return { ma: updated.ma, trangThai: updated.trangThai, thoiDiemXuLy: updated.thoiDiemXuLy, lyDoXuLy: updated.lyDoXuLy }
  }

  async huyCuaToi(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    const profile = await this.hoSoCuaTaiKhoan(actor)
    if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_YEU_CAU', thongBao: 'Không tìm thấy yêu cầu cập nhật.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.submit, { maHoSo: profile.ma }, actor.maPhien)
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "ma_yeu_cau" FROM "yeu_cau_cap_nhat_ho_so" WHERE "ma_yeu_cau" = ${id}::uuid FOR UPDATE`
      const current = await tx.yeuCauCapNhatHoSo.findFirst({ where: { ma: id, maHoSo: profile.ma, maNguoiGui: actor.maTaiKhoan } })
      if (!current || current.trangThai !== 'CHO_DUYET') throw new ConflictException({ maLoi: 'YEU_CAU_KHONG_THE_HUY', thongBao: 'Chỉ có thể hủy yêu cầu đang chờ phê duyệt của bạn.' })
      const row = await tx.yeuCauCapNhatHoSo.update({ where: { ma: id }, data: { trangThai: 'DA_HUY', thoiDiemXuLy: new Date() } })
      await this.audit(tx, actor, id, 'HO_SO_CA_NHAN_HUY_YEU_CAU', { trangThai: current.trangThai }, { trangThai: row.trangThai }, ip)
      return row
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if (updated.anhDaiDienTamKhoa) await this.xoaAnh(updated.anhDaiDienTamKhoa)
    return { ma: updated.ma, trangThai: updated.trangThai }
  }

  async anhDaiDienCuaToi(actor: TaiKhoanDaXacThuc) {
    const profile = await this.hoSoCuaTaiKhoan(actor)
    if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_ANH', thongBao: 'Không tìm thấy ảnh đại diện.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', { maHoSo: profile.ma }, actor.maPhien)
    const key = await this.prisma.hoSoDangVien.findUnique({ where: { ma: profile.ma }, select: { anhDaiDienKhoa: true } }).then((row) => row?.anhDaiDienKhoa)
    if (!key) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_ANH', thongBao: 'Hồ sơ chưa có ảnh đại diện.' })
    return this.docAnh(key)
  }

  async anhDaiDienHoSo(actor: TaiKhoanDaXacThuc, maHoSo: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', { maHoSo }, actor.maPhien)
    const key = await this.prisma.hoSoDangVien.findUnique({ where: { ma: maHoSo }, select: { anhDaiDienKhoa: true } }).then((row) => row?.anhDaiDienKhoa)
    if (!key) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_ANH', thongBao: 'Hồ sơ chưa có ảnh đại diện.' })
    return this.docAnh(key)
  }

  private async hoSoCuaTaiKhoan(actor: TaiKhoanDaXacThuc) {
    return this.prisma.hoSoDangVien.findUnique({ where: { maTaiKhoan: actor.maTaiKhoan }, select: { ma: true } })
  }

  private async chiBoHienTai(maHoSo: string) {
    const now = new Date()
    const currentRows = await this.prisma.lichSuDonViDangVien.findMany({ where: { maHoSo, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 2, select: { maChiBo: true, maTo: true, chiBo: { select: { loaiDonVi: true, trangThai: true } }, to: { select: { loaiDonVi: true, trangThai: true } } } })
    const current = currentRows[0]
    if (currentRows.length !== 1 || !current || current.chiBo.loaiDonVi !== 'CHI_BO' || current.chiBo.trangThai !== 'DANG_HOAT_DONG') return null
    const parents = await this.prisma.lichSuQuanHeDonVi.findMany({ where: { maDonViCon: current.maChiBo, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, select: { donViCha: { select: { loaiDonVi: true, trangThai: true } } } })
    const parent = parents[0]
    if (parents.length !== 1 || !parent || parent.donViCha.loaiDonVi !== 'DANG_UY' || parent.donViCha.trangThai !== 'DANG_HOAT_DONG') return null
    if (current.maTo) {
      if (!current.to || current.to.loaiDonVi !== 'TO' || current.to.trangThai !== 'DANG_HOAT_DONG') return null
      const groupParents = await this.prisma.lichSuQuanHeDonVi.findMany({ where: { maDonViCon: current.maTo, maDonViCha: current.maChiBo, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, select: { ma: true } })
      if (groupParents.length !== 1) return null
    }
    return current.maChiBo
  }

  private chuanHoaThayDoi(input: Record<string, unknown>, allowed: string[]): Snapshot {
    const output: Snapshot = {}
    for (const [field, raw] of Object.entries(input)) {
      if (!editableProfileFields.includes(field as never) || !allowed.includes(field)) throw this.badRequest(`Trường ${field} không được mở trong đợt cập nhật này.`)
      if (field.startsWith('diaChi.')) {
        const type = field.slice('diaChi.'.length)
        if (!['NOI_SINH', 'QUE_QUAN', 'THUONG_TRU'].includes(type) || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw this.badRequest('Thông tin địa chỉ không hợp lệ.')
        const address = raw as Record<string, unknown>
        if (Object.keys(address).some((key) => !addressKeys.includes(key as never))) throw this.badRequest('Địa chỉ có trường không được phép cập nhật.')
        for (const [key, value] of Object.entries(address)) if (value !== null && (typeof value !== 'string' || value.length > 500)) throw this.badRequest('Giá trị địa chỉ không hợp lệ.')
        if (type !== 'NOI_SINH' && 'phanLoaiNoiSinh' in address) throw this.badRequest('Phân loại nơi sinh chỉ dùng cho địa chỉ nơi sinh.')
        output[field] = Object.fromEntries(Object.entries(address).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]))
        continue
      }
      if (typeof raw !== 'string' && raw !== null) throw this.badRequest(`Giá trị ${field} không hợp lệ.`)
      const value = typeof raw === 'string' ? raw.trim() : null
      if (field === 'hoVaTen' && !value) throw this.badRequest('Họ và tên không được để trống.')
      if (field === 'khoaDangVien' && value && value.length > 50) throw this.badRequest('Khóa Đảng viên không được vượt quá 50 ký tự.')
      if (value && field.endsWith('.soCccd') && !/^\d{12}$/.test(value)) throw this.badRequest('Số CCCD phải gồm đúng 12 chữ số.')
      if (value && field.endsWith('.emailLienHe') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw this.badRequest('Thư điện tử không đúng định dạng.')
      if (value && field.endsWith('.ngaySinh') || value && field.endsWith('.ngayCapCccd')) {
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value!) ? new Date(`${value}T00:00:00.000Z`) : null
        if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw this.badRequest('Ngày tháng không đúng định dạng.')
      }
      const max = field === 'hoVaTen' ? 200 : field.endsWith('.soDienThoai') ? 30 : field.endsWith('.noiCapCccd') ? 250 : 100
      if (value && value.length > max) throw this.badRequest(`Giá trị ${field} vượt quá giới hạn.`)
      output[field] = value
    }
    return output
  }

  private async laySnapshot(tx: Prisma.TransactionClient, maHoSo: string, fields: string[]): Promise<Snapshot> {
    const profile = await tx.hoSoDangVien.findUnique({ where: { ma: maHoSo }, include: { thongTinCaNhan: true, diaChi: true } })
    if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    const personal = profile.thongTinCaNhan
    return Object.fromEntries(fields.map((field) => {
      if (field === 'hoVaTen' || field === 'khoaDangVien') return [field, profile[field]]
      if (field.startsWith('thongTinCaNhan.')) return [field, personal?.[personalFieldMap[field as keyof typeof personalFieldMap] as keyof NonNullable<typeof personal>] ?? null]
      const type = field.slice('diaChi.'.length)
      const row = profile.diaChi.find((address) => address.loaiDiaChi === type)
      return [field, row ? Object.fromEntries(addressKeys.map((key) => [key, row[key] ?? null])) : null]
    }))
  }

  private async apDungThayDoi(tx: Prisma.TransactionClient, maHoSo: string, before: Snapshot, proposed: Snapshot) {
    const now = new Date()
    const current = await this.laySnapshot(tx, maHoSo, Object.keys(proposed))
    for (const [key, value] of Object.entries(before)) if (JSON.stringify(current[key] ?? null) !== JSON.stringify(value ?? null)) throw new ConflictException({ maLoi: 'HO_SO_DA_THAY_DOI', thongBao: 'Hồ sơ đã được cập nhật trong thời gian yêu cầu chờ duyệt. Hãy gửi yêu cầu mới.' })
    const profileData: Prisma.HoSoDangVienUpdateInput = {}
    const personalData: Prisma.ThongTinCaNhanDangVienUncheckedCreateInput = { maHoSo }
    const addressData = new Map<string, Record<string, string | null>>()
    for (const [field, value] of Object.entries(proposed)) {
      if (field === 'hoVaTen') profileData.hoVaTen = value as string
      else if (field === 'khoaDangVien') profileData.khoaDangVien = value as string | null
      else if (field.startsWith('thongTinCaNhan.')) {
        const key = personalFieldMap[field as keyof typeof personalFieldMap]
        ;(personalData as Record<string, unknown>)[key] = key === 'ngaySinh' || key === 'ngayCapCccd' ? (value ? new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`) : null) : value
      } else addressData.set(field.slice('diaChi.'.length), value as Record<string, string | null>)
    }
    if (Object.keys(personalData).length > 1) await tx.thongTinCaNhanDangVien.upsert({ where: { maHoSo }, create: personalData, update: Object.fromEntries(Object.entries(personalData).filter(([key]) => key !== 'maHoSo')) })
    for (const [type, values] of addressData) {
      const loaiDiaChi = type as 'NOI_SINH' | 'QUE_QUAN' | 'THUONG_TRU'
      const phanLoaiNoiSinh = type === 'NOI_SINH' ? values.phanLoaiNoiSinh as 'TRONG_NUOC' | 'NUOC_NGOAI' | null ?? null : null
      const createData: Prisma.DiaChiDangVienUncheckedCreateInput = { maHoSo, loaiDiaChi, ...values, phanLoaiNoiSinh }
      const updateData: Prisma.DiaChiDangVienUncheckedUpdateInput = { ...values, phanLoaiNoiSinh }
      await tx.diaChiDangVien.upsert({ where: { maHoSo_loaiDiaChi: { maHoSo, loaiDiaChi } }, create: createData, update: updateData })
    }
    if (Object.keys(profileData).length) await tx.hoSoDangVien.update({ where: { ma: maHoSo }, data: profileData })
    await tx.hoSoDangVien.update({ where: { ma: maHoSo }, data: { ngayCapNhat: now } })
  }

  private async layYeuCauTrongPhamVi(actor: TaiKhoanDaXacThuc, id: string) {
    const request = await this.prisma.yeuCauCapNhatHoSo.findUnique({ where: { ma: id } })
    if (!request) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_YEU_CAU', thongBao: 'Không tìm thấy yêu cầu cập nhật.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission.decide, { maDonVi: request.maDonViDuyet }, actor.maPhien)
    return request
  }

  private validateImage(file: Upload) {
    if (file.size > 5 * 1024 * 1024) throw this.badRequest('Ảnh đại diện không được vượt quá 5 MB.')
    const signatures: Record<string, boolean> = {
      'image/jpeg': file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff,
      'image/png': file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/webp': file.buffer.toString('ascii', 0, 4) === 'RIFF' && file.buffer.toString('ascii', 8, 12) === 'WEBP',
    }
    if (!signatures[file.mimetype]) throw this.badRequest('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ.')
  }

  private async luuAnhTam(id: string, file: Upload) {
    const ext = file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/png' ? '.png' : '.webp'
    const key = `tam/${id}${ext}`
    const path = this.duongDanAnh(key)
    await mkdir(join(this.storageRoot, 'tam'), { recursive: true })
    await writeFile(path, file.buffer, { flag: 'wx', mode: 0o600 })
    return key
  }
  private async saoChepAnh(source: string, target: string) { await mkdir(join(this.storageRoot, 'chinh-thuc'), { recursive: true }); await copyFile(this.duongDanAnh(source), this.duongDanAnh(target)) }
  private async xoaAnh(key: string) { try { await rm(this.duongDanAnh(key), { force: true }) } catch { /* cleanup is best-effort */ } }
  private async docAnh(key: string) {
    const path = this.duongDanAnh(key)
    const ext = extname(path).toLowerCase()
    const mimeType = ext === '.jpg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : null
    if (!mimeType) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_ANH', thongBao: 'Không tìm thấy ảnh đại diện.' })
    try { return { buffer: await readFile(path), mimeType } } catch { throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_ANH', thongBao: 'Không tìm thấy ảnh đại diện.' }) }
  }
  private duongDanAnh(key: string) {
    if (!/^(tam|chinh-thuc)\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key) || basename(key) !== key.split('/').at(-1)) throw new NotFoundException()
    return join(this.storageRoot, key)
  }
  private lamMoGiaTri(input: Snapshot) { return Object.fromEntries(Object.entries(input).map(([key, value]) => [key.endsWith('.soCccd') ? key : key, key.endsWith('.soCccd') && value ? '[ĐÃ THAY ĐỔI]' : value])) }
  private async audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, target: string, action: string, before: unknown, after: unknown, ip: string | null, targetType = 'YEU_CAU_CAP_NHAT_HO_SO') {
    await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: targetType, maDoiTuong: target, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip } })
  }
  private forbidden(message = 'Tài khoản không có đủ quyền hoặc phạm vi phù hợp để thực hiện thao tác này.') { return new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: message }) }
  private badRequest(message: string) { return new BadRequestException({ maLoi: 'DU_LIEU_KHONG_HOP_LE', thongBao: message }) }
  private mapError(error: unknown): never {
    if (error instanceof ConflictException || error instanceof ForbiddenException || error instanceof NotFoundException || error instanceof BadRequestException) throw error
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034')) throw new ConflictException({ maLoi: 'XUNG_DOT_CAP_NHAT', thongBao: 'Dữ liệu vừa thay đổi hoặc yêu cầu đang được xử lý. Hãy tải lại và thử lại.' })
    throw error
  }
}
