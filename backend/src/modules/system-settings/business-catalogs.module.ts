import { Module } from '@nestjs/common'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { DanhMucNghiepVuController } from './business-catalogs.controller'
import { DanhMucNghiepVuService } from './business-catalogs.service'

@Module({ imports: [PhanQuyenModule], controllers: [DanhMucNghiepVuController], providers: [DanhMucNghiepVuService], exports: [DanhMucNghiepVuService] })
export class DanhMucNghiepVuModule {}
