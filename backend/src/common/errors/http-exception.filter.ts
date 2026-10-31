import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'

const thongBaoTheoMaTrangThai: Record<number, { maLoi: string; thongBao: string }> = {
  400: { maLoi: 'YEU_CAU_KHONG_HOP_LE', thongBao: 'Dữ liệu gửi lên không hợp lệ.' },
  401: { maLoi: 'CHUA_XAC_THUC', thongBao: 'Bạn cần đăng nhập để tiếp tục.' },
  403: { maLoi: 'KHONG_DU_QUYEN', thongBao: 'Bạn không có quyền thực hiện thao tác này.' },
  404: { maLoi: 'KHONG_TIM_THAY', thongBao: 'Không tìm thấy tài nguyên.' },
  409: { maLoi: 'XUNG_DOT_DU_LIEU', thongBao: 'Dữ liệu đang xung đột với trạng thái hiện tại.' },
  503: { maLoi: 'DICH_VU_CHUA_SAN_SANG', thongBao: 'Một dịch vụ cần thiết hiện chưa sẵn sàng.' },
}

@Catch()
export class BoLocLoiHttp implements ExceptionFilter {
  private readonly logger = new Logger('BoLocLoiHttp')

  catch(ngoaiLe: unknown, nguCanh: ArgumentsHost) {
    const http = nguCanh.switchToHttp()
    const phanHoi = http.getResponse<Response>()
    const maTrangThaiHttp = ngoaiLe instanceof HttpException ? ngoaiLe.getStatus() : 500
    const loiMacDinh =
      thongBaoTheoMaTrangThai[maTrangThaiHttp] ?? {
        maLoi: 'LOI_MAY_CHU',
        thongBao: 'Máy chủ gặp lỗi khi xử lý yêu cầu.',
      }
    const noiDung = ngoaiLe instanceof HttpException ? ngoaiLe.getResponse() : undefined
    const loiTuyChinh =
      typeof noiDung === 'object' && noiDung !== null
        ? (noiDung as { maLoi?: unknown; thongBao?: unknown })
        : undefined
    const coLoiTuyChinhAnToan = maTrangThaiHttp < 500 || maTrangThaiHttp === 503
    const maLoi =
      coLoiTuyChinhAnToan && typeof loiTuyChinh?.maLoi === 'string'
        ? loiTuyChinh.maLoi
        : loiMacDinh.maLoi
    const thongBao =
      coLoiTuyChinhAnToan && typeof loiTuyChinh?.thongBao === 'string'
        ? loiTuyChinh.thongBao
        : loiMacDinh.thongBao
    const maTuongQuan = phanHoi.getHeader('X-Correlation-Id')

    if (maTrangThaiHttp >= 500) {
      this.logger.error(JSON.stringify({ maLoi, maTuongQuan, loaiNgoaiLe: this.loaiNgoaiLe(ngoaiLe) }))
    }

    phanHoi.status(maTrangThaiHttp).json({ maLoi, thongBao, maTuongQuan })
  }

  private loaiNgoaiLe(ngoaiLe: unknown) {
    return ngoaiLe instanceof Error ? ngoaiLe.constructor.name : 'NgoaiLeKhongXacDinh'
  }
}
