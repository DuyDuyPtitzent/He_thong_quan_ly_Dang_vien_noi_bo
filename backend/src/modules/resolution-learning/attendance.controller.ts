import { BadRequestException, Body, Controller, Delete, Get, Header, Headers, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { GuiYeuCauCongKhaiDto, TaoLienKetBieuMauDto, TokenDiemDanhDto } from './attendance.dto'
import { DanhSachKetQuaThuCongDto, DongKetQuaThuCongDto, GhiKetQuaThuCongLoDto, NoiDungKetQuaThuCongDto, XacNhanChotDiemDanhDto } from './attendance-manual.dto'
import { DiemDanhThuCongService } from './attendance-manual.service'
import { ChotDiemDanhService } from './attendance-finalization.service'
import { LichSuDiemDanhQueryDto } from './attendance-finalization.dto'
import { VanHanhDiemDanhService } from './attendance-operations.service'
import { DanhSachYeuCauDiemDanhDto, XuLyYeuCauDiemDanhDto, XacMinhYeuCauDiemDanhDto } from './attendance-requests.dto'
import { XuLyYeuCauDiemDanhService } from './attendance-requests.service'

@Controller()
@UseGuards(XacThucGuard)
export class VanHanhDiemDanhController {
  constructor(@Inject(VanHanhDiemDanhService) private readonly service: VanHanhDiemDanhService, @Inject(XuLyYeuCauDiemDanhService) private readonly requests: XuLyYeuCauDiemDanhService, @Inject(DiemDanhThuCongService) private readonly manual: DiemDanhThuCongService, @Inject(ChotDiemDanhService) private readonly finalization: ChotDiemDanhService) {}

  @Get('buoi/:id/cua-so') trangThai(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.trangThai(req.taiKhoanDaXacThuc, id) }
  @Post('buoi/:id/cua-so/mo') mo(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.moCuaSo(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Post('buoi/:id/cua-so/dong') dong(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.dongCuaSo(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Get('buoi/:id/qr') @Header('Cache-Control', 'no-store') @Header('Pragma', 'no-cache') qr(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.qr(req.taiKhoanDaXacThuc, id) }
  @Post('buoi/:id/tu-diem-danh') @HttpCode(HttpStatus.OK) tuDiemDanh(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TokenDiemDanhDto) { return this.service.tuDiemDanh(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Post('buoi/:id/bieu-mau/lien-ket') @Header('Cache-Control', 'no-store') @Header('Pragma', 'no-cache') taoLienKet(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TaoLienKetBieuMauDto) { return this.service.taoLienKet(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Get('buoi/:id/yeu-cau') danhSachYeuCau(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: DanhSachYeuCauDiemDanhDto) { return this.requests.danhSach(req.taiKhoanDaXacThuc, id, query) }
  @Get('yeu-cau/:id') chiTietYeuCau(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.requests.chiTiet(req.taiKhoanDaXacThuc, id) }
  @Delete('yeu-cau/:id') xoaYeuCau(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.requests.xoa(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Post('yeu-cau/:id/xac-minh') xacMinhYeuCau(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: XacMinhYeuCauDiemDanhDto) { return this.requests.xacMinh(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Post('yeu-cau/:id/duyet') duyetYeuCau(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: XuLyYeuCauDiemDanhDto) { return this.requests.duyet(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Post('yeu-cau/:id/tu-choi') tuChoiYeuCau(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: XuLyYeuCauDiemDanhDto) { return this.requests.tuChoi(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Get('buoi/:id/ket-qua') ketQua(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: DanhSachKetQuaThuCongDto) { return this.manual.danhSach(req.taiKhoanDaXacThuc, id, query) }
  @Put('buoi/:id/ket-qua/:hoSo') capNhatKetQua(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Param('hoSo', ParseUUIDPipe) hoSo: string, @Body() dto: NoiDungKetQuaThuCongDto) { return this.manual.capNhat(req.taiKhoanDaXacThuc, id, { ...dto, maHoSo: hoSo }, req.ip ?? null) }
  @Post('buoi/:id/ket-qua/lo') capNhatKetQuaLo(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GhiKetQuaThuCongLoDto) { return this.manual.capNhatLo(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Get('buoi/:id/chot/kiem-tra') kiemTraChot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.finalization.kiemTra(req.taiKhoanDaXacThuc, id) }
  @Post('buoi/:id/chot') chotDiemDanh(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: XacNhanChotDiemDanhDto) { return this.finalization.chot(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Get('buoi/:id/chot') xemChot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.finalization.xemChot(req.taiKhoanDaXacThuc, id) }
  @Get('buoi/:id/ket-qua/lich-su') lichSuKetQua(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: LichSuDiemDanhQueryDto) { return this.finalization.lichSu(req.taiKhoanDaXacThuc, id, query) }
  @Post('buoi/:id/ket-qua/:hoSo/dieu-chinh-sau-chot') dieuChinhSauChot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Param('hoSo', ParseUUIDPipe) hoSo: string, @Body() dto: NoiDungKetQuaThuCongDto) { return this.manual.capNhatSauChot(req.taiKhoanDaXacThuc, id, hoSo, dto, req.ip ?? null) }
}

@Controller('cong-khai')
export class CongKhaiDiemDanhController {
  constructor(@Inject(VanHanhDiemDanhService) private readonly service: VanHanhDiemDanhService) {}

  @Post('cua-so/truy-cap') @HttpCode(HttpStatus.OK) @Header('Cache-Control', 'no-store') @Header('Referrer-Policy', 'no-referrer') truyCap(@Body() dto: TokenDiemDanhDto) { return this.service.truyCapCongKhai(dto) }
  @Post('yeu-cau') @HttpCode(HttpStatus.ACCEPTED) @Header('Cache-Control', 'no-store') @Header('Referrer-Policy', 'no-referrer') guiYeuCau(@Body() dto: GuiYeuCauCongKhaiDto, @Headers('idempotency-key') idempotencyKey: string | undefined) {
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128 || !/^[A-Za-z0-9._~-]+$/.test(idempotencyKey)) throw new BadRequestException({ maLoi: 'IDEMPOTENCY_KEY_KHONG_HOP_LE', thongBao: 'Thiếu hoặc sai định dạng khóa gửi lặp.' })
    return this.service.guiYeuCauCongKhai(dto, idempotencyKey)
  }
}
