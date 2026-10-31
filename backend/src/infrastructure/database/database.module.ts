import { Global, Module } from '@nestjs/common'
import { DichVuPrisma } from './prisma.service'

@Global()
@Module({
  providers: [DichVuPrisma],
  exports: [DichVuPrisma],
})
export class CoSoDuLieuModule {}
