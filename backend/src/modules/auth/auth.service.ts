import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import type { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DangNhapDto, DoiMatKhauDto } from './auth.dto'
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

    return {
      maPhien: phien.ma,
      hetHanLuc: phien.hetHanLuc,
      taiKhoan: {
        maTaiKhoan: taiKhoan.ma,
        tenDangNhap: taiKhoan.tenDangNhap,
        doiMatKhauLanDau: taiKhoan.doiMatKhauLanDau,
      },
    }
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
      duLieuTruoc?: { doiMatKhauLanDau: boolean }
      duLieuSau?: { doiMatKhauLanDau: boolean }
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
