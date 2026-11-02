import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import type { YeuCauDaXacThuc } from '../auth/auth.types'
import { PhanQuyenService } from './authorization.service'
import { PERMISSION_METADATA, type YeuCauPhamVi } from './authorization.types'

type AuthorizationRequest = Request & Partial<YeuCauDaXacThuc>

@Injectable()
export class PhanQuyenGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PhanQuyenService) private readonly phanQuyen: PhanQuyenService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const maQuyen = this.reflector.getAllAndOverride<string>(PERMISSION_METADATA, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!maQuyen) return true

    const request = context.switchToHttp().getRequest<AuthorizationRequest>()
    if (!request.taiKhoanDaXacThuc) {
      throw new ForbiddenException({
        maLoi: 'CHUA_XAC_THUC',
        thongBao: 'Cần đăng nhập để thực hiện thao tác này.',
      })
    }

    // Routes supply resource identifiers in route params; body/query values never widen scope.
    const target: YeuCauPhamVi = {
      maDonVi: this.chuoiThamSo(request.params?.maDonVi),
      maHoSo: this.chuoiThamSo(request.params?.maHoSo),
    }
    await this.phanQuyen.kiemTra(request.taiKhoanDaXacThuc.maTaiKhoan, maQuyen, target)
    return true
  }

  private chuoiThamSo(value: string | string[] | undefined) {
    return typeof value === 'string' ? value : undefined
  }
}
