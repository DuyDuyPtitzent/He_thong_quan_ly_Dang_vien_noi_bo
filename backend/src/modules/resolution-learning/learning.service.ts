import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { DanhMucNghiepVuService } from '../system-settings/business-catalogs.service'
import type { DanhSachHocTapDto, DanhSachThamGiaDto, SuaBuoiHocDto, SuaDotHocDto, SuaPhanCongNhiemVuDto, TaoBuoiHocDto, TaoDotHocDto, TaoPhanCongNhiemVuDto } from './learning.dto'

const Q = {
  dotXem: 'HOC_TAP_NGHI_QUYET_DOT_XEM', dotTao: 'HOC_TAP_NGHI_QUYET_DOT_TAO', dotSua: 'HOC_TAP_NGHI_QUYET_DOT_SUA', dotKetThuc: 'HOC_TAP_NGHI_QUYET_DOT_KET_THUC',
  buoiXem: 'HOC_TAP_NGHI_QUYET_BUOI_XEM', buoiTao: 'HOC_TAP_NGHI_QUYET_BUOI_TAO', buoiSua: 'HOC_TAP_NGHI_QUYET_BUOI_SUA', buoiQuanLy: 'HOC_TAP_NGHI_QUYET_BUOI_QUAN_LY',
  danhSachXem: 'HOC_TAP_NGHI_QUYET_DANH_SACH_XEM', tepTaiXuong: 'HOC_TAP_TEP_TAI_XUONG',
  danhSachQuanLy: 'HOC_TAP_NGHI_QUYET_DANH_SACH_QUAN_LY', ngoaiLeBoSung: 'HOC_TAP_NGHI_QUYET_NGOAI_LE_BO_SUNG', phanCongQuanLy: 'HOC_TAP_NGHI_QUYET_PHAN_CONG_QUAN_LY',
} as const
const ketThuc = new Set(['DA_KET_THUC', 'DA_HUY'])

