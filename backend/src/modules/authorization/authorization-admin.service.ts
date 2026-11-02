import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from './authorization.service'
import { systemAdministratorRoleCode } from './system-administrator.policy'
import { CapNhatQuyenVaiTroDto, SuaPhanCongVaiTroDto, SuaVaiTroDto, TaoPhanCongVaiTroDto, TaoVaiTroDto, TimTaiKhoanPhanQuyenDto } from './authorization-admin.dto'
import { permissionMetadata } from './permission-catalog'

const active = 'DANG_HOAT_DONG'
const forbidden = () => new ForbiddenException({ maLoi: 'KHONG_DU_THAM_QUYEN_CAP_QUYEN', thongBao: 'Không được cấp quyền hoặc phạm vi vượt thẩm quyền.' })

@Injectable()
export class QuanTriPhanQuyenService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
  ) {}

  danhMucQuyen() {
    return this.prisma.quyen.findMany({ orderBy: { maDinhDanh: 'asc' }, select: { ma: true, maDinhDanh: true } })
      .then((rows) => rows.map((row) => ({ ma: row.ma, maDinhDanh: row.maDinhDanh, ...permissionMetadata[row.maDinhDanh as keyof typeof permissionMetadata] })))
  }

  vaiTro() {
    return this.prisma.vaiTro.findMany({
      orderBy: { maDinhDanh: 'asc' },
      include: {
        quyen: { include: { quyen: { select: { ma: true, maDinhDanh: true, ten: true } } } },
        _count: { select: { phanCong: true } },
      },
    })
  }

  async taiKhoanDePhanQuyen(actor: TaiKhoanDaXacThuc, query: TimTaiKhoanPhanQuyenDto) {
    const scope = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, 'TAI_KHOAN_XEM')
    if (!scope.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Không có quyền xem tài khoản.' })

    const accountIds = scope.toanHeThong ? undefined : await this.taiKhoanTrongDonViDuocQuanLy(scope.maDonVi)
    if (accountIds && accountIds.length === 0) return { duLieu: [] }
    const keyword = query.tuKhoa?.trim()
    const accounts = await this.prisma.taiKhoanNguoiDung.findMany({
      where: {
        trangThai: active,
        ...(accountIds ? { ma: { in: accountIds } } : {}),
        ...(keyword ? { OR: [
          { tenDangNhap: { contains: keyword, mode: 'insensitive' } },
          { hoSoDangVien: { is: { hoVaTen: { contains: keyword, mode: 'insensitive' } } } },
          { hoSoDangVien: { is: { maHoSoNoiBo: { contains: keyword, mode: 'insensitive' } } } },
        ] } : {}),
      },
      orderBy: { tenDangNhap: 'asc' },
      take: query.gioiHan ?? 20,
      select: {
        ma: true, tenDangNhap: true,
        hoSoDangVien: { select: { hoVaTen: true, maHoSoNoiBo: true } },
      },
    })
    return { duLieu: accounts.map(({ ma, tenDangNhap, hoSoDangVien }) => ({
      maTaiKhoan: ma, tenDangNhap, hoVaTen: hoSoDangVien?.hoVaTen ?? null,
      maHoSoNoiBo: hoSoDangVien?.maHoSoNoiBo ?? null,
    })) }
  }

  private async taiKhoanTrongDonViDuocQuanLy(maDonVi: string[]) {
    if (!maDonVi.length) return []
    const now = new Date()
    const assignments = await this.prisma.phanCongVaiTro.findMany({
      where: {
        ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
        thuHoiLuc: null, vaiTro: { trangThai: active },
        loaiPhamVi: { in: ['CAY_DON_VI', 'DON_VI_CHI_DINH'] },
      },
      select: {
        maTaiKhoan: true, loaiPhamVi: true, maDonViGoc: true,
        phamViDonViChiDinh: { select: { maDonVi: true } },
      },
    })
    const visibleAccounts = new Set<string>()
    for (const assignment of assignments) {
      if (assignment.loaiPhamVi === 'CAY_DON_VI' && assignment.maDonViGoc && maDonVi.includes(assignment.maDonViGoc)) {
        visibleAccounts.add(assignment.maTaiKhoan)
      }
      if (assignment.loaiPhamVi === 'DON_VI_CHI_DINH' && assignment.phamViDonViChiDinh.length > 0
        && assignment.phamViDonViChiDinh.every(({ maDonVi: targetUnit }) => maDonVi.includes(targetUnit))) {
        visibleAccounts.add(assignment.maTaiKhoan)
      }
    }
    return [...visibleAccounts]
  }

  async taoVaiTro(actor: TaiKhoanDaXacThuc, dto: TaoVaiTroDto) {
    if (dto.maDinhDanh === systemAdministratorRoleCode || dto.maDinhDanh === 'QUAN_TRI_KHOI_TAO_24H') throw forbidden()
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'VAI_TRO_TAO', [])
    try {
      return await this.prisma.$transaction(async (tx) => {
        const role = await tx.vaiTro.create({ data: {
          maDinhDanh: dto.maDinhDanh, ten: dto.ten, moTa: dto.moTa, trangThai: active, laVaiTroHeThong: false,
        } })
        await this.ghiAudit(tx, actor.maTaiKhoan, role.ma, 'VAI_TRO_TAO', undefined, { maDinhDanh: role.maDinhDanh })
        return role
      })
    } catch (error) { this.mapError(error) }
  }

  async suaVaiTro(actor: TaiKhoanDaXacThuc, maVaiTro: string, dto: SuaVaiTroDto) {
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'VAI_TRO_SUA', [])
    const before = await this.prisma.vaiTro.findUnique({ where: { ma: maVaiTro } })
    if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_VAI_TRO', thongBao: 'Không tìm thấy vai trò.' })
    if (before.laVaiTroHeThong) throw forbidden()
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.vaiTro.update({ where: { ma: maVaiTro }, data: dto })
      await this.ghiAudit(tx, actor.maTaiKhoan, role.ma, 'VAI_TRO_SUA', { ten: before.ten, trangThai: before.trangThai }, { ten: role.ten, trangThai: role.trangThai })
      return role
    })
  }

  async xoaVaiTro(actor: TaiKhoanDaXacThuc, maVaiTro: string) {
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'VAI_TRO_XOA', [])
    const role = await this.prisma.vaiTro.findUnique({ where: { ma: maVaiTro } })
    if (!role) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_VAI_TRO', thongBao: 'Không tìm thấy vai trò.' })
    if (role.laVaiTroHeThong || (await this.prisma.phanCongVaiTro.count({ where: { maVaiTro } })) > 0) throw forbidden()
    return this.prisma.$transaction(async (tx) => {
      await this.ghiAudit(tx, actor.maTaiKhoan, role.ma, 'VAI_TRO_XOA', { maDinhDanh: role.maDinhDanh })
      await tx.vaiTro.delete({ where: { ma: maVaiTro } })
      return { daXoa: true, maVaiTro }
    })
  }

  async capNhatQuyenVaiTro(actor: TaiKhoanDaXacThuc, maVaiTro: string, dto: CapNhatQuyenVaiTroDto) {
    const role = await this.prisma.vaiTro.findUnique({
      where: { ma: maVaiTro }, include: { quyen: { include: { quyen: true } } },
    })
    if (!role) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_VAI_TRO', thongBao: 'Không tìm thấy vai trò.' })
    if (role.laVaiTroHeThong) throw forbidden()
    if (dto.themMaQuyen.some((id) => dto.boMaQuyen.includes(id))) throw new ConflictException({ maLoi: 'QUYEN_TRUNG_LAP', thongBao: 'Không thể thêm và gỡ cùng một Permission trong một yêu cầu.' })
    const codes = await this.prisma.quyen.findMany({ where: { ma: { in: dto.themMaQuyen } }, select: { ma: true, maDinhDanh: true } })
    if (codes.length !== dto.themMaQuyen.length) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_QUYEN', thongBao: 'Danh mục có Permission không tồn tại.' })
    const resultingCodes = [
      ...role.quyen.map(({ quyen }) => quyen).filter(({ ma }) => !dto.boMaQuyen.includes(ma)).map(({ maDinhDanh }) => maDinhDanh),
      ...codes.map(({ maDinhDanh }) => maDinhDanh),
    ]
    await this.kiemTraCoTheSuaQuyenVaiTro(actor.maTaiKhoan, resultingCodes, maVaiTro)
    await this.prisma.$transaction(async (tx) => {
      if (dto.boMaQuyen.length) await tx.vaiTroQuyen.deleteMany({ where: { maVaiTro, maQuyen: { in: dto.boMaQuyen } } })
      if (dto.themMaQuyen.length) await tx.vaiTroQuyen.createMany({
        data: dto.themMaQuyen.map((maQuyen) => ({ maVaiTro, maQuyen, maNguoiGhiNhan: actor.maTaiKhoan })),
        skipDuplicates: true,
      })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'VAI_TRO_GAN_QUYEN', loaiDoiTuong: 'VAI_TRO', maDoiTuong: maVaiTro,
        ketQua: 'THANH_CONG', duLieuSau: { themMaQuyen: dto.themMaQuyen, boMaQuyen: dto.boMaQuyen }, maTuongQuan: randomUUID(),
      } })
    })
    return { maVaiTro, soQuyenThem: dto.themMaQuyen.length, soQuyenGo: dto.boMaQuyen.length }
  }

  async kiemTraQuyenDanhMuc(actorId: string, code: 'QUYEN_XEM_DANH_MUC' | 'VAI_TRO_XEM') {
    await this.kiemTraCoTheCap(actorId, code, [])
  }

  async taoPhanCong(actor: TaiKhoanDaXacThuc, dto: TaoPhanCongVaiTroDto) {
    if (dto.maTaiKhoan === actor.maTaiKhoan) throw forbidden()
    if (dto.loaiPhamVi === 'TOAN_HE_THONG' || dto.loaiPhamVi === 'CA_NHAN') throw forbidden()
    if ((dto.loaiPhamVi === 'CAY_DON_VI') !== Boolean(dto.maDonViGoc)) throw new ConflictException({ maLoi: 'PHAM_VI_KHONG_HOP_LE', thongBao: 'Phạm vi cây cần đúng một đơn vị gốc; phạm vi khác không nhận đơn vị gốc.' })
    if ((dto.loaiPhamVi === 'DON_VI_CHI_DINH') !== Boolean(dto.danhSachMaDonVi?.length)) throw new ConflictException({ maLoi: 'PHAM_VI_KHONG_HOP_LE', thongBao: 'Phạm vi đơn vị chỉ định cần danh sách đơn vị rõ ràng.' })
    const [target, role] = await Promise.all([
      this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: dto.maTaiKhoan }, select: { ma: true, trangThai: true } }),
      this.prisma.vaiTro.findUnique({ where: { ma: dto.maVaiTro }, include: { quyen: { include: { quyen: true } } } }),
    ])
    if (!target) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_KHOAN', thongBao: 'Không tìm thấy tài khoản.' })
    if (target.trangThai !== active) throw new ConflictException({ maLoi: 'TAI_KHOAN_KHONG_HOAT_DONG', thongBao: 'Chỉ cấp phân công cho tài khoản đang hoạt động.' })
    if (!role || role.trangThai !== active) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_VAI_TRO_HOAT_DONG', thongBao: 'Không tìm thấy vai trò đang hoạt động.' })
    if (role.laVaiTroHeThong) throw forbidden()
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'PHAN_CONG_VAI_TRO_TAO', role.quyen.map(({ quyen }) => quyen.maDinhDanh), dto)
    const end = dto.ngayHieuLucDen ? new Date(dto.ngayHieuLucDen) : null
    if (end && end <= new Date()) throw new ConflictException({ maLoi: 'THOI_HAN_KHONG_HOP_LE', thongBao: 'Thời điểm hết hạn phải ở tương lai.' })
    const start = new Date()
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.phanCongVaiTro.create({ data: {
        maTaiKhoan: dto.maTaiKhoan, maVaiTro: dto.maVaiTro, loaiPhamVi: dto.loaiPhamVi,
        maDonViGoc: dto.maDonViGoc, ngayHieuLucTu: start, ngayHieuLucDen: end,
        maNguoiCap: actor.maTaiKhoan, lyDo: dto.lyDo,
        ...(dto.loaiPhamVi === 'DON_VI_CHI_DINH'
          ? { phamViDonViChiDinh: { create: dto.danhSachMaDonVi!.map((maDonVi) => ({ maDonVi })) } }
          : {}),
      } })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'PHAN_CONG_VAI_TRO_TAO', loaiDoiTuong: 'PHAN_CONG_VAI_TRO', maDoiTuong: assignment.ma,
        ketQua: 'THANH_CONG', duLieuSau: { maTaiKhoan: target.ma, maVaiTro: role.ma, loaiPhamVi: dto.loaiPhamVi, maDonViGoc: dto.maDonViGoc, hetHanLuc: end?.toISOString() ?? null }, maTuongQuan: randomUUID(),
      } })
      return { maPhanCong: assignment.ma, ngayHieuLucTu: start, ngayHieuLucDen: end }
    })
  }

  async danhSachPhanCong(actor: TaiKhoanDaXacThuc, maTaiKhoan: string) {
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'PHAN_CONG_VAI_TRO_XEM', [])
    const account = await this.prisma.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true } })
    if (!account) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_KHOAN', thongBao: 'Không tìm thấy tài khoản.' })
    const assignments = await this.prisma.phanCongVaiTro.findMany({
      where: { maTaiKhoan }, orderBy: { ngayTao: 'desc' },
      include: {
        vaiTro: { select: { maDinhDanh: true, ten: true, quyen: { include: { quyen: { select: { maDinhDanh: true } } } } } },
        phamViDonViChiDinh: true,
      },
    })
    const visible: typeof assignments = []
    for (const assignment of assignments) {
      const permitted = await this.coPhamViQuanSatDuoc(actor.maTaiKhoan, assignment)
      if (permitted) visible.push(assignment)
    }
    return visible.map((assignment) => ({
      maPhanCong: assignment.ma, maVaiTro: assignment.vaiTro.maDinhDanh,
      tenVaiTro: assignment.vaiTro.ten, loaiPhamVi: assignment.loaiPhamVi,
      danhSachMaQuyen: assignment.vaiTro.quyen.map(({ quyen }) => quyen.maDinhDanh),
      maDonViGoc: assignment.maDonViGoc, danhSachMaDonVi: assignment.phamViDonViChiDinh.map(({ maDonVi }) => maDonVi),
      ngayHieuLucTu: assignment.ngayHieuLucTu, ngayHieuLucDen: assignment.ngayHieuLucDen,
      thuHoiLuc: assignment.thuHoiLuc, lyDo: assignment.lyDo,
    }))
  }

  async suaPhanCong(actor: TaiKhoanDaXacThuc, maPhanCong: string, dto: SuaPhanCongVaiTroDto) {
    const assignment = await this.prisma.phanCongVaiTro.findUnique({
      where: { ma: maPhanCong }, include: { vaiTro: { include: { quyen: { include: { quyen: true } } } }, phamViDonViChiDinh: true },
    })
    if (!assignment) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_PHAN_CONG', thongBao: 'Không tìm thấy phân công.' })
    if (assignment.thuHoiLuc || assignment.vaiTro.laVaiTroHeThong || assignment.ngayHieuLucDen && assignment.ngayHieuLucDen <= new Date()) throw forbidden()
    if (assignment.maTaiKhoan === actor.maTaiKhoan) throw forbidden()
    if (dto.loaiPhamVi === 'TOAN_HE_THONG' || dto.loaiPhamVi === 'CA_NHAN') throw forbidden()
    if ((dto.loaiPhamVi === 'CAY_DON_VI') !== Boolean(dto.maDonViGoc)) throw new ConflictException({ maLoi: 'PHAM_VI_KHONG_HOP_LE', thongBao: 'Phạm vi cây cần đúng một đơn vị gốc.' })
    if ((dto.loaiPhamVi === 'DON_VI_CHI_DINH') !== Boolean(dto.danhSachMaDonVi?.length)) throw new ConflictException({ maLoi: 'PHAM_VI_KHONG_HOP_LE', thongBao: 'Phạm vi đơn vị chỉ định cần danh sách rõ ràng.' })
    const roleCodes = assignment.vaiTro.quyen.map(({ quyen }) => quyen.maDinhDanh)
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'PHAN_CONG_VAI_TRO_SUA', roleCodes, dto)
    const end = dto.ngayHieuLucDen ? new Date(dto.ngayHieuLucDen) : null
    if (end && end <= new Date()) throw new ConflictException({ maLoi: 'THOI_HAN_KHONG_HOP_LE', thongBao: 'Thời điểm hết hạn phải ở tương lai.' })
    return this.prisma.$transaction(async (tx) => {
      const before = { loaiPhamVi: assignment.loaiPhamVi, maDonViGoc: assignment.maDonViGoc, ngayHieuLucDen: assignment.ngayHieuLucDen?.toISOString() ?? null }
      await tx.phamViDonVi.deleteMany({ where: { maPhanCong } })
      const updated = await tx.phanCongVaiTro.update({ where: { ma: maPhanCong }, data: {
        loaiPhamVi: dto.loaiPhamVi, maDonViGoc: dto.loaiPhamVi === 'CAY_DON_VI' ? dto.maDonViGoc : null,
        ngayHieuLucDen: end, lyDo: dto.lyDo,
        ...(dto.loaiPhamVi === 'DON_VI_CHI_DINH'
          ? { phamViDonViChiDinh: { create: dto.danhSachMaDonVi!.map((maDonVi) => ({ maDonVi })) } }
          : {}),
      } })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'PHAN_CONG_VAI_TRO_SUA', loaiDoiTuong: 'PHAN_CONG_VAI_TRO', maDoiTuong: maPhanCong,
        ketQua: 'THANH_CONG', duLieuTruoc: before, duLieuSau: { loaiPhamVi: dto.loaiPhamVi, maDonViGoc: dto.maDonViGoc, ngayHieuLucDen: end?.toISOString() ?? null }, maTuongQuan: randomUUID(),
      } })
      return { maPhanCong: updated.ma, loaiPhamVi: updated.loaiPhamVi, ngayHieuLucDen: end }
    })
  }

  async thuHoiPhanCong(actor: TaiKhoanDaXacThuc, maPhanCong: string, lyDo: string) {
    const assignment = await this.prisma.phanCongVaiTro.findUnique({
      where: { ma: maPhanCong }, include: { vaiTro: { include: { quyen: { include: { quyen: true } } } }, phamViDonViChiDinh: true },
    })
    if (!assignment) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_PHAN_CONG', thongBao: 'Không tìm thấy phân công.' })
    if (assignment.vaiTro.laVaiTroHeThong || assignment.vaiTro.maDinhDanh === 'QUAN_TRI_VIEN_TOAN_HE_THONG') throw forbidden()
    await this.kiemTraCoTheCap(actor.maTaiKhoan, 'PHAN_CONG_VAI_TRO_THU_HOI', assignment.vaiTro.quyen.map(({ quyen }) => quyen.maDinhDanh), {
      loaiPhamVi: assignment.loaiPhamVi, maDonViGoc: assignment.maDonViGoc ?? undefined,
      danhSachMaDonVi: assignment.phamViDonViChiDinh.map(({ maDonVi }) => maDonVi),
    })
    if (assignment.maTaiKhoan === actor.maTaiKhoan) throw forbidden()
    const revokedAt = new Date()
    await this.prisma.$transaction(async (tx) => {
      await tx.phanCongVaiTro.update({ where: { ma: maPhanCong }, data: { thuHoiLuc: revokedAt, maNguoiThuHoi: actor.maTaiKhoan, lyDo } })
      await tx.nhatKyKiemToan.create({ data: {
        maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'PHAN_CONG_VAI_TRO_THU_HOI', loaiDoiTuong: 'PHAN_CONG_VAI_TRO', maDoiTuong: maPhanCong,
        ketQua: 'THANH_CONG', lyDo, maTuongQuan: randomUUID(),
      } })
    })
    return { daThuHoi: true, maPhanCong, thuHoiLuc: revokedAt }
  }

  private async kiemTraCoTheCap(
    actorId: string,
    requiredPermission: string,
    targetPermissions: string[],
    target?: { loaiPhamVi: string; maDonViGoc?: string; danhSachMaDonVi?: string[] },
  ) {
    const now = new Date()
    const sources = await this.prisma.phanCongVaiTro.findMany({
      where: { maTaiKhoan: actorId, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }], thuHoiLuc: null, vaiTro: { trangThai: active } },
      include: { vaiTro: { include: { quyen: { include: { quyen: true } } } }, phamViDonViChiDinh: true },
    })
    for (const source of sources) {
      const sourceCodes = new Set(source.vaiTro.quyen.map(({ quyen }) => quyen.maDinhDanh))
      const isSystemAdmin = source.vaiTro.maDinhDanh === systemAdministratorRoleCode
        && source.vaiTro.laVaiTroHeThong && source.loaiPhamVi === 'TOAN_HE_THONG'
      if (!sourceCodes.has(requiredPermission) || (!isSystemAdmin && targetPermissions.some((permission) => !sourceCodes.has(permission)))) continue
      if (!target || await this.phamViCon(target, source)) return
    }
    throw forbidden()
  }

  private async kiemTraCoTheSuaQuyenVaiTro(actorId: string, permissionCodes: string[], roleId: string) {
    const roleAssignments = await this.prisma.phanCongVaiTro.findMany({
      where: { maVaiTro: roleId },
      include: { phamViDonViChiDinh: true },
    })
    const now = new Date()
    const sources = await this.prisma.phanCongVaiTro.findMany({
      where: { maTaiKhoan: actorId, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }], thuHoiLuc: null, vaiTro: { trangThai: active } },
      include: { vaiTro: { include: { quyen: { include: { quyen: true } } } }, phamViDonViChiDinh: true },
    })
    for (const source of sources) {
      const sourceCodes = new Set(source.vaiTro.quyen.map(({ quyen }) => quyen.maDinhDanh))
      const isSystemAdmin = source.vaiTro.maDinhDanh === systemAdministratorRoleCode
        && source.vaiTro.laVaiTroHeThong && source.loaiPhamVi === 'TOAN_HE_THONG'
      if (!sourceCodes.has('VAI_TRO_GAN_QUYEN') || (!isSystemAdmin && permissionCodes.some((code) => !sourceCodes.has(code)))) continue
      let coversEveryAssignment = true
      for (const assignment of roleAssignments) {
        if (!await this.phamViCon({
          loaiPhamVi: assignment.loaiPhamVi, maDonViGoc: assignment.maDonViGoc ?? undefined,
          danhSachMaDonVi: assignment.phamViDonViChiDinh.map(({ maDonVi }) => maDonVi),
        }, source)) {
          coversEveryAssignment = false
          break
        }
      }
      if (coversEveryAssignment) return
    }
    throw forbidden()
  }

  private async phamViCon(
    target: { loaiPhamVi: string; maDonViGoc?: string; danhSachMaDonVi?: string[] },
    source: { loaiPhamVi: string; maDonViGoc: string | null; phamViDonViChiDinh: { maDonVi: string }[] },
  ) {
    if (source.loaiPhamVi === 'TOAN_HE_THONG') return true
    const targetUnits = target.loaiPhamVi === 'CAY_DON_VI'
      ? (target.maDonViGoc ? [target.maDonViGoc] : [])
      : target.loaiPhamVi === 'DON_VI_CHI_DINH' ? target.danhSachMaDonVi ?? [] : []
    if (!targetUnits.length) return false
    if (source.loaiPhamVi === 'DON_VI_CHI_DINH') {
      return target.loaiPhamVi === 'DON_VI_CHI_DINH' && targetUnits.every((id) => source.phamViDonViChiDinh.some((unit) => unit.maDonVi === id))
    }
    if (source.loaiPhamVi === 'CAY_DON_VI' && source.maDonViGoc) {
      for (const unit of targetUnits) {
        if (!await this.namTrongCay(unit, source.maDonViGoc)) return false
      }
      return true
    }
    return false
  }

  private async coPhamViQuanSatDuoc(actorId: string, target: {
    loaiPhamVi: string; maDonViGoc: string | null; phamViDonViChiDinh: { maDonVi: string }[]
  }) {
    const now = new Date()
    const sources = await this.prisma.phanCongVaiTro.findMany({
      where: { maTaiKhoan: actorId, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }], thuHoiLuc: null, vaiTro: { trangThai: active } },
      include: { vaiTro: { include: { quyen: { include: { quyen: true } } } }, phamViDonViChiDinh: true },
    })
    for (const source of sources) {
      if (!source.vaiTro.quyen.some(({ quyen }) => quyen.maDinhDanh === 'PHAN_CONG_VAI_TRO_XEM')) continue
      if (await this.phamViCon({
        loaiPhamVi: target.loaiPhamVi, maDonViGoc: target.maDonViGoc ?? undefined,
        danhSachMaDonVi: target.phamViDonViChiDinh.map(({ maDonVi }) => maDonVi),
      }, source)) return true
    }
    return false
  }

  private async namTrongCay(unit: string, root: string) {
    if (unit === root) return true
    const rows = await this.prisma.$queryRaw<Array<{ found: boolean }>>`
      WITH RECURSIVE to_tien(ma_don_vi) AS (
        SELECT ${unit}::uuid UNION SELECT q.ma_don_vi_cha FROM lich_su_quan_he_don_vi q
        JOIN to_tien t ON q.ma_don_vi_con=t.ma_don_vi WHERE q.ngay_hieu_luc_tu<=NOW()
          AND (q.ngay_hieu_luc_den IS NULL OR q.ngay_hieu_luc_den>NOW())
      ) SELECT EXISTS(SELECT 1 FROM to_tien WHERE ma_don_vi=${root}::uuid) AS found
    `
    return rows[0]?.found === true
  }

  private async ghiAudit(tx: Prisma.TransactionClient, actor: string, target: string, action: string, before?: object, after?: object) {
    await tx.nhatKyKiemToan.create({ data: {
      maNguoiThucHien: actor, hanhDong: action, loaiDoiTuong: 'VAI_TRO', maDoiTuong: target,
      ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(),
    } })
  }

  private mapError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'VAI_TRO_DA_TON_TAI', thongBao: 'Mã định danh vai trò đã được sử dụng.' })
    throw error
  }
}
