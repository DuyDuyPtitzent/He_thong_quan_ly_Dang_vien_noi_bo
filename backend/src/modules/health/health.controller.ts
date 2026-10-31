import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'

@Controller('suc-khoe')
export class KiemTraSucKhoeController {
  constructor(@Inject(DichVuPrisma) private readonly dichVuPrisma: DichVuPrisma) {}

  @Get()
  async kiemTraSanSang() {
    try {
      await this.dichVuPrisma.kiemTraKetNoi()
      return {
        trangThaiMayChu: 'SAN_SANG',
        trangThaiCoSoDuLieu: 'SAN_SANG',
      }
    } catch {
      throw new ServiceUnavailableException({
        maLoi: 'CO_SO_DU_LIEU_CHUA_SAN_SANG',
        thongBao: 'Cơ sở dữ liệu hiện chưa sẵn sàng.',
      })
    }
  }
}
