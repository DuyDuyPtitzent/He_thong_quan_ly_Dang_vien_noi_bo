import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve, sep } from 'node:path'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { TaiKhoanDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from '../authorization/authorization.service'
import type { TaoTaiLieuHoSoDto } from './member-profiles.dto'

const MAX_BYTES = 10 * 1024 * 1024
const MIME_EXT: Record<string, string> = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' }
const allowedTypes = new Set(['ANH_CCCD_VNEID', 'QUYET_DINH_KET_NAP', 'GIAY_CHUNG_NHAN_DANG_VIEN_MOI'])
const reservedTypeLabels = new Set([...allowedTypes, 'Ảnh CCCD từ VNeID', 'Quyết định kết nạp', 'Giấy chứng nhận lớp Đảng viên mới'].map((item) => item.toLocaleLowerCase('vi')))

@Injectable()
export class MemberProfileDocumentsService {
  private readonly storageRoot: string

  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    const configured = config.get<string>('KHO_TEP_RIENG') ?? './storage/private'
    this.storageRoot = isAbsolute(configured) ? configured : resolve(process.cwd(), configured)
  }

  async danhSach(actor: TaiKhoanDaXacThuc, maHoSo: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_TAI_LIEU_XEM', { maHoSo }, actor.maPhien)
    return this.prisma.taiLieuHoSoDangVien.findMany({ where: { maHoSo, trangThai: 'DANG_SU_DUNG' }, orderBy: { ngayTao: 'desc' }, select: { ma: true, loaiTaiLieu: true, tenTepGoc: true, kieuNoiDung: true, kichThuoc: true, ngayTao: true, maQuaTrinhDangVien: true, maDaoTaoDang: true } })
  }

  async taiLen(actor: TaiKhoanDaXacThuc, maHoSo: string, dto: TaoTaiLieuHoSoDto, file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined, ip: string | null) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_TAI_LIEU_TAI_LEN', { maHoSo }, actor.maPhien)
    if (!file || file.size < 1 || file.size > MAX_BYTES) throw new BadRequestException({ maLoi: 'TEP_HO_SO_KHONG_HOP_LE', thongBao: 'Chọn tệp PDF, JPG hoặc PNG có dung lượng không quá 10 MB.' })
    if (!allowedTypes.has(dto.loaiTaiLieu) && reservedTypeLabels.has(dto.loaiTaiLieu.toLocaleLowerCase('vi'))) throw new BadRequestException({ maLoi: 'LOAI_TAI_LIEU_KHONG_HOP_LE', thongBao: 'Loại tài liệu này đã có sẵn trong danh sách. Hãy chọn loại tương ứng.' })
    if (!this.signatureMatches(file.buffer, file.mimetype)) throw new BadRequestException({ maLoi: 'DINH_DANG_TEP_KHONG_HOP_LE', thongBao: 'Định dạng thực tế của tệp không đúng PDF, JPG hoặc PNG.' })
    if (dto.loaiTaiLieu === 'QUYET_DINH_KET_NAP') {
      if (!dto.maQuaTrinhDangVien || dto.maDaoTaoDang) throw new BadRequestException({ maLoi: 'LIEN_KET_TAI_LIEU_KHONG_HOP_LE', thongBao: 'Quyết định kết nạp phải gắn với sự kiện kết nạp trong quá trình Đảng.' })
      const process = await this.prisma.quaTrinhDangVien.findFirst({ where: { ma: dto.maQuaTrinhDangVien, maHoSo, loaiSuKien: 'VAO_DANG_DU_BI' }, select: { ma: true } })
      if (!process) throw new BadRequestException({ maLoi: 'SU_KIEN_KET_NAP_KHONG_HOP_LE', thongBao: 'Không tìm thấy sự kiện kết nạp của hồ sơ để liên kết tài liệu.' })
    } else if (dto.loaiTaiLieu === 'GIAY_CHUNG_NHAN_DANG_VIEN_MOI') {
      if (!dto.maDaoTaoDang || dto.maQuaTrinhDangVien) throw new BadRequestException({ maLoi: 'LIEN_KET_TAI_LIEU_KHONG_HOP_LE', thongBao: 'Giấy chứng nhận phải gắn với bản ghi đào tạo Đảng tương ứng.' })
      const training = await this.prisma.thongTinDaoTaoDang.findFirst({ where: { ma: dto.maDaoTaoDang, maHoSo, loaiLop: 'LOP_DANG_VIEN_MOI' }, select: { ma: true } })
      if (!training) throw new BadRequestException({ maLoi: 'BAN_GHI_DAO_TAO_KHONG_HOP_LE', thongBao: 'Không tìm thấy khóa học tương ứng của hồ sơ.' })
    } else if (dto.maQuaTrinhDangVien || dto.maDaoTaoDang) throw new BadRequestException({ maLoi: 'LIEN_KET_TAI_LIEU_KHONG_HOP_LE', thongBao: 'Loại tài liệu này không liên kết với sự kiện hoặc khóa học.' })

    const extension = MIME_EXT[file.mimetype]
    const key = `${randomUUID()}${extension}`
    const target = this.safePath(key)
    await mkdir(this.storageRoot, { recursive: true })
    await writeFile(target, file.buffer, { flag: 'wx', mode: 0o600 })
    try {
      const name = basename(file.originalname).replace(/[\r\n\0]/g, '').slice(0, 255) || 'tai-lieu'
      const created = await this.prisma.$transaction(async (tx) => {
        const document = await tx.taiLieuHoSoDangVien.create({ data: { maHoSo, loaiTaiLieu: dto.loaiTaiLieu, tenTepGoc: name, khoaLuuTru: key, kieuNoiDung: file.mimetype, kichThuoc: file.size, maNguoiTaiLen: actor.maTaiKhoan, maQuaTrinhDangVien: dto.maQuaTrinhDangVien, maDaoTaoDang: dto.maDaoTaoDang }, select: { ma: true, loaiTaiLieu: true, tenTepGoc: true, kieuNoiDung: true, kichThuoc: true, ngayTao: true } })
        await tx.nhatKyKiemToan.create({ data: { maNguoiThucHien: actor.maTaiKhoan, hanhDong: 'HO_SO_TAI_LIEU_TAI_LEN', loaiDoiTuong: 'TAI_LIEU_HO_SO_DANG_VIEN', maDoiTuong: document.ma, ketQua: 'THANH_CONG', duLieuSau: { loaiTaiLieu: dto.loaiTaiLieu, kichThuoc: file.size } as Prisma.InputJsonValue, maTuongQuan: randomUUID(), diaChiIp: ip } })
        return document
      })
      return created
    } catch (error) {
      await unlink(target).catch(() => undefined)
      throw error
    }
  }

  async taiXuong(actor: TaiKhoanDaXacThuc, maHoSo: string, maTaiLieu: string) {
    await this.phanQuyen.kiemTra(actor.maTaiKhoan, 'HO_SO_TAI_LIEU_TAI_XUONG', { maHoSo }, actor.maPhien)
    const document = await this.prisma.taiLieuHoSoDangVien.findFirst({ where: { ma: maTaiLieu, maHoSo, trangThai: 'DANG_SU_DUNG' }, select: { khoaLuuTru: true, tenTepGoc: true, kieuNoiDung: true } })
    if (!document) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_LIEU', thongBao: 'Không tìm thấy tài liệu trong hồ sơ này.' })
    try { return { buffer: await readFile(this.safePath(document.khoaLuuTru)), tenTepGoc: document.tenTepGoc, kieuNoiDung: document.kieuNoiDung } }
    catch { throw new NotFoundException({ maLoi: 'KHONG_DOC_DUOC_TAI_LIEU', thongBao: 'Tệp không còn trong kho lưu trữ riêng tư.' }) }
  }

  private signatureMatches(buffer: Buffer, mime: string) {
    if (mime === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-'
    if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    return false
  }

  private safePath(key: string) {
    if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/i.test(key)) throw new ForbiddenException()
    const path = resolve(this.storageRoot, key)
    if (!path.startsWith(`${resolve(this.storageRoot)}${sep}`)) throw new ForbiddenException()
    return join(this.storageRoot, key)
  }
}
