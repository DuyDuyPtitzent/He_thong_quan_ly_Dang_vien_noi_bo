import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { LichHocCaNhanQueryDto, LichSuThamGiaCaNhanQueryDto } from './personal-learning.dto'
import { HocTapCaNhanService } from './personal-learning.service'

@Controller('ca-nhan')
@UseGuards(XacThucGuard)
export class HocTapCaNhanController {
  constructor(@Inject(HocTapCaNhanService) private readonly service: HocTapCaNhanService) {}
  @Get('lich') lich(@Req() req: YeuCauDaXacThuc, @Query() query: LichHocCaNhanQueryDto) { return this.service.lich(req.taiKhoanDaXacThuc, query) }
  @Get('buoi/:id') chiTiet(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.chiTiet(req.taiKhoanDaXacThuc, id) }
  @Get('lich-su') lichSu(@Req() req: YeuCauDaXacThuc, @Query() query: LichSuThamGiaCaNhanQueryDto) { return this.service.lichSu(req.taiKhoanDaXacThuc, query) }
}
