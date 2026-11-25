import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { MucDoThamGiaQueryDto, ThongKeDotQueryDto, ThongKeHocTapQueryDto } from './statistics.dto'
import { ThongKeHocTapNghiQuyetService } from './statistics.service'

@Controller('thong-ke')
@UseGuards(XacThucGuard)
export class ThongKeHocTapNghiQuyetController {
  constructor(@Inject(ThongKeHocTapNghiQuyetService) private readonly service: ThongKeHocTapNghiQuyetService) {}
  @Get('dot/:id') theoDot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: ThongKeDotQueryDto) { return this.service.theoDot(req.taiKhoanDaXacThuc, id, query) }
  @Get('buoi/:id') theoBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.theoBuoi(req.taiKhoanDaXacThuc, id) }
  @Get('theo-chi-bo') theoChiBo(@Req() req: YeuCauDaXacThuc, @Query() query: ThongKeHocTapQueryDto) { return this.service.theoChiBo(req.taiKhoanDaXacThuc, query) }
  @Get('xu-huong') xuHuong(@Req() req: YeuCauDaXacThuc, @Query() query: ThongKeHocTapQueryDto) { return this.service.xuHuong(req.taiKhoanDaXacThuc, query) }
  @Get('muc-do-tham-gia') mucDoThamGia(@Req() req: YeuCauDaXacThuc, @Query() query: MucDoThamGiaQueryDto) { return this.service.mucDoThamGia(req.taiKhoanDaXacThuc, query) }
}
