import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import type { DanhSachGiaTriDanhMucDto, DanhSachNhomDanhMucDto, SuaGiaTriDanhMucDto, SuaNhomDanhMucDto, TaoGiaTriDanhMucDto, TaoNhomDanhMucDto } from './business-catalogs.dto'

const P = { xem: 'CAU_HINH_DANH_MUC_XEM', tao: 'CAU_HINH_DANH_MUC_TAO', sua: 'CAU_HINH_DANH_MUC_SUA', taoBuoi: 'HOC_TAP_NGHI_QUYET_BUOI_TAO' } as const
const maNhomHinhThucBuoiHoc = 'HINH_THUC_BUOI_HOC_NGHI_QUYET'
const scopeXemDanhMuc = ['CAY_DON_VI', 'DON_VI_CHI_DINH', 'TOAN_HE_THONG'] as const
const scopeSuaDanhMuc = ['TOAN_HE_THONG'] as const

@Injectable()
export class DanhMucNghiepVuService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService) {}

  private async authorize(actor: TaiKhoanDaXacThuc, permission: string) {
    const scope = permission === P.xem || permission === P.taoBuoi ? scopeXemDanhMuc : scopeSuaDanhMuc
    await this.phanQuyen.kiemTraQuyenDanhMucChung(actor.maTaiKhoan, permission, actor.maPhien, scope)
  }
  private async group(maNhom: string) {
    const row = await this.prisma.nhomDanhMucNghiepVu.findUnique({ where: { maNhom } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_NHOM_DANH_MUC', thongBao: 'Không tìm thấy nhóm danh mục.' })
    return row
  }
  private async ensureOperationalType(tx: Prisma.TransactionClient, code: string) {
    const value = await tx.giaTriDanhMucNghiepVu.findFirst({
      where: { maGiaTri: code, trangThai: 'DANG_HOAT_DONG', nhom: { maNhom: maNhomHinhThucBuoiHoc, trangThai: 'DANG_HOAT_DONG' } },
      select: { ma: true, maGiaTri: true },
    })
    if (!value) throw new BadRequestException({ maLoi: 'HINH_THUC_BUOI_HOC_KHONG_HOP_LE', thongBao: 'Mã hình thức buổi học không tồn tại hoặc đã ngừng hoạt động.' })
    return value
  }

  async danhSachNhom(actor: TaiKhoanDaXacThuc, query: DanhSachNhomDanhMucDto) {
    await this.authorize(actor, P.xem)
    return this.prisma.nhomDanhMucNghiepVu.findMany({
      where: query.baoGomNgungHoatDong ? {} : { trangThai: 'DANG_HOAT_DONG' },
      include: { _count: { select: { giaTri: true } } },
      orderBy: [{ ten: 'asc' }, { maNhom: 'asc' }],
    })
  }
  async chiTietNhom(actor: TaiKhoanDaXacThuc, maNhom: string, query: DanhSachGiaTriDanhMucDto) {
    let readViaSessionCreation = false
    try { await this.authorize(actor, P.xem) }
    catch (error) {
      if (!(error instanceof ForbiddenException) || maNhom !== maNhomHinhThucBuoiHoc || query.baoGomNgungHoatDong) throw error
      await this.authorize(actor, P.taoBuoi)
      readViaSessionCreation = true
    }
    const row = await this.prisma.nhomDanhMucNghiepVu.findUnique({
      where: { maNhom },
      include: { giaTri: { where: query.baoGomNgungHoatDong ? {} : { trangThai: 'DANG_HOAT_DONG' }, orderBy: [{ thuTu: 'asc' }, { tenHienThi: 'asc' }, { maGiaTri: 'asc' }] } },
    })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_NHOM_DANH_MUC', thongBao: 'Không tìm thấy nhóm danh mục.' })
    if (readViaSessionCreation && row.trangThai !== 'DANG_HOAT_DONG') throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_NHOM_DANH_MUC', thongBao: 'Không tìm thấy nhóm danh mục.' })
    return row
  }
  async taoNhom(actor: TaiKhoanDaXacThuc, dto: TaoNhomDanhMucDto, ip?: string | null) {
    await this.authorize(actor, P.tao)
    const id = randomUUID()
    try { return await this.prisma.$transaction(async tx => {
      const row = await tx.nhomDanhMucNghiepVu.create({ data: { ma: id, maNhom: dto.maNhom, ten: dto.ten, moTa: dto.moTa } })
      await this.audit(tx, actor, 'TAO_NHOM', row.ma, null, row, ip); return row
    }) } catch (error) { this.conflict(error, 'MA_NHOM_DANH_MUC_DA_TON_TAI') }
  }
  async suaNhom(actor: TaiKhoanDaXacThuc, maNhom: string, dto: SuaNhomDanhMucDto, ip?: string | null) {
    await this.authorize(actor, P.sua); const before = await this.group(maNhom)
    if (!dto.ten && dto.moTa === undefined && !dto.trangThai) throw new BadRequestException({ maLoi: 'THIEU_TRUONG_CAP_NHAT', thongBao: 'Cần cung cấp ít nhất một trường để cập nhật.' })
    const row = await this.prisma.$transaction(async tx => {
      const updated = await tx.nhomDanhMucNghiepVu.update({ where: { ma: before.ma }, data: { ten: dto.ten, moTa: dto.moTa, trangThai: dto.trangThai } })
      await this.audit(tx, actor, 'SUA_NHOM', updated.ma, before, updated, ip); return updated
    })
    return row
  }
  async taoGiaTri(actor: TaiKhoanDaXacThuc, maNhom: string, dto: TaoGiaTriDanhMucDto, ip?: string | null) {
    await this.authorize(actor, P.tao); const group = await this.group(maNhom)
    if (group.trangThai !== 'DANG_HOAT_DONG') throw new ConflictException({ maLoi: 'NHOM_DANH_MUC_DA_NGUNG', thongBao: 'Không thể thêm giá trị vào nhóm danh mục đã ngừng hoạt động.' })
    try { return await this.prisma.$transaction(async tx => {
      const row = await tx.giaTriDanhMucNghiepVu.create({ data: { maNhomDanhMuc: group.ma, maGiaTri: dto.maGiaTri, tenHienThi: dto.tenHienThi, thuTu: dto.thuTu } })
      await this.audit(tx, actor, 'TAO_GIA_TRI', row.ma, null, row, ip); return row
    }) } catch (error) { this.conflict(error, 'MA_GIA_TRI_DA_TON_TAI_TRONG_NHOM') }
  }
  async suaGiaTri(actor: TaiKhoanDaXacThuc, maNhom: string, maGiaTri: string, dto: SuaGiaTriDanhMucDto, ip?: string | null) {
    await this.authorize(actor, P.sua); const group = await this.group(maNhom)
    const before = await this.prisma.giaTriDanhMucNghiepVu.findUnique({ where: { maNhomDanhMuc_maGiaTri: { maNhomDanhMuc: group.ma, maGiaTri } } })
    if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_GIA_TRI_DANH_MUC', thongBao: 'Không tìm thấy giá trị danh mục.' })
    if (dto.tenHienThi === undefined && dto.thuTu === undefined && dto.trangThai === undefined) throw new BadRequestException({ maLoi: 'THIEU_TRUONG_CAP_NHAT', thongBao: 'Cần cung cấp ít nhất một trường để cập nhật.' })
    const row = await this.prisma.$transaction(async tx => {
      const updated = await tx.giaTriDanhMucNghiepVu.update({ where: { ma: before.ma }, data: { tenHienThi: dto.tenHienThi, thuTu: dto.thuTu, trangThai: dto.trangThai } })
      await this.audit(tx, actor, 'SUA_GIA_TRI', updated.ma, before, updated, ip); return updated
    })
    return row
  }

  private async audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, action: string, id: string, before: unknown, after: unknown, ip?: string | null) {
    return tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: `CAU_HINH_DANH_MUC_${action}`, loaiDoiTuong: 'DANH_MUC_NGHIEP_VU', maDoiTuong: id, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
  }
  private conflict(error: unknown, code: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: code, thongBao: 'Mã danh mục đã tồn tại.' })
    throw error
  }

  async kiemTraHinhThucBuoiHoc(tx: Prisma.TransactionClient, maGiaTri: string) { return this.ensureOperationalType(tx, maGiaTri) }
}
