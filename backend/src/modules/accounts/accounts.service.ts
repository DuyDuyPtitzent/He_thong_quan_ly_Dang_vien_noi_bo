import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { BamMatKhauService } from '../auth/password-hasher'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import { demQuanTriVienToanHeThongHopLe, khoaKiemTraQuanTriVienCuoi, systemAdministratorRoleCode } from '../authorization/system-administrator.policy'
import { DanhSachTaiKhoanDto, DoiTrangThaiTaiKhoanDto, LienKetHoSoDto, SuaTaiKhoanDto, TaoTaiKhoanDto, TimHoSoChuaLienKetDto } from './accounts.dto'

const statusValues = ['DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG'] as const
const nowFilter = (now: Date) => ({ ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] })
const activeAssignmentFilter = (now: Date) => ({ ...nowFilter(now), thuHoiLuc: null })

@Injectable()
export class TaiKhoanService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
    @Inject(BamMatKhauService) private readonly bamMatKhau: BamMatKhauService,
  ) {}

  async danhSach(actor: TaiKhoanDaXacThuc, query: DanhSachTaiKhoanDto) {
    const trang = Number(query.trang ?? 1)
    const gioiHan = Number(query.gioiHan ?? 20)
    const scope = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_XEM', actor.maPhien)
    if (!scope.coQuyen) throw this.forbidden()
    const ids = scope.toanHeThong ? undefined : await this.layTaiKhoanTrongDonVi(scope.maDonVi)
    if (ids && ids.length === 0) return { duLieu: [], phanTrang: { trang, gioiHan, tongSo: 0 }, thongKe: this.thongKeRong(), thongKePhanQuyen: this.thongKePhanQuyenRong(), danhMucChiBo: [] }
    const now = new Date()
    const scopeWhere: Prisma.TaiKhoanNguoiDungWhereInput = ids ? { ma: { in: ids } } : {}
    const assignmentFilters: Prisma.TaiKhoanNguoiDungWhereInput[] = []
    if (query.coPhanCong === 'CO') assignmentFilters.push({ phanCongVaiTroDuocGan: { some: activeAssignmentFilter(now) } })
    if (query.coPhanCong === 'KHONG') assignmentFilters.push({ phanCongVaiTroDuocGan: { none: activeAssignmentFilter(now) } })
    if (query.maVaiTro) assignmentFilters.push({ phanCongVaiTroDuocGan: { some: { ...activeAssignmentFilter(now), maVaiTro: query.maVaiTro } } })
    const accountConditions: Prisma.TaiKhoanNguoiDungWhereInput[] = []
    if (query.maTaiKhoan) accountConditions.push({ ma: query.maTaiKhoan })
    if (query.tuKhoa?.trim()) accountConditions.push({ OR: [
        { tenDangNhap: { contains: query.tuKhoa.trim(), mode: 'insensitive' } },
        { email: { contains: query.tuKhoa.trim(), mode: 'insensitive' } },
        { hoSoDangVien: { is: { hoVaTen: { contains: query.tuKhoa.trim(), mode: 'insensitive' } } } },
      ] })
    if (query.trangThai) accountConditions.push({ trangThai: query.trangThai })
    if (query.tinhTrangLienKet === 'DA_LIEN_KET') accountConditions.push({ hoSoDangVien: { isNot: null } })
    if (query.tinhTrangLienKet === 'CHUA_LIEN_KET') accountConditions.push({ hoSoDangVien: { is: null } })
    if (query.maChiBo) accountConditions.push({ hoSoDangVien: { is: { lichSuDonVi: { some: { AND: [nowFilter(now), { maChiBo: query.maChiBo }] } } } } })
    accountConditions.push(...assignmentFilters)
    const base: Prisma.TaiKhoanNguoiDungWhereInput = {
      ...(ids ? { ma: { in: ids } } : {}),
      ...(accountConditions.length ? { AND: accountConditions } : {}),
    }
    const [total, accounts, statusCounts, unlinked, totalInScope, assignedInScope, expiringAssignments, branchRows] = await Promise.all([
      this.prisma.taiKhoanNguoiDung.count({ where: base }),
      this.prisma.taiKhoanNguoiDung.findMany({
        where: base,
        orderBy: { tenDangNhap: 'asc' },
        skip: (trang - 1) * gioiHan,
        take: gioiHan,
        select: {
          ma: true, tenDangNhap: true, email: true, trangThai: true, dangNhapCuoiLuc: true, ngayTao: true, ngayCapNhat: true, khoaDen: true, doiMatKhauLanDau: true,
        hoSoDangVien: { select: {
            ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true,
            lichSuDonVi: {
              where: nowFilter(now), take: 1,
              select: { chiBo: { select: {
                ma: true, maDinhDanh: true,
                tenDonVi: {
                  where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] },
                  take: 1, select: { ten: true },
                },
              } } },
            },
          } },
          phanCongVaiTroDuocGan: {
            where: activeAssignmentFilter(now),
            select: {
              ma: true, maVaiTro: true, loaiPhamVi: true, maDonViGoc: true, ngayHieuLucTu: true, ngayHieuLucDen: true,
              donViGoc: { select: { ma: true, maDinhDanh: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } } } },
              vaiTro: { select: { maDinhDanh: true, ten: true } },
              phamViDonViChiDinh: { select: { donVi: { select: {
                ma: true, maDinhDanh: true,
                tenDonVi: {
                  where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] },
                  take: 1, select: { ten: true },
                },
              } } } },
            },
          },
        },
      }),
      this.prisma.taiKhoanNguoiDung.groupBy({ by: ['trangThai'], where: scopeWhere, _count: { _all: true } }),
      this.prisma.taiKhoanNguoiDung.count({ where: { ...scopeWhere, hoSoDangVien: { is: null } } }),
      this.prisma.taiKhoanNguoiDung.count({ where: scopeWhere }),
      this.prisma.taiKhoanNguoiDung.count({ where: { ...scopeWhere, phanCongVaiTroDuocGan: { some: activeAssignmentFilter(now) } } }),
      this.prisma.phanCongVaiTro.count({ where: { ...(ids ? { maTaiKhoan: { in: ids } } : {}), ...activeAssignmentFilter(now), ngayHieuLucDen: { gt: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.lichSuDonViDangVien.findMany({
        where: { ...nowFilter(now), hoSoDangVien: { is: { maTaiKhoan: ids ? { in: ids } : { not: null } } } },
        distinct: ['maChiBo'],
        select: { maChiBo: true, chiBo: { select: { ma: true, maDinhDanh: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } } } } },
        orderBy: { maChiBo: 'asc' },
      }),
    ])
    const counts = new Map(statusCounts.map(({ trangThai, _count }) => [trangThai, _count._all]))
    const profileIds = accounts.flatMap((row) => row.hoSoDangVien ? [row.hoSoDangVien.ma] : [])
    const cccdPermission = await Promise.all(profileIds.map(async (id) => await this.coQuyen(actor, 'HO_SO_CA_NHAN_XEM', id) ? id : null))
    const visibleProfileIds = cccdPermission.filter((id): id is string => id !== null)
    const cccdRows = visibleProfileIds.length
      ? await this.prisma.thongTinCaNhanDangVien.findMany({ where: { maHoSo: { in: visibleProfileIds } }, select: { maHoSo: true, soCccd: true } })
      : []
    const cccdByProfile = new Map(cccdRows.map(({ maHoSo, soCccd }) => [maHoSo, soCccd]))
    return {
      duLieu: accounts.map((row) => ({
        maTaiKhoan: row.ma, tenDangNhap: row.tenDangNhap, email: row.email, trangThai: row.trangThai, ngayTao: row.ngayTao, ngayCapNhat: row.ngayCapNhat, khoaDen: row.khoaDen, doiMatKhauLanDau: row.doiMatKhauLanDau,
        hoSoDangVien: row.hoSoDangVien ? { ma: row.hoSoDangVien.ma, maHoSoNoiBo: row.hoSoDangVien.maHoSoNoiBo, hoVaTen: row.hoSoDangVien.hoVaTen, trangThai: row.hoSoDangVien.trangThai, cccd: cccdByProfile.get(row.hoSoDangVien.ma) ?? null, chiBoHienTai: row.hoSoDangVien.lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? row.hoSoDangVien.lichSuDonVi[0]?.chiBo.maDinhDanh ?? null, maChiBoHienTai: row.hoSoDangVien.lichSuDonVi[0]?.chiBo.ma ?? null } : null,
        hoVaTen: row.hoSoDangVien?.hoVaTen ?? null,
        chiBoHienTai: row.hoSoDangVien?.lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? row.hoSoDangVien?.lichSuDonVi[0]?.chiBo.maDinhDanh ?? null,
        maChiBoHienTai: row.hoSoDangVien?.lichSuDonVi[0]?.chiBo.ma ?? null,
        vaiTroDangPhanCong: row.phanCongVaiTroDuocGan.map(({ vaiTro }) => vaiTro.ten),
        phamViPhanCong: row.phanCongVaiTroDuocGan.map((assignment) => ({ maPhanCong: assignment.ma, maVaiTro: assignment.maVaiTro, maDinhDanhVaiTro: assignment.vaiTro.maDinhDanh, tenVaiTro: assignment.vaiTro.ten, loaiPhamVi: assignment.loaiPhamVi, maDonViGoc: assignment.maDonViGoc, tenDonViGoc: assignment.donViGoc?.tenDonVi[0]?.ten ?? assignment.donViGoc?.maDinhDanh ?? null, ngayHieuLucTu: assignment.ngayHieuLucTu, ngayHieuLucDen: assignment.ngayHieuLucDen, danhSachMaDonVi: assignment.phamViDonViChiDinh.map((item) => item.donVi.ma), donViChiDinh: assignment.phamViDonViChiDinh.map((item) => item.donVi.tenDonVi[0]?.ten ?? item.donVi.maDinhDanh ?? item.donVi.ma) })),
        soPhanCongHieuLuc: row.phanCongVaiTroDuocGan.length,
        dangNhapCuoiLuc: row.dangNhapCuoiLuc,
      })),
      phanTrang: { trang, gioiHan, tongSo: total },
      thongKe: {
        tongTaiKhoan: [...counts.values()].reduce((sum, value) => sum + value, 0),
        dangHoatDong: counts.get('DANG_HOAT_DONG') ?? 0,
        khoaHoacVoHieuHoa: (counts.get('TAM_KHOA') ?? 0) + (counts.get('NGUNG_HOAT_DONG') ?? 0),
        chuaLienKetHoSo: unlinked,
      },
      thongKePhanQuyen: { tongTaiKhoan: totalInScope, daPhanQuyen: assignedInScope, chuaPhanQuyen: Math.max(0, totalInScope - assignedInScope), sapHetHan: expiringAssignments },
      danhMucChiBo: branchRows.map(({ maChiBo, chiBo }) => ({ ma: maChiBo, ten: chiBo.tenDonVi[0]?.ten ?? chiBo.maDinhDanh })),
    }
  }

  async chiTiet(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const account = await this.prisma.taiKhoanNguoiDung.findUnique({
      where: { ma: maTaiKhoan },
      select: { ma: true, tenDangNhap: true, email: true, trangThai: true, dangNhapCuoiLuc: true, doiMatKhauLanDau: true, ngayTao: true, ngayCapNhat: true, khoaDen: true,
        hoSoDangVien: { select: { ma: true } } },
    })
    if (!account) throw this.notFound()
    let hoSoDangVien: Record<string, unknown> | null = null
    if (account.hoSoDangVien && await this.coQuyen(actor, 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', account.hoSoDangVien.ma)) {
      const now = new Date()
      const caNhanDuocXem = await this.coQuyen(actor, 'HO_SO_CA_NHAN_XEM', account.hoSoDangVien.ma)
      const profile = await this.prisma.hoSoDangVien.findUnique({ where: { ma: account.hoSoDangVien.ma }, select: {
        ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true,
        thongTinCaNhan: caNhanDuocXem ? { select: { ngaySinh: true, soCccd: true } } : false,
        lichSuDonVi: { where: nowFilter(now), take: 1, select: {
          maChiBo: true, maTo: true,
          chiBo: { select: { maDinhDanh: true, tenDonVi: { where: nowFilter(now), take: 1, select: { ten: true } } } },
          to: { select: { maDinhDanh: true, tenDonVi: { where: nowFilter(now), take: 1, select: { ten: true } } } },
        } },
      } })
      if (profile) {
        const currentUnit = profile.lichSuDonVi[0]
        hoSoDangVien = {
          ma: profile.ma, maHoSoNoiBo: profile.maHoSoNoiBo, hoVaTen: profile.hoVaTen, trangThai: profile.trangThai,
          ngaySinh: profile.thongTinCaNhan?.ngaySinh ?? null, cccd: profile.thongTinCaNhan?.soCccd ?? null,
          chiBoHienTai: currentUnit?.chiBo.tenDonVi[0]?.ten ?? currentUnit?.chiBo.maDinhDanh ?? null,
          maChiBoHienTai: currentUnit?.maChiBo ?? null,
          toHienTai: currentUnit?.to ? currentUnit.to.tenDonVi[0]?.ten ?? currentUnit.to.maDinhDanh : null,
        }
      }
    }
    let phienDangNhap: { ngayTao: Date; hetHanLuc: Date; diaChiIp: string | null }[] = []
    try {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'NHAT_KY_BAO_MAT_XEM', {}, actor.maPhien)
      phienDangNhap = await this.prisma.phienDangNhap.findMany({ where: { maTaiKhoan, thuHoiLuc: null, hetHanLuc: { gt: new Date() } }, orderBy: { ngayTao: 'desc' }, take: 20, select: { ngayTao: true, hetHanLuc: true, diaChiIp: true } })
    } catch (error) { if (!(error instanceof ForbiddenException)) throw error }
    return { ...account, maTaiKhoan: account.ma, daLienKetHoSo: Boolean(account.hoSoDangVien), hoSoDangVien, phienDangNhap }
  }

  async tao(actor: TaiKhoanDaXacThuc, dto: TaoTaiKhoanDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_TAO', {}, actor.maPhien)
    if (dto.trangThai && dto.trangThai !== 'DANG_HOAT_DONG') await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', {}, actor.maPhien)
    if (dto.maHoSo) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: dto.maHoSo }, actor.maPhien)
      await this.kiemTraHoSoChuaLienKet(dto.maHoSo)
    }
    const passwordHash = await this.bamMatKhau.tao(dto.matKhauBanDau)
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.taiKhoanNguoiDung.create({ data: {
          tenDangNhap: dto.tenDangNhap.trim(), email: dto.email?.trim() || null, matKhauBam: passwordHash,
        trangThai: dto.trangThai ?? 'DANG_HOAT_DONG', doiMatKhauLanDau: false,
          ...(dto.maHoSo ? { hoSoDangVien: { connect: { ma: dto.maHoSo } } } : {}),
        }, select: { ma: true, tenDangNhap: true, email: true, trangThai: true } })
        await this.audit(tx, actor, created.ma, 'TAI_KHOAN_TAO', ip, undefined, { tenDangNhap: created.tenDangNhap, emailDaThietLap: Boolean(created.email) })
        return { ...created, maTaiKhoan: created.ma }
      })
    } catch (error) { this.mapError(error) }
  }

  async sua(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, dto: SuaTaiKhoanDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_SUA_THONG_TIN', {}, actor.maPhien)
    if (dto.trangThai !== undefined) await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const before = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, tenDangNhap: true, email: true, doiMatKhauLanDau: true, trangThai: true } })
    if (!before) throw this.notFound()
    const matKhauBam = dto.matKhauMoi ? await this.bamMatKhau.tao(dto.matKhauMoi) : undefined
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (before.trangThai === 'DANG_HOAT_DONG' && dto.trangThai !== undefined && dto.trangThai !== 'DANG_HOAT_DONG') {
          await khoaKiemTraQuanTriVienCuoi(tx)
          const isSystemAdmin = await tx.phanCongVaiTro.count({ where: { maTaiKhoan, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } } })
          if (isSystemAdmin && await demQuanTriVienToanHeThongHopLe(tx, new Date(), { maTaiKhoan }) === 0) throw new ConflictException({ maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG', thongBao: 'Không thể khóa hoặc vô hiệu hóa Quản trị viên toàn hệ thống hợp lệ cuối cùng.' })
        }
        const updated = await tx.taiKhoanNguoiDung.update({
          where: { ma: maTaiKhoan },
          data: { tenDangNhap: dto.tenDangNhap?.trim(), email: dto.email === undefined ? undefined : dto.email?.trim() || null, trangThai: dto.trangThai, matKhauBam, doiMatKhauLanDau: dto.yeuCauDoiMatKhau ?? (matKhauBam ? false : undefined) },
          select: { ma: true, tenDangNhap: true, email: true, trangThai: true, doiMatKhauLanDau: true },
        })
        if (matKhauBam || (dto.trangThai !== undefined && dto.trangThai !== 'DANG_HOAT_DONG')) await tx.phienDangNhap.updateMany({ where: { maTaiKhoan, thuHoiLuc: null }, data: { thuHoiLuc: new Date(), maPhanCongVaiTroDangHoatDong: null } })
        await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_SUA', ip,
          { tenDangNhap: before.tenDangNhap, emailDaThietLap: Boolean(before.email), doiMatKhauLanDau: before.doiMatKhauLanDau, trangThai: before.trangThai },
          { tenDangNhap: updated.tenDangNhap, emailDaThietLap: Boolean(updated.email), doiMatKhauLanDau: updated.doiMatKhauLanDau, trangThai: updated.trangThai })
        return { ...updated, maTaiKhoan: updated.ma }
      })
    } catch (error) { this.mapError(error) }
  }

  async doiTrangThai(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, dto: DoiTrangThaiTaiKhoanDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_KHOA_MO_KHOA', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const before = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, trangThai: true } })
    if (!before) throw this.notFound()
    if (!(statusValues as readonly string[]).includes(dto.trangThai)) throw new ConflictException({ maLoi: 'TRANG_THAI_TAI_KHOAN_KHONG_HOP_LE', thongBao: 'Trạng thái tài khoản không hợp lệ.' })
    if (before.trangThai === dto.trangThai) return before
    return this.prisma.$transaction(async (tx) => {
      if (before.trangThai === 'DANG_HOAT_DONG' && dto.trangThai !== 'DANG_HOAT_DONG') {
        await khoaKiemTraQuanTriVienCuoi(tx)
        const isSystemAdmin = await tx.phanCongVaiTro.count({ where: { maTaiKhoan, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } } })
        if (isSystemAdmin && await demQuanTriVienToanHeThongHopLe(tx, new Date(), { maTaiKhoan }) === 0) {
          throw new ConflictException({ maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG', thongBao: 'Không thể khóa hoặc vô hiệu hóa Quản trị viên toàn hệ thống hợp lệ cuối cùng.' })
        }
      }
      const updated = await tx.taiKhoanNguoiDung.update({ where: { ma: maTaiKhoan }, data: { trangThai: dto.trangThai }, select: { ma: true, trangThai: true } })
      if (dto.trangThai !== 'DANG_HOAT_DONG') await tx.phienDangNhap.updateMany({ where: { maTaiKhoan, thuHoiLuc: null }, data: { thuHoiLuc: new Date(), maPhanCongVaiTroDangHoatDong: null } })
      await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_DOI_TRANG_THAI', ip, { trangThai: before.trangThai }, { trangThai: updated.trangThai, lyDo: dto.lyDo ?? null })
      return { ...updated, maTaiKhoan: updated.ma }
    })
  }

  async xoa(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, ip: string | null) {
    if (actor.maTaiKhoan === maTaiKhoan) throw new ConflictException({ maLoi: 'KHONG_THE_TU_XOA_TAI_KHOAN', thongBao: 'Không thể xóa tài khoản đang đăng nhập bằng luồng quản trị thông thường.' })
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_XOA', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    return this.prisma.$transaction(async (tx) => {
      await khoaKiemTraQuanTriVienCuoi(tx)
      const target = await tx.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, tenDangNhap: true, trangThai: true } })
      if (!target) throw this.notFound()
      const isSystemAdmin = await tx.phanCongVaiTro.count({ where: { maTaiKhoan, vaiTro: { maDinhDanh: systemAdministratorRoleCode, laVaiTroHeThong: true } } })
      if (isSystemAdmin && await demQuanTriVienToanHeThongHopLe(tx, new Date(), { maTaiKhoan }) === 0) {
        throw new ConflictException({ maLoi: 'KHONG_THE_THU_HOI_QUAN_TRI_VIEN_CUOI_CUNG', thongBao: 'Không thể xóa Quản trị viên toàn hệ thống hợp lệ cuối cùng.' })
      }
      const deps = await Promise.all([
        tx.hoSoDangVien.count({ where: { maTaiKhoan } }),
        tx.phienDangNhap.count({ where: { maTaiKhoan } }),
        tx.phanCongVaiTro.count({ where: { OR: [{ maTaiKhoan }, { maNguoiCap: maTaiKhoan }, { maNguoiThuHoi: maTaiKhoan }] } }),
        tx.lichSuTenDonVi.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.lichSuQuanHeDonVi.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.quaTrinhDangVien.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.lichSuDonViDangVien.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.phanCongChucVu.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.vaiTroQuyen.count({ where: { maNguoiGhiNhan: maTaiKhoan } }),
        tx.nhatKyKiemToan.count({ where: { maNguoiThucHien: maTaiKhoan } }),
      ])
      const labels = ['hồ sơ Đảng viên', 'phiên đăng nhập', 'Assignment/phân công', 'lịch sử tên đơn vị', 'lịch sử quan hệ tổ chức', 'quá trình Đảng', 'lịch sử sinh hoạt', 'phân công chức vụ', 'lịch sử Role–Permission', 'nhật ký do tài khoản thực hiện']
      const retained = deps.flatMap((count, index) => count ? [labels[index]] : [])
      if (retained.length) throw new ConflictException({ maLoi: 'TAI_KHOAN_CON_DU_LIEU_THAM_CHIEU', thongBao: `Không thể xóa vì còn ${retained.join(', ')} cần bảo toàn.` })
      await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_XOA', ip, { tenDangNhap: target.tenDangNhap, trangThai: target.trangThai }, undefined)
      await tx.taiKhoanNguoiDung.delete({ where: { ma: maTaiKhoan } })
      return { daXoa: true, maTaiKhoan }
    })
  }

  async lienKetHoSo(actor: TaiKhoanDaXacThuc, maTaiKhoan: string, dto: LienKetHoSoDto, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', {}, actor.maPhien)
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    const account = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, include: { hoSoDangVien: true } })
    if (!account) throw this.notFound()
    if (dto.maHoSo) {
      await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', { maHoSo: dto.maHoSo }, actor.maPhien)
      await this.kiemTraHoSoChuaLienKet(dto.maHoSo)
    }
    const previous = account.hoSoDangVien?.ma ?? null
    if (previous === (dto.maHoSo ?? null)) return { maTaiKhoan, maHoSo: previous }
    return this.prisma.$transaction(async (tx) => {
      await tx.hoSoDangVien.updateMany({ where: { maTaiKhoan }, data: { maTaiKhoan: null } })
      if (dto.maHoSo) await tx.hoSoDangVien.update({ where: { ma: dto.maHoSo }, data: { maTaiKhoan } })
      await this.audit(tx, actor, maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', ip, { maHoSo: previous }, { maHoSo: dto.maHoSo ?? null })
      return { maTaiKhoan, maHoSo: dto.maHoSo ?? null }
    })
  }

  async hoSoChuaLienKet(actor: TaiKhoanDaXacThuc, query: TimHoSoChuaLienKetDto) {
    const allowed = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_LIEN_KET_HO_SO', actor.maPhien)
    if (!allowed.coQuyen) throw this.forbidden()
    const now = new Date()
    const rows = await this.prisma.hoSoDangVien.findMany({
      where: { maTaiKhoan: null, ...(allowed.toanHeThong ? {} : { lichSuDonVi: { some: { AND: [nowFilter(new Date()), { OR: [{ maChiBo: { in: allowed.maDonVi } }, { maTo: { in: allowed.maDonVi } }] }] } } }), OR: [
        { hoVaTen: { contains: query.tuKhoa, mode: 'insensitive' } },
        { maHoSoNoiBo: { contains: query.tuKhoa, mode: 'insensitive' } },
      ] }, orderBy: { hoVaTen: 'asc' }, take: 20,
      select: {
        ma: true, maHoSoNoiBo: true, hoVaTen: true,
        lichSuDonVi: {
          where: nowFilter(now), take: 1,
          select: { chiBo: { select: {
            ma: true, maDinhDanh: true,
            tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } },
          } } },
        },
      },
    })
    return rows.map(({ lichSuDonVi, ...row }) => ({ ...row, chiBoHienTai: lichSuDonVi[0]?.chiBo.tenDonVi[0]?.ten ?? lichSuDonVi[0]?.chiBo.maDinhDanh ?? null, maChiBoHienTai: lichSuDonVi[0]?.chiBo.ma ?? null }))
  }

  async lichSu(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    await this.kiemTraTaiKhoanTrongPhamVi(actor, maTaiKhoan)
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'NHAT_KY_KIEM_TOAN_XEM', {}, actor.maPhien)
    return this.prisma.nhatKyKiemToan.findMany({
      where: { loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: maTaiKhoan },
      orderBy: { thoiDiem: 'desc' }, take: 100,
      select: { hanhDong: true, ketQua: true, lyDo: true, duLieuTruoc: true, duLieuSau: true, thoiDiem: true, maNguoiThucHien: true },
    })
  }

  private async kiemTraHoSoChuaLienKet(maHoSo: string) {
    const profile = await this.prisma.hoSoDangVien.findUnique({ where: { ma: maHoSo }, select: { maTaiKhoan: true } })
    if (!profile) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_HO_SO', thongBao: 'Không tìm thấy hồ sơ Đảng viên.' })
    if (profile.maTaiKhoan) throw new ConflictException({ maLoi: 'HO_SO_DA_LIEN_KET_TAI_KHOAN', thongBao: 'Hồ sơ này đã được liên kết với tài khoản khác.' })
  }

  private async kiemTraTaiKhoanTrongPhamVi(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    const scope = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_XEM', actor.maPhien)
    if (!scope.coQuyen) throw this.forbidden()
    const ids = scope.toanHeThong ? null : await this.layTaiKhoanTrongDonVi(scope.maDonVi)
    if (ids && !ids.includes(maTaiKhoan)) throw this.notFound()
  }

  private async coQuyen(actor: TaiKhoanDaXacThuc, permission: string, maHoSo: string) {
    try { await this.phanQuyen.kiemTra(actor.maTaiKhoan, permission, { maHoSo }, actor.maPhien); return true }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error }
  }

  private async layTaiKhoanTrongDonVi(maDonVi: string[]) {
    if (!maDonVi.length) return []
    const now = new Date()
    const assignments = await this.prisma.phanCongVaiTro.findMany({
      where: { ...activeAssignmentFilter(now), vaiTro: { trangThai: 'DANG_HOAT_DONG' }, loaiPhamVi: { in: ['CAY_DON_VI', 'DON_VI_CHI_DINH'] } },
      select: { maTaiKhoan: true, loaiPhamVi: true, maDonViGoc: true, phamViDonViChiDinh: { select: { maDonVi: true } } },
    })
    const ids = new Set<string>()
    for (const row of assignments) {
      const inside = row.loaiPhamVi === 'CAY_DON_VI'
        ? Boolean(row.maDonViGoc && maDonVi.includes(row.maDonViGoc))
        : row.phamViDonViChiDinh.some(({ maDonVi: id }) => maDonVi.includes(id))
      if (inside) ids.add(row.maTaiKhoan)
    }
    const profiles = await this.prisma.hoSoDangVien.findMany({
      where: { maTaiKhoan: { not: null }, lichSuDonVi: { some: { ...nowFilter(now), OR: [{ maChiBo: { in: maDonVi } }, { maTo: { in: maDonVi } }] } } },
      select: { maTaiKhoan: true },
    })
    for (const { maTaiKhoan } of profiles) if (maTaiKhoan) ids.add(maTaiKhoan)
    return [...ids]
  }

  private async audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, target: string, action: string, ip: string | null, before?: object, after?: object) {
    await tx.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: 'TAI_KHOAN', maDoiTuong: target,
      ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue,
      maTuongQuan: randomUUID(), diaChiIp: ip,
    } })
  }

  private thongKeRong() { return { tongTaiKhoan: 0, dangHoatDong: 0, khoaHoacVoHieuHoa: 0, chuaLienKetHoSo: 0 } }
  private thongKePhanQuyenRong() { return { tongTaiKhoan: 0, daPhanQuyen: 0, chuaPhanQuyen: 0, sapHetHan: 0 } }
  private forbidden() { return new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không đủ Permission hoặc Scope để quản lý tài khoản.' }) }
  private notFound() { return new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_KHOAN', thongBao: 'Không tìm thấy tài khoản trong phạm vi được phép.' }) }
  private mapError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'TAI_KHOAN_DA_TON_TAI', thongBao: 'Tên đăng nhập hoặc email đã được sử dụng.' })
    throw error
  }
}
