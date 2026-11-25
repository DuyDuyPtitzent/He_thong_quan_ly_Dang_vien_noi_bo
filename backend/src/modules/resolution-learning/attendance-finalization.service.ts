import { ConflictException, ForbiddenException, HttpException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { BaoMatDiemDanhService } from './attendance-security.service'
import type { LichSuDiemDanhQueryDto } from './attendance-finalization.dto'
import type { XacNhanChotDiemDanhDto } from './attendance-manual.dto'

const P = { xem: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', chot: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_CHOT' } as const
const pendingStates = ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] as const

@Injectable()
export class ChotDiemDanhService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService, @Inject(BaoMatDiemDanhService) private readonly security: BaoMatDiemDanhService) {}

  private async getAccess(actor: TaiKhoanDaXacThuc, permission: string) {
    const access = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!access.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_CO_QUYEN', thongBao: 'Bạn không có quyền thực hiện nghiệp vụ chốt điểm danh.' })
    return access
  }
  private inScope(access: { toanHeThong: boolean; maDonVi: string[] }, unitId: string) { return access.toanHeThong || access.maDonVi.includes(unitId) }
  private async buoi(client: Prisma.TransactionClient | DichVuPrisma, id: string) {
    const row = await client.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, trangThai: true, phienBanDanhSach: true, phamVi: { select: { maDonVi: true } } } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    return row
  }
  private async assertWholeScope(access: { toanHeThong: boolean; maDonVi: string[] }, buoiId: string, client: Prisma.TransactionClient | DichVuPrisma) {
    const roster = await client.danhSachThamGiaBuoiHoc.findMany({ where: { maBuoi: buoiId, trangThai: 'TRONG_DANH_SACH' }, select: { maChiBoSnapshot: true } })
    const units = [...new Set(roster.map(row => row.maChiBoSnapshot))]
    if (units.some(unit => !this.inScope(access, unit))) throw new ForbiddenException({ maLoi: 'KHONG_DU_PHAM_VI', thongBao: 'Phạm vi được cấp không bao phủ toàn bộ danh sách Đảng viên thuộc diện chốt.' })
    return roster
  }
  private async lockBuoi(tx: Prisma.TransactionClient, id: string) { await tx.$queryRaw`SELECT ma_buoi FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${id}::uuid FOR UPDATE` }

  private async calculation(tx: Prisma.TransactionClient, buoiId: string) {
    const [buoi, roster, pending, existingChot] = await Promise.all([
      this.buoi(tx, buoiId),
      tx.danhSachThamGiaBuoiHoc.findMany({ where: { maBuoi: buoiId, trangThai: 'TRONG_DANH_SACH' }, orderBy: { maHoSo: 'asc' }, select: { maHoSo: true, maChiBoSnapshot: true } }),
      tx.yeuCauDiemDanh.findMany({ where: { maBuoi: buoiId, trangThai: { in: [...pendingStates] } }, orderBy: { ma: 'asc' }, select: { ma: true, maHoSo: true, trangThai: true } }),
      tx.chotDanhSachDiemDanh.findUnique({ where: { maBuoi: buoiId }, select: { ma: true } }),
    ])
    const results = roster.length ? await tx.ketQuaDiemDanh.findMany({ where: { maBuoi: buoiId, maHoSo: { in: roster.map(row => row.maHoSo) } }, select: { maHoSo: true, ma: true, trangThai: true, version: true } }) : []
    const byProfile = new Map(results.map(row => [row.maHoSo, row]))
    let coMat = 0; let vangCoPhep = 0; let vangKhongPhep = 0; let chuaDiemDanh = 0
    for (const member of roster) {
      const status = byProfile.get(member.maHoSo)?.trangThai ?? null
      if (status === 'CO_MAT') coMat++
      else if (status === 'VANG_CO_PHEP') vangCoPhep++
      else if (status === 'VANG_KHONG_PHEP') vangKhongPhep++
      else chuaDiemDanh++
    }
    const canonical = JSON.stringify({ maBuoi: buoiId, trangThaiBuoi: buoi.trangThai, phienBanDanhSach: buoi.phienBanDanhSach, roster: roster.map(row => { const result = byProfile.get(row.maHoSo); return { maHoSo: row.maHoSo, maChiBoSnapshot: row.maChiBoSnapshot, ketQua: result?.trangThai ?? null, version: result?.version ?? null } }), pending: pending.map(row => ({ ma: row.ma, maHoSo: row.maHoSo, trangThai: row.trangThai })), chot: existingChot?.ma ?? null })
    const blockers: string[] = []
    if (buoi.trangThai === 'DA_HUY') blockers.push('BUOI_DA_HUY')
    else if (buoi.trangThai !== 'DA_KET_THUC') blockers.push('BUOI_CHUA_KET_THUC')
    if (existingChot) blockers.push('BUOI_DA_CHOT')
    if (pending.some(row => row.trangThai === 'CHO_XAC_MINH')) blockers.push('CON_YEU_CAU_CHO_XAC_MINH')
    if (pending.some(row => row.trangThai === 'CHO_PHE_DUYET')) blockers.push('CON_YEU_CAU_CHO_PHE_DUYET')
    return { buoi, roster, pending, existingChot, byProfile, coMat, vangCoPhep, vangKhongPhep, chuaDiemDanh, blockers, digest: this.security.hashCurrent('CHOT_PREVIEW', canonical) }
  }

  async kiemTra(actor: TaiKhoanDaXacThuc, buoiId: string) {
    return this.prisma.$transaction(async tx => {
      const access = await this.getAccess(actor, P.chot)
      await this.assertWholeScope(access, buoiId, tx)
      const result = await this.calculation(tx, buoiId)
      return { maBuoi: buoiId, trangThaiBuoi: result.buoi.trangThai, duDieuKienChot: result.blockers.length === 0, lyDoKhongTheChot: result.blockers, tongThuocDien: result.roster.length, tongCoMat: result.coMat, tongVangCoPhep: result.vangCoPhep, tongVangKhongPhep: result.vangKhongPhep, tongChuaDiemDanh: result.chuaDiemDanh, soNguoiSeChuyenSangVangKhongPhep: result.chuaDiemDanh, phienBanXemTruoc: result.digest }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  }

  async chot(actor: TaiKhoanDaXacThuc, buoiId: string, dto: XacNhanChotDiemDanhDto, ip?: string | null) {
    await this.getAccess(actor, P.chot)
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockBuoi(tx, buoiId)
        const currentAccess = await this.getAccess(actor, P.chot)
        await this.assertWholeScope(currentAccess, buoiId, tx)
        const state = await this.calculation(tx, buoiId)
        if (state.existingChot) throw new ConflictException({ maLoi: 'BUOI_DA_CHOT', thongBao: 'Buổi học đã được chốt. Mỗi buổi chỉ được chốt một lần.' })
        if (state.buoi.trangThai === 'DA_HUY') throw new ConflictException({ maLoi: 'BUOI_DA_HUY', thongBao: 'Không thể chốt buổi học đã hủy.' })
        if (state.buoi.trangThai !== 'DA_KET_THUC') throw new ConflictException({ maLoi: 'BUOI_CHUA_KET_THUC', thongBao: 'Chỉ có thể chốt sau khi buổi học kết thúc.' })
        if (state.pending.some(row => row.trangThai === 'CHO_XAC_MINH')) throw new ConflictException({ maLoi: 'CON_YEU_CAU_CHO_XAC_MINH', thongBao: 'Còn yêu cầu điểm danh chờ xác minh; hãy xử lý trước khi chốt.' })
        if (state.pending.some(row => row.trangThai === 'CHO_PHE_DUYET')) throw new ConflictException({ maLoi: 'CON_YEU_CAU_CHO_PHE_DUYET', thongBao: 'Còn yêu cầu điểm danh chờ phê duyệt; hãy xử lý trước khi chốt.' })
        if (state.digest !== dto.phienBanXemTruoc) throw new ConflictException({ maLoi: 'DU_LIEU_DA_THAY_DOI_XEM_LAI', thongBao: 'Dữ liệu đã thay đổi kể từ lần xem trước. Hãy tải lại số liệu trước khi xác nhận chốt.' })

        const now = new Date()
        for (const member of state.roster) {
          const current = state.byProfile.get(member.maHoSo)
          if (current?.trangThai) continue
          const updated = current
            ? await tx.ketQuaDiemDanh.update({ where: { ma: current.ma }, data: { trangThai: 'VANG_KHONG_PHEP', version: { increment: 1 }, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now, thoiDiemCoMat: null } })
            : await tx.ketQuaDiemDanh.create({ data: { maBuoi: buoiId, maHoSo: member.maHoSo, trangThai: 'VANG_KHONG_PHEP', version: 1, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now, thoiDiemCoMat: null } })
          await tx.lichSuDiemDanh.create({ data: { maBuoi: buoiId, maHoSo: member.maHoSo, ketQuaTruoc: null, ketQuaSau: 'VANG_KHONG_PHEP', versionTruoc: current?.version ?? null, versionSau: updated.version, maNguoiThucHien: actor.maTaiKhoan, thoiDiem: now, maTuongQuan: randomUUID() } })
        }
        const tongVangKhongPhep = state.vangKhongPhep + state.chuaDiemDanh
        const chot = await tx.chotDanhSachDiemDanh.create({ data: { maBuoi: buoiId, phienBan: 1, tongThuocDien: state.roster.length, tongCoMat: state.coMat, tongVangCoPhep: state.vangCoPhep, tongVangKhongPhep, tongChuaDiemDanh: 0, maNguoiChot: actor.maTaiKhoan, chotLuc: now } })
        await tx.chiTietChotDanhSachDiemDanh.createMany({ data: state.roster.map(member => ({ maChot: chot.ma, maHoSo: member.maHoSo, maChiBoSnapshot: member.maChiBoSnapshot, trangThai: (state.byProfile.get(member.maHoSo)?.trangThai && state.byProfile.get(member.maHoSo)?.trangThai !== null ? state.byProfile.get(member.maHoSo)!.trangThai! : 'VANG_KHONG_PHEP') as never, versionKetQua: (state.byProfile.get(member.maHoSo)?.version ?? 0) + (state.byProfile.get(member.maHoSo)?.trangThai ? 0 : 1) })) })
        await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HOC_TAP_DIEM_DANH_CHOT', loaiDoiTuong: 'CHOT_DANH_SACH_DIEM_DANH', maDoiTuong: chot.ma, ketQua: 'THANH_CONG', duLieuTruoc: { tongThuocDien: state.roster.length, tongChuaDiemDanh: state.chuaDiemDanh }, duLieuSau: { tongThuocDien: chot.tongThuocDien, tongCoMat: chot.tongCoMat, tongVangCoPhep: chot.tongVangCoPhep, tongVangKhongPhep: chot.tongVangKhongPhep, tongChuaDiemDanh: chot.tongChuaDiemDanh, chotLuc: now }, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
        const snapshot = await tx.chiTietChotDanhSachDiemDanh.findMany({ where: { maChot: chot.ma }, orderBy: [{ maChiBoSnapshot: 'asc' }, { maHoSo: 'asc' }] })
        return { ...chot, chiTietSnapshot: snapshot }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'BUOI_DA_CHOT', thongBao: 'Buổi học đã được chốt. Mỗi buổi chỉ được chốt một lần.' })
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException({ maLoi: 'DU_LIEU_DA_THAY_DOI_XEM_LAI', thongBao: 'Dữ liệu vừa thay đổi trong lúc chốt. Hãy tải lại số liệu trước khi xác nhận.' })
      if (error instanceof HttpException) throw error
      throw new InternalServerErrorException({ maLoi: 'CHOT_KHONG_THANH_CONG', thongBao: 'Không thể hoàn tất chốt điểm danh; không có thay đổi nào được lưu.' })
    }
  }

  async xemChot(actor: TaiKhoanDaXacThuc, buoiId: string) {
    const access = await this.getAccess(actor, P.chot)
    const row = await this.prisma.chotDanhSachDiemDanh.findUnique({ where: { maBuoi: buoiId }, include: { buoiHoc: { select: { ma: true, trangThai: true } }, nguoiChot: { select: { ma: true, tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } }, chiTietSnapshot: { orderBy: [{ maChiBoSnapshot: 'asc' }, { maHoSo: 'asc' }] } } })
    if (!row) throw new NotFoundException({ maLoi: 'CHUA_CO_BAN_CHOT', thongBao: 'Buổi học chưa có bản chốt.' })
    if (row.chiTietSnapshot.some(item => !this.inScope(access, item.maChiBoSnapshot))) throw new ForbiddenException({ maLoi: 'KHONG_DU_PHAM_VI', thongBao: 'Phạm vi được cấp không bao phủ toàn bộ snapshot chốt.' })
    return { ...row, snapshotDayDu: row.chiTietSnapshot.length === row.tongThuocDien, nguoiChot: { ma: row.nguoiChot.ma, tenHienThi: row.nguoiChot.hoSoDangVien?.hoVaTen ?? row.nguoiChot.tenDangNhap } }
  }

  async lichSu(actor: TaiKhoanDaXacThuc, buoiId: string, query: LichSuDiemDanhQueryDto) {
    const access = await this.getAccess(actor, P.xem)
    const buoi = await this.buoi(this.prisma, buoiId)
    const units = access.toanHeThong ? buoi.phamVi.map(row => row.maDonVi) : buoi.phamVi.map(row => row.maDonVi).filter(id => access.maDonVi.includes(id))
    const roster = await this.prisma.danhSachThamGiaBuoiHoc.findMany({ where: { maBuoi: buoiId, maChiBoSnapshot: { in: units }, ...(query.maHoSo ? { maHoSo: query.maHoSo } : {}) }, select: { maHoSo: true } })
    if (query.maHoSo && !roster.some(row => row.maHoSo === query.maHoSo)) throw new ForbiddenException({ maLoi: 'NGOAI_PHAM_VI', thongBao: 'Hồ sơ không nằm trong phạm vi được cấp của buổi học.' })
    const where: Prisma.LichSuDiemDanhWhereInput = { maBuoi: buoiId, maHoSo: { in: roster.map(row => row.maHoSo) } }
    const [rows, tongSo] = await this.prisma.$transaction([
      this.prisma.lichSuDiemDanh.findMany({ where, orderBy: [{ thoiDiem: 'desc' }, { ma: 'asc' }], skip: (query.trang - 1) * query.gioiHan, take: query.gioiHan }),
      this.prisma.lichSuDiemDanh.count({ where }),
    ])
    return { duLieu: rows, phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo } }
  }
}
