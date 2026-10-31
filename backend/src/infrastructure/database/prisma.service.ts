import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

@Injectable()
export class DichVuPrisma extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ConfigService) cauHinh: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: cauHinh.getOrThrow<string>('KET_NOI_CO_SO_DU_LIEU'),
      }),
    })
  }

  async kiemTraKetNoi() {
    await this.$queryRaw`SELECT 1`
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
