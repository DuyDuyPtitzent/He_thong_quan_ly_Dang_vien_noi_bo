import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import { RequirePermission } from '../authorization/require-permission.decorator'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { CapNhatTrangThaiDonViDto, CayDonViDto, DanhSachDonViDto, DoiQuanHeChaDto, DoiTenDonViDto, SuaDonViDto, TaoDonViDto } from './organizations.dto'
import { ToChucService } from './organizations.service'

@Controller('to-chuc')
export class ToChucController {
  constructor(@Inject(ToChucService) private readonly toChuc: ToChucService) {}

  @Get()
  @UseGuards(XacThucGuard)
  danhSach(@Req() request: YeuCauDaXacThuc, @Query() query: DanhSachDonViDto) {
    return this.toChuc.danhSach(request.taiKhoanDaXacThuc, query)
  }

  @Get('cay')
  @UseGuards(XacThucGuard)
  cay(@Req() request: YeuCauDaXacThuc, @Query() query: CayDonViDto) {
    return this.toChuc.cay(request.taiKhoanDaXacThuc, query.thoiDiem ? new Date(query.thoiDiem) : new Date())
  }

  @Get(':maDonVi/lich-su-quan-he')
  @RequirePermission('TO_CHUC_XEM_LICH_SU')
  lichSu(@Param('maDonVi') maDonVi: string) { return this.toChuc.lichSuQuanHe(maDonVi) }

  @Get(':maDonVi')
  @RequirePermission('TO_CHUC_XEM')
  chiTiet(@Param('maDonVi') maDonVi: string) { return this.toChuc.chiTiet(maDonVi) }

  @Post()
  @UseGuards(XacThucGuard)
  tao(@Req() request: YeuCauDaXacThuc, @Body() dto: TaoDonViDto) {
    return this.toChuc.tao(request.taiKhoanDaXacThuc, dto)
  }

  @Patch(':maDonVi')
  @RequirePermission('TO_CHUC_SUA_THONG_TIN')
  sua(@Req() request: YeuCauDaXacThuc, @Param('maDonVi') maDonVi: string, @Body() dto: SuaDonViDto) {
    return this.toChuc.sua(request.taiKhoanDaXacThuc, maDonVi, dto)
  }

  @Patch(':maDonVi/trang-thai')
  @UseGuards(XacThucGuard)
  capNhatTrangThai(@Req() request: YeuCauDaXacThuc, @Param('maDonVi') maDonVi: string, @Body() dto: CapNhatTrangThaiDonViDto) {
    return this.toChuc.capNhatTrangThai(request.taiKhoanDaXacThuc, maDonVi, dto)
  }

  @Post(':maDonVi/doi-ten')
  @UseGuards(XacThucGuard)
  doiTen(@Req() request: YeuCauDaXacThuc, @Param('maDonVi') maDonVi: string, @Body() dto: DoiTenDonViDto) {
    return this.toChuc.doiTen(request.taiKhoanDaXacThuc, maDonVi, dto)
  }

  @Post(':maDonVi/cap-nhat-quan-he-cha')
  @UseGuards(XacThucGuard)
  doiQuanHeCha(@Req() request: YeuCauDaXacThuc, @Param('maDonVi') maDonVi: string, @Body() dto: DoiQuanHeChaDto) {
    return this.toChuc.doiQuanHeCha(request.taiKhoanDaXacThuc, maDonVi, dto)
  }

  @Delete(':maDonVi')
  @RequirePermission('TO_CHUC_XOA')
  xoa(@Req() request: YeuCauDaXacThuc, @Param('maDonVi') maDonVi: string) {
    return this.toChuc.xoa(request.taiKhoanDaXacThuc, maDonVi)
  }
}
