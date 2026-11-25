import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import type { DanhSachKetQuaThuCongDto, DongKetQuaThuCongDto, GhiKetQuaThuCongLoDto } from './attendance-manual.dto'

const P_XEM = 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM'
const P_SUA = 'HOC_TAP_NGHI_QUYET_DIEM_DANH_THU_CONG'
const P_DIEU_CHINH = 'HOC_TAP_NGHI_QUYET_DIEM_DANH_DIEU_CHINH'
const pending = ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] as const

@Injectable()
export class DiemDanhThuCongService {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService) {}

  private async access(actor: TaiKhoanDaXacThuc, permission: string) {
    const value = await this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!value.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_CO_QUYEN', thongBao: 'Bạn không có quyền thực hiện thao tác điểm danh này.' })
    return value
  }
  private inScope(access: { toanHeThong: boolean; maDonVi: string[] }, unitId: string) { return access.toanHeThong || access.maDonVi.includes(unitId) }
  private async getBuoi(id: string) {
    const row = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, trangThai: true, yeuCauPheDuyet: true, phamVi: { select: { maDonVi: true } } } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    return row
  }
  private async allowedUnits(actor: TaiKhoanDaXacThuc, permission: string, unitIds: string[]) {
    const access = await this.access(actor, permission)
    return access.toanHeThong ? unitIds : unitIds.filter(id => access.maDonVi.includes(id))
  }
  private async requireUnit(actor: TaiKhoanDaXacThuc, permission: string, unitId: string) {
    const access = await this.access(actor, permission)
    if (!this.inScope(access, unitId)) throw new ForbiddenException({ maLoi: 'NGOAI_PHAM_VI', thongBao: 'Đơn vị của hồ sơ nằm ngoài phạm vi được cấp.' })
  }
  private async lockBuoi(tx: Prisma.TransactionClient, id: string) { await tx.$queryRaw`SELECT ma_buoi FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${id}::uuid FOR UPDATE` }
  private async assertOpen(tx: Prisma.TransactionClient, id: string, sauChot = false) {
    const row = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { trangThai: true, yeuCauPheDuyet: true } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    const chot = await tx.chotDanhSachDiemDanh.findUnique({ where: { maBuoi: id }, select: { ma: true } })
    if (sauChot) {
      if (row.trangThai === 'DA_HUY') throw new ConflictException({ maLoi: 'BUOI_DA_HUY', thongBao: 'Buổi học đã hủy, không thể điều chỉnh kết quả.' })
      if (row.trangThai !== 'DA_KET_THUC' || !chot) throw new ConflictException({ maLoi: 'BUOI_CHUA_CHOT', thongBao: 'Chỉ điều chỉnh sau chốt khi buổi đã kết thúc và có bản chốt.' })
    } else {
      if (!['DANG_DIEN_RA', 'DA_KET_THUC'].includes(row.trangThai)) throw new ConflictException({ maLoi: row.trangThai === 'DA_HUY' ? 'BUOI_DA_HUY' : 'BUOI_CHUA_CHO_PHEP_DIEM_DANH', thongBao: 'Buổi học hiện không cho phép ghi nhận điểm danh thủ công.' })
      if (chot) throw new ConflictException({ maLoi: 'BUOI_DA_CHOT', thongBao: 'Danh sách điểm danh đã chốt; hãy dùng nghiệp vụ điều chỉnh sau chốt.' })
    }
    return row
  }
  async danhSach(actor: TaiKhoanDaXacThuc, buoiId: string, query: DanhSachKetQuaThuCongDto) {
    const buoi = await this.getBuoi(buoiId)
    const allowed = await this.allowedUnits(actor, P_XEM, buoi.phamVi.map(x => x.maDonVi))
    if (query.maChiBo && !allowed.includes(query.maChiBo)) throw new ForbiddenException({ maLoi: 'NGOAI_PHAM_VI', thongBao: 'Chi bộ lọc nằm ngoài phạm vi được cấp.' })
    if (!allowed.length) return { duLieu: [], phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo: 0 } }
    const where: Prisma.DanhSachThamGiaBuoiHocWhereInput = { maBuoi: buoiId, trangThai: 'TRONG_DANH_SACH', maChiBoSnapshot: { in: query.maChiBo ? [query.maChiBo] : allowed } }
    const [rows, tongSo] = await this.prisma.$transaction([
      this.prisma.danhSachThamGiaBuoiHoc.findMany({ where, orderBy: [{ tenChiBoSnapshot: 'asc' }, { hoSo: { hoVaTen: 'asc' } }], skip: (query.trang - 1) * query.gioiHan, take: query.gioiHan, include: { hoSo: { select: { ma: true, maHoSoNoiBo: true, hoVaTen: true } } } }),
      this.prisma.danhSachThamGiaBuoiHoc.count({ where }),
    ])
    const results = await this.prisma.ketQuaDiemDanh.findMany({ where: { maBuoi: buoiId, maHoSo: { in: rows.map(row => row.maHoSo) } } })
    const byProfile = new Map(results.map(row => [row.maHoSo, row]))
    return { duLieu: rows.map(row => { const result = byProfile.get(row.maHoSo); return { maHoSo: row.maHoSo, maHoSoNoiBo: row.hoSo.maHoSoNoiBo, hoVaTen: row.hoSo.hoVaTen, maChiBo: row.maChiBoSnapshot, tenChiBo: row.tenChiBoSnapshot, ketQua: result?.trangThai ?? 'CHUA_DIEM_DANH', version: result?.version ?? null } }), phanTrang: { trang: query.trang, gioiHan: query.gioiHan, tongSo } }
  }
  async capNhat(actor: TaiKhoanDaXacThuc, buoiId: string, dto: DongKetQuaThuCongDto, ip?: string | null) {
    try { return await this.prisma.$transaction(async tx => { const [row] = await this.capNhatNhieu(tx, actor, buoiId, [dto], ip); return row }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) { this.throwConcurrentConflict(error); throw error }
  }
  async capNhatLo(actor: TaiKhoanDaXacThuc, buoiId: string, dto: GhiKetQuaThuCongLoDto, ip?: string | null) {
    try { return await this.prisma.$transaction(tx => this.capNhatNhieu(tx, actor, buoiId, dto.ketQua, ip, false), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) { this.throwConcurrentConflict(error); throw error }
  }
  async capNhatSauChot(actor: TaiKhoanDaXacThuc, buoiId: string, hoSoId: string, dto: Omit<DongKetQuaThuCongDto, 'maHoSo'>, ip?: string | null) {
    try { return await this.prisma.$transaction(async tx => { const [row] = await this.capNhatNhieu(tx, actor, buoiId, [{ ...dto, maHoSo: hoSoId }], ip, true); return row }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) { this.throwConcurrentConflict(error); throw error }
  }
  private throwConcurrentConflict(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new ConflictException({ maLoi: 'XUNG_DOT_CAP_NHAT', thongBao: 'Dữ liệu vừa được thay đổi ở thao tác khác; không có phần nào của lô được ghi. Hãy tải lại và thử lại.' })
  }

  private async capNhatNhieu(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, buoiId: string, rows: DongKetQuaThuCongDto[], ip?: string | null, sauChot = false) {
    const buoi = await this.getBuoi(buoiId)
    const permission = sauChot ? P_DIEU_CHINH : P_SUA
    await this.access(actor, permission)
    await this.lockBuoi(tx, buoiId)
    const access = await this.access(actor, permission)
    const currentSession = await this.assertOpen(tx, buoiId, sauChot)
    const output: Record<string, unknown>[] = []
    for (const input of rows) {
      const roster = await tx.danhSachThamGiaBuoiHoc.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo: input.maHoSo } }, include: { hoSo: { select: { ma: true, hoVaTen: true, thongTinCaNhan: { select: { ngaySinh: true } } } } } })
      if (!roster || roster.trangThai !== 'TRONG_DANH_SACH') throw new ConflictException({ maLoi: 'KHONG_THUOC_ROSTER', thongBao: 'Hồ sơ không nằm trong danh sách tham gia hiện hành của buổi học.' })
      if (!buoi.phamVi.some(x => x.maDonVi === roster.maChiBoSnapshot) || !this.inScope(access, roster.maChiBoSnapshot)) throw new ForbiddenException({ maLoi: 'NGOAI_PHAM_VI', thongBao: 'Hồ sơ nằm ngoài phạm vi của buổi học hoặc Assignment hiện hành.' })
      const [current, linkedPending, publicPendingRows] = await Promise.all([
        tx.ketQuaDiemDanh.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo: input.maHoSo } } }),
        tx.yeuCauDiemDanh.findFirst({ where: { maBuoi: buoiId, maHoSo: input.maHoSo, trangThai: { in: [...pending] } }, select: { ma: true } }),
        tx.yeuCauDiemDanh.findMany({ where: { maBuoi: buoiId, maHoSo: null, maDonViDoiChieu: roster.maChiBoSnapshot, trangThai: { in: [...pending] }, ...(roster.hoSo.thongTinCaNhan?.ngaySinh ? { namSinhDoiChieu: roster.hoSo.thongTinCaNhan.ngaySinh.getFullYear() } : {}) }, select: { ma: true, hoVaTenDoiChieu: true } }),
      ])
      const publicPending = publicPendingRows.some(request => this.normalize(request.hoVaTenDoiChieu) === this.normalize(roster.hoSo.hoVaTen))
      if (linkedPending || publicPending) throw new ConflictException({ maLoi: 'YEU_CAU_DANG_CHO_XU_LY', thongBao: 'Hồ sơ đang có yêu cầu điểm danh chờ xử lý.' })
      if (current && input.version === undefined) throw new ConflictException({ maLoi: 'THIEU_VERSION_KET_QUA', thongBao: 'Cần gửi version kết quả hiện tại để tránh ghi đè cập nhật đồng thời.' })
      if (current && input.version !== current.version) throw new ConflictException({ maLoi: 'KET_QUA_DA_THAY_DOI', thongBao: 'Kết quả đã được cập nhật bởi thao tác khác; hãy tải lại.' })
      if (!current && input.version !== undefined) throw new ConflictException({ maLoi: 'KET_QUA_KHONG_CON_TON_TAI', thongBao: 'Kết quả đã thay đổi; hãy tải lại trước khi ghi.' })
      const target = input.ketQua === 'CHUA_DIEM_DANH' ? null : input.ketQua
      if ((current?.trangThai ?? null) === target) { output.push({ maHoSo: input.maHoSo, ketQua: target ?? 'CHUA_DIEM_DANH', version: current?.version ?? null, khongThayDoi: true }); continue }
      const now = new Date()
      const year = roster.hoSo.thongTinCaNhan?.ngaySinh?.getFullYear() ?? null
      if (currentSession.yeuCauPheDuyet) {
        const request = await tx.yeuCauDiemDanh.create({ data: { maBuoi: buoiId, maCuaSo: null, maHoSo: input.maHoSo, loaiYeuCau: current ? 'DIEU_CHINH' : 'TAO_MOI', maKetQuaHienTai: current?.ma ?? null, versionKetQuaLucTao: current?.version ?? null, ketQuaDuKien: target, trangThai: 'CHO_PHE_DUYET', hoVaTenDoiChieu: roster.hoSo.hoVaTen, maDonViDoiChieu: roster.maChiBoSnapshot, tenDonViDoiChieu: roster.tenChiBoSnapshot, namSinhDoiChieu: year, maNguoiXacMinh: null, xacMinhLuc: null } })
        await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: sauChot ? 'HOC_TAP_DIEM_DANH_DIEU_CHINH_GUI_DUYET' : 'HOC_TAP_DIEM_DANH_THU_CONG_GUI_DUYET', loaiDoiTuong: 'YEU_CAU_DIEM_DANH', maDoiTuong: request.ma, ketQua: 'THANH_CONG', duLieuTruoc: { loaiYeuCau: current ? 'DIEU_CHINH' : 'TAO_MOI' }, duLieuSau: { trangThai: 'CHO_PHE_DUYET', ketQuaDuKien: target ?? 'CHUA_DIEM_DANH', maHoSo: input.maHoSo }, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
        output.push({ maHoSo: input.maHoSo, maYeuCau: request.ma, trangThai: request.trangThai, ketQuaHienTai: current?.trangThai ?? 'CHUA_DIEM_DANH', choPheDuyet: true })
      } else {
        const updated = current ? await tx.ketQuaDiemDanh.update({ where: { ma: current.ma }, data: { trangThai: target, version: { increment: 1 }, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now, thoiDiemCoMat: target === 'CO_MAT' ? now : null, ghiChu: input.ghiChu ?? null } }) : await tx.ketQuaDiemDanh.create({ data: { maBuoi: buoiId, maHoSo: input.maHoSo, trangThai: target!, version: 1, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now, thoiDiemCoMat: target === 'CO_MAT' ? now : null, ghiChu: input.ghiChu ?? null } })
        await tx.lichSuDiemDanh.create({ data: { maBuoi: buoiId, maHoSo: input.maHoSo, ketQuaTruoc: current?.trangThai ?? null, ketQuaSau: target, versionTruoc: current?.version ?? null, versionSau: updated.version, maNguoiThucHien: actor.maTaiKhoan, thoiDiem: now, maTuongQuan: randomUUID() } })
        await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: sauChot ? 'HOC_TAP_DIEM_DANH_DIEU_CHINH' : 'HOC_TAP_DIEM_DANH_THU_CONG', loaiDoiTuong: 'KET_QUA_DIEM_DANH', maDoiTuong: updated.ma, ketQua: 'THANH_CONG', duLieuTruoc: { ketQua: current?.trangThai ?? 'CHUA_DIEM_DANH', version: current?.version ?? null }, duLieuSau: { ketQua: target ?? 'CHUA_DIEM_DANH', version: updated.version, maHoSo: input.maHoSo }, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
        output.push({ maHoSo: input.maHoSo, maKetQua: updated.ma, ketQua: updated.trangThai ?? 'CHUA_DIEM_DANH', version: updated.version, choPheDuyet: false })
      }
    }
    return output
  }
  private normalize(value: string) { return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN') }
}
