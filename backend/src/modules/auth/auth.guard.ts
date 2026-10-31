import { CanActivate, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { XacThucService } from './auth.service'
import type { YeuCauDaXacThuc } from './auth.types'

@Injectable()
export class XacThucGuard implements CanActivate {
  constructor(@Inject(XacThucService) private readonly xacThuc: XacThucService) {}

  async canActivate(nguCanh: { switchToHttp: () => { getRequest: () => Request } }) {
    const yeuCau = nguCanh.switchToHttp().getRequest() as YeuCauDaXacThuc
    const tokenPhien = this.xacThuc.layTokenPhien(yeuCau)
    const phien = await this.xacThuc.layPhien(tokenPhien)

    if (!phien) {
      throw new UnauthorizedException({
        maLoi: 'CHUA_XAC_THUC',
        thongBao: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      })
    }

    yeuCau.taiKhoanDaXacThuc = {
      maTaiKhoan: phien.taiKhoan.maTaiKhoan,
      tenDangNhap: phien.taiKhoan.tenDangNhap,
      doiMatKhauLanDau: phien.taiKhoan.doiMatKhauLanDau,
      maPhien: phien.maPhien,
    }
    return true
  }
}
