import { Module } from '@nestjs/common'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { ToChucController } from './organizations.controller'
import { ToChucService } from './organizations.service'

@Module({
  imports: [PhanQuyenModule],
  controllers: [ToChucController],
  providers: [ToChucService],
})
export class ToChucModule {}
