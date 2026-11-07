import { Module } from '@nestjs/common'
import { XacThucModule } from '../auth/auth.module'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { DataTransferModule } from '../data-transfer/data-transfer.module'
import { TaiKhoanController } from './accounts.controller'
import { TaiKhoanService } from './accounts.service'

@Module({
  imports: [XacThucModule, PhanQuyenModule, DataTransferModule],
  controllers: [TaiKhoanController],
  providers: [TaiKhoanService],
})
export class TaiKhoanModule {}
