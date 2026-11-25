import { Inject, Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'
import { BaoMatDiemDanhService } from './attendance-security.service'

@Injectable()
export class GioiHanDiemDanhCongKhaiMiddleware implements NestMiddleware {
  constructor(@Inject(DichVuPrisma) private readonly prisma: DichVuPrisma, @Inject(BaoMatDiemDanhService) private readonly security: BaoMatDiemDanhService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method !== 'POST') return next()
    const route = req.path.endsWith('/cong-khai/cua-so/truy-cap') ? 'TRUY_CAP' : req.path.endsWith('/cong-khai/yeu-cau') ? 'GUI_YEU_CAU' : null
    if (!route) return next()
    try {
      const allowed = await this.prisma.$transaction(tx => this.security.gioiHan(tx, req.ip || 'unknown', route))
      if (!allowed) {
        res.setHeader('Retry-After', '60')
        return res.status(429).json({ maLoi: route === 'GUI_YEU_CAU' ? 'QUA_GIOI_HAN_GUI' : 'QUA_GIOI_HAN_TRUY_CAP', thongBao: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' })
      }
      return next()
    } catch {
      return res.status(503).json({ maLoi: 'GIOI_HAN_CONG_KHAI_CHUA_SAN_SANG', thongBao: 'Dịch vụ tiếp nhận tạm thời chưa sẵn sàng.' })
    }
  }
}
