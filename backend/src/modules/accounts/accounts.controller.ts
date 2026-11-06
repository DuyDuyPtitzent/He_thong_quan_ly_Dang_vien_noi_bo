import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
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
}
