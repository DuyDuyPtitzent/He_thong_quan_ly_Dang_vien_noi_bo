import { Module } from '@nestjs/common'
import { XacThucModule } from '../auth/auth.module'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { NamHocController } from './school-years.controller'
import { NamHocService } from './school-years.service'

@Module({ imports: [XacThucModule, PhanQuyenModule], controllers: [NamHocController], providers: [NamHocService] })
export class NamHocModule {}
