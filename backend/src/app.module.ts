import { Module } from '@nestjs/common'
import { CauHinhModule } from './common/config/config.module'
import { CoSoDuLieuModule } from './infrastructure/database/database.module'
import { XacThucModule } from './modules/auth/auth.module'
import { SucKhoeModule } from './modules/health/health.module'

@Module({
  imports: [CauHinhModule, CoSoDuLieuModule, XacThucModule, SucKhoeModule],
})
export class UngDungModule {}
