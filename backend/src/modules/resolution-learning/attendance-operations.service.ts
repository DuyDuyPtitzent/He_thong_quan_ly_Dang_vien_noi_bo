import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { BaoMatDiemDanhService, type MucDichTokenDiemDanh } from './attendance-security.service'
import type { GuiYeuCauCongKhaiDto, TaoLienKetBieuMauDto, TokenDiemDanhDto } from './attendance.dto'

const PERMISSION = {
  xem: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_XEM',
  moDong: 'HOC_TAP_NGHI_QUYET_DIEM_DANH_DONG_MO',
  taoLienKet: 'TAO_LIEN_KET_BIEU_MAU',
  tuDiemDanh: 'HOC_TAP_NGHI_QUYET_TU_DIEM_DANH',
} as const
const closed = new Set(['DA_KET_THUC', 'DA_HUY'])
const fixedForm = [
  { ma: 'hoVaTen', ten: 'Họ và tên', batBuoc: true, kieu: 'text' },
  { ma: 'maChiBo', ten: 'Chi bộ', batBuoc: true, kieu: 'select' },
  { ma: 'namSinh', ten: 'Năm sinh', batBuoc: true, kieu: 'year' },
  { ma: 'cccd', ten: 'CCCD', batBuoc: false, kieu: 'text' },
] as const

