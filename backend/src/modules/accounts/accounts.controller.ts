import { BadRequestException, Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import type { Response } from 'express'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { XacThucGuard } from '../auth/auth.guard'
import { DanhSachTaiKhoanDto, DoiTrangThaiTaiKhoanDto, LienKetHoSoDto, SuaTaiKhoanDto, TaoTaiKhoanDto, TimHoSoChuaLienKetDto } from './accounts.dto'
import { TaiKhoanService } from './accounts.service'

@Controller('tai-khoan')
@UseGuards(XacThucGuard)
export class TaiKhoanController {
  constructor(@Inject(TaiKhoanService) private readonly service: TaiKhoanService) {}

  @Get()
  danhSach(@Req() request: YeuCauDaXacThuc, @Query() query: DanhSachTaiKhoanDto) { return this.service.danhSach(request.taiKhoanDaXacThuc, query) }

  @Get('nhap-xuat/mau')
  async mauNhap(@Req() request: YeuCauDaXacThuc, @Query('loaiNhap') mode: string, @Res() response: Response) {
    const workbook = await this.service.taoMauNhap(request.taiKhoanDaXacThuc, this.importMode(mode))
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.setHeader('Content-Disposition', `attachment; filename="mau-nhap-tai-khoan-${mode.toLowerCase()}.xlsx"`)
    response.send(workbook)
  }

  @Post('nhap-xuat/kiem-tra')
  @UseInterceptors(FileInterceptor('tep', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async kiemTraNhap(@Req() request: YeuCauDaXacThuc, @UploadedFile() file: { buffer: Buffer; originalname: string; size: number } | undefined, @Body('loaiNhap') mode: string) {
    return this.service.kiemTraNhap(request.taiKhoanDaXacThuc, file, this.importMode(mode))
  }

  @Post('nhap-xuat/xac-nhan')
  xacNhanNhap(@Req() request: YeuCauDaXacThuc, @Body('maPhienNhap') sessionId: string) {
    return this.service.xacNhanNhap(request.taiKhoanDaXacThuc, sessionId, this.ip(request))
  }

  @Post('nhap-xuat/bao-cao-loi')
  async baoCaoLoi(@Req() request: YeuCauDaXacThuc, @Body('loi') errors: { row: number; field: string; message: string }[] = [], @Res() response: Response) {
    const workbook = await this.service.taoBaoCaoLoiNhap(request.taiKhoanDaXacThuc, errors)
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.setHeader('Content-Disposition', 'attachment; filename="bao-cao-loi-nhap-tai-khoan.xlsx"')
    response.send(workbook)
  }

  @Get('ho-so-chua-lien-ket')
  hoSoChuaLienKet(@Req() request: YeuCauDaXacThuc, @Query() query: TimHoSoChuaLienKetDto) { return this.service.hoSoChuaLienKet(request.taiKhoanDaXacThuc, query) }

  @Get(':maTaiKhoan/lich-su')
  lichSu(@Req() request: YeuCauDaXacThuc, @Param('maTaiKhoan') id: string) { return this.service.lichSu(request.taiKhoanDaXacThuc, id) }

  @Get(':maTaiKhoan')
  chiTiet(@Req() request: YeuCauDaXacThuc, @Param('maTaiKhoan') id: string) { return this.service.chiTiet(request.taiKhoanDaXacThuc, id) }

  @Post()
  tao(@Req() request: YeuCauDaXacThuc, @Body() dto: TaoTaiKhoanDto) { return this.service.tao(request.taiKhoanDaXacThuc, dto, this.ip(request)) }

  @Patch(':maTaiKhoan')
  sua(@Req() request: YeuCauDaXacThuc, @Param('maTaiKhoan') id: string, @Body() dto: SuaTaiKhoanDto) { return this.service.sua(request.taiKhoanDaXacThuc, id, dto, this.ip(request)) }

  @Patch(':maTaiKhoan/trang-thai')
  doiTrangThai(@Req() request: YeuCauDaXacThuc, @Param('maTaiKhoan') id: string, @Body() dto: DoiTrangThaiTaiKhoanDto) { return this.service.doiTrangThai(request.taiKhoanDaXacThuc, id, dto, this.ip(request)) }

  @Patch(':maTaiKhoan/lien-ket-ho-so')
  lienKetHoSo(@Req() request: YeuCauDaXacThuc, @Param('maTaiKhoan') id: string, @Body() dto: LienKetHoSoDto) { return this.service.lienKetHoSo(request.taiKhoanDaXacThuc, id, dto, this.ip(request)) }

  @Delete(':maTaiKhoan')
  xoa(@Req() request: YeuCauDaXacThuc, @Param('maTaiKhoan') id: string) { return this.service.xoa(request.taiKhoanDaXacThuc, id, this.ip(request)) }

  private ip(request: Request) { return request.ip ?? null }
  private importMode(value: string): 'LIEN_KET_HO_SO' | 'DOC_LAP' {
    if (value === 'LIEN_KET_HO_SO' || value === 'DOC_LAP') return value
    throw new BadRequestException({ maLoi: 'LOAI_NHAP_KHONG_HOP_LE', thongBao: 'Chọn hình thức nhập tài khoản hợp lệ.' })
  }
}
