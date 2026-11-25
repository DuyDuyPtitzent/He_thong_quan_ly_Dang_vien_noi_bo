import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import type { DanhSachYeuCauDiemDanhDto, XuLyYeuCauDiemDanhDto, XacMinhYeuCauDiemDanhDto } from './attendance-requests.dto'

const P = { xem: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM', xacMinh: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XAC_MINH', pheDuyet: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_PHE_DUYET', xoa: 'HOC_TAP_NGHI_QUYET_YEU_CAU_DIEM_DANH_XOA' } as const
const requestContext = { include: { buoiHoc: { include: { phamVi: { select: { maDonVi: true } } } }, hoSo: { select: { ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true } }, nguoiXacMinh: { select: { ma: true, tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } }, nguoiXuLy: { select: { ma: true, tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } } } } satisfies Prisma.YeuCauDiemDanhDefaultArgs
type RequestWithContext = Prisma.YeuCauDiemDanhGetPayload<typeof requestContext>

@Injectable()
export class XuLyYeuCauDiemDanhService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService) {}

  private async access(actor: TaiKhoanDaXacThuc, permission: string) {
    const access = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!access.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_CO_QUYEN', thongBao: 'Bạn không có quyền thực hiện thao tác này.' })
    return access
  }
  private inScope(access: { toanHeThong: boolean; maDonVi: string[] }, unitId: string) { return access.toanHeThong || access.maDonVi.includes(unitId) }
  private async request(id: string, client: Prisma.TransactionClient | DichVuPrisma = this.prisma): Promise<RequestWithContext> {
    const row = await client.yeuCauDiemDanh.findUnique({ where: { ma: id }, ...requestContext })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_YEU_CAU', thongBao: 'Không tìm thấy yêu cầu điểm danh.' })
    return row
  }
  private async assertRequestScope(access: { toanHeThong: boolean; maDonVi: string[] }, row: { maDonViDoiChieu: string; buoiHoc: { phamVi: { maDonVi: string }[] } }, candidateUnit?: string) {
    const buoiUnitIds = row.buoiHoc.phamVi.map(unit => unit.maDonVi)
    if (!buoiUnitIds.includes(row.maDonViDoiChieu) || !this.inScope(access, row.maDonViDoiChieu) || (candidateUnit && (!buoiUnitIds.includes(candidateUnit) || !this.inScope(access, candidateUnit)))) throw new ForbiddenException({ maLoi: 'NGOAI_PHAM_VI', thongBao: 'Yêu cầu hoặc hồ sơ liên quan nằm ngoài phạm vi được cấp.' })
  }
  private async cccdHoSoDuocXem(actor: TaiKhoanDaXacThuc, profileId: string | null) {
    if (!profileId) return false
    try {
      await this.permissions.kiemTra(actor.maTaiKhoan, 'HO_SO_CA_NHAN_XEM', { maHoSo: profileId }, actor.maPhien)
      return true
    } catch (error) {
      if (error instanceof ForbiddenException) return false
      throw error
    }
  }
  private safe(row: RequestWithContext, showCccd = false) {
    const { cccd, idempotencyHash, dauVanTayCoBanBam, dauVanTayCccdBam, phienBanKhoaBam, nguoiXacMinh, nguoiXuLy, ...data } = row
    return { ...data, cccd: showCccd ? cccd : null, nguoiXacMinh: nguoiXacMinh ? { ma: nguoiXacMinh.ma, tenHienThi: nguoiXacMinh.hoSoDangVien?.hoVaTen ?? nguoiXacMinh.tenDangNhap } : null, nguoiXuLy: nguoiXuLy ? { ma: nguoiXuLy.ma, tenHienThi: nguoiXuLy.hoSoDangVien?.hoVaTen ?? nguoiXuLy.tenDangNhap } : null }
  }
  private audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, action: string, requestId: string, before: unknown, after: unknown, ip?: string | null) {
    return tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: 'YEU_CAU_DIEM_DANH', maDoiTuong: requestId, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
  }
  private async lock(tx: Prisma.TransactionClient, id: string) {
    const request = await tx.yeuCauDiemDanh.findUnique({ where: { ma: id }, select: { maBuoi: true } })
    if (!request) return
    await tx.$queryRaw`SELECT ma_buoi FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${request.maBuoi}::uuid FOR UPDATE`
    await tx.$queryRaw`SELECT ma_yeu_cau FROM yeu_cau_diem_danh WHERE ma_yeu_cau = ${id}::uuid FOR UPDATE`
  }
  private statusError(row: { trangThai: string }) { throw new ConflictException({ maLoi: 'YEU_CAU_DA_DUOC_XU_LY', thongBao: `Yêu cầu không ở trạng thái cần xử lý (trạng thái hiện tại: ${row.trangThai}).` }) }

  async danhSach(actor: TaiKhoanDaXacThuc, buoiId: string, query: DanhSachYeuCauDiemDanhDto) {
    const access = await this.access(actor, P.xem)
    const buoi = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, select: { ma: true, phamVi: { select: { maDonVi: true } } } })
    if (!buoi) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    const allowed = access.toanHeThong ? buoi.phamVi.map(unit => unit.maDonVi) : buoi.phamVi.map(unit => unit.maDonVi).filter(id => access.maDonVi.includes(id))
    if (query.maDonVi && !allowed.includes(query.maDonVi)) throw new ForbiddenException({ maLoi: 'NGOAI_PHAM_VI', thongBao: 'Chi bộ lọc nằm ngoài phạm vi được cấp.' })
    if (allowed.length === 0) return { duLieu: [], phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo: 0 } }
    const where: Prisma.YeuCauDiemDanhWhereInput = { maBuoi: buoiId, maDonViDoiChieu: query.maDonVi ? { equals: query.maDonVi } : { in: allowed }, ...(query.trangThai ? { trangThai: query.trangThai as never } : {}), ...(query.tuKhoa ? { OR: [{ hoVaTenDoiChieu: { contains: query.tuKhoa, mode: 'insensitive' } }, { tenDonViDoiChieu: { contains: query.tuKhoa, mode: 'insensitive' } }] } : {}) }
    const [rows, total] = await this.prisma.$transaction([this.prisma.yeuCauDiemDanh.findMany({ where, orderBy: [{ guiLuc: 'desc' }, { ma: 'asc' }], skip: (query.trang - 1) * query.gioiHan, take: query.gioiHan, include: { nguoiXacMinh: { select: { ma: true, tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } }, nguoiXuLy: { select: { ma: true, tenDangNhap: true, hoSoDangVien: { select: { hoVaTen: true } } } } } }), this.prisma.yeuCauDiemDanh.count({ where })])
    return { duLieu: await Promise.all(rows.map(async row => { const { cccd, idempotencyHash, dauVanTayCoBanBam, dauVanTayCccdBam, phienBanKhoaBam, nguoiXacMinh, nguoiXuLy, ...data } = row; const allowed = await this.cccdHoSoDuocXem(actor, row.maHoSo); return { ...data, cccd: allowed ? cccd : null, nguoiXacMinh: nguoiXacMinh ? { ma: nguoiXacMinh.ma, tenHienThi: nguoiXacMinh.hoSoDangVien?.hoVaTen ?? nguoiXacMinh.tenDangNhap } : null, nguoiXuLy: nguoiXuLy ? { ma: nguoiXuLy.ma, tenHienThi: nguoiXuLy.hoSoDangVien?.hoVaTen ?? nguoiXuLy.tenDangNhap } : null } })), phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo: total } }
  }
  async chiTiet(actor: TaiKhoanDaXacThuc, id: string) {
    const access = await this.access(actor, P.xem); const row = await this.request(id); await this.assertRequestScope(access, row)
    return this.safe(row, await this.cccdHoSoDuocXem(actor, row.maHoSo))
  }
  async xoa(actor: TaiKhoanDaXacThuc, id: string, ip?: string | null) {
    const access = await this.access(actor, P.xoa)
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lock(tx, id)
        const row = await this.request(id, tx)
        await this.assertRequestScope(access, row)
        const before = { trangThai: row.trangThai, loaiYeuCau: row.loaiYeuCau, ketQuaDuKien: row.ketQuaDuKien, maBuoi: row.maBuoi }
        await this.audit(tx, actor, 'HOC_TAP_YEU_CAU_XOA', id, before, { daXoa: true }, ip)
        await tx.yeuCauDiemDanh.delete({ where: { ma: id } })
        return { ma: id, daXoa: true }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new ConflictException({ maLoi: 'YEU_CAU_CON_DU_LIEU_THAM_CHIEU', thongBao: 'Không thể xóa yêu cầu vì còn dữ liệu liên quan cần được bảo toàn.' })
      throw error
    }
  }
  async xacMinh(actor: TaiKhoanDaXacThuc, id: string, dto: XacMinhYeuCauDiemDanhDto, ip?: string | null) {
    const access = await this.access(actor, P.xacMinh)
    try { return await this.prisma.$transaction(async tx => {
      await this.lock(tx, id); const row = await this.request(id, tx); await this.assertRequestScope(access, row)
      if (row.trangThai !== 'CHO_XAC_MINH') this.statusError(row)
      const now = new Date()
      if (dto.ketQuaXacMinh === 'KHONG_HOP_LE') {
        const before = { trangThai: row.trangThai, maHoSo: row.maHoSo }
        const updated = await tx.yeuCauDiemDanh.update({ where: { ma: id }, data: { trangThai: 'TU_CHOI', maNguoiXacMinh: actor.maTaiKhoan, xacMinhLuc: now, maNguoiXuLy: actor.maTaiKhoan, xuLyLuc: now, ghiChuTuChoi: dto.ghiChu, dauVanTayCoBanBam: null, dauVanTayCccdBam: null, phienBanKhoaBam: null } })
        await this.audit(tx, actor, 'HOC_TAP_YEU_CAU_XAC_MINH_TU_CHOI', id, before, { trangThai: updated.trangThai, maNguoiXacMinh: actor.maTaiKhoan, xacMinhLuc: now }, ip)
        return { ma: updated.ma, trangThai: updated.trangThai, maNguoiXacMinh: actor.maTaiKhoan, xacMinhLuc: now, ketQuaDaGhiNhan: false }
      }
      const profileId = dto.maHoSo ?? row.maHoSo
      if (!profileId) throw new BadRequestException({ maLoi: 'HO_SO_KHONG_HOP_LE', thongBao: 'Chọn hồ sơ Đảng viên hợp lệ để xác minh yêu cầu.' })
      const roster = await tx.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: row.maBuoi, maHoSo: profileId } }, include: { hoSo: { select: { ma: true, maHoSoNoiBo: true, hoVaTen: true, trangThai: true, trangThaiDangVien: true, thongTinCaNhan: { select: { ngaySinh: true } } } } } })
      if (!roster || roster.trangThai !== 'TRONG_DANH_SACH') throw new BadRequestException({ maLoi: 'KHONG_THUOC_ROSTER', thongBao: 'Hồ sơ không nằm trong danh sách tham gia hiện hành của buổi học.' })
      await this.assertRequestScope(access, row, roster.maChiBoSnapshot)
      const profile = roster.hoSo
      const fullNameMatches = this.normalize(profile.hoVaTen) === this.normalize(row.hoVaTenDoiChieu)
      const yearMatches = !!profile.thongTinCaNhan?.ngaySinh && profile.thongTinCaNhan.ngaySinh.getFullYear() === row.namSinhDoiChieu
      if (profile.trangThai !== 'DANG_HOAT_DONG' || !['DU_BI', 'CHINH_THUC'].includes(profile.trangThaiDangVien ?? '') || !fullNameMatches || !yearMatches || roster.maChiBoSnapshot !== row.maDonViDoiChieu) throw new BadRequestException({ maLoi: 'HO_SO_KHONG_HOP_LE', thongBao: 'Hồ sơ không khớp thông tin đã khai báo hoặc không đủ điều kiện xác minh.' })
      const before = { trangThai: row.trangThai, maHoSo: row.maHoSo, maNguoiXacMinh: row.maNguoiXacMinh, xacMinhLuc: row.xacMinhLuc }
      const direct = !row.buoiHoc.yeuCauPheDuyet
      if (direct) await this.applyResult(tx, row, profileId, actor, now)
      const updated = await tx.yeuCauDiemDanh.update({ where: { ma: id }, data: { maHoSo: profileId, trangThai: direct ? 'DA_DUYET' : 'CHO_PHE_DUYET', maNguoiXacMinh: actor.maTaiKhoan, xacMinhLuc: now, ...(direct ? { maNguoiXuLy: actor.maTaiKhoan, xuLyLuc: now, dauVanTayCoBanBam: null, dauVanTayCccdBam: null, phienBanKhoaBam: null } : {}) } })
      await this.audit(tx, actor, 'HOC_TAP_YEU_CAU_XAC_MINH', id, before, { trangThai: updated.trangThai, maHoSo: profileId, maNguoiXacMinh: actor.maTaiKhoan, xacMinhLuc: now, ghiNhanKetQuaTrucTiep: direct }, ip)
      return { ma: updated.ma, trangThai: updated.trangThai, maHoSo: updated.maHoSo, maNguoiXacMinh: updated.maNguoiXacMinh, xacMinhLuc: updated.xacMinhLuc, ketQuaDaGhiNhan: direct }
    }) } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'XUNG_DOT_CAP_NHAT', thongBao: 'Yêu cầu vừa được xử lý ở thao tác khác. Hãy tải lại trạng thái.' }); throw error }
  }
  private normalize(value: string) { return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN') }
  private async applyResult(tx: Prisma.TransactionClient, row: Awaited<ReturnType<XuLyYeuCauDiemDanhService['request']>>, profileId: string, actor: TaiKhoanDaXacThuc, now: Date) {
    if (row.loaiYeuCau === 'DIEU_CHINH') {
      const current = await tx.ketQuaDiemDanh.findUnique({ where: { maBuoi_maHoSo: { maBuoi: row.maBuoi, maHoSo: profileId } } })
      if (!current || current.ma !== row.maKetQuaHienTai || current.version !== row.versionKetQuaLucTao) throw new ConflictException({ maLoi: 'XUNG_DOT_KET_QUA', thongBao: 'Kết quả điểm danh đã thay đổi; cần tải lại trước khi xử lý yêu cầu.' })
      const updated = await tx.ketQuaDiemDanh.update({ where: { ma: current.ma }, data: { trangThai: row.ketQuaDuKien, version: { increment: 1 }, ghiNhanLuc: now, thoiDiemCoMat: row.ketQuaDuKien === 'CO_MAT' ? row.guiLuc : null, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now } })
      await tx.lichSuDiemDanh.create({ data: { maBuoi: row.maBuoi, maHoSo: profileId, maYeuCau: row.ma, maYeuCauNguon: row.ma, ketQuaTruoc: current.trangThai, ketQuaSau: updated.trangThai, versionTruoc: current.version, versionSau: updated.version, maNguoiThucHien: actor.maTaiKhoan, maTuongQuan: randomUUID() } })
      return
    }
    const existing = await tx.ketQuaDiemDanh.findUnique({ where: { maBuoi_maHoSo: { maBuoi: row.maBuoi, maHoSo: profileId } } })
    if (!row.ketQuaDuKien) throw new ConflictException({ maLoi: 'KET_QUA_YEU_CAU_KHONG_HOP_LE', thongBao: 'Yêu cầu tạo mới không thể có đích Chưa điểm danh.' })
    if (existing && existing.trangThai !== null) throw new ConflictException({ maLoi: 'KET_QUA_DA_TON_TAI', thongBao: 'Hồ sơ đã có kết quả điểm danh chính thức; không thể ghi đè từ yêu cầu tạo mới.' })
    const created = existing
      ? await tx.ketQuaDiemDanh.update({ where: { ma: existing.ma }, data: { trangThai: row.ketQuaDuKien, version: { increment: 1 }, ghiNhanLuc: now, thoiDiemCoMat: row.ketQuaDuKien === 'CO_MAT' ? row.guiLuc : null, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now } })
      : await tx.ketQuaDiemDanh.create({ data: { maBuoi: row.maBuoi, maHoSo: profileId, trangThai: row.ketQuaDuKien, ghiNhanLuc: now, thoiDiemCoMat: row.ketQuaDuKien === 'CO_MAT' ? row.guiLuc : null, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now } })
    await tx.lichSuDiemDanh.create({ data: { maBuoi: row.maBuoi, maHoSo: profileId, maYeuCau: row.ma, maYeuCauNguon: row.ma, ketQuaTruoc: existing?.trangThai ?? null, ketQuaSau: created.trangThai, versionTruoc: existing?.version ?? null, versionSau: created.version, maNguoiThucHien: actor.maTaiKhoan, maTuongQuan: randomUUID() } })
  }
  async duyet(actor: TaiKhoanDaXacThuc, id: string, dto: XuLyYeuCauDiemDanhDto, ip?: string | null) {
    const access = await this.access(actor, P.pheDuyet)
    try { return await this.prisma.$transaction(async tx => {
      await this.lock(tx, id); const row = await this.request(id, tx); await this.assertRequestScope(access, row)
      if (row.trangThai === 'CHO_XAC_MINH') throw new ConflictException({ maLoi: 'YEU_CAU_CHUA_XAC_MINH', thongBao: 'Yêu cầu cần được xác minh trước khi phê duyệt.' })
      if (row.trangThai !== 'CHO_PHE_DUYET') this.statusError(row)
      if (!row.buoiHoc.yeuCauPheDuyet) throw new ConflictException({ maLoi: 'BUOI_KHONG_YEU_CAU_PHE_DUYET', thongBao: 'Buổi học không bật yêu cầu phê duyệt.' })
      const roster = await tx.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: row.maBuoi, maHoSo: row.maHoSo! } } })
      if (!roster || roster.trangThai !== 'TRONG_DANH_SACH') throw new BadRequestException({ maLoi: 'KHONG_THUOC_ROSTER', thongBao: 'Hồ sơ không còn thuộc danh sách tham gia hiện hành.' })
      await this.assertRequestScope(access, row, roster.maChiBoSnapshot)
      const now = new Date(); await this.applyResult(tx, row, row.maHoSo!, actor, now)
      const updated = await tx.yeuCauDiemDanh.update({ where: { ma: id }, data: { trangThai: 'DA_DUYET', maNguoiXuLy: actor.maTaiKhoan, xuLyLuc: now, dauVanTayCoBanBam: null, dauVanTayCccdBam: null, phienBanKhoaBam: null } })
      await this.audit(tx, actor, 'HOC_TAP_YEU_CAU_DUYET', id, { trangThai: row.trangThai, maHoSo: row.maHoSo }, { trangThai: updated.trangThai, maNguoiXuLy: actor.maTaiKhoan, xuLyLuc: now }, ip)
      return { ma: updated.ma, trangThai: updated.trangThai, maNguoiXuLy: updated.maNguoiXuLy, xuLyLuc: updated.xuLyLuc }
    }) } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'XUNG_DOT_CAP_NHAT', thongBao: 'Yêu cầu vừa được xử lý ở thao tác khác. Hãy tải lại trạng thái.' }); throw error }
  }
  async tuChoi(actor: TaiKhoanDaXacThuc, id: string, dto: XuLyYeuCauDiemDanhDto, ip?: string | null) {
    const access = await this.access(actor, P.pheDuyet)
    return this.prisma.$transaction(async tx => {
      await this.lock(tx, id); const row = await this.request(id, tx); await this.assertRequestScope(access, row)
      if (row.trangThai === 'CHO_XAC_MINH') throw new ConflictException({ maLoi: 'YEU_CAU_CHUA_XAC_MINH', thongBao: 'Yêu cầu cần được xác minh trước khi xử lý phê duyệt.' })
      if (row.trangThai !== 'CHO_PHE_DUYET') this.statusError(row)
      const now = new Date(); const updated = await tx.yeuCauDiemDanh.update({ where: { ma: id }, data: { trangThai: 'TU_CHOI', maNguoiXuLy: actor.maTaiKhoan, xuLyLuc: now, ghiChuTuChoi: dto.ghiChu, dauVanTayCoBanBam: null, dauVanTayCccdBam: null, phienBanKhoaBam: null } })
      await this.audit(tx, actor, 'HOC_TAP_YEU_CAU_TU_CHOI', id, { trangThai: row.trangThai, maHoSo: row.maHoSo }, { trangThai: updated.trangThai, maNguoiXuLy: actor.maTaiKhoan, xuLyLuc: now }, ip)
      return { ma: updated.ma, trangThai: updated.trangThai, maNguoiXuLy: updated.maNguoiXuLy, xuLyLuc: updated.xuLyLuc }
    })
  }
}
