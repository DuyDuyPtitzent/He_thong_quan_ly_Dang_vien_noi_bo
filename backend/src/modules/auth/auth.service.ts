import {
  ForbiddenException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { CapNhatThongTinTaiKhoanCuaToiDto, DangNhapDto, DoiMatKhauDto } from './auth.dto'
import { BamMatKhauService } from './password-hasher'

const tenCookiePhien = 'phien_dang_nhap'
const trangThaiTaiKhoanHoatDong = 'DANG_HOAT_DONG'
const bamGia = `scrypt$16384$8$1$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`

export type ThongTinYeuCau = {
  maTuongQuan: string
  diaChiIp: string | null
  thietBi: string | null
}

@Injectable()
export class XacThucService {
  constructor(
    @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma,
    @Inject(BamMatKhauService) private readonly bamMatKhau: BamMatKhauService,
    @Inject(ConfigService) private readonly cauHinh: ConfigService,
  ) {}

  async dangNhap(dto: DangNhapDto, thongTin: ThongTinYeuCau) {
    const taiKhoan = await this.prisma.taiKhoanNguoiDung.findUnique({
      where: { tenDangNhap: dto.tenDangNhap },
    })
    const bamCanKiemTra = taiKhoan?.matKhauBam ?? bamGia
    const matKhauDung = await this.bamMatKhau.kiemTra(dto.matKhau, bamCanKiemTra)
    const thoiDiemHienTai = new Date()
    const dangBiKhoa = Boolean(taiKhoan?.khoaDen && taiKhoan.khoaDen > thoiDiemHienTai)
    const taiKhoanDuDieuKien = taiKhoan?.trangThai === trangThaiTaiKhoanHoatDong

    if (!taiKhoan || !matKhauDung || dangBiKhoa || !taiKhoanDuDieuKien) {
      await this.ghiNhanDangNhapThatBai(
        taiKhoan,
        taiKhoanDuDieuKien && !matKhauDung && !dangBiKhoa,
        thongTin,
      )
      throw new UnauthorizedException({
        maLoi: 'DANG_NHAP_KHONG_HOP_LE',
        thongBao: 'Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản chưa thể đăng nhập.',
      })
    }

    const tokenPhien = randomBytes(32).toString('base64url')
    const maLamMoiBam = this.bamToken(tokenPhien)
    const thoiHanGio = this.cauHinh.get<number>('THOI_HAN_PHIEN_DANG_NHAP_GIO', 8)
    const hetHanLuc = new Date(thoiDiemHienTai.getTime() + thoiHanGio * 60 * 60 * 1000)

    await this.prisma.$transaction(async (giaoDich) => {
      await giaoDich.taiKhoanNguoiDung.update({
        where: { ma: taiKhoan.ma },
        data: {
          soLanDangNhapThatBai: 0,
          khoaDen: null,
          dangNhapCuoiLuc: thoiDiemHienTai,
        },
      })
      await giaoDich.phienDangNhap.create({
        data: {
          maTaiKhoan: taiKhoan.ma,
          maLamMoiBam,
          hetHanLuc,
          diaChiIp: thongTin.diaChiIp,
          thietBi: thongTin.thietBi,
        },
      })
      await this.ghiAudit(giaoDich, {
        maNguoiThucHien: taiKhoan.ma,
        maDoiTuong: taiKhoan.ma,
        hanhDong: 'DANG_NHAP',
        ketQua: 'THANH_CONG',
        maTuongQuan: thongTin.maTuongQuan,
        diaChiIp: thongTin.diaChiIp,
      })
    })

    return {
      tokenPhien,
      hetHanLuc,
      taiKhoan: {
        maTaiKhoan: taiKhoan.ma,
        tenDangNhap: taiKhoan.tenDangNhap,
        doiMatKhauLanDau: taiKhoan.doiMatKhauLanDau,
      },
    }
  }

  async layPhien(tokenPhien: string | undefined) {
    if (!tokenPhien) return null
    const phien = await this.prisma.phienDangNhap.findFirst({
      where: {
        maLamMoiBam: this.bamToken(tokenPhien),
        thuHoiLuc: null,
        hetHanLuc: { gt: new Date() },
      },
    })
    if (!phien) return null

    const taiKhoan = await this.prisma.taiKhoanNguoiDung.findUnique({
      where: { ma: phien.maTaiKhoan },
    })
    if (!taiKhoan || taiKhoan.trangThai !== trangThaiTaiKhoanHoatDong) return null

    const now = new Date()
    const assignments = await this.prisma.phanCongVaiTro.findMany({
      where: {
        maTaiKhoan: taiKhoan.ma,
        ngayHieuLucTu: { lte: now },
        OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
        thuHoiLuc: null,
        vaiTro: { trangThai: 'DANG_HOAT_DONG' },
      },
      orderBy: [{ ngayTao: 'asc' }, { ma: 'asc' }],
      select: {
        ma: true, loaiPhamVi: true, maDonViGoc: true,
        vaiTro: { select: { maDinhDanh: true, ten: true, quyen: { select: { quyen: { select: { maDinhDanh: true } } } } } },
        donViGoc: { select: { maDinhDanh: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } } } },
        phamViDonViChiDinh: { select: { donVi: { select: { maDinhDanh: true, tenDonVi: { where: { ngayHieuLucTu: { lte: now }, OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }] }, take: 1, select: { ten: true } } } } } },
      },
    })
    let activeAssignmentId = phien.maPhanCongVaiTroDangHoatDong
    if (activeAssignmentId && !assignments.some(({ ma }) => ma === activeAssignmentId)) {
      await this.prisma.phienDangNhap.update({ where: { ma: phien.ma }, data: { maPhanCongVaiTroDangHoatDong: null } })
      activeAssignmentId = null
    }
    if (!activeAssignmentId && assignments.length === 1 && assignments[0]) {
      activeAssignmentId = assignments[0].ma
      await this.prisma.phienDangNhap.update({ where: { ma: phien.ma }, data: { maPhanCongVaiTroDangHoatDong: activeAssignmentId } })
    }

    return {
      maPhien: phien.ma,
      hetHanLuc: phien.hetHanLuc,
      maPhanCongVaiTroDangHoatDong: activeAssignmentId,
      phanCongHopLe: assignments.map(({ ma, loaiPhamVi, vaiTro, maDonViGoc, donViGoc, phamViDonViChiDinh }) => ({
        maPhanCong: ma,
        maVaiTro: vaiTro.maDinhDanh,
        tenVaiTro: vaiTro.ten,
        loaiPhamVi,
        maDonViGoc,
        tenDonViGoc: donViGoc?.tenDonVi[0]?.ten ?? donViGoc?.maDinhDanh ?? null,
        donViChiDinh: phamViDonViChiDinh.map(({ donVi }) => donVi.tenDonVi[0]?.ten ?? donVi.maDinhDanh),
      })),
      quyenDangHoatDong: assignments.find(({ ma }) => ma === activeAssignmentId)?.vaiTro.quyen.map(({ quyen }) => quyen.maDinhDanh) ?? [],
      taiKhoan: {
        maTaiKhoan: taiKhoan.ma,
        tenDangNhap: taiKhoan.tenDangNhap,
        doiMatKhauLanDau: taiKhoan.doiMatKhauLanDau,
      },
    }
  }

  async chonPhanCongDangHoatDong(maTaiKhoan: string, maPhien: string, maPhanCong: string) {
    const now = new Date()
    const assignment = await this.prisma.phanCongVaiTro.findFirst({
      where: {
        ma: maPhanCong, maTaiKhoan,
        ngayHieuLucTu: { lte: now },
        OR: [{ ngayHieuLucDen: null }, { ngayHieuLucDen: { gt: now } }],
        thuHoiLuc: null,
        vaiTro: { trangThai: 'DANG_HOAT_DONG' },
      },
      select: { ma: true },
    })
    if (!assignment) throw new ForbiddenException({ maLoi: 'PHAN_CONG_KHONG_HOP_LE', thongBao: 'Phân công không còn hiệu lực hoặc không thuộc tài khoản này.' })
    const updated = await this.prisma.phienDangNhap.updateMany({
      where: { ma: maPhien, maTaiKhoan, thuHoiLuc: null, hetHanLuc: { gt: now } },
      data: { maPhanCongVaiTroDangHoatDong: assignment.ma },
    })
    if (!updated.count) throw new UnauthorizedException({ maLoi: 'PHIEN_KHONG_HOP_LE', thongBao: 'Phiên đăng nhập không còn hiệu lực.' })
    return { maPhanCongVaiTroDangHoatDong: assignment.ma }
  }

  async dangXuat(tokenPhien: string | undefined, thongTin: ThongTinYeuCau) {
    if (!tokenPhien) return
    const maLamMoiBam = this.bamToken(tokenPhien)
    const phien = await this.prisma.phienDangNhap.findFirst({
      where: { maLamMoiBam, thuHoiLuc: null },
    })
    if (!phien) return

    await this.prisma.$transaction(async (giaoDich) => {
      await giaoDich.phienDangNhap.updateMany({
        where: { ma: phien.ma, thuHoiLuc: null },
        data: { thuHoiLuc: new Date() },
      })
      await this.ghiAudit(giaoDich, {
        maNguoiThucHien: phien.maTaiKhoan,
        maDoiTuong: phien.maTaiKhoan,
        hanhDong: 'DANG_XUAT',
        ketQua: 'THANH_CONG',
        maTuongQuan: thongTin.maTuongQuan,
        diaChiIp: thongTin.diaChiIp,
      })
    })
  }

  async doiMatKhau(
    taiKhoanDaXacThuc: { maTaiKhoan: string; maPhien: string },
    dto: DoiMatKhauDto,
    thongTin: ThongTinYeuCau,
  ) {
    if (dto.matKhauHienTai === dto.matKhauMoi) {
      throw new ForbiddenException({
        maLoi: 'MAT_KHAU_MOI_TRUNG_MAT_KHAU_CU',
        thongBao: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      })
    }

    const taiKhoan = await this.prisma.taiKhoanNguoiDung.findUnique({
      where: { ma: taiKhoanDaXacThuc.maTaiKhoan },
    })
    if (!taiKhoan || !(await this.bamMatKhau.kiemTra(dto.matKhauHienTai, taiKhoan.matKhauBam))) {
      throw new UnauthorizedException({
        maLoi: 'MAT_KHAU_HIEN_TAI_KHONG_DUNG',
        thongBao: 'Mật khẩu hiện tại không đúng.',
      })
    }

    const matKhauBamMoi = await this.bamMatKhau.tao(dto.matKhauMoi)
    await this.prisma.$transaction(async (giaoDich) => {
      await giaoDich.taiKhoanNguoiDung.update({
        where: { ma: taiKhoan.ma },
        data: { matKhauBam: matKhauBamMoi, doiMatKhauLanDau: false },
      })
      await giaoDich.phienDangNhap.updateMany({
        where: {
          maTaiKhoan: taiKhoan.ma,
          ma: { not: taiKhoanDaXacThuc.maPhien },
          thuHoiLuc: null,
        },
        data: { thuHoiLuc: new Date() },
      })
      await this.ghiAudit(giaoDich, {
        maNguoiThucHien: taiKhoan.ma,
        maDoiTuong: taiKhoan.ma,
        hanhDong: 'DOI_MAT_KHAU',
        ketQua: 'THANH_CONG',
        maTuongQuan: thongTin.maTuongQuan,
        diaChiIp: thongTin.diaChiIp,
        duLieuTruoc: { doiMatKhauLanDau: taiKhoan.doiMatKhauLanDau },
        duLieuSau: { doiMatKhauLanDau: false },
      })
    })
  }

  async thongTinTaiKhoanCuaToi(maTaiKhoan: string) {
    const account = await this.prisma.taiKhoanNguoiDung.findUnique({
      where: { ma: maTaiKhoan },
      select: { ma: true, tenDangNhap: true, email: true, trangThai: true, doiMatKhauLanDau: true },
    })
    if (!account) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_KHOAN', thongBao: 'Không tìm thấy tài khoản.' })
    return account
  }

  async capNhatThongTinTaiKhoanCuaToi(maTaiKhoan: string, dto: CapNhatThongTinTaiKhoanCuaToiDto, thongTin: ThongTinYeuCau) {
    try {
      return await this.prisma.$transaction(async (giaoDich) => {
        const before = await giaoDich.taiKhoanNguoiDung.findUnique({ where: { ma: maTaiKhoan }, select: { ma: true, email: true } })
        if (!before) throw new NotFoundException({ maLoi: 'KHONG_TIM_THAY_TAI_KHOAN', thongBao: 'Không tìm thấy tài khoản.' })
        const after = await giaoDich.taiKhoanNguoiDung.update({
          where: { ma: maTaiKhoan }, data: { email: dto.email },
          select: { ma: true, tenDangNhap: true, email: true, trangThai: true, doiMatKhauLanDau: true },
        })
        await this.ghiAudit(giaoDich, {
          maNguoiThucHien: maTaiKhoan, maDoiTuong: maTaiKhoan, hanhDong: 'TAI_KHOAN_TU_CAP_NHAT_THONG_TIN',
          ketQua: 'THANH_CONG', maTuongQuan: thongTin.maTuongQuan, diaChiIp: thongTin.diaChiIp,
          duLieuTruoc: { emailDaThietLap: Boolean(before.email) }, duLieuSau: { emailDaThietLap: Boolean(after.email) },
        })
        return after
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ maLoi: 'EMAIL_DA_DUOC_SU_DUNG', thongBao: 'Email đã được liên kết với tài khoản khác.' })
      }
      throw error
    }
  }

  kiemTraNguonYeuCau(nguon: string | undefined) {
    const nguonDuocPhep = this.cauHinh.get<string>(
      'URL_GIAO_DIEN_DUOC_PHEP',
      'http://127.0.0.1:5173',
    )
    try {
      if (!nguon || new URL(nguon).origin !== new URL(nguonDuocPhep).origin) {
        throw new Error('Nguồn yêu cầu không được phép')
      }
    } catch {
      throw new ForbiddenException({
        maLoi: 'NGUON_YEU_CAU_KHONG_HOP_LE',
        thongBao: 'Nguồn yêu cầu không được phép thực hiện thao tác này.',
      })
    }
  }

  layTokenPhien(yeuCau: { headers: { cookie?: string } }) {
    const cookies = yeuCau.headers.cookie?.split(';') ?? []
    for (const cookie of cookies) {
      const dauPhanCach = cookie.indexOf('=')
      if (dauPhanCach < 0) continue
      const ten = cookie.slice(0, dauPhanCach).trim()
      if (ten === tenCookiePhien) return cookie.slice(dauPhanCach + 1).trim()
    }
    return undefined
  }

  tenCookie() {
    return tenCookiePhien
  }

  cookieBaoMat() {
    return this.cauHinh.get<string>('MOI_TRUONG', 'PHAT_TRIEN') !== 'PHAT_TRIEN'
  }

  private bamToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private async ghiNhanDangNhapThatBai(
    taiKhoan: { ma: string; khoaDen: Date | null } | null,
    tangDem: boolean,
    thongTin: ThongTinYeuCau,
  ) {
    if (!taiKhoan || !tangDem) return
    const soLanToiDa = this.cauHinh.get<number>('SO_LAN_DANG_NHAP_THAT_BAI_TOI_DA', 5)
    const thoiGianKhoa = this.cauHinh.get<number>('THOI_GIAN_KHOA_DANG_NHAP_PHUT', 15)

    await this.prisma.$transaction(async (giaoDich) => {
      await giaoDich.$executeRaw`
        UPDATE "tai_khoan_nguoi_dung"
        SET
          "so_lan_dang_nhap_that_bai" = CASE
            WHEN "khoa_den" IS NOT NULL AND "khoa_den" <= NOW() THEN 1
            ELSE "so_lan_dang_nhap_that_bai" + 1
          END,
          "khoa_den" = CASE
            WHEN (CASE
              WHEN "khoa_den" IS NOT NULL AND "khoa_den" <= NOW() THEN 1
              ELSE "so_lan_dang_nhap_that_bai" + 1
            END) >= ${soLanToiDa}
              THEN NOW() + (${thoiGianKhoa} * INTERVAL '1 minute')
            ELSE NULL
          END
        WHERE "ma_tai_khoan" = ${taiKhoan.ma}::uuid
      `
      await this.ghiAudit(giaoDich, {
        maNguoiThucHien: null,
        maDoiTuong: taiKhoan?.ma ?? null,
        hanhDong: 'DANG_NHAP',
        ketQua: 'THAT_BAI',
        lyDo: 'THONG_TIN_DANG_NHAP_KHONG_HOP_LE',
        maTuongQuan: thongTin.maTuongQuan,
        diaChiIp: thongTin.diaChiIp,
      })
    })
  }

  private async ghiAudit(
    giaoDich: Prisma.TransactionClient,
    duLieu: {
      maNguoiThucHien: string | null
      maDoiTuong: string | null
      hanhDong: string
      ketQua: string
      maTuongQuan: string
      diaChiIp: string | null
      lyDo?: string
      duLieuTruoc?: { doiMatKhauLanDau?: boolean; emailDaThietLap?: boolean }
      duLieuSau?: { doiMatKhauLanDau?: boolean; emailDaThietLap?: boolean }
    },
  ) {
    await giaoDich.nhatKyKiemToan.create({
      data: {
        maNguoiThucHien: duLieu.maNguoiThucHien,
        hanhDong: duLieu.hanhDong,
        loaiDoiTuong: 'TAI_KHOAN',
        maDoiTuong: duLieu.maDoiTuong,
        ketQua: duLieu.ketQua,
        lyDo: duLieu.lyDo,
        duLieuTruoc: duLieu.duLieuTruoc,
        duLieuSau: duLieu.duLieuSau,
        maTuongQuan: duLieu.maTuongQuan || randomUUID(),
        diaChiIp: duLieu.diaChiIp,
      },
    })
  }
}
