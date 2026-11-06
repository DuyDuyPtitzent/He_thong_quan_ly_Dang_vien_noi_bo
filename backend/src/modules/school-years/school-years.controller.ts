import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { DanhSachNamHocDto, SuaNamHocDto, TaoNamHocDto } from './school-years.dto'
import { NamHocService } from './school-years.service'

@Controller('nam-hoc')
@UseGuards(XacThucGuard)
export class NamHocController {
  constructor(@Inject(NamHocService) private readonly service: NamHocService) {}
  @Get() danhSach(@Req() req: YeuCauDaXacThuc, @Query() query: DanhSachNamHocDto) { return this.service.danhSach(req.taiKhoanDaXacThuc, query) }
  @Get(':id') chiTiet(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.chiTiet(req.taiKhoanDaXacThuc, id) }
  @Post() tao(@Req() req: YeuCauDaXacThuc, @Body() dto: TaoNamHocDto) { return this.service.tao(req.taiKhoanDaXacThuc, dto, req.ip ?? null) }
  @Patch(':id') sua(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SuaNamHocDto) { return this.service.sua(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Delete(':id') xoa(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.xoa(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
}
