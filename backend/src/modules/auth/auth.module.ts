import { Module } from '@nestjs/common'
import { XacThucController } from './auth.controller'
import { XacThucGuard } from './auth.guard'
import { XacThucService } from './auth.service'
import { BamMatKhauService } from './password-hasher'

@Module({
  controllers: [XacThucController],
  providers: [XacThucService, XacThucGuard, BamMatKhauService],
  exports: [XacThucGuard, XacThucService, BamMatKhauService],
})
export class XacThucModule {}
