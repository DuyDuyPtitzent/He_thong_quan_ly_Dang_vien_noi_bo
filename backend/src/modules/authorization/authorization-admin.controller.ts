import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { XacThucGuard } from '../auth/auth.guard'
import { CapNhatQuyenVaiTroDto, LocPhanCongVaiTroDto, SuaPhanCongVaiTroDto, SuaVaiTroDto, TaoPhanCongVaiTroDto, TaoVaiTroDto, ThuHoiPhanCongVaiTroDto, TimTaiKhoanPhanQuyenDto } from './authorization-admin.dto'
import { QuanTriPhanQuyenService } from './authorization-admin.service'

@Controller()
@UseGuards(XacThucGuard)
export class QuanTriPhanQuyenController {
  constructor(@Inject(QuanTriPhanQuyenService) private readonly service: QuanTriPhanQuyenService) {}

  @Get('quyen')
  async danhMuc(@Req() request: YeuCauDaXacThuc) {
    await this.service.kiemTraQuyenDanhMuc(request.taiKhoanDaXacThuc.maTaiKhoan, 'QUYEN_XEM_DANH_MUC')
    return this.service.danhMucQuyen()
  }

  @Get('tai-khoan')
  taiKhoanDePhanQuyen(@Req() request: YeuCauDaXacThuc, @Query() query: TimTaiKhoanPhanQuyenDto) {
    return this.service.taiKhoanDePhanQuyen(request.taiKhoanDaXacThuc, query)
  }

  @Get('vai-tro')
  async danhSachVaiTro(@Req() request: YeuCauDaXacThuc) {
    await this.service.kiemTraQuyenDanhMuc(request.taiKhoanDaXacThuc.maTaiKhoan, 'VAI_TRO_XEM')
    return this.service.vaiTro()
  }

  @Post('vai-tro')
  taoVaiTro(@Req() request: YeuCauDaXacThuc, @Body() dto: TaoVaiTroDto) {
    return this.service.taoVaiTro(request.taiKhoanDaXacThuc, dto)
  }

  @Patch('vai-tro/:maVaiTro')
  suaVaiTro(@Req() request: YeuCauDaXacThuc, @Param('maVaiTro') maVaiTro: string, @Body() dto: SuaVaiTroDto) {
    return this.service.suaVaiTro(request.taiKhoanDaXacThuc, maVaiTro, dto)
  }

  @Delete('vai-tro/:maVaiTro')
  xoaVaiTro(@Req() request: YeuCauDaXacThuc, @Param('maVaiTro') maVaiTro: string) {
    return this.service.xoaVaiTro(request.taiKhoanDaXacThuc, maVaiTro)
  }

  @Patch('vai-tro/:maVaiTro/quyen')
  capNhatQuyen(@Req() request: YeuCauDaXacThuc, @Param('maVaiTro') maVaiTro: string, @Body() dto: CapNhatQuyenVaiTroDto) {
    return this.service.capNhatQuyenVaiTro(request.taiKhoanDaXacThuc, maVaiTro, dto)
  }

  @Post('phan-cong-vai-tro')
  taoPhanCong(@Req() request: YeuCauDaXacThuc, @Body() dto: TaoPhanCongVaiTroDto) {
    return this.service.taoPhanCong(request.taiKhoanDaXacThuc, dto)
  }

  @Get('phan-cong-vai-tro')
  danhSachPhanCong(@Req() request: YeuCauDaXacThuc, @Query() query: LocPhanCongVaiTroDto) {
    return this.service.danhSachPhanCong(request.taiKhoanDaXacThuc, query.maTaiKhoan)
  }

  @Get('phan-cong-vai-tro/cua-toi')
  danhSachPhanCongCuaToi(@Req() request: YeuCauDaXacThuc) {
    return this.service.danhSachPhanCong(request.taiKhoanDaXacThuc, request.taiKhoanDaXacThuc.maTaiKhoan)
  }

  @Patch('phan-cong-vai-tro/:maPhanCong')
  suaPhanCong(@Req() request: YeuCauDaXacThuc, @Param('maPhanCong') maPhanCong: string, @Body() dto: SuaPhanCongVaiTroDto) {
    return this.service.suaPhanCong(request.taiKhoanDaXacThuc, maPhanCong, dto)
  }

  @Post('phan-cong-vai-tro/:maPhanCong/thu-hoi')
  thuHoi(@Req() request: YeuCauDaXacThuc, @Param('maPhanCong') maPhanCong: string, @Body() dto: ThuHoiPhanCongVaiTroDto) {
    return this.service.thuHoiPhanCong(request.taiKhoanDaXacThuc, maPhanCong, dto.lyDo)
  }
}
