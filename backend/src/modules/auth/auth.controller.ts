import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { CapNhatThongTinTaiKhoanCuaToiDto, ChonPhanCongDangHoatDongDto, DangNhapDto, DoiMatKhauDto } from './auth.dto'
import { XacThucGuard } from './auth.guard'
import { XacThucService, type ThongTinYeuCau } from './auth.service'
import type { YeuCauDaXacThuc } from './auth.types'

@Controller('xac-thuc')
export class XacThucController {
  constructor(@Inject(XacThucService) private readonly xacThuc: XacThucService) {}

  @Post('dang-nhap')
  @HttpCode(200)
  async dangNhap(
    @Body() dto: DangNhapDto,
    @Req() yeuCau: Request,
    @Headers('origin') nguon: string | undefined,
    @Res({ passthrough: true }) phanHoi: Response,
  ) {
    this.xacThuc.kiemTraNguonYeuCau(nguon)
    const ketQua = await this.xacThuc.dangNhap(dto, this.layThongTinYeuCau(yeuCau))
    phanHoi.cookie(this.xacThuc.tenCookie(), ketQua.tokenPhien, {
      httpOnly: true,
      secure: this.xacThuc.cookieBaoMat(),
      sameSite: 'strict',
      path: '/api/v1',
      expires: ketQua.hetHanLuc,
    })

    return {
      taiKhoan: ketQua.taiKhoan,
      hetHanLuc: ketQua.hetHanLuc.toISOString(),
      maTuongQuan: this.layThongTinYeuCau(yeuCau).maTuongQuan,
    }
  }

  @Get('phien-hien-tai')
  @UseGuards(XacThucGuard)
  phienHienTai(@Req() yeuCau: YeuCauDaXacThuc) {
    return {
      maPhanCongVaiTroDangHoatDong: yeuCau.taiKhoanDaXacThuc.maPhanCongVaiTroDangHoatDong,
      phanCongHopLe: yeuCau.taiKhoanDaXacThuc.phanCongHopLe,
      quyenDangHoatDong: yeuCau.taiKhoanDaXacThuc.quyenDangHoatDong,
      taiKhoan: {
        maTaiKhoan: yeuCau.taiKhoanDaXacThuc.maTaiKhoan,
        tenDangNhap: yeuCau.taiKhoanDaXacThuc.tenDangNhap,
        doiMatKhauLanDau: yeuCau.taiKhoanDaXacThuc.doiMatKhauLanDau,
      },
    }
  }

  @Post('phan-cong-vai-tro-dang-hoat-dong')
  @HttpCode(200)
  @UseGuards(XacThucGuard)
  async chonPhanCongDangHoatDong(
    @Body() dto: ChonPhanCongDangHoatDongDto,
    @Req() yeuCau: YeuCauDaXacThuc,
    @Headers('origin') nguon: string | undefined,
  ) {
    this.xacThuc.kiemTraNguonYeuCau(nguon)
    await this.xacThuc.chonPhanCongDangHoatDong(
      yeuCau.taiKhoanDaXacThuc.maTaiKhoan,
      yeuCau.taiKhoanDaXacThuc.maPhien,
      dto.maPhanCong,
    )
    return { maPhanCongVaiTroDangHoatDong: dto.maPhanCong }
  }

  @Get('tai-khoan-cua-toi')
  @UseGuards(XacThucGuard)
  taiKhoanCuaToi(@Req() yeuCau: YeuCauDaXacThuc) {
    return this.xacThuc.thongTinTaiKhoanCuaToi(yeuCau.taiKhoanDaXacThuc.maTaiKhoan)
  }

  @Patch('tai-khoan-cua-toi')
  @HttpCode(200)
  @UseGuards(XacThucGuard)
  async capNhatTaiKhoanCuaToi(
    @Body() dto: CapNhatThongTinTaiKhoanCuaToiDto,
    @Req() yeuCau: YeuCauDaXacThuc,
    @Headers('origin') nguon: string | undefined,
  ) {
    this.xacThuc.kiemTraNguonYeuCau(nguon)
    const thongTin = this.layThongTinYeuCau(yeuCau)
    const taiKhoan = await this.xacThuc.capNhatThongTinTaiKhoanCuaToi(yeuCau.taiKhoanDaXacThuc.maTaiKhoan, dto, thongTin)
    return { taiKhoan, maTuongQuan: thongTin.maTuongQuan }
  }

  @Post('doi-mat-khau')
  @HttpCode(200)
  @UseGuards(XacThucGuard)
  async doiMatKhau(
    @Body() dto: DoiMatKhauDto,
    @Req() yeuCau: YeuCauDaXacThuc,
    @Headers('origin') nguon: string | undefined,
  ) {
    this.xacThuc.kiemTraNguonYeuCau(nguon)
    const thongTin = this.layThongTinYeuCau(yeuCau)
    await this.xacThuc.doiMatKhau(yeuCau.taiKhoanDaXacThuc, dto, thongTin)
    return {
      doiMatKhauLanDau: false,
      maTuongQuan: thongTin.maTuongQuan,
    }
  }

  @Post('dang-xuat')
  @HttpCode(200)
  async dangXuat(
    @Req() yeuCau: Request,
    @Headers('origin') nguon: string | undefined,
    @Res({ passthrough: true }) phanHoi: Response,
  ) {
    this.xacThuc.kiemTraNguonYeuCau(nguon)
    const thongTin = this.layThongTinYeuCau(yeuCau)
    await this.xacThuc.dangXuat(this.xacThuc.layTokenPhien(yeuCau), thongTin)
    phanHoi.clearCookie(this.xacThuc.tenCookie(), {
      httpOnly: true,
      secure: this.xacThuc.cookieBaoMat(),
      sameSite: 'strict',
      path: '/api/v1',
    })
    return { daDangXuat: true, maTuongQuan: thongTin.maTuongQuan }
  }

  private layThongTinYeuCau(yeuCau: Request): ThongTinYeuCau {
    const maTuongQuan = yeuCau.headers['x-correlation-id']
    const thietBi = yeuCau.headers['user-agent']
    return {
      maTuongQuan:
        typeof maTuongQuan === 'string' && maTuongQuan.length <= 80 ? maTuongQuan : 'CHUA_CO_MA',
      diaChiIp: yeuCau.ip ?? null,
      thietBi: typeof thietBi === 'string' ? thietBi.slice(0, 500) : null,
    }
  }
}
