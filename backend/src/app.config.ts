import { BadRequestException, ValidationPipe, type INestApplication, type ValidationError } from '@nestjs/common'
import { BoLocLoiHttp } from './common/errors/http-exception.filter'
import { GhiLogYeuCauMiddleware } from './common/logging/request-logging.middleware'

function chiTietLoiValidation(lois: ValidationError[], cha = ''): { tenTruong: string; maLoi: string[] }[] {
  return lois.flatMap((loi) => {
    const tenTruong = cha ? `${cha}.${loi.property}` : loi.property
    const loiHienTai = loi.constraints ? [{ tenTruong, maLoi: Object.keys(loi.constraints) }] : []
    return [...loiHienTai, ...chiTietLoiValidation(loi.children ?? [], tenTruong)]
  })
}

export function cauHinhUngDung(ungDung: INestApplication) {
  ungDung.setGlobalPrefix('api/v1')
  const ghiLog = new GhiLogYeuCauMiddleware()
  ungDung.use(ghiLog.use.bind(ghiLog))
  ungDung.useGlobalFilters(new BoLocLoiHttp())
  ungDung.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (loi) =>
        new BadRequestException({
          maLoi: 'DU_LIEU_KHONG_HOP_LE',
          thongBao: 'Dữ liệu gửi lên không hợp lệ.',
          chiTietLoi: chiTietLoiValidation(loi),
        }),
    }),
  )
}
