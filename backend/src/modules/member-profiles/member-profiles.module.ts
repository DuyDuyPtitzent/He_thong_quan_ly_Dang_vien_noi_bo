import { Module } from '@nestjs/common'
import { XacThucModule } from '../auth/auth.module'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { HoSoDangVienController } from './member-profiles.controller'
import { HoSoDangVienService } from './member-profiles.service'
import { YeuCauCapNhatHoSoService } from './member-profile-updates.service'
import { MemberProfileDocumentsService } from './member-profile-documents.service'
import { DataTransferModule } from '../data-transfer/data-transfer.module'

@Module({ imports: [XacThucModule, PhanQuyenModule, DataTransferModule], controllers: [HoSoDangVienController], providers: [HoSoDangVienService, YeuCauCapNhatHoSoService, MemberProfileDocumentsService] })
export class HoSoDangVienModule {}
