import { Module } from '@nestjs/common'
import { XacThucModule } from '../auth/auth.module'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { NhatKyHeThongController } from './system-logs.controller'
import { NhatKyHeThongService } from './system-logs.service'

@Module({ imports: [XacThucModule, PhanQuyenModule], controllers: [NhatKyHeThongController], providers: [NhatKyHeThongService] })
export class NhatKyHeThongModule {}
