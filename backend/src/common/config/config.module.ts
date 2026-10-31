import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { kiemTraCauHinh } from './validate-config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: kiemTraCauHinh,
    }),
  ],
})
export class CauHinhModule {}
