import { Injectable, Logger, type NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

const mauMaTuongQuan = /^[A-Za-z0-9-]{1,64}$/

@Injectable()
export class GhiLogYeuCauMiddleware implements NestMiddleware {
  private readonly logger = new Logger('NhatKyYeuCau')

  use(yeuCau: Request, phanHoi: Response, tiepTheo: NextFunction) {
    const maGuiLen = yeuCau.headers['x-correlation-id']
    const maTuongQuan =
      typeof maGuiLen === 'string' && mauMaTuongQuan.test(maGuiLen) ? maGuiLen : randomUUID()
    const batDau = performance.now()

    phanHoi.setHeader('X-Correlation-Id', maTuongQuan)
    phanHoi.on('finish', () => {
      const maTrangThaiHttp = phanHoi.statusCode
      const suKien = JSON.stringify({
        thoiGian: new Date().toISOString(),
        mucDo: maTrangThaiHttp >= 500 ? 'LOI' : maTrangThaiHttp >= 400 ? 'CANH_BAO' : 'THONG_TIN',
        maTuongQuan,
        phuongThuc: yeuCau.method,
        duongDan: yeuCau.path,
        maTrangThaiHttp,
        thoiGianXuLyMs: Math.round(performance.now() - batDau),
      })

      if (maTrangThaiHttp >= 500) this.logger.error(suKien)
      else if (maTrangThaiHttp >= 400) this.logger.warn(suKien)
      else this.logger.log(suKien)
    })

    tiepTheo()
  }
}