@Injectable()
export class HocTapNghiQuyetService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService, @Inject(DanhMucNghiepVuService) private readonly danhMuc: DanhMucNghiepVuService) {}

  private async allowed(actor: TaiKhoanDaXacThuc, permission: string) { return this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien) }
  private phanTrang(query: { trang?: number | string; gioiHan?: number | string }) {
    const trang = Number(query.trang ?? 1)
    const gioiHan = Number(query.gioiHan ?? 10)
    if (!Number.isSafeInteger(trang) || trang < 1 || !Number.isSafeInteger(gioiHan) || gioiHan < 10 || gioiHan > 100 || !Number.isSafeInteger((trang - 1) * gioiHan)) {
      throw new BadRequestException({ maLoi: 'PHAN_TRANG_KHONG_HOP_LE', thongBao: 'Trang phải là số nguyên dương và số dòng mỗi trang phải từ 10 đến 100.' })
    }
    return { trang, gioiHan }
  }
  private async requireSet(actor: TaiKhoanDaXacThuc, permission: string, ids: string[]) {
    const access = await this.allowed(actor, permission)
    if (!access.coQuyen || (!access.toanHeThong && ids.some((id) => !access.maDonVi.includes(id)))) throw new ForbiddenException({ maLoi: 'KHONG_DU_PHAM_VI', thongBao: 'Bạn không có quyền trong toàn bộ phạm vi tổ chức được yêu cầu.' })
  }
  private async requireResource(actor: TaiKhoanDaXacThuc, permission: string, ids: string[]) { await this.requireSet(actor, permission, ids) }
  private danhSachPhamVi(ids: string[]) { const values = [...new Set(ids)]; if (!values.length || values.length !== ids.length) throw new BadRequestException({ maLoi: 'PHAM_VI_KHONG_HOP_LE', thongBao: 'Phạm vi phải có ít nhất một đơn vị và không được trùng.' }); return values }
  private validateTimes(start: string | Date, end: string | Date, field = 'THOI_GIAN_KHONG_HOP_LE') {
    const a = new Date(start).getTime(), b = new Date(end).getTime()
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) throw new BadRequestException({ maLoi: field, thongBao: 'Thời điểm bắt đầu phải trước thời điểm kết thúc.' })
    for (const value of [start, end]) if (typeof value === 'string' && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new BadRequestException({ maLoi: 'THIEU_MUI_GIO', thongBao: 'Thời gian phải kèm múi giờ ISO-8601.' })
  }
  private donViWhere(access: { coQuyen: boolean; toanHeThong: boolean; maDonVi: string[] }) { return access.toanHeThong ? {} : { phamVi: { some: { maDonVi: { in: access.maDonVi } } } } }
  private async getDot(id: string) { const row = await this.prisma.dotHocNghiQuyet.findUnique({ where: { ma: id }, include: { phamVi: { select: { maDonVi: true } }, namHoc: true, donViToChuc: { include: { tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, orderBy: { ngayHieuLucTu: 'desc' } } } }, nguoiPhuTrach: { select: { ma: true, tenDangNhap: true } } } }); if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT', thongBao: 'Không tìm thấy đợt học.' }); return row }
  private async getBuoi(id: string) { const row = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, include: { phamVi: { select: { maDonVi: true } }, giaTriHinhThuc: { select: { maGiaTri: true, tenHienThi: true, trangThai: true } }, cauHinhDiemDanh: true, dotHoc: { include: { phamVi: { select: { maDonVi: true } } } }, nguoiPhuTrach: { select: { ma: true, tenDangNhap: true } }, nguoiXacNhanDanhSach: { select: { ma: true, tenDangNhap: true } } } }); if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' }); return row }

  private async layBuoiRoster(id: string) {
    const row = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, trangThai: true, phamVi: { select: { maDonVi: true } }, phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true, maNguoiXacNhanDanhSach: true, xacNhanDanhSachLuc: true } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    return row
  }

  private async yeuCauPhamViBuoi(actor: TaiKhoanDaXacThuc, permission: string, buoi: { phamVi: { maDonVi: string }[] }, themDonVi: string[] = []) {
    if (!buoi.phamVi.length) throw new ConflictException({ maLoi: 'BUOI_CHUA_CO_PHAM_VI', thongBao: 'Buổi học chưa có phạm vi tổ chức để thực hiện nghiệp vụ danh sách/phân công.' })
    await this.requireSet(actor, permission, [...new Set([...buoi.phamVi.map(unit => unit.maDonVi), ...themDonVi])])
  }

  private async khoaBuoi(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT ma_buoi FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${id}::uuid FOR UPDATE`
  }

  private kiemTraBuoiChoPhepRoster(trangThai: string) {
    if (ketThuc.has(trangThai)) throw new ConflictException({ maLoi: 'BUOI_KHONG_CHO_PHEP_SUA_DANH_SACH', thongBao: 'Buổi đã kết thúc hoặc hủy, không thể thay đổi danh sách dự kiến.' })
  }

  private trangThaiXacNhan(row: { phienBanDanhSach: number; phienBanDanhSachDaXacNhan: number | null }) {
    if (row.phienBanDanhSachDaXacNhan === null) return 'CHUA_XAC_NHAN'
    return row.phienBanDanhSach === row.phienBanDanhSachDaXacNhan ? 'DA_XAC_NHAN' : 'DA_THAY_DOI_SAU_XAC_NHAN'
  }

  private anhSnapshot(row: { maChiBoSnapshot: string; tenChiBoSnapshot: string; maToSnapshot: string | null; tenToSnapshot: string | null }) {
    return { maChiBoSnapshot: row.maChiBoSnapshot, tenChiBoSnapshot: row.tenChiBoSnapshot, maToSnapshot: row.maToSnapshot, tenToSnapshot: row.tenToSnapshot }
  }

  private async laySinhHoatHieuLuc(tx: Prisma.TransactionClient, maHoSo: string, now: Date) {
    const rows = await tx.lichSuDonViDangVien.findMany({
      where: { maHoSo, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] },
      orderBy: { ngayHieuLucTu: 'desc' }, take: 2,
      include: {
        hoSoDangVien: { select: { ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true } },
        chiBo: { select: { ma: true, trangThai: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1, select: { ten: true } } } },
        to: { select: { ma: true, trangThai: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1, select: { ten: true } } } },
      },
    })
    if (rows.length > 1) throw new ConflictException({ maLoi: 'SINH_HOAT_HIEN_TAI_KHONG_XAC_DINH', thongBao: 'Hồ sơ có nhiều bản ghi sinh hoạt hiệu lực; cần xử lý dữ liệu tổ chức trước.' })
    const row = rows[0]
    if (!row || row.hoSoDangVien.trangThai !== 'DANG_HOAT_DONG' || !['DU_BI', 'CHINH_THUC'].includes(row.hoSoDangVien.trangThaiDangVien ?? '') || row.chiBo.trangThai !== 'DANG_HOAT_DONG' || (row.to && row.to.trangThai !== 'DANG_HOAT_DONG') || !row.chiBo.tenDonVi[0]?.ten || (row.to && !row.to.tenDonVi[0]?.ten)) return null
    return { maHoSo: row.maHoSo, maHoSoNoiBo: row.hoSoDangVien.maHoSoNoiBo, hoVaTen: row.hoSoDangVien.hoVaTen, maChiBoSnapshot: row.maChiBo, tenChiBoSnapshot: row.chiBo.tenDonVi[0].ten, maToSnapshot: row.maTo, tenToSnapshot: row.to?.tenDonVi[0]?.ten ?? null }
  }

  private async ghiLichSuDanhSach(tx: Prisma.TransactionClient, input: { buoiId: string; maHoSo: string; action: 'THEM' | 'LOAI' | 'KHOI_PHUC'; before: string | null; after: string; snapshotBefore?: Prisma.InputJsonValue; snapshotAfter?: Prisma.InputJsonValue; actorId: string; correlationId: string }) {
    return tx.lichSuDanhSachThamGia.create({ data: { maBuoi: input.buoiId, maHoSo: input.maHoSo, hanhDong: input.action, trangThaiTruoc: input.before as never, trangThaiSau: input.after as never, snapshotTruoc: input.snapshotBefore, snapshotSau: input.snapshotAfter, maNguoiThucHien: input.actorId, maTuongQuan: input.correlationId } })
  }

  private phanLoaiXungDot(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'DANH_SACH_HOAC_PHAN_CONG_TRUNG', thongBao: 'Bản ghi đã tồn tại hoặc vừa được thay đổi bởi yêu cầu đồng thời.' })
    throw error
  }

  async danhSachDot(actor: TaiKhoanDaXacThuc, query: DanhSachHocTapDto) {
    const access = await this.allowed(actor, Q.dotXem)
    if (!access.coQuyen) throw new ForbiddenException()
    const pagination = this.phanTrang(query)
    const where: Prisma.DotHocNghiQuyetWhereInput = { ...this.donViWhere(access), ...(query.trangThai ? { trangThai: query.trangThai as never } : {}), ...(query.maNamHoc ? { maNamHoc: query.maNamHoc } : {}), ...(query.tuKhoa ? { OR: [{ ten: { contains: query.tuKhoa, mode: 'insensitive' } }, { maDot: { contains: query.tuKhoa, mode: 'insensitive' } }] } : {}) }
    const [data, total] = await this.prisma.$transaction([this.prisma.dotHocNghiQuyet.findMany({ where, include: { namHoc: true, phamVi: { select: { maDonVi: true } } }, orderBy: { [query.sapXep ?? 'batDauLuc']: query.thuTu ?? 'desc' }, skip: (pagination.trang - 1) * pagination.gioiHan, take: pagination.gioiHan }), this.prisma.dotHocNghiQuyet.count({ where })])
    const duLieu = data.map(row => ({ ...row, phamVi: access.toanHeThong ? row.phamVi : row.phamVi.filter(unit => access.maDonVi.includes(unit.maDonVi)) }))
    return { duLieu, phanTrang: { ...pagination, tongSo: total } }
  }
  private async tepChoPhepXem(actor: TaiKhoanDaXacThuc, units: string[], owner: { maDot?: string; maBuoi?: string }) {
    const access = await this.allowed(actor, Q.tepTaiXuong)
    if (!access.coQuyen || (!access.toanHeThong && units.some(unit => !access.maDonVi.includes(unit)))) return []
    return this.prisma.tepDinhKemHocTap.findMany({ where: { ...owner, trangThai: 'DANG_SU_DUNG' }, select: { ma: true, tenTepGoc: true, kieuNoiDung: true, kichThuoc: true, ngayTao: true }, orderBy: { ngayTao: 'desc' } })
  }

  async chiTietDot(actor: TaiKhoanDaXacThuc, id: string) {
    const row = await this.getDot(id)
    await this.requireResource(actor, Q.dotXem, row.phamVi.map(x => x.maDonVi))
    const tepDinhKem = await this.tepChoPhepXem(actor, row.phamVi.map(x => x.maDonVi), { maDot: id })
    return { ...row, tepDinhKem }
  }

  async taoDot(actor: TaiKhoanDaXacThuc, dto: TaoDotHocDto, ip?: string | null) {
    const units = this.danhSachPhamVi(dto.phamViDonVi); if (!units.includes(dto.maDonViToChuc)) throw new BadRequestException({ maLoi: 'DON_VI_TO_CHUC_NGOAI_PHAM_VI', thongBao: 'Đơn vị tổ chức phải thuộc phạm vi đợt.' })
    await this.requireSet(actor, Q.dotTao, units); this.validateTimes(dto.ngayBatDau, dto.ngayKetThuc)
    const [year, org, responsible, validUnits] = await Promise.all([
      this.prisma.namHoc.findUnique({ where: { ma: dto.maNamHoc } }),
      this.prisma.donViToChuc.findUnique({ where: { ma: dto.maDonViToChuc }, select: { ma: true, trangThai: true } }),
      dto.maNguoiPhuTrach ? this.prisma.taiKhoanNguoiDung.findFirst({ where: { ma: dto.maNguoiPhuTrach, trangThai: 'DANG_HOAT_DONG' }, select: { ma: true } }) : Promise.resolve(true),
      this.prisma.donViToChuc.count({ where: { ma: { in: units }, trangThai: 'DANG_HOAT_DONG' } }),
    ])
    if (!year) throw new BadRequestException({ maLoi: 'NAM_HOC_KHONG_TON_TAI', thongBao: 'Năm học không tồn tại.' })
    if (!org || org.trangThai !== 'DANG_HOAT_DONG' || validUnits !== units.length) throw new BadRequestException({ maLoi: 'DON_VI_KHONG_HOP_LE', thongBao: 'Đơn vị không tồn tại hoặc không hoạt động.' })
    if (!responsible) throw new BadRequestException({ maLoi: 'NGUOI_PHU_TRACH_KHONG_HOP_LE', thongBao: 'Tài khoản phụ trách không tồn tại hoặc không hoạt động.' })
    const id = randomUUID(); const maDot = `ND-${id.slice(0, 8).toUpperCase()}`
    try { return await this.prisma.$transaction(async tx => {
      const row = await tx.dotHocNghiQuyet.create({ data: { ma: id, maDot, ten: dto.ten, moTa: dto.moTa, maNamHoc: dto.maNamHoc, maDonViToChuc: dto.maDonViToChuc, maNguoiPhuTrach: dto.maNguoiPhuTrach, ngayBatDau: new Date(dto.ngayBatDau), ngayKetThuc: new Date(dto.ngayKetThuc), maNguoiTao: actor.maTaiKhoan, phamVi: { create: units.map(maDonVi => ({ maDonVi, maNguoiThem: actor.maTaiKhoan })) } }, include: { phamVi: true, namHoc: true } })
      await this.audit(tx, actor, 'HOC_TAP_DOT_TAO', 'DOT_HOC_NGHI_QUYET', id, null, row, ip); return row
    }) } catch (e) { this.dbConflict(e) }
  }

  async suaDot(actor: TaiKhoanDaXacThuc, id: string, dto: SuaDotHocDto, ip?: string | null) {
    const before = await this.getDot(id); await this.requireResource(actor, Q.dotSua, before.phamVi.map(x => x.maDonVi))
    if (ketThuc.has(before.trangThai)) throw new ConflictException({ maLoi: 'TRANG_THAI_KHONG_CHO_PHEP', thongBao: 'Không thể sửa đợt đã kết thúc hoặc đã hủy.' })
    const units = dto.phamViDonVi === undefined ? before.phamVi.map(x => x.maDonVi) : this.danhSachPhamVi(dto.phamViDonVi)
    if (dto.phamViDonVi && (await this.prisma.buoiHocNghiQuyet.count({ where: { maDot: id } }) || await this.prisma.tepDinhKemHocTap.count({ where: { maDot: id } }))) throw new ConflictException({ maLoi: 'PHAM_VI_DOT_DA_PHAT_SINH_DU_LIEU', thongBao: 'Không thể đổi phạm vi đợt sau khi đã phát sinh buổi học hoặc tệp đính kèm.' })
    const orgId = dto.maDonViToChuc ?? before.maDonViToChuc
    if (!units.includes(orgId)) throw new BadRequestException({ maLoi: 'DON_VI_TO_CHUC_NGOAI_PHAM_VI', thongBao: 'Đơn vị tổ chức phải thuộc phạm vi đợt.' })
    await this.requireSet(actor, Q.dotSua, [...new Set([...before.phamVi.map(x => x.maDonVi), ...units])])
    const start = dto.ngayBatDau ?? before.ngayBatDau.toISOString(), end = dto.ngayKetThuc ?? before.ngayKetThuc.toISOString(); this.validateTimes(start, end)
    if (dto.maNamHoc && !await this.prisma.namHoc.findUnique({ where: { ma: dto.maNamHoc }, select: { ma: true } })) throw new BadRequestException({ maLoi: 'NAM_HOC_KHONG_TON_TAI', thongBao: 'Năm học không tồn tại.' })
    if (dto.maNguoiPhuTrach && !await this.prisma.taiKhoanNguoiDung.findFirst({ where: { ma: dto.maNguoiPhuTrach, trangThai: 'DANG_HOAT_DONG' }, select: { ma: true } })) throw new BadRequestException({ maLoi: 'NGUOI_PHU_TRACH_KHONG_HOP_LE', thongBao: 'Tài khoản phụ trách không tồn tại hoặc không hoạt động.' })
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT ma_dot FROM dot_hoc_nghi_quyet WHERE ma_dot = ${id}::uuid FOR UPDATE`
      if (dto.phamViDonVi && (await tx.buoiHocNghiQuyet.count({ where: { maDot: id } }) || await tx.tepDinhKemHocTap.count({ where: { maDot: id } }))) throw new ConflictException({ maLoi: 'PHAM_VI_DOT_DA_PHAT_SINH_DU_LIEU', thongBao: 'Không thể đổi phạm vi đợt sau khi đã phát sinh buổi học hoặc tệp đính kèm.' })
      const row = await tx.dotHocNghiQuyet.update({ where: { ma: id }, data: { ten: dto.ten, moTa: dto.moTa, maNamHoc: dto.maNamHoc, maDonViToChuc: dto.maDonViToChuc, maNguoiPhuTrach: dto.maNguoiPhuTrach, ngayBatDau: dto.ngayBatDau ? new Date(dto.ngayBatDau) : undefined, ngayKetThuc: dto.ngayKetThuc ? new Date(dto.ngayKetThuc) : undefined, maNguoiCapNhat: actor.maTaiKhoan, ...(dto.phamViDonVi ? { phamVi: { deleteMany: {}, create: units.map(maDonVi => ({ maDonVi, maNguoiThem: actor.maTaiKhoan })) } } : {}) }, include: { phamVi: true, namHoc: true } })
      await this.audit(tx, actor, 'HOC_TAP_DOT_SUA', 'DOT_HOC_NGHI_QUYET', id, before, row, ip); return row
    })
  }
  async chuyenDot(actor: TaiKhoanDaXacThuc, id: string, status: 'DA_KET_THUC' | 'DA_HUY', ip?: string | null) {
    const before = await this.getDot(id); await this.requireResource(actor, Q.dotKetThuc, before.phamVi.map(x => x.maDonVi))
    if (ketThuc.has(before.trangThai)) throw new ConflictException({ maLoi: 'TRANG_THAI_KHONG_CHO_PHEP', thongBao: 'Đợt đã kết thúc hoặc đã hủy.' })
    const sessions = await this.prisma.buoiHocNghiQuyet.findMany({ where: { maDot: id }, select: { ma: true, trangThai: true } })
    if (status === 'DA_KET_THUC' && sessions.some(x => !ketThuc.has(x.trangThai))) throw new ConflictException({ maLoi: 'BUOI_CHUA_KET_THUC', thongBao: 'Chỉ kết thúc đợt khi mọi buổi đã kết thúc hoặc đã hủy.' })
    if (status === 'DA_HUY' && sessions.length) throw new ConflictException({ maLoi: 'DOT_DA_CO_BUOI', thongBao: 'Không thể hủy đợt đã có buổi học; chưa có quy tắc hủy dây chuyền được duyệt.' })
    return this.prisma.$transaction(async tx => { const row = await tx.dotHocNghiQuyet.update({ where: { ma: id }, data: { trangThai: status, maNguoiCapNhat: actor.maTaiKhoan } }); await this.audit(tx, actor, `HOC_TAP_DOT_${status === 'DA_HUY' ? 'HUY' : 'KET_THUC'}`, 'DOT_HOC_NGHI_QUYET', id, before, row, ip); return row })
  }

  async danhSachBuoi(actor: TaiKhoanDaXacThuc, dotId: string, query: DanhSachHocTapDto) {
    const dot = await this.getDot(dotId)
    const parentAccess = await this.allowed(actor, Q.dotXem)
    if (!parentAccess.coQuyen || (!parentAccess.toanHeThong && !dot.phamVi.some(x => parentAccess.maDonVi.includes(x.maDonVi)))) throw new NotFoundException()
    const access = await this.allowed(actor, Q.buoiXem)
    const pagination = this.phanTrang(query)
    const where: Prisma.BuoiHocNghiQuyetWhereInput = { maDot: dotId, ...(access.toanHeThong ? {} : { phamVi: { some: { maDonVi: { in: access.maDonVi } } } }), ...(query.trangThai ? { trangThai: query.trangThai as never } : {}), ...(query.tuKhoa ? { OR: [{ ten: { contains: query.tuKhoa, mode: 'insensitive' } }, { maBuoi: { contains: query.tuKhoa, mode: 'insensitive' } }] } : {}) }
    const [duLieu, tongSo] = await this.prisma.$transaction([this.prisma.buoiHocNghiQuyet.findMany({ where, include: { phamVi: { select: { maDonVi: true } }, cauHinhDiemDanh: true }, orderBy: { [query.sapXep === 'ten' ? 'ten' : 'batDauLuc']: query.thuTu ?? 'asc' }, skip: (pagination.trang - 1) * pagination.gioiHan, take: pagination.gioiHan }), this.prisma.buoiHocNghiQuyet.count({ where })])
    const visibleRows = duLieu.map(row => ({ ...row, phamVi: access.toanHeThong ? row.phamVi : row.phamVi.filter(unit => access.maDonVi.includes(unit.maDonVi)) }))
    return { duLieu: visibleRows, phanTrang: { ...pagination, tongSo } }
  }
  async chiTietBuoi(actor: TaiKhoanDaXacThuc, id: string) {
    const row = await this.getBuoi(id)
    await this.requireResource(actor, Q.buoiXem, row.phamVi.map(x => x.maDonVi))
    await this.requireResource(actor, Q.dotXem, row.dotHoc.phamVi.map(x => x.maDonVi))
    const units = [...new Set([...row.dotHoc.phamVi.map(x => x.maDonVi), ...row.phamVi.map(x => x.maDonVi)])]
    const tepDinhKem = await this.tepChoPhepXem(actor, units, { maBuoi: id })
    return { ...row, tepDinhKem, danhSachDuKien: { trangThai: this.trangThaiXacNhan(row), phienBan: row.phienBanDanhSach, phienBanDaXacNhan: row.phienBanDanhSachDaXacNhan, maNguoiXacNhan: row.maNguoiXacNhanDanhSach, xacNhanLuc: row.xacNhanDanhSachLuc, nguoiXacNhan: row.nguoiXacNhanDanhSach } }
  }

  async danhSachThamGia(actor: TaiKhoanDaXacThuc, buoiId: string, query: DanhSachThamGiaDto) {
    const access = await this.allowed(actor, Q.danhSachXem)
    if (!access.coQuyen) throw new ForbiddenException()
    const pagination = this.phanTrang(query)
    const buoi = await this.layBuoiRoster(buoiId)
    if ((query.maChiBo && !access.toanHeThong && !access.maDonVi.includes(query.maChiBo)) || (query.maTo && !access.toanHeThong && !access.maDonVi.includes(query.maTo))) throw new ForbiddenException({ maLoi: 'KHONG_DU_PHAM_VI', thongBao: 'Đơn vị lọc không thuộc phạm vi được cấp.' })
    const and: Prisma.DanhSachThamGiaBuoiHocWhereInput[] = []
    if (!access.toanHeThong) and.push({ OR: [{ maChiBoSnapshot: { in: access.maDonVi } }, { maToSnapshot: { in: access.maDonVi } }] })
    if (query.maChiBo) and.push({ maChiBoSnapshot: query.maChiBo })
    if (query.maTo) and.push({ maToSnapshot: query.maTo })
    if (query.tuKhoa) and.push({ hoSo: { is: { OR: [{ hoVaTen: { contains: query.tuKhoa, mode: 'insensitive' } }, { maHoSoNoiBo: { contains: query.tuKhoa, mode: 'insensitive' } }] } } })
    const where: Prisma.DanhSachThamGiaBuoiHocWhereInput = { maBuoi: buoiId, ...(query.trangThai ? { trangThai: query.trangThai as never } : {}), ...(and.length ? { AND: and } : {}) }
    const sort = query.sapXep ?? 'themLuc'
    const direction: Prisma.SortOrder = query.thuTu === 'desc' ? 'desc' : 'asc'
    const orderBy: Prisma.DanhSachThamGiaBuoiHocOrderByWithRelationInput = sort === 'maHoSoNoiBo' ? { hoSo: { maHoSoNoiBo: direction } } : sort === 'hoVaTen' ? { hoSo: { hoVaTen: direction } } : { [sort]: direction }
    const { trang: page, gioiHan: size } = pagination
    const [duLieu, tongSo] = await this.prisma.$transaction([
      this.prisma.danhSachThamGiaBuoiHoc.findMany({ where, orderBy: [orderBy, { ma: 'asc' }], skip: (page - 1) * size, take: size, select: { ma: true, maHoSo: true, trangThai: true, maChiBoSnapshot: true, tenChiBoSnapshot: true, maToSnapshot: true, tenToSnapshot: true, themLuc: true, loaiLuc: true, khoiPhucLuc: true, hoSo: { select: { maHoSoNoiBo: true, hoVaTen: true } } } }),
      this.prisma.danhSachThamGiaBuoiHoc.count({ where }),
    ])
    return { duLieu: duLieu.map(row => ({ ma: row.ma, maHoSo: row.maHoSo, maHoSoNoiBo: row.hoSo.maHoSoNoiBo, hoVaTen: row.hoSo.hoVaTen, maChiBoSnapshot: row.maChiBoSnapshot, tenChiBoSnapshot: row.tenChiBoSnapshot, maToSnapshot: row.maToSnapshot, tenToSnapshot: row.tenToSnapshot, trangThai: row.trangThai, themLuc: row.themLuc, loaiLuc: row.loaiLuc, khoiPhucLuc: row.khoiPhucLuc })), phanTrang: { trang: page, gioiHan: size, tongSo, tongTrang: Math.ceil(tongSo / size) }, danhSachDuKien: { trangThai: this.trangThaiXacNhan(buoi), phienBan: buoi.phienBanDanhSach, phienBanDaXacNhan: buoi.phienBanDanhSachDaXacNhan, maNguoiXacNhan: buoi.maNguoiXacNhanDanhSach, xacNhanLuc: buoi.xacNhanDanhSachLuc } }
  }

  async khoiTaoDanhSach(actor: TaiKhoanDaXacThuc, buoiId: string, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.yeuCauPhamViBuoi(actor, Q.danhSachQuanLy, buoi)
    const scopeIds = buoi.phamVi.map(unit => unit.maDonVi)
    const correlationId = randomUUID()
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const locked = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { trangThai: true, phamVi: { select: { maDonVi: true } }, phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true } })
      if (!locked) throw new NotFoundException()
      this.kiemTraBuoiChoPhepRoster(locked.trangThai)
      await this.yeuCauPhamViBuoi(actor, Q.danhSachQuanLy, locked)
      if (locked.phamVi.some(row => !scopeIds.includes(row.maDonVi)) || scopeIds.some(id => !locked.phamVi.some(row => row.maDonVi === id))) throw new ConflictException({ maLoi: 'PHAM_VI_BUOI_DA_THAY_DOI', thongBao: 'Phạm vi buổi đã thay đổi; hãy tải lại và lập danh sách lại.' })
      const now = new Date()
      const membershipRows = await tx.lichSuDonViDangVien.findMany({
        where: { AND: [
          { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] },
          { OR: [{ maChiBo: { in: scopeIds } }, { maTo: { in: scopeIds } }] },
          { hoSoDangVien: { is: { trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: { in: ['DU_BI', 'CHINH_THUC'] } } } },
        ] },
        orderBy: [{ maHoSo: 'asc' }, { ngayHieuLucTu: 'desc' }],
        include: {
          hoSoDangVien: { select: { ma: true, maHoSoNoiBo: true, hoVaTen: true } },
          chiBo: { select: { ma: true, trangThai: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1, select: { ten: true } } } },
          to: { select: { ma: true, trangThai: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1, select: { ten: true } } } },
        },
      })
      const candidateIds = [...new Set(membershipRows.map(row => row.maHoSo))]
      if (candidateIds.length) {
        const allActiveMemberships = await tx.lichSuDonViDangVien.findMany({ where: { maHoSo: { in: candidateIds }, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, select: { maHoSo: true } })
        const counts = new Map<string, number>()
        for (const row of allActiveMemberships) counts.set(row.maHoSo, (counts.get(row.maHoSo) ?? 0) + 1)
        if ([...counts.values()].some(count => count > 1)) throw new ConflictException({ maLoi: 'SINH_HOAT_HIEN_TAI_KHONG_XAC_DINH', thongBao: 'Có hồ sơ có nhiều bản ghi sinh hoạt hiệu lực; không thể lập roster an toàn.' })
      }
      const candidateByProfile = new Map<string, typeof membershipRows[number]>()
      for (const row of membershipRows) {
        if (candidateByProfile.has(row.maHoSo)) throw new ConflictException({ maLoi: 'SINH_HOAT_HIEN_TAI_KHONG_XAC_DINH', thongBao: 'Có hồ sơ có nhiều bản ghi sinh hoạt hiệu lực; không thể lập roster an toàn.' })
        if (row.chiBo.trangThai !== 'DANG_HOAT_DONG' || (row.to && row.to.trangThai !== 'DANG_HOAT_DONG')) continue
        if (!row.chiBo.tenDonVi[0]?.ten || (row.to && !row.to.tenDonVi[0]?.ten)) throw new ConflictException({ maLoi: 'THIEU_TEN_DON_VI_HIEU_LUC', thongBao: 'Không tìm thấy tên đơn vị hiệu lực để lưu snapshot.' })
        candidateByProfile.set(row.maHoSo, row)
      }
      const candidates = [...candidateByProfile.values()]
      if (!candidates.length) return { soThemMoi: 0, phienBanDanhSach: locked.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(locked), idempotent: true }
      const maHoSos = candidates.map(row => row.maHoSo)
      const existing = await tx.danhSachThamGiaBuoiHoc.findMany({ where: { maBuoi: buoiId, maHoSo: { in: maHoSos } }, select: { maHoSo: true } })
      const existingIds = new Set(existing.map(row => row.maHoSo))
      const missing = candidates.filter(row => !existingIds.has(row.maHoSo))
      if (!missing.length) return { soThemMoi: 0, phienBanDanhSach: locked.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(locked), idempotent: true }
      const ids = missing.map(() => randomUUID())
      await tx.danhSachThamGiaBuoiHoc.createMany({ data: missing.map((row, index) => ({ ma: ids[index], maBuoi: buoiId, maHoSo: row.maHoSo, trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: row.maChiBo, tenChiBoSnapshot: row.chiBo.tenDonVi[0]!.ten, maToSnapshot: row.maTo, tenToSnapshot: row.to?.tenDonVi[0]?.ten ?? null, maNguoiThem: actor.maTaiKhoan })) , skipDuplicates: true })
      const inserted = await tx.danhSachThamGiaBuoiHoc.findMany({ where: { ma: { in: ids } }, select: { ma: true, maHoSo: true, maChiBoSnapshot: true, tenChiBoSnapshot: true, maToSnapshot: true, tenToSnapshot: true } })
      for (const row of inserted) {
        await this.ghiLichSuDanhSach(tx, { buoiId, maHoSo: row.maHoSo, action: 'THEM', before: null, after: 'TRONG_DANH_SACH', snapshotAfter: this.anhSnapshot(row), actorId: actor.maTaiKhoan, correlationId })
      }
      const newCount = inserted.length
      const updated = newCount ? await tx.buoiHocNghiQuyet.update({ where: { ma: buoiId }, data: { phienBanDanhSach: { increment: 1 } }, select: { phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true } }) : locked
      await this.audit(tx, actor, 'HOC_TAP_DANH_SACH_KHOI_TAO', 'BUOI_HOC_NGHI_QUYET', buoiId, { phienBanDanhSach: locked.phienBanDanhSach }, { soThemMoi: newCount, phienBanDanhSach: updated.phienBanDanhSach }, ip)
      return { soThemMoi: newCount, phienBanDanhSach: updated.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(updated), idempotent: newCount === 0 }
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async boSungNgoaiLe(actor: TaiKhoanDaXacThuc, buoiId: string, maHoSo: string, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.yeuCauPhamViBuoi(actor, Q.ngoaiLeBoSung, buoi)
    const now = new Date()
    const membership = await this.laySinhHoatHieuLuc(this.prisma as unknown as Prisma.TransactionClient, maHoSo, now)
    if (!membership) throw new BadRequestException({ maLoi: 'HO_SO_KHONG_DU_DIEU_KIEN', thongBao: 'Hồ sơ không tồn tại hoặc không đủ điều kiện tham gia.' })
    await this.yeuCauPhamViBuoi(actor, Q.ngoaiLeBoSung, buoi, [membership.maChiBoSnapshot, ...(membership.maToSnapshot ? [membership.maToSnapshot] : [])])
    const correlationId = randomUUID()
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const locked = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { trangThai: true, phamVi: { select: { maDonVi: true } }, phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true } })
      if (!locked) throw new NotFoundException()
      this.kiemTraBuoiChoPhepRoster(locked.trangThai)
      await this.yeuCauPhamViBuoi(actor, Q.ngoaiLeBoSung, locked, [membership.maChiBoSnapshot, ...(membership.maToSnapshot ? [membership.maToSnapshot] : [])])
      if (locked.phamVi.some(row => !buoi.phamVi.some(unit => unit.maDonVi === row.maDonVi)) || buoi.phamVi.some(unit => !locked.phamVi.some(row => row.maDonVi === unit.maDonVi))) throw new ConflictException({ maLoi: 'PHAM_VI_BUOI_DA_THAY_DOI', thongBao: 'Phạm vi buổi đã thay đổi; hãy tải lại trước khi bổ sung ngoại lệ.' })
      const currentMembership = await this.laySinhHoatHieuLuc(tx, maHoSo, new Date())
      if (!currentMembership || currentMembership.maChiBoSnapshot !== membership.maChiBoSnapshot || currentMembership.maToSnapshot !== membership.maToSnapshot) throw new ConflictException({ maLoi: 'SINH_HOAT_DA_THAY_DOI', thongBao: 'Đơn vị sinh hoạt của hồ sơ đã thay đổi; hãy xác minh lại phạm vi.' })
      const existing = await tx.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo } } })
      if (existing) throw new ConflictException({ maLoi: existing.trangThai === 'DA_LOAI' ? 'HO_SO_DA_BI_LOAI' : 'HO_SO_DA_CO_TRONG_DANH_SACH', thongBao: existing.trangThai === 'DA_LOAI' ? 'Hồ sơ đã bị loại; hãy dùng API khôi phục.' : 'Hồ sơ đã có trong danh sách dự kiến.' })
      const row = await tx.danhSachThamGiaBuoiHoc.create({ data: { maBuoi: buoiId, maHoSo, trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: currentMembership.maChiBoSnapshot, tenChiBoSnapshot: currentMembership.tenChiBoSnapshot, maToSnapshot: currentMembership.maToSnapshot, tenToSnapshot: currentMembership.tenToSnapshot, maNguoiThem: actor.maTaiKhoan } })
      await this.ghiLichSuDanhSach(tx, { buoiId, maHoSo, action: 'THEM', before: null, after: 'TRONG_DANH_SACH', snapshotAfter: this.anhSnapshot(row), actorId: actor.maTaiKhoan, correlationId })
      const version = await tx.buoiHocNghiQuyet.update({ where: { ma: buoiId }, data: { phienBanDanhSach: { increment: 1 } }, select: { phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true } })
      await this.audit(tx, actor, 'HOC_TAP_DANH_SACH_NGOAI_LE_BO_SUNG', 'DANH_SACH_THAM_GIA_BUOI_HOC', row.ma, null, { maBuoi: buoiId, ...this.anhSnapshot(row), phienBanDanhSach: version.phienBanDanhSach }, ip)
      return { ...row, phienBanDanhSach: version.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(version) }
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async loaiKhoiDanhSach(actor: TaiKhoanDaXacThuc, buoiId: string, maHoSo: string, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.requireSet(actor, Q.danhSachQuanLy, buoi.phamVi.map(unit => unit.maDonVi))
    const prior = await this.prisma.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo } }, select: { maChiBoSnapshot: true, maToSnapshot: true } })
    if (!prior) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DANH_SACH', thongBao: 'Không tìm thấy hồ sơ trong danh sách buổi học.' })
    await this.requireSet(actor, Q.danhSachQuanLy, [...buoi.phamVi.map(unit => unit.maDonVi), prior.maChiBoSnapshot, ...(prior.maToSnapshot ? [prior.maToSnapshot] : [])])
    const correlationId = randomUUID()
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const lockedBuoi = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { trangThai: true, phamVi: { select: { maDonVi: true } } } })
      if (!lockedBuoi) throw new NotFoundException()
      this.kiemTraBuoiChoPhepRoster(lockedBuoi.trangThai)
      await this.yeuCauPhamViBuoi(actor, Q.danhSachQuanLy, lockedBuoi, [prior.maChiBoSnapshot, ...(prior.maToSnapshot ? [prior.maToSnapshot] : [])])
      const current = await tx.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo } } })
      if (!current) throw new NotFoundException()
      if (current.trangThai === 'DA_LOAI') throw new ConflictException({ maLoi: 'HO_SO_DA_BI_LOAI', thongBao: 'Hồ sơ đã bị loại khỏi danh sách.' })
      const pending = await tx.yeuCauDiemDanh.count({ where: { maBuoi: buoiId, maHoSo, trangThai: { in: ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] } } })
      if (pending) throw new ConflictException({ maLoi: 'YE_U_CAU_DIEM_DANH_DANG_CHO', thongBao: 'Cần xử lý yêu cầu điểm danh đang chờ trước khi loại hồ sơ.' })
      const result = await tx.ketQuaDiemDanh.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo } }, select: { ma: true, trangThai: true, version: true } })
      const before = this.anhSnapshot(current)
      const row = await tx.danhSachThamGiaBuoiHoc.update({ where: { ma: current.ma }, data: { trangThai: 'DA_LOAI', maNguoiLoai: actor.maTaiKhoan, loaiLuc: new Date() } })
      const snapshotBefore = { ...before, ketQuaLichSu: result }
      await this.ghiLichSuDanhSach(tx, { buoiId, maHoSo, action: 'LOAI', before: 'TRONG_DANH_SACH', after: 'DA_LOAI', snapshotBefore, snapshotAfter: this.anhSnapshot(row), actorId: actor.maTaiKhoan, correlationId })
      const version = await tx.buoiHocNghiQuyet.update({ where: { ma: buoiId }, data: { phienBanDanhSach: { increment: 1 } }, select: { phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true } })
      await this.audit(tx, actor, 'HOC_TAP_DANH_SACH_LOAI', 'DANH_SACH_THAM_GIA_BUOI_HOC', row.ma, { trangThai: current.trangThai, ...before }, { trangThai: row.trangThai, ...before, ketQuaLichSu: result, phienBanDanhSach: version.phienBanDanhSach }, ip)
      return { ...row, phienBanDanhSach: version.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(version) }
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async khoiPhucDanhSach(actor: TaiKhoanDaXacThuc, buoiId: string, maHoSo: string, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.requireSet(actor, Q.danhSachQuanLy, buoi.phamVi.map(unit => unit.maDonVi))
    const prior = await this.prisma.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo } }, select: { maChiBoSnapshot: true, maToSnapshot: true } })
    if (!prior) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DANH_SACH', thongBao: 'Không tìm thấy hồ sơ trong danh sách buổi học.' })
    await this.requireSet(actor, Q.danhSachQuanLy, [...buoi.phamVi.map(unit => unit.maDonVi), prior.maChiBoSnapshot, ...(prior.maToSnapshot ? [prior.maToSnapshot] : [])])
    const correlationId = randomUUID()
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const lockedBuoi = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { trangThai: true, phamVi: { select: { maDonVi: true } } } })
      if (!lockedBuoi) throw new NotFoundException()
      this.kiemTraBuoiChoPhepRoster(lockedBuoi.trangThai)
      await this.yeuCauPhamViBuoi(actor, Q.danhSachQuanLy, lockedBuoi, [prior.maChiBoSnapshot, ...(prior.maToSnapshot ? [prior.maToSnapshot] : [])])
      const current = await tx.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo } } })
      if (!current) throw new NotFoundException()
      if (current.trangThai === 'TRONG_DANH_SACH') throw new ConflictException({ maLoi: 'HO_SO_CHUA_BI_LOAI', thongBao: 'Hồ sơ hiện vẫn đang trong danh sách.' })
      if (!await this.laySinhHoatHieuLuc(tx, maHoSo, new Date())) throw new ConflictException({ maLoi: 'HO_SO_KHONG_DU_DIEU_KIEN', thongBao: 'Hồ sơ không còn đáp ứng điều kiện khôi phục danh sách.' })
      const pending = await tx.yeuCauDiemDanh.count({ where: { maBuoi: buoiId, maHoSo, trangThai: { in: ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] } } })
      if (pending) throw new ConflictException({ maLoi: 'YE_U_CAU_DIEM_DANH_DANG_CHO', thongBao: 'Cần xử lý yêu cầu điểm danh đang chờ trước khi khôi phục hồ sơ.' })
      const before = this.anhSnapshot(current)
      const row = await tx.danhSachThamGiaBuoiHoc.update({ where: { ma: current.ma }, data: { trangThai: 'TRONG_DANH_SACH', maNguoiKhoiPhuc: actor.maTaiKhoan, khoiPhucLuc: new Date() } })
      await this.ghiLichSuDanhSach(tx, { buoiId, maHoSo, action: 'KHOI_PHUC', before: 'DA_LOAI', after: 'TRONG_DANH_SACH', snapshotBefore: before, snapshotAfter: this.anhSnapshot(row), actorId: actor.maTaiKhoan, correlationId })
      const version = await tx.buoiHocNghiQuyet.update({ where: { ma: buoiId }, data: { phienBanDanhSach: { increment: 1 } }, select: { phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true } })
      await this.audit(tx, actor, 'HOC_TAP_DANH_SACH_KHOI_PHUC', 'DANH_SACH_THAM_GIA_BUOI_HOC', row.ma, { trangThai: current.trangThai, ...before }, { trangThai: row.trangThai, ...before, phienBanDanhSach: version.phienBanDanhSach }, ip)
      return { ...row, phienBanDanhSach: version.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(version) }
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async xacNhanDanhSach(actor: TaiKhoanDaXacThuc, buoiId: string, phienBanYeuCau: number, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.requireSet(actor, Q.danhSachQuanLy, buoi.phamVi.map(unit => unit.maDonVi))
    const active = await this.prisma.danhSachThamGiaBuoiHoc.findMany({ where: { maBuoi: buoiId, trangThai: 'TRONG_DANH_SACH' }, select: { maChiBoSnapshot: true, maToSnapshot: true } })
    await this.requireSet(actor, Q.danhSachQuanLy, [...buoi.phamVi.map(unit => unit.maDonVi), ...active.flatMap(row => [row.maChiBoSnapshot, ...(row.maToSnapshot ? [row.maToSnapshot] : [])])])
    const correlationId = randomUUID()
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const current = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { trangThai: true, phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true, maNguoiXacNhanDanhSach: true, xacNhanDanhSachLuc: true } })
      if (!current) throw new NotFoundException()
      this.kiemTraBuoiChoPhepRoster(current.trangThai)
      const activeInsideLock = await tx.danhSachThamGiaBuoiHoc.findMany({ where: { maBuoi: buoiId, trangThai: 'TRONG_DANH_SACH' }, select: { maChiBoSnapshot: true, maToSnapshot: true } })
      await this.requireSet(actor, Q.danhSachQuanLy, [...buoi.phamVi.map(unit => unit.maDonVi), ...activeInsideLock.flatMap(row => [row.maChiBoSnapshot, ...(row.maToSnapshot ? [row.maToSnapshot] : [])])])
      if (current.phienBanDanhSach !== phienBanYeuCau) throw new ConflictException({ maLoi: 'PHIEN_BAN_DANH_SACH_DA_THAY_DOI', thongBao: 'Danh sách đã thay đổi; hãy tải lại trước khi xác nhận.' })
      if (current.phienBanDanhSachDaXacNhan === current.phienBanDanhSach) return { phienBanDanhSach: current.phienBanDanhSach, trangThaiXacNhan: 'DA_XAC_NHAN', maNguoiXacNhan: current.maNguoiXacNhanDanhSach, xacNhanLuc: current.xacNhanDanhSachLuc, idempotent: true }
      const row = await tx.buoiHocNghiQuyet.update({ where: { ma: buoiId }, data: { phienBanDanhSachDaXacNhan: current.phienBanDanhSach, maNguoiXacNhanDanhSach: actor.maTaiKhoan, xacNhanDanhSachLuc: new Date() }, select: { phienBanDanhSach: true, phienBanDanhSachDaXacNhan: true, maNguoiXacNhanDanhSach: true, xacNhanDanhSachLuc: true } })
      await this.audit(tx, actor, 'HOC_TAP_DANH_SACH_XAC_NHAN_DU_KIEN', 'BUOI_HOC_NGHI_QUYET', buoiId, { phienBanDanhSach: current.phienBanDanhSach, phienBanDanhSachDaXacNhan: current.phienBanDanhSachDaXacNhan }, row, ip)
      return { phienBanDanhSach: row.phienBanDanhSach, trangThaiXacNhan: this.trangThaiXacNhan(row), maNguoiXacNhan: row.maNguoiXacNhanDanhSach, xacNhanLuc: row.xacNhanDanhSachLuc, idempotent: false, maTuongQuan: correlationId }
    })
  }

  async lichSuDanhSach(actor: TaiKhoanDaXacThuc, buoiId: string, query: DanhSachHocTapDto) {
    const access = await this.allowed(actor, Q.danhSachQuanLy)
    if (!access.coQuyen) throw new ForbiddenException()
    const pagination = this.phanTrang(query)
    if (!await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { ma: true } })) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    const scopeIds = access.toanHeThong ? (await this.prisma.donViToChuc.findMany({ select: { ma: true } })).map(unit => unit.ma) : access.maDonVi
    const { trang: page, gioiHan: size } = pagination
    const conditions = Prisma.sql`(
      h.snapshot_truoc->>'maChiBoSnapshot' = ANY(${scopeIds}::text[])
      OR h.snapshot_truoc->>'maToSnapshot' = ANY(${scopeIds}::text[])
      OR h.snapshot_sau->>'maChiBoSnapshot' = ANY(${scopeIds}::text[])
      OR h.snapshot_sau->>'maToSnapshot' = ANY(${scopeIds}::text[])
    )`
    const [duLieu, tongSo] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT h.ma_lich_su_danh_sach AS "ma", h.ma_ho_so AS "maHoSo", p.ma_ho_so_noi_bo AS "maHoSoNoiBo", p.ho_va_ten AS "hoVaTen", h.hanh_dong AS "hanhDong", h.trang_thai_truoc AS "trangThaiTruoc", h.trang_thai_sau AS "trangThaiSau", h.snapshot_truoc AS "snapshotTruoc", h.snapshot_sau AS "snapshotSau", h.ma_nguoi_thuc_hien AS "maNguoiThucHien", a.ten_dang_nhap AS "tenNguoiThucHien", h.thoi_diem AS "thoiDiem", h.ma_tuong_quan AS "maTuongQuan" FROM lich_su_danh_sach_tham_gia h JOIN ho_so_dang_vien p ON p.ma_ho_so = h.ma_ho_so JOIN tai_khoan_nguoi_dung a ON a.ma_tai_khoan = h.ma_nguoi_thuc_hien WHERE h.ma_buoi = ${buoiId}::uuid AND ${conditions} ORDER BY h.thoi_diem DESC, h.ma_lich_su_danh_sach ASC LIMIT ${size} OFFSET ${(page - 1) * size}`),
      this.prisma.$queryRaw<Array<{ tongSo: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS "tongSo" FROM lich_su_danh_sach_tham_gia h WHERE h.ma_buoi = ${buoiId}::uuid AND ${conditions}`),
    ])
    const total = Number(tongSo[0]?.tongSo ?? 0)
    return { duLieu, phanTrang: { trang: page, gioiHan: size, tongSo: total, tongTrang: Math.ceil(total / size) } }
  }

  private async layTaiKhoanPhanCong(tx: Prisma.TransactionClient, maTaiKhoan: string) {
    const account = await tx.taiKhoanNguoiDung.findFirst({ where: { ma: maTaiKhoan, trangThai: 'DANG_HOAT_DONG' }, select: { ma: true, tenDangNhap: true, trangThai: true, hoSoDangVien: { select: { ma: true, maHoSoNoiBo: true, hoVaTen: true } } } })
    if (!account) throw new BadRequestException({ maLoi: 'TAI_KHOAN_KHONG_HOP_LE', thongBao: 'Tài khoản không tồn tại hoặc không hoạt động.' })
    return account
  }

  async danhSachPhanCong(actor: TaiKhoanDaXacThuc, buoiId: string) {
    const buoi = await this.layBuoiRoster(buoiId)
    await this.yeuCauPhamViBuoi(actor, Q.phanCongQuanLy, buoi)
    const now = new Date()
    const include = {
      taiKhoan: { select: {
        ma: true, tenDangNhap: true, trangThai: true,
        hoSoDangVien: { select: {
          ma: true, maHoSoNoiBo: true, hoVaTen: true,
          lichSuDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { maChiBo: true, maTo: true } },
        } },
      } },
    } satisfies Prisma.PhanCongNhiemVuBuoiHocInclude
    const rows = await this.prisma.phanCongNhiemVuBuoiHoc.findMany({
      where: { maBuoi: buoiId }, orderBy: [{ nhiemVu: 'asc' }, { hieuLucTu: 'asc' }],
      include,
    })
    const allowed = await this.allowed(actor, Q.phanCongQuanLy)
    const visibleBranchIds = [...new Set(rows.flatMap(row => {
      const membership = row.taiKhoan.hoSoDangVien?.lichSuDonVi[0]
      const branchId = membership?.maChiBo
      return branchId && (allowed.toanHeThong || allowed.maDonVi.includes(branchId) || Boolean(membership?.maTo && allowed.maDonVi.includes(membership.maTo))) ? [branchId] : []
    }))]
    const branchNames = visibleBranchIds.length ? await this.prisma.donViToChuc.findMany({ where: { ma: { in: visibleBranchIds } }, select: { ma: true, tenDonVi: { where: { ngayHieuLucDen: null }, take: 1, select: { ten: true } } } }) : []
    const nameByBranch = new Map(branchNames.map(branch => [branch.ma, branch.tenDonVi[0]?.ten ?? null]))
    return rows.map(row => {
      const membership = row.taiKhoan.hoSoDangVien?.lichSuDonVi[0]
      const maChiBo = membership?.maChiBo
      const chiBoVisible = allowed.toanHeThong || Boolean((maChiBo && allowed.maDonVi.includes(maChiBo)) || (membership?.maTo && allowed.maDonVi.includes(membership.maTo)))
      return { ma: row.ma, maBuoi: row.maBuoi, maTaiKhoan: row.maTaiKhoan, tenDangNhap: row.taiKhoan.tenDangNhap, trangThaiTaiKhoan: row.taiKhoan.trangThai, maHoSo: chiBoVisible ? row.taiKhoan.hoSoDangVien?.ma ?? null : null, maHoSoNoiBo: chiBoVisible ? row.taiKhoan.hoSoDangVien?.maHoSoNoiBo ?? null : null, hoVaTen: chiBoVisible ? row.taiKhoan.hoSoDangVien?.hoVaTen ?? null : null, tenChiBo: chiBoVisible && maChiBo ? nameByBranch.get(maChiBo) ?? null : null, nhiemVu: row.nhiemVu, maNguoiGiao: row.maNguoiGiao, hieuLucTu: row.hieuLucTu, hieuLucDen: row.hieuLucDen, dangHieuLuc: row.hieuLucTu <= now && (!row.hieuLucDen || row.hieuLucDen > now), ngayTao: row.ngayTao }
    })
  }

  private validateAssignmentRange(start: Date, end: Date | null) {
    if (!Number.isFinite(start.getTime()) || (end && !Number.isFinite(end.getTime())) || (end && start > end)) throw new BadRequestException({ maLoi: 'HIEU_LUC_PHAN_CONG_KHONG_HOP_LE', thongBao: 'Khoảng hiệu lực phân công không hợp lệ.' })
  }

  private validateAssignmentDateString(value: string | undefined | null) {
    if (value !== undefined && value !== null && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new BadRequestException({ maLoi: 'THIEU_MUI_GIO', thongBao: 'Thời hạn phân công phải kèm múi giờ ISO-8601.' })
  }

  private assignmentPeriodsOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null) {
    return (!aEnd || bStart <= aEnd) && (!bEnd || aStart <= bEnd)
  }

  async taoPhanCong(actor: TaiKhoanDaXacThuc, buoiId: string, dto: TaoPhanCongNhiemVuDto, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.yeuCauPhamViBuoi(actor, Q.phanCongQuanLy, buoi)
    this.validateAssignmentDateString(dto.hieuLucTu)
    this.validateAssignmentDateString(dto.hieuLucDen)
    const start = dto.hieuLucTu ? new Date(dto.hieuLucTu) : new Date()
    const end = dto.hieuLucDen ? new Date(dto.hieuLucDen) : null
    this.validateAssignmentRange(start, end)
    if (end && end <= new Date()) throw new BadRequestException({ maLoi: 'PHAN_CONG_DA_HET_HIEU_LUC', thongBao: 'Thời điểm kết thúc phân công phải ở tương lai.' })
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const account = await this.layTaiKhoanPhanCong(tx, dto.maTaiKhoan)
      const existing = await tx.phanCongNhiemVuBuoiHoc.findMany({ where: { maBuoi: buoiId, maTaiKhoan: dto.maTaiKhoan, nhiemVu: dto.nhiemVu as never }, select: { ma: true, hieuLucTu: true, hieuLucDen: true } })
      if (existing.some(row => this.assignmentPeriodsOverlap(start, end, row.hieuLucTu, row.hieuLucDen))) throw new ConflictException({ maLoi: 'PHAN_CONG_DANG_HIEU_LUC_DA_TON_TAI', thongBao: 'Tài khoản đã có phân công trùng hiệu lực cho nhiệm vụ này.' })
      const row = await tx.phanCongNhiemVuBuoiHoc.create({ data: { maBuoi: buoiId, maTaiKhoan: account.ma, nhiemVu: dto.nhiemVu as never, maNguoiGiao: actor.maTaiKhoan, hieuLucTu: start, hieuLucDen: end } })
      await this.audit(tx, actor, 'HOC_TAP_PHAN_CONG_TAO', 'PHAN_CONG_NHIEM_VU_BUOI_HOC', row.ma, null, { maBuoi: buoiId, maTaiKhoan: row.maTaiKhoan, nhiemVu: row.nhiemVu, hieuLucTu: row.hieuLucTu, hieuLucDen: row.hieuLucDen }, ip)
      return { ...row, taiKhoan: { ma: account.ma, tenDangNhap: account.tenDangNhap, trangThai: account.trangThai } }
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async suaPhanCong(actor: TaiKhoanDaXacThuc, buoiId: string, assignmentId: string, dto: SuaPhanCongNhiemVuDto, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.yeuCauPhamViBuoi(actor, Q.phanCongQuanLy, buoi)
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const before = await tx.phanCongNhiemVuBuoiHoc.findFirst({ where: { ma: assignmentId, maBuoi: buoiId } })
      if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_PHAN_CONG', thongBao: 'Không tìm thấy phân công trong buổi học.' })
      if (before.hieuLucDen && before.hieuLucDen <= new Date()) throw new ConflictException({ maLoi: 'PHAN_CONG_DA_HET_HIEU_LUC', thongBao: 'Không thể sửa phân công đã hết hiệu lực hoặc đã thu hồi.' })
      const account = dto.maTaiKhoan ? await this.layTaiKhoanPhanCong(tx, dto.maTaiKhoan) : null
      if (!dto.maTaiKhoan) await this.layTaiKhoanPhanCong(tx, before.maTaiKhoan)
      const maTaiKhoan = account?.ma ?? before.maTaiKhoan
      const nhiemVu = (dto.nhiemVu ?? before.nhiemVu) as never
      this.validateAssignmentDateString(dto.hieuLucTu)
      this.validateAssignmentDateString(dto.hieuLucDen)
      const start = dto.hieuLucTu ? new Date(dto.hieuLucTu) : before.hieuLucTu
      const end = Object.hasOwn(dto, 'hieuLucDen') ? (dto.hieuLucDen ? new Date(dto.hieuLucDen) : null) : before.hieuLucDen
      this.validateAssignmentRange(start, end)
      const otherAssignments = await tx.phanCongNhiemVuBuoiHoc.findMany({ where: { maBuoi: buoiId, maTaiKhoan, nhiemVu, ma: { not: assignmentId } }, select: { ma: true, hieuLucTu: true, hieuLucDen: true } })
      if (otherAssignments.some(row => this.assignmentPeriodsOverlap(start, end, row.hieuLucTu, row.hieuLucDen))) throw new ConflictException({ maLoi: 'PHAN_CONG_DANG_HIEU_LUC_DA_TON_TAI', thongBao: 'Tài khoản đã có phân công trùng hiệu lực cho nhiệm vụ này.' })
      const row = await tx.phanCongNhiemVuBuoiHoc.update({ where: { ma: assignmentId }, data: { maTaiKhoan, nhiemVu, hieuLucTu: start, hieuLucDen: end } })
      await this.audit(tx, actor, 'HOC_TAP_PHAN_CONG_SUA', 'PHAN_CONG_NHIEM_VU_BUOI_HOC', row.ma, { maTaiKhoan: before.maTaiKhoan, nhiemVu: before.nhiemVu, hieuLucTu: before.hieuLucTu, hieuLucDen: before.hieuLucDen }, { maTaiKhoan: row.maTaiKhoan, nhiemVu: row.nhiemVu, hieuLucTu: row.hieuLucTu, hieuLucDen: row.hieuLucDen }, ip)
      return { ...row, taiKhoan: account }
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async thuHoiPhanCong(actor: TaiKhoanDaXacThuc, buoiId: string, assignmentId: string, ip?: string | null) {
    const buoi = await this.layBuoiRoster(buoiId)
    this.kiemTraBuoiChoPhepRoster(buoi.trangThai)
    await this.yeuCauPhamViBuoi(actor, Q.phanCongQuanLy, buoi)
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, buoiId)
      const before = await tx.phanCongNhiemVuBuoiHoc.findFirst({ where: { ma: assignmentId, maBuoi: buoiId } })
      if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_PHAN_CONG', thongBao: 'Không tìm thấy phân công trong buổi học.' })
      const now = new Date()
      if (before.hieuLucDen && before.hieuLucDen <= now) throw new ConflictException({ maLoi: 'PHAN_CONG_DA_HET_HIEU_LUC', thongBao: 'Phân công đã hết hiệu lực hoặc đã bị thu hồi.' })
      const end = before.hieuLucTu > now ? before.hieuLucTu : now
      const row = await tx.phanCongNhiemVuBuoiHoc.update({ where: { ma: assignmentId }, data: { hieuLucDen: end } })
      await this.audit(tx, actor, 'HOC_TAP_PHAN_CONG_THU_HOI', 'PHAN_CONG_NHIEM_VU_BUOI_HOC', row.ma, { maTaiKhoan: before.maTaiKhoan, nhiemVu: before.nhiemVu, hieuLucTu: before.hieuLucTu, hieuLucDen: before.hieuLucDen }, { maTaiKhoan: row.maTaiKhoan, nhiemVu: row.nhiemVu, hieuLucTu: row.hieuLucTu, hieuLucDen: row.hieuLucDen, thuHoiLuc: now }, ip)
      return row
    }).catch(error => this.phanLoaiXungDot(error))
  }

  async taoBuoi(actor: TaiKhoanDaXacThuc, dotId: string, dto: TaoBuoiHocDto, ip?: string | null) {
    if (typeof dto.hinhThuc !== 'string' || !dto.hinhThuc.trim()) throw new BadRequestException({ maLoi: 'THIEU_HINH_THUC_BUOI_HOC', thongBao: 'Hình thức buổi học là bắt buộc.' })
    const dot = await this.getDot(dotId)
    if (ketThuc.has(dot.trangThai)) throw new ConflictException({ maLoi: 'DOT_KHONG_CHO_PHEP_TAO_BUOI', thongBao: 'Không tạo buổi trong đợt đã kết thúc hoặc đã hủy.' })
    const units = this.danhSachPhamVi(dto.phamViDonVi); if (units.some(x => !dot.phamVi.some(y => y.maDonVi === x))) throw new BadRequestException({ maLoi: 'PHAM_VI_BUOI_VUOT_DOT', thongBao: 'Phạm vi buổi phải là tập con phạm vi đợt.' })
    await this.requireSet(actor, Q.buoiTao, units); this.validateTimes(dto.batDauLuc, dto.ketThucLuc); this.validateTimes(dto.moTheoKeHoachLuc, dto.dongTheoKeHoachLuc)
    if (new Date(dto.moTheoKeHoachLuc) < new Date(dto.batDauLuc) || new Date(dto.dongTheoKeHoachLuc) > new Date(dto.ketThucLuc)) throw new BadRequestException({ maLoi: 'CUA_SO_NGOAI_THOI_GIAN_BUOI', thongBao: 'Thời gian điểm danh dự kiến phải nằm trong thời gian buổi học.' })
    const [validUnits, responsible] = await Promise.all([this.prisma.donViToChuc.count({ where: { ma: { in: units }, trangThai: 'DANG_HOAT_DONG' } }), dto.maNguoiPhuTrach ? this.prisma.taiKhoanNguoiDung.findFirst({ where: { ma: dto.maNguoiPhuTrach, trangThai: 'DANG_HOAT_DONG' }, select: { ma: true } }) : Promise.resolve(true)])
    if (validUnits !== units.length) throw new BadRequestException({ maLoi: 'DON_VI_KHONG_HOP_LE', thongBao: 'Đơn vị không tồn tại hoặc không hoạt động.' })
    if (!responsible) throw new BadRequestException({ maLoi: 'NGUOI_PHU_TRACH_KHONG_HOP_LE', thongBao: 'Tài khoản phụ trách không tồn tại hoặc không hoạt động.' })
    const id = randomUUID(); const maBuoi = `BUOI-${id.slice(0, 8).toUpperCase()}`
    const data = { ma: id, maDot: dotId, maBuoi, ten: dto.ten, hinhThuc: dto.hinhThuc, noiDung: dto.noiDung, diaDiem: dto.diaDiem, batDauLuc: new Date(dto.batDauLuc), ketThucLuc: new Date(dto.ketThucLuc), maNguoiPhuTrach: dto.maNguoiPhuTrach, yeuCauPheDuyet: dto.yeuCauPheDuyet ?? false, maNguoiTao: actor.maTaiKhoan, phamVi: { create: units.map(maDonVi => ({ maDonVi, maNguoiThem: actor.maTaiKhoan })) }, cauHinhDiemDanh: { create: { choPhepTrucTuyen: dto.choPhepTrucTuyen ?? true, choPhepQr: dto.choPhepQr ?? true, choPhepBieuMau: dto.choPhepBieuMau ?? true, choPhepKhongDangNhap: dto.choPhepKhongDangNhap ?? true, chuKyQrGiay: dto.chuKyQrGiay ?? 15, moTheoKeHoachLuc: new Date(dto.moTheoKeHoachLuc), dongTheoKeHoachLuc: new Date(dto.dongTheoKeHoachLuc) } } }
    return this.prisma.$transaction(async tx => { const category = await this.danhMuc.kiemTraHinhThucBuoiHoc(tx, dto.hinhThuc); const row = await tx.buoiHocNghiQuyet.create({ data: { ...data, maGiaTriHinhThuc: category.ma }, include: { phamVi: true, giaTriHinhThuc: true, cauHinhDiemDanh: true } }); await this.audit(tx, actor, 'HOC_TAP_BUOI_TAO', 'BUOI_HOC_NGHI_QUYET', id, null, row, ip); return row })
  }

  async suaBuoi(actor: TaiKhoanDaXacThuc, id: string, dto: SuaBuoiHocDto, ip?: string | null) {
    const before = await this.getBuoi(id); await this.requireResource(actor, Q.buoiSua, before.phamVi.map(x => x.maDonVi)); await this.requireResource(actor, Q.dotXem, before.dotHoc.phamVi.map(x => x.maDonVi))
    if (ketThuc.has(before.trangThai)) throw new ConflictException({ maLoi: 'TRANG_THAI_KHONG_CHO_PHEP', thongBao: 'Không thể sửa buổi đã kết thúc hoặc đã hủy.' })
    const units = dto.phamViDonVi === undefined ? before.phamVi.map(x => x.maDonVi) : this.danhSachPhamVi(dto.phamViDonVi)
    if (dto.phamViDonVi && (await this.prisma.danhSachThamGiaBuoiHoc.count({ where: { maBuoi: id } }) || await this.prisma.cuaSoDiemDanhTrucTuyen.count({ where: { maBuoi: id } }) || await this.prisma.yeuCauDiemDanh.count({ where: { maBuoi: id } }) || await this.prisma.phanCongNhiemVuBuoiHoc.count({ where: { maBuoi: id } }) || await this.prisma.tepDinhKemHocTap.count({ where: { maBuoi: id } }))) throw new ConflictException({ maLoi: 'PHAM_VI_BUOI_DA_PHAT_SINH_DU_LIEU', thongBao: 'Không thể đổi phạm vi buổi sau khi đã phát sinh danh sách, phân công, dữ liệu điểm danh hoặc tệp đính kèm.' })
    if (units.some(x => !before.dotHoc.phamVi.some(y => y.maDonVi === x))) throw new BadRequestException({ maLoi: 'PHAM_VI_BUOI_VUOT_DOT', thongBao: 'Phạm vi buổi phải là tập con phạm vi đợt.' })
    await this.requireSet(actor, Q.buoiSua, [...new Set([...before.phamVi.map(x => x.maDonVi), ...units])])
    const start = dto.batDauLuc ?? before.batDauLuc.toISOString(), end = dto.ketThucLuc ?? before.ketThucLuc.toISOString(); this.validateTimes(start, end)
    const cfg = before.cauHinhDiemDanh
    const plannedStart = dto.moTheoKeHoachLuc ?? cfg?.moTheoKeHoachLuc.toISOString(); const plannedEnd = dto.dongTheoKeHoachLuc ?? cfg?.dongTheoKeHoachLuc.toISOString()
    if (plannedStart && plannedEnd) { this.validateTimes(plannedStart, plannedEnd); if (new Date(plannedStart) < new Date(start) || new Date(plannedEnd) > new Date(end)) throw new BadRequestException({ maLoi: 'CUA_SO_NGOAI_THOI_GIAN_BUOI', thongBao: 'Thời gian điểm danh dự kiến phải nằm trong thời gian buổi học.' }) }
    if (dto.yeuCauPheDuyet !== undefined && dto.yeuCauPheDuyet !== before.yeuCauPheDuyet && await this.prisma.yeuCauDiemDanh.count({ where: { maBuoi: id } })) throw new ConflictException({ maLoi: 'CAU_HINH_DUYET_DA_KHOA', thongBao: 'Không thể đổi yêu cầu phê duyệt sau khi buổi đã nhận yêu cầu điểm danh.' })
    const changedConfig = ['choPhepTrucTuyen','choPhepQr','choPhepBieuMau','choPhepKhongDangNhap','chuKyQrGiay','moTheoKeHoachLuc','dongTheoKeHoachLuc'].some(k => Object.hasOwn(dto, k))
    if (changedConfig && !cfg && (!plannedStart || !plannedEnd)) throw new BadRequestException({ maLoi: 'THIEU_CAU_HINH_CUA_SO', thongBao: 'Cần cung cấp giờ mở và đóng dự kiến khi tạo cấu hình điểm danh.' })
    const configData = cfg || changedConfig ? { choPhepTrucTuyen: dto.choPhepTrucTuyen ?? cfg?.choPhepTrucTuyen ?? true, choPhepQr: dto.choPhepQr ?? cfg?.choPhepQr ?? true, choPhepBieuMau: dto.choPhepBieuMau ?? cfg?.choPhepBieuMau ?? true, choPhepKhongDangNhap: dto.choPhepKhongDangNhap ?? cfg?.choPhepKhongDangNhap ?? true, chuKyQrGiay: dto.chuKyQrGiay ?? cfg?.chuKyQrGiay ?? 15, moTheoKeHoachLuc: plannedStart ? new Date(plannedStart) : undefined, dongTheoKeHoachLuc: plannedEnd ? new Date(plannedEnd) : undefined } : undefined
    return this.prisma.$transaction(async tx => {
      await this.khoaBuoi(tx, id)
      const locked = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { trangThai: true, phamVi: { select: { maDonVi: true } } } })
      if (!locked) throw new NotFoundException()
      if (ketThuc.has(locked.trangThai)) throw new ConflictException({ maLoi: 'TRANG_THAI_KHONG_CHO_PHEP', thongBao: 'Không thể sửa buổi đã kết thúc hoặc đã hủy.' })
      const lockedScope = locked.phamVi.map(row => row.maDonVi)
      if (lockedScope.length !== before.phamVi.length || lockedScope.some(unit => !before.phamVi.some(prior => prior.maDonVi === unit))) throw new ConflictException({ maLoi: 'PHAM_VI_BUOI_DA_THAY_DOI', thongBao: 'Phạm vi buổi vừa được thay đổi; hãy tải lại trước khi cập nhật.' })
      if (dto.phamViDonVi && (await tx.danhSachThamGiaBuoiHoc.count({ where: { maBuoi: id } }) || await tx.cuaSoDiemDanhTrucTuyen.count({ where: { maBuoi: id } }) || await tx.yeuCauDiemDanh.count({ where: { maBuoi: id } }) || await tx.phanCongNhiemVuBuoiHoc.count({ where: { maBuoi: id } }) || await tx.tepDinhKemHocTap.count({ where: { maBuoi: id } }))) throw new ConflictException({ maLoi: 'PHAM_VI_BUOI_DA_PHAT_SINH_DU_LIEU', thongBao: 'Không thể đổi phạm vi buổi sau khi đã phát sinh danh sách, phân công, dữ liệu điểm danh hoặc tệp đính kèm.' })
      await this.requireSet(actor, Q.buoiSua, [...new Set([...lockedScope, ...units])])
      if (dto.hinhThuc !== undefined && (typeof dto.hinhThuc !== 'string' || !dto.hinhThuc.trim())) throw new BadRequestException({ maLoi: 'THIEU_HINH_THUC_BUOI_HOC', thongBao: 'Mã hình thức buổi học không hợp lệ.' })
      const category = dto.hinhThuc !== undefined ? await this.danhMuc.kiemTraHinhThucBuoiHoc(tx, dto.hinhThuc) : undefined
      const row = await tx.buoiHocNghiQuyet.update({ where: { ma: id }, data: { ten: dto.ten, hinhThuc: dto.hinhThuc, maGiaTriHinhThuc: category?.ma, noiDung: dto.noiDung, diaDiem: dto.diaDiem, batDauLuc: dto.batDauLuc ? new Date(dto.batDauLuc) : undefined, ketThucLuc: dto.ketThucLuc ? new Date(dto.ketThucLuc) : undefined, maNguoiPhuTrach: dto.maNguoiPhuTrach, yeuCauPheDuyet: dto.yeuCauPheDuyet, maNguoiCapNhat: actor.maTaiKhoan, ...(dto.phamViDonVi ? { phamVi: { deleteMany: {}, create: units.map(maDonVi => ({ maDonVi, maNguoiThem: actor.maTaiKhoan })) } } : {}), ...(configData ? { cauHinhDiemDanh: { upsert: { create: configData as never, update: configData as never } } } : {}) }, include: { phamVi: true, giaTriHinhThuc: true, cauHinhDiemDanh: true } })
      await this.audit(tx, actor, 'HOC_TAP_BUOI_SUA', 'BUOI_HOC_NGHI_QUYET', id, before, row, ip); return row
    })
  }
  async chuyenBuoi(actor: TaiKhoanDaXacThuc, id: string, status: string, ip?: string | null) {
    const before = await this.getBuoi(id); await this.requireResource(actor, Q.buoiQuanLy, before.phamVi.map(x => x.maDonVi))
    const next: Record<string, string[]> = { NHAP: ['DA_LEN_LICH', 'DA_HUY'], DA_LEN_LICH: ['DANG_DIEN_RA', 'DA_HUY'], DANG_DIEN_RA: ['DA_KET_THUC', 'DA_HUY'], DA_KET_THUC: [], DA_HUY: [] }
    if (!next[before.trangThai]?.includes(status)) throw new ConflictException({ maLoi: 'CHUYEN_TRANG_THAI_KHONG_HOP_LE', thongBao: 'Không thể chuyển buổi sang trạng thái yêu cầu.' })
    return this.prisma.$transaction(async tx => { await this.khoaBuoi(tx, id); const current = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { trangThai: true } }); if (!current || !next[current.trangThai]?.includes(status)) throw new ConflictException({ maLoi: 'CHUYEN_TRANG_THAI_KHONG_HOP_LE', thongBao: 'Trạng thái buổi vừa thay đổi; hãy tải lại trước khi thực hiện.' }); const row = await tx.buoiHocNghiQuyet.update({ where: { ma: id }, data: { trangThai: status as never, maNguoiCapNhat: actor.maTaiKhoan } }); if (status === 'DA_KET_THUC' || status === 'DA_HUY') { const activeWindow = await tx.cuaSoDiemDanhTrucTuyen.findFirst({ where: { maBuoi: id, moLucThucTe: { not: null }, dongLucThucTe: null } }); if (activeWindow) { const closedAt = new Date(); const closedWindow = await tx.cuaSoDiemDanhTrucTuyen.update({ where: { ma: activeWindow.ma }, data: { dongLucThucTe: closedAt, maNguoiDong: actor.maTaiKhoan, phienBanLienKetBieuMau: { increment: 1 } } }); await this.audit(tx, actor, 'HOC_TAP_CUA_SO_DONG', 'CUA_SO_DIEM_DANH_TRUC_TUYEN', activeWindow.ma, { moLucThucTe: activeWindow.moLucThucTe, dongLucThucTe: null }, { moLucThucTe: closedWindow.moLucThucTe, dongLucThucTe: closedAt, lyDo: status, linkFormVoHieu: true }, ip) } } await this.audit(tx, actor, 'HOC_TAP_BUOI_CHUYEN_TRANG_THAI', 'BUOI_HOC_NGHI_QUYET', id, before, row, ip); return row })
  }
  private audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, action: string, type: string, id: string, before: unknown, after: unknown, ip?: string | null) { return tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: type, maDoiTuong: id, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } }) }
  private dbConflict(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'DU_LIEU_TRUNG', thongBao: 'Mã nghiệp vụ đã tồn tại.' }); throw error }
}
