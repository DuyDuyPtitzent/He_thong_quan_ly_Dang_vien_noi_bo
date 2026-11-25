import { Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Req, Res, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import type { Readable } from 'node:stream'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { XacThucGuard } from '../auth/auth.guard'
import { TepDinhKemHocTapService } from './learning-files.service'
import { TepTaiLenExceptionFilter } from './learning-files-upload.filter'

type UploadedPrivateFile = { buffer: Buffer; originalname: string; mimetype: string; size: number }

@Controller()
@UseGuards(XacThucGuard)
export class TepDinhKemHocTapController {
  constructor(@Inject(TepDinhKemHocTapService) private readonly service: TepDinhKemHocTapService) {}

  @Post('dot/:id/tep') @UseFilters(TepTaiLenExceptionFilter) @UseInterceptors(FileInterceptor('tep', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } })) taiLenDot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: UploadedPrivateFile) {
    return this.service.taiLenDot(req.taiKhoanDaXacThuc, id, file, req.ip ?? null)
  }

  @Post('buoi/:id/tep') @UseFilters(TepTaiLenExceptionFilter) @UseInterceptors(FileInterceptor('tep', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } })) taiLenBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: UploadedPrivateFile) {
    return this.service.taiLenBuoi(req.taiKhoanDaXacThuc, id, file, req.ip ?? null)
  }

  @Get('tep/:id') async taiXuong(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.service.taiXuong(req.taiKhoanDaXacThuc, id)
    res.set({ 'Content-Type': file.kieuNoiDung, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.tenTepGoc)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
    const stream = file.stream as Readable
    stream.on('error', () => { if (!res.headersSent) res.status(404).json({ maLoi: 'KHONG_DOC_DUOC_TEP', thongBao: 'Tệp không còn khả dụng trong kho lưu trữ riêng.' }); else res.destroy() })
    stream.pipe(res)
  }

  @Delete('tep/:id') xoa(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.xoa(req.taiKhoanDaXacThuc, id, req.ip ?? null)
  }
}
