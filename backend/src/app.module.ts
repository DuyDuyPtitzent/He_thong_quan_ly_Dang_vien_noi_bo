import { Module } from '@nestjs/common'
import { CauHinhModule } from './common/config/config.module'
import { CoSoDuLieuModule } from './infrastructure/database/database.module'
import { XacThucModule } from './modules/auth/auth.module'
import { PhanQuyenModule } from './modules/authorization/authorization.module'
import { ToChucModule } from './modules/organizations/organizations.module'
import { SucKhoeModule } from './modules/health/health.module'

@Module({
  imports: [CauHinhModule, CoSoDuLieuModule, XacThucModule, PhanQuyenModule, ToChucModule, SucKhoeModule],
})
export class UngDungModule {}
