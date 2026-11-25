import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { DanhSachGiaTriDanhMucDto, DanhSachNhomDanhMucDto, SuaGiaTriDanhMucDto, SuaNhomDanhMucDto, TaoGiaTriDanhMucDto, TaoNhomDanhMucDto } from './business-catalogs.dto'
import { DanhMucNghiepVuService } from './business-catalogs.service'

@Controller('cau-hinh/danh-muc')
@UseGuards(XacThucGuard)
export class DanhMucNghiepVuController {
  constructor(@Inject(DanhMucNghiepVuService) private readonly service: DanhMucNghiepVuService) {}
  @Get() danhSachNhom(@Req() req: YeuCauDaXacThuc, @Query() query: DanhSachNhomDanhMucDto) { return this.service.danhSachNhom(req.taiKhoanDaXacThuc, query) }
  @Post() taoNhom(@Req() req: YeuCauDaXacThuc, @Body() dto: TaoNhomDanhMucDto) { return this.service.taoNhom(req.taiKhoanDaXacThuc, dto, req.ip ?? null) }
  @Get(':maNhom') chiTietNhom(@Req() req: YeuCauDaXacThuc, @Param('maNhom') maNhom: string, @Query() query: DanhSachGiaTriDanhMucDto) { return this.service.chiTietNhom(req.taiKhoanDaXacThuc, maNhom, query) }
  @Patch(':maNhom') suaNhom(@Req() req: YeuCauDaXacThuc, @Param('maNhom') maNhom: string, @Body() dto: SuaNhomDanhMucDto) { return this.service.suaNhom(req.taiKhoanDaXacThuc, maNhom, dto, req.ip ?? null) }
  @Post(':maNhom/gia-tri') taoGiaTri(@Req() req: YeuCauDaXacThuc, @Param('maNhom') maNhom: string, @Body() dto: TaoGiaTriDanhMucDto) { return this.service.taoGiaTri(req.taiKhoanDaXacThuc, maNhom, dto, req.ip ?? null) }
  @Patch(':maNhom/gia-tri/:maGiaTri') suaGiaTri(@Req() req: YeuCauDaXacThuc, @Param('maNhom') maNhom: string, @Param('maGiaTri') maGiaTri: string, @Body() dto: SuaGiaTriDanhMucDto) { return this.service.suaGiaTri(req.taiKhoanDaXacThuc, maNhom, maGiaTri, dto, req.ip ?? null) }
}
