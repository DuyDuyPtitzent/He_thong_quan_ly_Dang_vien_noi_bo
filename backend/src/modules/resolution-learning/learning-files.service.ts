import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import { PrivateFileStorageService } from '../../common/private-storage/private-file-storage.service'

const Q = { upload: 'HOC_TAP_TEP_TAI_LEN', download: 'HOC_TAP_TEP_TAI_XUONG', delete: 'HOC_TAP_TEP_XOA' } as const
const MAX_BYTES = 10 * 1024 * 1024
const MIME_BY_SIGNATURE = [
  { mime: 'application/pdf', extension: 'pdf', matches: (b: Buffer) => b.length >= 5 && b.subarray(0, 5).toString('ascii') === '%PDF-' },
  { mime: 'image/jpeg', extension: 'jpg', matches: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', extension: 'png', matches: (b: Buffer) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
] as const
const SELECT_METADATA = { ma: true, tenTepGoc: true, kieuNoiDung: true, kichThuoc: true, ngayTao: true, trangThai: true } as const

@Injectable()
export class TepDinhKemHocTapService {
  private readonly logger = new Logger(TepDinhKemHocTapService.name)
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly permissions: PhanQuyenService,
    @Inject(PrivateFileStorageService) private readonly storage: PrivateFileStorageService,
  ) {}

  private async access(actor: TaiKhoanDaXacThuc, permission: string) {
    return this.permissions.layDonViTrongPhamVi(actor.maTaiKhoan, permission, actor.maPhien)
  }

  private async requireScope(actor: TaiKhoanDaXacThuc, permission: string, units: string[]) {
    if (!units.length) throw new ConflictException({ maLoi: 'OWNER_CHUA_CO_PHAM_VI', thongBao: 'Đợt hoặc buổi học chưa có phạm vi tổ chức để quản lý tệp.' })
    const access = await this.access(actor, permission)
    if (!access.coQuyen) throw new ForbiddenException({ maLoi: 'KHONG_DU_QUYEN', thongBao: 'Tài khoản không được phân công quyền quản lý tệp trong phiên hiện tại.' })
    if (!access.toanHeThong && units.some(unit => !access.maDonVi.includes(unit))) throw new ForbiddenException({ maLoi: 'KHONG_DU_PHAM_VI', thongBao: 'Phạm vi được cấp chưa bao phủ toàn bộ đợt hoặc buổi học.' })
  }

  private async ownerDot(id: string) {
    const row = await this.prisma.dotHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, trangThai: true, phamVi: { select: { maDonVi: true } } } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT', thongBao: 'Không tìm thấy đợt học.' })
    if (['DA_KET_THUC', 'DA_HUY'].includes(row.trangThai)) throw new ConflictException({ maLoi: row.trangThai === 'DA_HUY' ? 'DOT_DA_HUY_KHONG_CHO_PHEP_TAI_TEP' : 'DOT_DA_KET_THUC_KHONG_CHO_PHEP_TAI_TEP', thongBao: 'Đợt đã kết thúc hoặc bị hủy, không thể tải tệp mới lên.' })
    return row
  }

  private async ownerBuoi(id: string) {
    const row = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { ma: true, trangThai: true, phamVi: { select: { maDonVi: true } }, dotHoc: { select: { ma: true, trangThai: true, phamVi: { select: { maDonVi: true } } } } } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    if (['DA_KET_THUC', 'DA_HUY'].includes(row.trangThai)) throw new ConflictException({ maLoi: row.trangThai === 'DA_HUY' ? 'BUOI_DA_HUY_KHONG_CHO_PHEP_TAI_TEP' : 'BUOI_DA_KET_THUC_KHONG_CHO_PHEP_TAI_TEP', thongBao: 'Buổi đã kết thúc hoặc bị hủy, không thể tải tệp mới lên.' })
    if (['DA_KET_THUC', 'DA_HUY'].includes(row.dotHoc.trangThai)) throw new ConflictException({ maLoi: 'DOT_KHONG_CHO_PHEP_TAI_TEP', thongBao: 'Đợt học đã kết thúc hoặc bị hủy, không thể tải tệp mới lên.' })
    return row
  }

  private bytes(file?: { buffer: Buffer; originalname: string; mimetype: string; size: number }) {
    if (!file) throw new BadRequestException({ maLoi: 'THIEU_TEP_TAI_LEN', thongBao: 'Vui lòng chọn một tệp PDF, JPG hoặc PNG để tải lên.' })
    if (!file.size || !file.buffer?.length) throw new BadRequestException({ maLoi: 'TEP_RONG', thongBao: 'Tệp tải lên đang rỗng.' })
    if (file.size > MAX_BYTES || file.buffer.length > MAX_BYTES) throw new BadRequestException({ maLoi: 'TEP_VUOT_QUA_DUNG_LUONG', thongBao: 'Dung lượng mỗi tệp tối đa là 10 MB.' })
    const detected = MIME_BY_SIGNATURE.find(type => type.matches(file.buffer))
    if (!detected || file.mimetype !== detected.mime) throw new BadRequestException({ maLoi: 'DINH_DANG_TEP_KHONG_HOP_LE', thongBao: 'Nội dung tệp không khớp PDF, JPG hoặc PNG được hỗ trợ.' })
    const safeName = (file.originalname ?? 'tep-tai-len').replace(/\\/g, '/').split('/').pop()?.replace(/[\r\n\0\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) || 'tep-tai-len'
    return { detected, safeName }
  }

  private async save(actor: TaiKhoanDaXacThuc, owner: { maDot?: string; maBuoi?: string }, units: string[], file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined, ip: string | null) {
    await this.requireScope(actor, Q.upload, units)
    const { detected, safeName } = this.bytes(file)
    const key = this.storage.taoKhoa(detected.extension)
    const hash = createHash('sha256').update(file!.buffer).digest('hex')
    await this.storage.ghi(key, file!.buffer)
    try {
      return await this.prisma.$transaction(async tx => {
        const currentUnits = await this.lockAndCheckOwner(tx, owner)
        await this.requireScope(actor, Q.upload, currentUnits)
        const row = await tx.tepDinhKemHocTap.create({ data: { maDot: owner.maDot, maBuoi: owner.maBuoi, tenTepGoc: safeName, khoaLuuTru: key, kieuNoiDung: detected.mime, kichThuoc: file!.buffer.length, maSha256: hash, maNguoiTaiLen: actor.maTaiKhoan }, select: SELECT_METADATA })
        await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HOC_TAP_TEP_TAI_LEN', loaiDoiTuong: 'TEP_DINH_KEM_HOC_TAP', maDoiTuong: row.ma, ketQua: 'THANH_CONG', duLieuSau: { maDot: owner.maDot ?? null, maBuoi: owner.maBuoi ?? null, kichThuoc: row.kichThuoc, kieuNoiDung: row.kieuNoiDung } as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
        return row
      })
    } catch (error) {
      await this.storage.donDep(key).catch(cleanupError => this.logger.error(`Private upload cleanup failed; correlation ${randomUUID()}: ${cleanupError instanceof Error ? cleanupError.name : 'unknown'}`))
      throw error
    }
  }

  private async lockAndCheckOwner(tx: Prisma.TransactionClient, owner: { maDot?: string; maBuoi?: string }) {
    if (owner.maDot) {
      await tx.$queryRaw`SELECT ma_dot FROM dot_hoc_nghi_quyet WHERE ma_dot = ${owner.maDot}::uuid FOR UPDATE`
      const dot = await tx.dotHocNghiQuyet.findUnique({ where: { ma: owner.maDot }, select: { trangThai: true, phamVi: { select: { maDonVi: true } } } })
      if (!dot) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_DOT', thongBao: 'Không tìm thấy đợt học.' })
      if (['DA_KET_THUC', 'DA_HUY'].includes(dot.trangThai)) throw new ConflictException({ maLoi: 'OWNER_KHONG_CHO_PHEP_TAI_TEP', thongBao: 'Đợt đã kết thúc hoặc bị hủy, không thể tải tệp mới lên.' })
      return dot.phamVi.map(row => row.maDonVi)
    }
    const id = owner.maBuoi!
    await tx.$queryRaw`SELECT ma_dot FROM dot_hoc_nghi_quyet WHERE ma_dot = (SELECT ma_dot FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${id}::uuid) FOR UPDATE`
    await tx.$queryRaw`SELECT ma_buoi FROM buoi_hoc_nghi_quyet WHERE ma_buoi = ${id}::uuid FOR UPDATE`
    const buoi = await tx.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { trangThai: true, phamVi: { select: { maDonVi: true } }, dotHoc: { select: { trangThai: true, phamVi: { select: { maDonVi: true } } } } } })
    if (!buoi) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_BUOI', thongBao: 'Không tìm thấy buổi học.' })
    if (['DA_KET_THUC', 'DA_HUY'].includes(buoi.trangThai) || ['DA_KET_THUC', 'DA_HUY'].includes(buoi.dotHoc.trangThai)) throw new ConflictException({ maLoi: 'OWNER_KHONG_CHO_PHEP_TAI_TEP', thongBao: 'Đợt hoặc buổi đã kết thúc hoặc bị hủy, không thể tải tệp mới lên.' })
    return [...new Set([...buoi.dotHoc.phamVi.map(row => row.maDonVi), ...buoi.phamVi.map(row => row.maDonVi)])]
  }

  async taiLenDot(actor: TaiKhoanDaXacThuc, id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined, ip: string | null) {
    const dot = await this.ownerDot(id)
    return this.save(actor, { maDot: dot.ma }, dot.phamVi.map(x => x.maDonVi), file, ip)
  }

  async taiLenBuoi(actor: TaiKhoanDaXacThuc, id: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined, ip: string | null) {
    const buoi = await this.ownerBuoi(id)
    const units = [...new Set([...buoi.dotHoc.phamVi.map(x => x.maDonVi), ...buoi.phamVi.map(x => x.maDonVi)])]
    return this.save(actor, { maBuoi: buoi.ma }, units, file, ip)
  }

  private async fileWithAccess(actor: TaiKhoanDaXacThuc, id: string, permission: string, allowDeleted = false) {
    const row = await this.prisma.tepDinhKemHocTap.findUnique({ where: { ma: id }, select: { ma: true, maDot: true, maBuoi: true, khoaLuuTru: true, tenTepGoc: true, kieuNoiDung: true, kichThuoc: true, maSha256: true, trangThai: true, ngayXoa: true } })
    if (!row || (row.trangThai !== 'DANG_SU_DUNG' && !(allowDeleted && row.trangThai === 'DA_XOA'))) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEP', thongBao: 'Không tìm thấy tệp khả dụng.' })
    const units = row.maDot ? (await this.ownerForAccessDot(row.maDot)) : (await this.ownerForAccessBuoi(row.maBuoi!))
    try { await this.requireScope(actor, permission, units) }
    catch (error) { if (error instanceof ForbiddenException) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEP', thongBao: 'Không tìm thấy tệp khả dụng.' }); throw error }
    return row
  }

  private async ownerForAccessDot(id: string) {
    const row = await this.prisma.dotHocNghiQuyet.findUnique({ where: { ma: id }, select: { phamVi: { select: { maDonVi: true } } } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEP', thongBao: 'Không tìm thấy tệp khả dụng.' })
    return row.phamVi.map(x => x.maDonVi)
  }

  private async ownerForAccessBuoi(id: string) {
    const row = await this.prisma.buoiHocNghiQuyet.findUnique({ where: { ma: id }, select: { phamVi: { select: { maDonVi: true } }, dotHoc: { select: { phamVi: { select: { maDonVi: true } } } } } })
    if (!row) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEP', thongBao: 'Không tìm thấy tệp khả dụng.' })
    return [...new Set([...row.dotHoc.phamVi.map(x => x.maDonVi), ...row.phamVi.map(x => x.maDonVi)])]
  }

  async taiXuong(actor: TaiKhoanDaXacThuc, id: string) {
    const row = await this.fileWithAccess(actor, id, Q.download)
    if (!MIME_BY_SIGNATURE.some(type => type.mime === row.kieuNoiDung)) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEP', thongBao: 'Không tìm thấy tệp khả dụng.' })
    try { return { stream: await this.storage.taoLuonDocDaXacMinh(row.khoaLuuTru, row.maSha256), tenTepGoc: row.tenTepGoc, kieuNoiDung: row.kieuNoiDung } }
    catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_FILE_HASH_MISMATCH') throw new ConflictException({ maLoi: 'TEP_KHONG_TOAN_VEN', thongBao: 'Tệp không vượt qua kiểm tra toàn vẹn và không thể tải xuống.' })
      this.logger.error(`Private file read failed for ${row.ma}; error ${error instanceof Error ? error.name : 'unknown'}`)
      throw new ServiceUnavailableException({ maLoi: 'KHONG_DOC_DUOC_TEP', thongBao: 'Tệp không còn khả dụng trong kho lưu trữ riêng.' })
    }
  }

  async xoa(actor: TaiKhoanDaXacThuc, id: string, ip: string | null) {
    const accessible = await this.fileWithAccess(actor, id, Q.delete, true)
    if (accessible.trangThai === 'DA_XOA') return { ma: accessible.ma, trangThai: accessible.trangThai, ngayXoa: accessible.ngayXoa }
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT ma_tep FROM tep_dinh_kem_hoc_tap WHERE ma_tep = ${id}::uuid FOR UPDATE`
      const current = await tx.tepDinhKemHocTap.findUnique({ where: { ma: id }, select: { ma: true, maDot: true, maBuoi: true, trangThai: true, ngayXoa: true } })
      if (!current) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TEP', thongBao: 'Không tìm thấy tệp khả dụng.' })
      if (current.trangThai === 'DA_XOA') return { ma: current.ma, trangThai: current.trangThai, ngayXoa: current.ngayXoa }
      const deletedAt = new Date()
      const updated = await tx.tepDinhKemHocTap.update({ where: { ma: id }, data: { trangThai: 'DA_XOA', ngayXoa: deletedAt, maNguoiXoa: actor.maTaiKhoan }, select: { ma: true, trangThai: true, ngayXoa: true } })
      await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HOC_TAP_TEP_XOA', loaiDoiTuong: 'TEP_DINH_KEM_HOC_TAP', maDoiTuong: id, ketQua: 'THANH_CONG', duLieuTruoc: { trangThai: 'DANG_SU_DUNG', maDot: current.maDot, maBuoi: current.maBuoi }, duLieuSau: { trangThai: 'DA_XOA', ngayXoa: deletedAt } as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip ?? undefined } })
      return updated
    })
  }
}
