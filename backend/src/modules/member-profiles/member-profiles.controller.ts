import { Body, Controller, Delete, Get, Headers, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request, Response } from 'express'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { XacThucGuard } from '../auth/auth.guard'
import { RequirePermission } from '../authorization/require-permission.decorator'
import { DanhSachHoSoDto, SuaHoSoDto, TaoHoSoDto } from './member-profiles.dto'
import { HoSoDangVienService } from './member-profiles.service'
import { YeuCauCapNhatHoSoService } from './member-profile-updates.service'
import { DanhSachDotCapNhatDto, DanhSachYeuCauCapNhatDto, GuiYeuCauCapNhatDto, SuaDotCapNhatDto, TaoDotCapNhatDto, TuChoiYeuCauDto } from './member-profile-updates.dto'

@Controller('ho-so-dang-vien')
@UseGuards(XacThucGuard)
export class HoSoDangVienController {
  constructor(@Inject(HoSoDangVienService) private readonly service: HoSoDangVienService, @Inject(YeuCauCapNhatHoSoService) private readonly updates: YeuCauCapNhatHoSoService) {}
  @Get('cua-toi') cuaToi(@Req() req: YeuCauDaXacThuc) { return this.service.hoSoCuaToi(req.taiKhoanDaXacThuc) }
  @Get('cua-toi/dot-cap-nhat') dotCuaToi(@Req() req: YeuCauDaXacThuc) { return this.updates.dotHienHanhCuaToi(req.taiKhoanDaXacThuc) }
  @Get('cua-toi/yeu-cau-cap-nhat') yeuCauCuaToi(@Req() req: YeuCauDaXacThuc) { return this.updates.yeuCauCuaToi(req.taiKhoanDaXacThuc) }
  @Post('cua-toi/yeu-cau-cap-nhat') @UseInterceptors(FileInterceptor('anhDaiDien', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } })) guiYeuCau(@Req() req: YeuCauDaXacThuc, @Body() dto: GuiYeuCauCapNhatDto, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }) { return this.updates.guiYeuCau(req.taiKhoanDaXacThuc, dto, file, req.ip ?? null) }
  @Post('cua-toi/yeu-cau-cap-nhat/:maYeuCau/huy') huyYeuCau(@Req() req: YeuCauDaXacThuc, @Param('maYeuCau', ParseUUIDPipe) id: string) { return this.updates.huyCuaToi(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Get('cua-toi/anh-dai-dien') async anhCuaToi(@Req() req: YeuCauDaXacThuc, @Res() res: Response) { const image = await this.updates.anhDaiDienCuaToi(req.taiKhoanDaXacThuc); res.set({ 'Content-Type': image.mimeType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(image.buffer) }
  @Get('dot-cap-nhat/don-vi') donViMoDot(@Req() req: YeuCauDaXacThuc) { return this.updates.danhSachDonViMoDot(req.taiKhoanDaXacThuc) }
  @Get('dot-cap-nhat') danhSachDot(@Req() req: YeuCauDaXacThuc) { return this.updates.danhSachDot(req.taiKhoanDaXacThuc) }
  @Post('dot-cap-nhat/tao-va-kich-hoat') taoVaKichHoatDot(@Req() req: YeuCauDaXacThuc, @Body() dto: TaoDotCapNhatDto) { return this.updates.taoVaKichHoatDot(req.taiKhoanDaXacThuc, dto, req.ip ?? null) }
  @Post('dot-cap-nhat') taoDot(@Req() req: YeuCauDaXacThuc, @Body() dto: TaoDotCapNhatDto) { return this.updates.taoDot(req.taiKhoanDaXacThuc, dto, req.ip ?? null) }
  @Get('dot-cap-nhat/:ma/thong-ke') thongKeDot(@Req() req: YeuCauDaXacThuc, @Param('ma', ParseUUIDPipe) id: string) { return this.updates.thongKeDot(req.taiKhoanDaXacThuc, id) }
  @Patch('dot-cap-nhat/:ma') suaDot(@Req() req: YeuCauDaXacThuc, @Param('ma', ParseUUIDPipe) id: string, @Body() dto: SuaDotCapNhatDto) { return this.updates.suaDot(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Post('dot-cap-nhat/:ma/kich-hoat') kichHoatDot(@Req() req: YeuCauDaXacThuc, @Param('ma', ParseUUIDPipe) id: string) { return this.updates.kichHoatDot(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Post('dot-cap-nhat/:ma/ket-thuc') ketThucDot(@Req() req: YeuCauDaXacThuc, @Param('ma', ParseUUIDPipe) id: string) { return this.updates.ketThucDot(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Delete('dot-cap-nhat/:ma') xoaDot(@Req() req: YeuCauDaXacThuc, @Param('ma', ParseUUIDPipe) id: string) { return this.updates.xoaDot(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Get('yeu-cau-cap-nhat') danhSachYeuCau(@Req() req: YeuCauDaXacThuc, @Query() query: DanhSachYeuCauCapNhatDto) { return this.updates.danhSachYeuCau(req.taiKhoanDaXacThuc, query) }
  @Post('yeu-cau-cap-nhat/:maYeuCau/duyet') duyetYeuCau(@Req() req: YeuCauDaXacThuc, @Param('maYeuCau', ParseUUIDPipe) id: string) { return this.updates.duyet(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Post('yeu-cau-cap-nhat/:maYeuCau/tu-choi') tuChoiYeuCau(@Req() req: YeuCauDaXacThuc, @Param('maYeuCau', ParseUUIDPipe) id: string, @Body() dto: TuChoiYeuCauDto) { return this.updates.tuChoi(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Get(':maHoSo/anh-dai-dien') async anhDaiDien(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string, @Res() res: Response) { const image = await this.updates.anhDaiDienHoSo(req.taiKhoanDaXacThuc, id); res.set({ 'Content-Type': image.mimeType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(image.buffer) }
  // These list routes derive and apply unit scopes inside the service; a route guard with no target ID would reject every non-global scope.
  @Get() danhSach(@Req() req: YeuCauDaXacThuc, @Query() q: DanhSachHoSoDto) { return this.service.danhSach(req.taiKhoanDaXacThuc, q) }
  @Get('don-vi') donVi(@Req() req: YeuCauDaXacThuc) { return this.service.danhMucDonVi(req.taiKhoanDaXacThuc) }
  @Get(':maHoSo/lich-su-sinh-hoat') @RequirePermission('SINH_HOAT_XEM_LICH_SU') lichSuSinhHoat(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string) { return this.service.lichSuSinhHoat(req.taiKhoanDaXacThuc, id) }
  @Get(':maHoSo/qua-trinh') @RequirePermission('QUA_TRINH_DANG_XEM') quaTrinh(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string) { return this.service.quaTrinhDang(req.taiKhoanDaXacThuc, id) }
  @Get(':maHoSo/phan-cong-chuc-vu') @RequirePermission('PHAN_CONG_CHUC_VU_XEM') phanCongChucVu(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string) { return this.service.phanCongChucVu(req.taiKhoanDaXacThuc, id) }
  @Get(':maHoSo/lich-su-thay-doi') @RequirePermission('HO_SO_XEM_LICH_SU_THAY_DOI') lichSuThayDoi(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string) { return this.service.lichSuThayDoi(req.taiKhoanDaXacThuc, id) }
  @Get(':maHoSo') @RequirePermission('HO_SO_DANG_VIEN_XEM_TONG_QUAN') chiTiet(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string) { return this.service.chiTiet(req.taiKhoanDaXacThuc, id) }
  @Post() @RequirePermission('HO_SO_DANG_VIEN_TAO') tao(@Req() req: YeuCauDaXacThuc, @Body() dto: TaoHoSoDto) { return this.service.tao(req.taiKhoanDaXacThuc, dto, req.ip ?? null) }
  @Patch(':maHoSo') @RequirePermission('HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN') sua(@Req() req: YeuCauDaXacThuc, @Param('maHoSo', ParseUUIDPipe) id: string, @Body() dto: SuaHoSoDto) { return this.service.sua(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
}
