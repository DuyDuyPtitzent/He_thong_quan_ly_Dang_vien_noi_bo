import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { XacThucGuard } from '../auth/auth.guard'
import { DanhSachNhatKyDto, XemTruocXoaNhatKyDto } from './system-logs.dto'
import { NhatKyHeThongService } from './system-logs.service'

@Controller('nhat-ky-he-thong')
@UseGuards(XacThucGuard)
export class NhatKyHeThongController {
  constructor(@Inject(NhatKyHeThongService) private readonly service: NhatKyHeThongService) {}
  @Get(':phanLoai/thong-ke') thongKe(@Req() req: YeuCauDaXacThuc, @Param('phanLoai') type: string, @Query() query: DanhSachNhatKyDto) { return this.service.thongKe(req.taiKhoanDaXacThuc, type, query.maDonVi) }
  @Get(':phanLoai/don-vi') donVi(@Req() req: YeuCauDaXacThuc, @Param('phanLoai') type: string) { return this.service.donVi(req.taiKhoanDaXacThuc, type) }
  @Get(':phanLoai/hanh-dong') hanhDong(@Req() req: YeuCauDaXacThuc, @Param('phanLoai') type: string, @Query() query: DanhSachNhatKyDto) { return this.service.hanhDong(req.taiKhoanDaXacThuc, type, query.maDonVi) }
  @Post(':phanLoai/xoa/xem-truoc') xemTruocXoa(@Req() req: YeuCauDaXacThuc, @Param('phanLoai') type: string, @Body() dto: XemTruocXoaNhatKyDto) { return this.service.xemTruocXoa(req.taiKhoanDaXacThuc, type, dto) }
  @Get(':phanLoai') danhSach(@Req() req: YeuCauDaXacThuc, @Param('phanLoai') type: string, @Query() query: DanhSachNhatKyDto) { return this.service.danhSach(req.taiKhoanDaXacThuc, type, query) }
  @Get(':phanLoai/ban-ghi/:ma') chiTiet(@Req() req: YeuCauDaXacThuc, @Param('phanLoai') type: string, @Param('ma', ParseUUIDPipe) id: string) { return this.service.chiTiet(req.taiKhoanDaXacThuc, type, id) }
}
