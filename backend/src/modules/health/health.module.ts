import { Module } from '@nestjs/common'
import { KiemTraSucKhoeController } from './health.controller'

@Module({
  controllers: [KiemTraSucKhoeController],
})
export class SucKhoeModule {}