@Injectable()
export class VanHanhDiemDanhService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
    @Inject(BaoMatDiemDanhService) private readonly security: BaoMatDiemDanhService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private async scope(actor: TaiKhoanDaXacThuc, permission: string, unitIds: string[]) {
    const access = await this.phanQuyen.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
    if (!access.coQuyen || (!access.toanHeThong && unitIds.some(id => !access.maDonVi.includes(id)))) throw new ForbiddenException({ maLoi: 'KHONG_DU_PHAM_VI', thongBao: 'Bạn không có quyền trong toàn bộ phạm vi buổi học.' })
  }

  private async buoi(id: string) {
    const row = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, include: { phamVi: { select: { maDonVi: true } }, cauHinhDiemDanh: true } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    return row
  }

  private async lockBuoi(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT ma_buoi FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${id}::uuid FOR UPDATE`
  }

  private async currentWindow(tx: Prisma.TransactionClient, buoiId: string) {
    return tx.cuaSoDiemDanhTrucTuyen.findFirst({ where: { maBuoi: buoiId, moLucThucTe: { not: null }, dongLucThucTe: null }, orderBy: { ngayTao: 'desc' } })
  }

  private audit(tx: Prisma.TransactionClient, actor: TaiKhoanDaXacThuc, action: string, buoiId: string, targetId: string, before: unknown, after: unknown, ip?: string | null) {
    return tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: action, loaiDoiTuong: 'CUA_SO_DIEM_DANH_TRUC_TUYEN', maDoiTuong: targetId, ketQua: 'THANH_CONG', duLieuTruoc: before as Prisma.InputJsonValue, duLieuSau: after as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
  }

  async trangThai(actor: TaiKhoanDaXacThuc, buoiId: string) {
    const buoi = await this.buoi(buoiId)
    await this.scope(actor, PERMISSION.xem, buoi.phamVi.map(x => x.maDonVi))
    const [window, config] = await Promise.all([
      this.prisma.cuaSoDiemDanhTrucTuyen.findFirst({ where: { maBuoi: buoiId }, orderBy: { ngayTao: 'desc' } }),
      this.prisma.cauHinhDiemDanhBuoiHoc.findUnique({ where: { maBuoi: buoiId } }),
    ])
    const now = new Date()
    return { maBuoi: buoiId, trangThaiBuoi: buoi.trangThai, trangThaiCuaSo: !window ? 'CHUA_MO' : window.dongLucThucTe ? 'DA_DONG' : window.moLucThucTe && window.dongTheoKeHoachLuc <= now ? 'HET_HAN_THEO_LICH' : window.moLucThucTe ? 'DANG_MO' : 'CHUA_MO', cauHinh: config, cuaSo: window ? { ma: window.ma, choPhepQr: window.choPhepQr, choPhepBieuMau: window.choPhepBieuMau, choPhepKhongDangNhap: window.choPhepKhongDangNhap, chuKyQrGiay: window.chuKyQrGiay, moTheoKeHoachLuc: window.moTheoKeHoachLuc, dongTheoKeHoachLuc: window.dongTheoKeHoachLuc, moLucThucTe: window.moLucThucTe, dongLucThucTe: window.dongLucThucTe, maNguoiMo: window.maNguoiMo, maNguoiDong: window.maNguoiDong } : null }
  }

  async moCuaSo(actor: TaiKhoanDaXacThuc, buoiId: string, ip?: string | null) {
    const before = await this.buoi(buoiId)
    await this.scope(actor, PERMISSION.moDong, before.phamVi.map(x => x.maDonVi))
    if (before.trangThai !== 'DANG_DIEN_RA') throw new ConflictException({ maLoi: 'BUOI_KHONG_CHO_PHEP_MO_DIEM_DANH', thongBao: 'Chỉ mở điểm danh khi buổi đang diễn ra.' })
    const config = before.cauHinhDiemDanh
    if (!config?.choPhepTrucTuyen || (!config.choPhepQr && !config.choPhepBieuMau)) throw new ConflictException({ maLoi: 'KENH_DIEM_DANH_TRUC_TUYEN_DANG_TAT', thongBao: 'Cấu hình buổi không cho phép kênh điểm danh trực tuyến nào.' })
    const now = new Date()
    if (config.dongTheoKeHoachLuc <= now) throw new ConflictException({ maLoi: 'DA_QUA_GIO_DONG_THEO_KE_HOACH', thongBao: 'Không thể mở điểm danh sau thời điểm đóng đã cấu hình.' })
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockBuoi(tx, buoiId)
        const current = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: buoiId }, include: { cauHinhDiemDanh: true } })
        if (!current || current.trangThai !== 'DANG_DIEN_RA' || !current.cauHinhDiemDanh?.choPhepTrucTuyen || (!current.cauHinhDiemDanh.choPhepQr && !current.cauHinhDiemDanh.choPhepBieuMau) || current.cauHinhDiemDanh.dongTheoKeHoachLuc <= now) throw new ConflictException({ maLoi: 'BUOI_KHONG_CHO_PHEP_MO_DIEM_DANH', thongBao: 'Trạng thái hoặc cấu hình buổi vừa thay đổi; hãy tải lại.' })
        if (await this.currentWindow(tx, buoiId)) throw new ConflictException({ maLoi: 'CUA_SO_DANG_MO', thongBao: 'Buổi học đang có cửa sổ điểm danh mở.' })
        const row = await tx.cuaSoDiemDanhTrucTuyen.create({ data: { maBuoi: buoiId, choPhepQr: current.cauHinhDiemDanh.choPhepQr, choPhepBieuMau: current.cauHinhDiemDanh.choPhepBieuMau, choPhepKhongDangNhap: current.cauHinhDiemDanh.choPhepKhongDangNhap, chuKyQrGiay: current.cauHinhDiemDanh.chuKyQrGiay, moTheoKeHoachLuc: current.cauHinhDiemDanh.moTheoKeHoachLuc, dongTheoKeHoachLuc: current.cauHinhDiemDanh.dongTheoKeHoachLuc, moLucThucTe: now, maNguoiMo: actor.maTaiKhoan, maNguoiTao: actor.maTaiKhoan } })
        await this.audit(tx, actor, 'HOC_TAP_CUA_SO_MO', buoiId, row.ma, null, { maBuoi: buoiId, moLucThucTe: now, choPhepQr: row.choPhepQr, choPhepBieuMau: row.choPhepBieuMau, chuKyQrGiay: row.chuKyQrGiay }, ip)
        const { maPhienQr: _nonce, ...safeRow } = row
        return safeRow
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ maLoi: 'CUA_SO_DANG_MO', thongBao: 'Buổi học đang có cửa sổ điểm danh mở.' })
      throw error
    }
  }

  async dongCuaSo(actor: TaiKhoanDaXacThuc, buoiId: string, ip?: string | null) {
    const before = await this.buoi(buoiId)
    await this.scope(actor, PERMISSION.moDong, before.phamVi.map(x => x.maDonVi))
    return this.prisma.$transaction(async tx => {
      await this.lockBuoi(tx, buoiId)
      const current = await this.currentWindow(tx, buoiId)
      if (!current) throw new ConflictException({ maLoi: 'CUA_SO_CHUA_MO_HOAC_DA_DONG', thongBao: 'Không có cửa sổ đang mở để đóng.' })
      const now = new Date()
      const row = await tx.cuaSoDiemDanhTrucTuyen.update({ where: { ma: current.ma }, data: { dongLucThucTe: now, maNguoiDong: actor.maTaiKhoan, phienBanLienKetBieuMau: { increment: 1 } } })
      await this.audit(tx, actor, 'HOC_TAP_CUA_SO_DONG', buoiId, row.ma, { moLucThucTe: current.moLucThucTe, dongLucThucTe: null }, { moLucThucTe: row.moLucThucTe, dongLucThucTe: now, linkFormVoHieu: true }, ip)
      const { maPhienQr: _nonce, ...safeRow } = row
      return safeRow
    })
  }

  async qr(actor: TaiKhoanDaXacThuc, buoiId: string) {
    const buoi = await this.buoi(buoiId)
    await this.scope(actor, PERMISSION.moDong, buoi.phamVi.map(x => x.maDonVi))
    const now = new Date()
    const row = await this.prisma.cuaSoDiemDanhTrucTuyen.findFirst({ where: { maBuoi: buoiId, moLucThucTe: { not: null }, dongLucThucTe: null }, orderBy: { ngayTao: 'desc' } })
    if (!row || !row.choPhepQr || buoi.trangThai !== 'DANG_DIEN_RA' || row.dongTheoKeHoachLuc <= now) throw new ConflictException({ maLoi: 'QR_KHONG_HOAT_DONG', thongBao: 'QR không hoạt động khi cửa sổ đóng/hết hạn hoặc kênh QR bị tắt.' })
    const bucket = Math.floor(now.getTime() / (row.chuKyQrGiay * 1000))
    const hetHanGiay = Math.min((bucket + 1) * row.chuKyQrGiay, Math.floor(row.dongTheoKeHoachLuc.getTime() / 1000))
    const token = this.security.token({ mucDich: 'QR', maBuoi: buoiId, maCuaSo: row.ma, maPhienQr: row.maPhienQr, bucket, hetHanGiay })
    const origin = this.config.get<string>('URL_GIAO_DIEN_DUOC_PHEP', 'http://127.0.0.1:5173').replace(/\/$/, '')
    return { maBuoi: buoiId, maCuaSo: row.ma, chuKyQrGiay: row.chuKyQrGiay, hetHanLuc: new Date(hetHanGiay * 1000).toISOString(), token, noiDungQr: `${origin}/diem-danh?c=${row.ma}#t=${token}`, cacheControl: 'no-store' }
  }

  async taoLienKet(actor: TaiKhoanDaXacThuc, buoiId: string, dto: TaoLienKetBieuMauDto, ip?: string | null) {
    const buoi = await this.buoi(buoiId)
    await this.scope(actor, PERMISSION.taoLienKet, buoi.phamVi.map(x => x.maDonVi))
    const rowBefore = await this.prisma.cuaSoDiemDanhTrucTuyen.findFirst({ where: { maBuoi: buoiId, moLucThucTe: { not: null }, dongLucThucTe: null }, orderBy: { ngayTao: 'desc' } })
    if (!rowBefore || !rowBefore.choPhepBieuMau || !rowBefore.choPhepKhongDangNhap || buoi.trangThai !== 'DANG_DIEN_RA' || rowBefore.dongTheoKeHoachLuc <= new Date()) throw new ConflictException({ maLoi: 'BIEU_MAU_CONG_KHAI_KHONG_HOAT_DONG', thongBao: 'Không thể phát hành biểu mẫu khi cửa sổ/kênh công khai không hoạt động.' })
    return this.prisma.$transaction(async tx => {
      await this.lockBuoi(tx, buoiId)
      const row = await tx.cuaSoDiemDanhTrucTuyen.findUnique({ where: { ma: rowBefore.ma } })
      if (!row || !row.moLucThucTe || row.dongLucThucTe || row.dongTheoKeHoachLuc <= new Date() || !row.choPhepBieuMau || !row.choPhepKhongDangNhap) throw new ConflictException({ maLoi: 'BIEU_MAU_CONG_KHAI_KHONG_HOAT_DONG', thongBao: 'Cửa sổ hoặc cấu hình biểu mẫu vừa thay đổi.' })
      const duration = Math.min(dto.thoiHanGio ?? 24, 168)
      const expiry = new Date(Math.min(Date.now() + duration * 3_600_000, row.dongTheoKeHoachLuc.getTime()))
      const updated = await tx.cuaSoDiemDanhTrucTuyen.update({ where: { ma: row.ma }, data: { phienBanLienKetBieuMau: { increment: 1 }, hetHanLienKetBieuMauLuc: expiry } })
      await this.audit(tx, actor, 'HOC_TAP_BIEU_MAU_PHAT_HANH_LIEN_KET', buoiId, row.ma, { phienBan: row.phienBanLienKetBieuMau }, { phienBan: updated.phienBanLienKetBieuMau, hetHanLuc: expiry }, ip)
      const token = this.security.token({ mucDich: 'BIEU_MAU', maBuoi: buoiId, maCuaSo: row.ma, phienBan: updated.phienBanLienKetBieuMau, hetHanGiay: Math.floor(expiry.getTime() / 1000) })
      const origin = this.config.get<string>('URL_GIAO_DIEN_DUOC_PHEP', 'http://127.0.0.1:5173').replace(/\/$/, '')
      return { maBuoi: buoiId, maCuaSo: row.ma, phienBan: updated.phienBanLienKetBieuMau, hetHanLuc: expiry.toISOString(), url: `${origin}/diem-danh/cong-khai#f=${token}`, token }
    })
  }

  private async validatePublicToken(token: string, purpose: MucDichTokenDiemDanh, tx: Prisma.TransactionClient, now = new Date(), requirePublicChannel = true) {
    const payload = this.security.xacMinhToken(token, purpose, now)
    if (!payload) throw new ForbiddenException({ maLoi: 'LIEN_KET_KHONG_HOP_LE', thongBao: 'Liên kết điểm danh không hợp lệ hoặc đã hết hạn.' })
    const window = await tx.cuaSoDiemDanhTrucTuyen.findUnique({ where: { ma: payload.maCuaSo }, include: { buoiHoc: { select: { ten: true, trangThai: true, yeuCauPheDuyet: true, phamVi: { select: { maDonVi: true } }, dotHoc: { select: { ten: true } }, cauHinhDiemDanh: true } } } })
    if (!window || window.maBuoi !== payload.maBuoi || !window.moLucThucTe || window.dongLucThucTe || window.dongTheoKeHoachLuc <= now || window.buoiHoc.trangThai !== 'DANG_DIEN_RA' || (requirePublicChannel && !window.choPhepKhongDangNhap)) throw new ForbiddenException({ maLoi: 'CUA_SO_DIEM_DANH_KHONG_HOAT_DONG', thongBao: 'Cửa sổ điểm danh không hoạt động.' })
    if (purpose === 'QR') {
      if (!window.choPhepQr || payload.maPhienQr !== window.maPhienQr || payload.bucket !== Math.floor(now.getTime() / (window.chuKyQrGiay * 1000))) throw new ForbiddenException({ maLoi: 'QR_HET_HAN', thongBao: 'Mã QR không còn hiệu lực.' })
    } else if (!window.choPhepBieuMau || payload.phienBan !== window.phienBanLienKetBieuMau || (window.hetHanLienKetBieuMauLuc && window.hetHanLienKetBieuMauLuc <= now)) throw new ForbiddenException({ maLoi: 'BIEU_MAU_HET_HAN', thongBao: 'Liên kết biểu mẫu không còn hiệu lực.' })
    return { payload, window }
  }

  async truyCapCongKhai(dto: TokenDiemDanhDto) {
    const qrPayload = this.security.xacMinhToken(dto.token, 'QR')
    const purpose: MucDichTokenDiemDanh = qrPayload ? 'QR' : 'BIEU_MAU'
    const now = new Date()
    const verified = this.security.xacMinhToken(dto.token, purpose, now)
    if (!verified) throw new ForbiddenException({ maLoi: 'LIEN_KET_KHONG_HOP_LE', thongBao: 'Liên kết điểm danh không hợp lệ hoặc đã hết hạn.' })
    return this.prisma.$transaction(async tx => {
      const { window } = await this.validatePublicToken(dto.token, purpose, tx, now)
      const ids = window.buoiHoc.phamVi.map(x => x.maDonVi)
      const chiBos = await tx.donViToChuc.findMany({ where: { ma: { in: ids }, loaiDonVi: 'CHI_BO', trangThai: 'DANG_HOAT_DONG' }, select: { ma: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1, select: { ten: true } } } })
      const formEnabled = window.choPhepBieuMau
      return { tenBuoi: window.buoiHoc.ten, tenDot: window.buoiHoc.dotHoc.ten, hetHanLuc: window.dongTheoKeHoachLuc.toISOString(), choPhepGuiBieuMau: formEnabled, truong: formEnabled ? fixedForm : [], danhSachChiBo: formEnabled ? chiBos.flatMap(x => x.tenDonVi[0]?.ten ? [{ ma: x.ma, ten: x.tenDonVi[0].ten }] : []) : [] }
    })
  }

  async tuDiemDanh(actor: TaiKhoanDaXacThuc, buoiId: string, dto: TokenDiemDanhDto, ip?: string | null) {
    await this.phanQuyen.kiemTraQuyenCaNhan(actor.maTaiKhoan, PERMISSION.tuDiemDanh, actor.maPhien)
    const profiles = await this.prisma.hoSoDangVien.findMany({
      where: { maTaiKhoan: actor.maTaiKhoan },
      select: { ma: true, trangThai: true, hoVaTen: true, thongTinCaNhan: { select: { ngaySinh: true } } },
      take: 2,
    })
    if (profiles.length !== 1 || !profiles[0]) throw new ForbiddenException({ maLoi: profiles.length ? 'LIEN_KET_HO_SO_KHONG_HOP_LE' : 'TAI_KHOAN_CHUA_LIEN_KET_HO_SO', thongBao: profiles.length ? 'Liên kết hồ sơ của tài khoản không hợp lệ; vui lòng liên hệ quản trị viên.' : 'Tài khoản chưa được liên kết hồ sơ Đảng viên.' })
    const profile = profiles[0]
    if (profile.trangThai !== 'DANG_HOAT_DONG') throw new ForbiddenException({ maLoi: 'HO_SO_KHONG_HOAT_DONG', thongBao: 'Hồ sơ Đảng viên không ở trạng thái hoạt động.' })

    const tokenPayload = this.security.xacMinhToken(dto.token, 'QR')
    if (!tokenPayload || tokenPayload.maBuoi !== buoiId) throw new ForbiddenException({ maLoi: 'QR_KHONG_HOP_LE', thongBao: 'Mã QR không hợp lệ hoặc không thuộc buổi học này.' })

    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockBuoi(tx, buoiId)
        const { window } = await this.validatePublicToken(dto.token, 'QR', tx, new Date(), false)
        const roster = await tx.danhSachThamGiaBuoiHoc.findUnique({
          where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo: profile.ma } },
          select: { ma: true, trangThai: true, maChiBoSnapshot: true, tenChiBoSnapshot: true },
        })
        if (!roster || roster.trangThai !== 'TRONG_DANH_SACH') throw new ConflictException({ maLoi: 'KHONG_THUOC_ROSTER', thongBao: 'Hồ sơ không nằm trong danh sách tham gia hiện hành của buổi học.' })
        const pendingRequest = await tx.yeuCauDiemDanh.findFirst({ where: { maBuoi: buoiId, maHoSo: profile.ma, trangThai: { in: ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] } } })
        if (pendingRequest) {
          if (pendingRequest.trangThai === 'CHO_PHE_DUYET' && pendingRequest.maCuaSo === window.ma) return { maBuoi: buoiId, maHoSo: profile.ma, maYeuCau: pendingRequest.ma, trangThai: pendingRequest.trangThai, choPheDuyet: true, daGuiTruocDo: true }
          throw new ConflictException({ maLoi: 'YEU_CAU_DANG_CHO_XU_LY', thongBao: 'Hồ sơ đang có yêu cầu điểm danh chờ xử lý.' })
        }
        const current = await tx.ketQuaDiemDanh.findUnique({ where: { maBuoi_maHoSo: { maBuoi: buoiId, maHoSo: profile.ma } } })
        if (current?.trangThai === 'CO_MAT') return { maBuoi: buoiId, maHoSo: profile.ma, maKetQua: current.ma, ketQua: 'CO_MAT', version: current.version, choPheDuyet: false, khongThayDoi: true }
        if (current) throw new ConflictException({ maLoi: 'KET_QUA_DA_TON_TAI', thongBao: 'Đã có kết quả điểm danh khác; vui lòng liên hệ người phụ trách để được xử lý.' })

        const now = new Date()
        if (window.buoiHoc.yeuCauPheDuyet) {
          const request = await tx.yeuCauDiemDanh.create({ data: {
            maBuoi: buoiId, maCuaSo: window.ma, maHoSo: profile.ma, loaiYeuCau: 'TAO_MOI', ketQuaDuKien: 'CO_MAT',
            trangThai: 'CHO_PHE_DUYET', hoVaTenDoiChieu: profile.hoVaTen, maDonViDoiChieu: roster.maChiBoSnapshot,
            tenDonViDoiChieu: roster.tenChiBoSnapshot, namSinhDoiChieu: profile.thongTinCaNhan?.ngaySinh?.getUTCFullYear() ?? null,
          } })
          await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HOC_TAP_DIEM_DANH_TU_DIEM_DANH_GUI_DUYET', loaiDoiTuong: 'YEU_CAU_DIEM_DANH', maDoiTuong: request.ma, ketQua: 'THANH_CONG', duLieuSau: { maBuoi: buoiId, maHoSo: profile.ma, trangThai: 'CHO_PHE_DUYET' }, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
          return { maBuoi: buoiId, maHoSo: profile.ma, maYeuCau: request.ma, trangThai: request.trangThai, choPheDuyet: true, daGuiTruocDo: false }
        }

        const result = await tx.ketQuaDiemDanh.create({ data: { maBuoi: buoiId, maHoSo: profile.ma, trangThai: 'CO_MAT', version: 1, maNguoiCapNhat: actor.maTaiKhoan, thoiDiemCapNhat: now, thoiDiemCoMat: now } })
        await tx.lichSuDiemDanh.create({ data: { maBuoi: buoiId, maHoSo: profile.ma, ketQuaTruoc: null, ketQuaSau: 'CO_MAT', versionTruoc: null, versionSau: result.version, maNguoiThucHien: actor.maTaiKhoan, thoiDiem: now, maTuongQuan: randomUUID() } })
        await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HOC_TAP_DIEM_DANH_TU_DIEM_DANH', loaiDoiTuong: 'KET_QUA_DIEM_DANH', maDoiTuong: result.ma, ketQua: 'THANH_CONG', duLieuSau: { maBuoi: buoiId, maHoSo: profile.ma, ketQua: 'CO_MAT', version: result.version }, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
        return { maBuoi: buoiId, maHoSo: profile.ma, maKetQua: result.ma, ketQua: result.trangThai, version: result.version, choPheDuyet: false, khongThayDoi: false }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new ConflictException({ maLoi: 'XUNG_DOT_DIEM_DANH', thongBao: 'Yêu cầu điểm danh vừa được xử lý ở thao tác khác; hãy tải lại trạng thái buổi học.' })
      throw error
    }
  }

  private normalize(value: string) { return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN') }
  private genericReceipt() { return { maTiepNhan: randomUUID(), trangThai: 'DA_TIEP_NHAN', thongBao: 'Yêu cầu đã được tiếp nhận nếu thông tin đủ điều kiện xử lý.' } }

  async guiYeuCauCongKhai(dto: GuiYeuCauCongKhaiDto, idempotencyKey: string) {
    const now = new Date()
    const qrTokenPayload = this.security.xacMinhToken(dto.token, 'QR', now)
    const formTokenPayload = qrTokenPayload ? null : this.security.xacMinhToken(dto.token, 'BIEU_MAU', now)
    const tokenPayload = qrTokenPayload ?? formTokenPayload
    if (!tokenPayload) throw new ForbiddenException({ maLoi: 'LIEN_KET_KHONG_HOP_LE', thongBao: 'Liên kết điểm danh không hợp lệ hoặc đã hết hạn.' })
    const baseValue = `${dto.hoVaTen.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN')}|${dto.maChiBo}|${dto.namSinh}`
    const baseCandidates = this.security.fingerprintCandidates('CO_BAN', baseValue)
    const cccdCandidates = dto.cccd ? this.security.fingerprintCandidates('CCCD', dto.cccd) : []
    const idempotencyCandidates = this.security.fingerprintCandidates('IDEMPOTENCY', idempotencyKey)
    const ack = this.genericReceipt()
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockBuoi(tx, tokenPayload.maBuoi)
        const purpose: MucDichTokenDiemDanh = qrTokenPayload ? 'QR' : 'BIEU_MAU'
        const { payload, window } = await this.validatePublicToken(dto.token, purpose, tx, now)
        if (!window.choPhepBieuMau) throw new ForbiddenException({ maLoi: 'BIEU_MAU_CONG_KHAI_DANG_TAT', thongBao: 'Buổi học không tiếp nhận biểu mẫu công khai.' })
        const currentKey = baseCandidates[0]
        if (!currentKey) throw new ConflictException({ maLoi: 'KHOA_DIEM_DANH_KHONG_HOP_LE', thongBao: 'Không thể bảo vệ yêu cầu gửi.' })
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${payload.maBuoi}:${currentKey.hash}`}, 0))`
        await tx.yeuCauDiemDanh.updateMany({ where: { guiLuc: { lt: new Date(now.getTime() - this.security.retentionHours * 3_600_000) }, idempotencyHash: { not: null } }, data: { idempotencyHash: null } })
        const byKey = await tx.yeuCauDiemDanh.findFirst({ where: { maBuoi: payload.maBuoi, idempotencyHash: { in: idempotencyCandidates.map(item => item.hash) } }, select: { ma: true, dauVanTayCoBanBam: true, dauVanTayCccdBam: true, phienBanKhoaBam: true, hoVaTenDoiChieu: true, maDonViDoiChieu: true, namSinhDoiChieu: true } })
        if (byKey) {
          const sameBase = baseCandidates.some(item => item.version === byKey.phienBanKhoaBam && item.hash === byKey.dauVanTayCoBanBam)
          const sameCccd = dto.cccd ? cccdCandidates.some(item => item.version === byKey.phienBanKhoaBam && item.hash === byKey.dauVanTayCccdBam) : byKey.dauVanTayCccdBam === null
          if (!sameBase || !sameCccd || byKey.maDonViDoiChieu !== dto.maChiBo || byKey.namSinhDoiChieu !== dto.namSinh || this.normalize(byKey.hoVaTenDoiChieu) !== this.normalize(dto.hoVaTen)) throw new ConflictException({ maLoi: 'IDEMPOTENCY_KEY_DA_DUOC_SU_DUNG', thongBao: 'Khóa gửi lặp đã được dùng cho một nội dung khác.' })
          return ack
        }
        const baseMatches = await tx.yeuCauDiemDanh.findMany({ where: { maBuoi: payload.maBuoi, trangThai: { in: ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] }, OR: baseCandidates.map(item => ({ dauVanTayCoBanBam: item.hash, phienBanKhoaBam: item.version })) }, select: { dauVanTayCccdBam: true, phienBanKhoaBam: true } })
        const duplicateBase = baseMatches.some(old => !dto.cccd || !old.dauVanTayCccdBam || cccdCandidates.some(item => item.version === old.phienBanKhoaBam && item.hash === old.dauVanTayCccdBam))
        const duplicateCccd = dto.cccd ? await tx.yeuCauDiemDanh.findFirst({ where: { maBuoi: payload.maBuoi, trangThai: { in: ['CHO_XAC_MINH', 'CHO_PHE_DUYET'] }, OR: cccdCandidates.map(item => ({ dauVanTayCccdBam: item.hash, phienBanKhoaBam: item.version })) }, select: { ma: true } }) : null
        if (duplicateBase || duplicateCccd) return ack
        const validUnit = await tx.donViToChuc.findFirst({ where: { ma: dto.maChiBo, loaiDonVi: 'CHI_BO', trangThai: 'DANG_HOAT_DONG', phamViBuoiHocNghiQuyet: { some: { maBuoi: payload.maBuoi } } }, include: { tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, orderBy: { ngayHieuLucTu: 'desc' }, take: 1 } } })
        if (!validUnit?.tenDonVi[0]) throw new BadRequestException({ maLoi: 'CHI_BO_KHONG_HOP_LE', thongBao: 'Chi bộ không có trong danh sách được phép của buổi học.' })
        let matchedProfileId: string | null = null
        const matches = await tx.hoSoDangVien.findMany({ where: { hoVaTen: { equals: dto.hoVaTen, mode: 'insensitive' }, trangThai: 'DANG_HOAT_DONG', trangThaiDangVien: { in: ['DU_BI', 'CHINH_THUC'] }, lichSuDonVi: { some: { maChiBo: dto.maChiBo, ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] } } }, take: 50, select: { ma: true, thongTinCaNhan: { select: { ngaySinh: true, soCccd: true } }, danhSachThamGiaNghiQuyet: { where: { maBuoi: payload.maBuoi, trangThai: 'TRONG_DANH_SACH' }, select: { ma: true } } } })
        const candidates = matches.filter(row => row.thongTinCaNhan?.ngaySinh?.getUTCFullYear() === dto.namSinh && (!dto.cccd || row.thongTinCaNhan.soCccd === dto.cccd))
        const candidate = candidates[0]
        if (candidate && candidates.length === 1 && candidate.danhSachThamGiaNghiQuyet.length === 1) matchedProfileId = candidate.ma
        const cccd = cccdCandidates.find(item => item.version === currentKey.version)
        const idHash = idempotencyCandidates.find(item => item.version === currentKey.version)?.hash
        if (!idHash) throw new ConflictException({ maLoi: 'KHOA_DIEM_DANH_KHONG_HOP_LE', thongBao: 'Không thể bảo vệ yêu cầu gửi.' })
        await tx.yeuCauDiemDanh.create({ data: { maBuoi: payload.maBuoi, maCuaSo: window.ma, maHoSo: matchedProfileId, loaiYeuCau: 'TAO_MOI', ketQuaDuKien: 'CO_MAT', trangThai: 'CHO_XAC_MINH', hoVaTenDoiChieu: dto.hoVaTen.trim().replace(/\s+/g, ' '), maDonViDoiChieu: dto.maChiBo, tenDonViDoiChieu: validUnit.tenDonVi[0].ten, namSinhDoiChieu: dto.namSinh, cccd: dto.cccd ?? null, idempotencyHash: idHash, dauVanTayCoBanBam: currentKey.hash, dauVanTayCccdBam: cccd?.hash ?? null, phienBanKhoaBam: currentKey.version } })
        return ack
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 15000 })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const payload = this.security.xacMinhToken(dto.token, 'QR', now) ?? this.security.xacMinhToken(dto.token, 'BIEU_MAU', now)
        if (!payload) return ack
        const existing = await this.prisma.yeuCauDiemDanh.findFirst({ where: { maBuoi: payload.maBuoi, idempotencyHash: { in: idempotencyCandidates.map(item => item.hash) } }, select: { dauVanTayCoBanBam: true, dauVanTayCccdBam: true, phienBanKhoaBam: true, hoVaTenDoiChieu: true, maDonViDoiChieu: true, namSinhDoiChieu: true } })
        if (existing) {
          const sameBase = baseCandidates.some(item => item.version === existing.phienBanKhoaBam && item.hash === existing.dauVanTayCoBanBam)
          const sameCccd = dto.cccd ? cccdCandidates.some(item => item.version === existing.phienBanKhoaBam && item.hash === existing.dauVanTayCccdBam) : existing.dauVanTayCccdBam === null
          if (!sameBase || !sameCccd || existing.maDonViDoiChieu !== dto.maChiBo || existing.namSinhDoiChieu !== dto.namSinh || this.normalize(existing.hoVaTenDoiChieu) !== this.normalize(dto.hoVaTen)) throw new ConflictException({ maLoi: 'IDEMPOTENCY_KEY_DA_DUOC_SU_DUNG', thongBao: 'Khóa gửi lặp đã được dùng cho một nội dung khác.' })
        }
        return ack
      }
      throw error
    }
  }
}
