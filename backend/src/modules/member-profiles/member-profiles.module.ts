import { Module } from '@nestjs/common'
import { XacThucModule } from '../auth/auth.module'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { HoSoDangVienController } from './member-profiles.controller'
import { HoSoDangVienService } from './member-profiles.service'
import { YeuCauCapNhatHoSoService } from './member-profile-updates.service'

@Module({ imports: [XacThucModule, PhanQuyenModule], controllers: [HoSoDangVienController], providers: [HoSoDangVienService, YeuCauCapNhatHoSoService] })
export class HoSoDangVienModule {}
