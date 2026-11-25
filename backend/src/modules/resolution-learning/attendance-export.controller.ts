import { Body, Controller, Get, Header, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { XuatKetQuaDiemDanhDto } from './attendance-export.dto'
import { XuatKetQuaDiemDanhService } from './attendance-export.service'

@Controller('xuat')
@UseGuards(XacThucGuard)
export class XuatKetQuaDiemDanhController {
  constructor(@Inject(XuatKetQuaDiemDanhService) private readonly service: XuatKetQuaDiemDanhService) {}

  @Get('cau-hinh') cauHinh(@Req() req: YeuCauDaXacThuc) { return this.service.cauHinh(req.taiKhoanDaXacThuc) }

  @Post() @Header('Cache-Control', 'private, no-store') @Header('X-Content-Type-Options', 'nosniff')
  async xuat(@Req() req: YeuCauDaXacThuc, @Body() dto: XuatKetQuaDiemDanhDto, @Res() res: Response) {
    const file = await this.service.xuat(req.taiKhoanDaXacThuc, dto)
    res.status(HttpStatus.OK).set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': "attachment; filename*=UTF-8''ket-qua-diem-danh.xlsx",
    }).send(file)
  }
}
