import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { ChuyenTrangThaiHocTapDto, DanhSachHocTapDto, DanhSachThamGiaDto, HoSoNgoaiLeDto, SuaBuoiHocDto, SuaDotHocDto, SuaPhanCongNhiemVuDto, TaoBuoiHocDto, TaoDotHocDto, TaoPhanCongNhiemVuDto, XacNhanDanhSachDuKienDto } from './learning.dto'
import { HocTapNghiQuyetService } from './learning.service'

@Controller()
@UseGuards(XacThucGuard)
export class DotHocNghiQuyetController {
  constructor(@Inject(HocTapNghiQuyetService) private readonly service: HocTapNghiQuyetService) {}
  @Get('dot') danhSachDot(@Req() req: YeuCauDaXacThuc, @Query() query: DanhSachHocTapDto) { return this.service.danhSachDot(req.taiKhoanDaXacThuc, query) }
  @Post('dot') taoDot(@Req() req: YeuCauDaXacThuc, @Body() dto: TaoDotHocDto) { return this.service.taoDot(req.taiKhoanDaXacThuc, dto, req.ip ?? null) }
  @Get('dot/:id') chiTietDot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.chiTietDot(req.taiKhoanDaXacThuc, id) }
  @Patch('dot/:id') suaDot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SuaDotHocDto) { return this.service.suaDot(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Post('dot/:id/ket-thuc') ketThucDot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.chuyenDot(req.taiKhoanDaXacThuc, id, 'DA_KET_THUC', req.ip ?? null) }
  @Post('dot/:id/huy') huyDot(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.chuyenDot(req.taiKhoanDaXacThuc, id, 'DA_HUY', req.ip ?? null) }
  @Get('dot/:id/buoi') danhSachBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: DanhSachHocTapDto) { return this.service.danhSachBuoi(req.taiKhoanDaXacThuc, id, query) }
  @Post('dot/:id/buoi') taoBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TaoBuoiHocDto) { return this.service.taoBuoi(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Get('buoi/:id') chiTietBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.chiTietBuoi(req.taiKhoanDaXacThuc, id) }
  @Patch('buoi/:id') suaBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SuaBuoiHocDto) { return this.service.suaBuoi(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Post('buoi/:id/trang-thai') chuyenTrangThaiBuoi(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChuyenTrangThaiHocTapDto) { return this.service.chuyenBuoi(req.taiKhoanDaXacThuc, id, dto.trangThai, req.ip ?? null) }
  @Get('buoi/:id/danh-sach') danhSachThamGia(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: DanhSachThamGiaDto) { return this.service.danhSachThamGia(req.taiKhoanDaXacThuc, id, query) }
  @Post('buoi/:id/danh-sach/khoi-tao') khoiTaoDanhSach(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.khoiTaoDanhSach(req.taiKhoanDaXacThuc, id, req.ip ?? null) }
  @Post('buoi/:id/danh-sach') boSungNgoaiLe(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: HoSoNgoaiLeDto) { return this.service.boSungNgoaiLe(req.taiKhoanDaXacThuc, id, dto.maHoSo, req.ip ?? null) }
  @Delete('buoi/:id/danh-sach/:maHoSo') loaiKhoiDanhSach(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Param('maHoSo', ParseUUIDPipe) maHoSo: string) { return this.service.loaiKhoiDanhSach(req.taiKhoanDaXacThuc, id, maHoSo, req.ip ?? null) }
  @Post('buoi/:id/danh-sach/:maHoSo/khoi-phuc') khoiPhucDanhSach(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Param('maHoSo', ParseUUIDPipe) maHoSo: string) { return this.service.khoiPhucDanhSach(req.taiKhoanDaXacThuc, id, maHoSo, req.ip ?? null) }
  @Post('buoi/:id/danh-sach/xac-nhan-du-kien') xacNhanDanhSach(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: XacNhanDanhSachDuKienDto) { return this.service.xacNhanDanhSach(req.taiKhoanDaXacThuc, id, dto.phienBanDanhSach, req.ip ?? null) }
  @Get('buoi/:id/danh-sach/lich-su') lichSuDanhSach(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Query() query: DanhSachHocTapDto) { return this.service.lichSuDanhSach(req.taiKhoanDaXacThuc, id, query) }
  @Get('buoi/:id/phan-cong') danhSachPhanCong(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string) { return this.service.danhSachPhanCong(req.taiKhoanDaXacThuc, id) }
  @Post('buoi/:id/phan-cong') taoPhanCong(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TaoPhanCongNhiemVuDto) { return this.service.taoPhanCong(req.taiKhoanDaXacThuc, id, dto, req.ip ?? null) }
  @Patch('buoi/:id/phan-cong/:maPhanCong') suaPhanCong(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Param('maPhanCong', ParseUUIDPipe) maPhanCong: string, @Body() dto: SuaPhanCongNhiemVuDto) { return this.service.suaPhanCong(req.taiKhoanDaXacThuc, id, maPhanCong, dto, req.ip ?? null) }
  @Delete('buoi/:id/phan-cong/:maPhanCong') thuHoiPhanCong(@Req() req: YeuCauDaXacThuc, @Param('id', ParseUUIDPipe) id: string, @Param('maPhanCong', ParseUUIDPipe) maPhanCong: string) { return this.service.thuHoiPhanCong(req.taiKhoanDaXacThuc, id, maPhanCong, req.ip ?? null) }
}
