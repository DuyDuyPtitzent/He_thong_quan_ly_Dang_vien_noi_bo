import { Module } from '@nestjs/common'
import { XacThucModule } from '../auth/auth.module'
import { QuanTriPhanQuyenController } from './authorization-admin.controller'
import { QuanTriPhanQuyenService } from './authorization-admin.service'
import { PhanQuyenGuard } from './authorization.guard'
import { PhanQuyenService } from './authorization.service'

@Module({
  imports: [XacThucModule],
  controllers: [QuanTriPhanQuyenController],
  providers: [PhanQuyenService, PhanQuyenGuard, QuanTriPhanQuyenService],
  exports: [XacThucModule, PhanQuyenService, PhanQuyenGuard],
})
export class PhanQuyenModule {}
