import 'dotenv/config'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { UngDungModule } from './app.module'
import { cauHinhUngDung } from './app.config'

async function khoiDongMayChu() {
  const ungDung = await NestFactory.create(UngDungModule, { bufferLogs: true })
  cauHinhUngDung(ungDung)
  ungDung.enableShutdownHooks()

  const cauHinh = ungDung.get(ConfigService)
  const cong = cauHinh.get<number>('CONG_MAY_CHU', 3001)
  const diaChi = cauHinh.get<string>('DIA_CHI_MAY_CHU', '127.0.0.1')

  await ungDung.listen(cong, diaChi)
}

void khoiDongMayChu()
