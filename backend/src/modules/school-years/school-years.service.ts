import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import type { DanhSachNamHocDto, SuaNamHocDto, TaoNamHocDto } from './school-years.dto'

const quyen = { xem: 'NAM_HOC_XEM', tao: 'NAM_HOC_TAO', sua: 'NAM_HOC_SUA', xoa: 'NAM_HOC_XOA' } as const

@Injectable()
export class NamHocService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma) {}

  private async check(actor: TaiKhoanDaXacThuc, permission: string, requiresSystemScope = false) {
    const now = new Date()
    const session = await this.prisma.phienDangNhap.findFirst({
      where: { ma: actor.maPhien, maTaiKhoan: actor.maTaiKhoan, thuHoiLuc: null, hetHanLuc: { gt: now } },
      select: { maPhanCongVaiTroDangHoatDong: true },
    })
    const assignmentId = session?.maPhanCongVaiTroDangHoatDong
    if (!assignmentId) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Phiên chưa chọn Assignment đang hoạt động.' })
    const assignment = await this.prisma.phanCongVaiTro.findFirst({
      where: {
        ma: assignmentId, maTaiKhoan: actor.maTaiKhoan,
        ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
        thuHoiLuc: null, vaiTro: { trangThai: 'DANG_HOAT_DONG', quyen: { some: { quyen: { maDinhDanh: permission } } } },
      },
      select: { loaiPhamVi: true },
    })
    if (!assignment || (requiresSystemScope && assignment.loaiPhamVi !== 'TOAN_HE_THONG')) {
      throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: requiresSystemScope
        ? 'Thao tác này cần Permission tương ứng trên Assignment đang hoạt động với Scope TOAN_HE_THONG.'
        : 'Cần Permission xem năm học trên Assignment đang hoạt động.' })
    }
  }

  async danhSach(actor: TaiKhoanDaXacThuc, query: DanhSachNamHocDto) {
    await this.check(actor, quyen.xem)
    const now = new Date(); const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const all = await this.prisma.namHoc.findMany({ orderBy: { ngayBatDau: 'desc' } })
    const duLieu = all.map((row) => ({ ...row, trangThaiThoiGian: row.trangThai !== 'DANG_HOAT_DONG' ? 'NGUNG_HOAT_DONG' : today < row.ngayBatDau ? 'SAP_DIEN_RA' : today <= row.ngayKetThuc ? 'DANG_DIEN_RA' : 'DA_KET_THUC' }))
    const stats = { tongSo: all.length, dangDienRa: duLieu.filter(x => x.trangThaiThoiGian === 'DANG_DIEN_RA').length, sapDienRa: duLieu.filter(x => x.trangThaiThoiGian === 'SAP_DIEN_RA').length, daKetThuc: duLieu.filter(x => x.trangThaiThoiGian === 'DA_KET_THUC').length }
    const filtered = duLieu.filter((row) => (!query.tuKhoa || `${row.maNamHoc} ${row.tenNamHoc}`.toLocaleLowerCase('vi').includes(query.tuKhoa.toLocaleLowerCase('vi'))) && (!query.trangThai || row.trangThaiThoiGian === query.trangThai || row.trangThai === query.trangThai) && (!query.tuNgay || row.ngayKetThuc >= new Date(`${query.tuNgay}T00:00:00.000Z`)) && (!query.denNgay || row.ngayBatDau <= new Date(`${query.denNgay}T00:00:00.000Z`)))
    const size = query.gioiHan ?? 10; const page = query.trang ?? 1
    return { duLieu: filtered.slice((page - 1) * size, page * size), phanTrang: { trang: page, gioiHan: size, tongSo: filtered.length }, thongKe: stats }
  }

  async chiTiet(actor: TaiKhoanDaXacThuc, id: string) { await this.check(actor, quyen.xem); const row = await this.prisma.namHoc.findUnique({ where: { ma: id } }); if (!row) throw new NotFoundException(); return row }

  async tao(actor: TaiKhoanDaXacThuc, dto: TaoNamHocDto, ip?: string | null) {
    await this.check(actor, quyen.tao, true); this.validateDates(dto.ngayBatDau, dto.ngayKetThuc)
    const id = randomUUID()
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.namHoc.create({ data: { ma: id, maNamHoc: dto.maNamHoc.toUpperCase(), tenNamHoc: dto.tenNamHoc, ngayBatDau: new Date(`${dto.ngayBatDau}T00:00:00.000Z`), ngayKetThuc: new Date(`${dto.ngayKetThuc}T00:00:00.000Z`), trangThai: dto.trangThai } })
        await this.audit(tx, actor, 'TAO', id, null, row, ip); return row
      })
    } catch (e) { this.dbConflict(e) }
  }

  async sua(actor: TaiKhoanDaXacThuc, id: string, dto: SuaNamHocDto, ip?: string | null) {
    await this.check(actor, quyen.sua, true)
    const before = await this.prisma.namHoc.findUnique({ where: { ma: id } }); if (!before) throw new NotFoundException()
    const start = dto.ngayBatDau ?? before.ngayBatDau.toISOString().slice(0, 10); const end = dto.ngayKetThuc ?? before.ngayKetThuc.toISOString().slice(0, 10); this.validateDates(start, end)
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.namHoc.update({ where: { ma: id }, data: { ...dto, maNamHoc: dto.maNamHoc?.toUpperCase(), ngayBatDau: dto.ngayBatDau ? new Date(`${start}T00:00:00.000Z`) : undefined, ngayKetThuc: dto.ngayKetThuc ? new Date(`${end}T00:00:00.000Z`) : undefined } })
        await this.audit(tx, actor, 'SUA', id, before, row, ip); return row
      })
    } catch (e) { this.dbConflict(e) }
  }

  async xoa(actor: TaiKhoanDaXacThuc, id: string, ip?: string | null) {
    await this.check(actor, quyen.xoa, true); const before = await this.prisma.namHoc.findUnique({ where: { ma: id } }); if (!before) throw new NotFoundException()
    await this.prisma.$transaction(async (tx) => { await tx.namHoc.delete({ where: { ma: id } }); await this.audit(tx, actor, 'XOA', id, before, null, ip) }); return { ma: id }
  }

  private validateDates(start: string, end: string) { if (start >= end) throw new BadRequestException({ maLoi: 'KHOANG_NGAY_KHONG_HOP_LE', thongBao: 'Ngày bắt đầu phải trước ngày kết thúc.' }) }
  private dbConflict(e: unknown): never { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException({ maLoi: 'MA_NAM_HOC_DA_TON_TAI', thongBao: 'Mã năm học đã tồn tại.' }); if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2004') throw new ConflictException({ maLoi: 'NAM_HOC_CHONG_LAN', thongBao: 'Khoảng thời gian năm học bị chồng lấn hoặc không hợp lệ.' }); throw e }
  private audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, action: string, id: string, before: unknown, after: unknown, ip?: string | null) { return tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: `NAM_HOC_${action}`, loaiDoiTuong: 'NAM_HOC', maDoiTuong: id, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } }) }
}
