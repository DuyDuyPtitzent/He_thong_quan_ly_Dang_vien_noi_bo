import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'
import type { Request } from 'express'

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
    const request = http.getRequest<Request>()
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
        ? (noiDung as { maLoi?: unknown; thongBao?: unknown; chiTietLoi?: unknown })
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
    const chiTietLoi = coLoiTuyChinhAnToan && Array.isArray(loiTuyChinh?.chiTietLoi)
      ? loiTuyChinh.chiTietLoi.flatMap((item) => {
          if (typeof item !== 'object' || item === null) return []
          const chiTiet = item as { tenTruong?: unknown; maLoi?: unknown }
          if (typeof chiTiet.tenTruong !== 'string' || !Array.isArray(chiTiet.maLoi)) return []
          return [{ tenTruong: chiTiet.tenTruong, maLoi: chiTiet.maLoi.filter((ma): ma is string => typeof ma === 'string') }]
        })
      : undefined
    const maTuongQuan = phanHoi.getHeader('X-Correlation-Id')

    if (maTrangThaiHttp >= 500) {
      this.logger.error(
        JSON.stringify({
          maLoi,
          maTuongQuan,
          loaiNgoaiLe: this.loaiNgoaiLe(ngoaiLe),
          chiTietPrisma: this.chiTietPrisma(ngoaiLe),
          hinhDangQuery: this.hinhDangQuery(request.query),
          viTriLoi: this.viTriLoi(ngoaiLe),
        }),
      )
    }

    phanHoi.status(maTrangThaiHttp).json({ maLoi, thongBao, maTuongQuan, ...(chiTietLoi ? { chiTietLoi } : {}) })
  }

  private loaiNgoaiLe(ngoaiLe: unknown) {
    return ngoaiLe instanceof Error ? ngoaiLe.constructor.name : 'NgoaiLeKhongXacDinh'
  }

  private viTriLoi(ngoaiLe: unknown) {
    if (!(ngoaiLe instanceof TypeError) || !ngoaiLe.stack) return undefined
    return ngoaiLe.stack
      .split('\n')
      .slice(1, 4)
      .map((dong) => dong.trim())
  }

  private chiTietPrisma(ngoaiLe: unknown) {
    if (!(ngoaiLe instanceof Error)) return undefined
    if (ngoaiLe.name === 'PrismaClientKnownRequestError') {
      const known = ngoaiLe as Error & { code?: unknown; meta?: unknown }
      const meta = typeof known.meta === 'object' && known.meta !== null ? known.meta as Record<string, unknown> : {}
      const safeMeta: Record<string, string | number | boolean | (string | number | boolean)[]> = {}
      // Known-request metadata describes the failing model/constraint. Exclude arbitrary values and SQL text.
      for (const key of ['modelName', 'field_name', 'target', 'constraint', 'relation_name', 'column']) {
        const value = meta[key]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') safeMeta[key] = value
        else if (Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) safeMeta[key] = value as (string | number | boolean)[]
      }
      return { prismaCode: typeof known.code === 'string' ? known.code : undefined, meta: safeMeta }
    }
    if (ngoaiLe.name !== 'PrismaClientValidationError') return undefined
    const invocation = ngoaiLe.message.match(/Invalid `([^`]+)` invocation/)
    const unknown = ngoaiLe.message.match(/Unknown (argument|field)\s+[`'\"]([^`'\"]+)[`'\"]/i)
    const invalidValue = ngoaiLe.message.match(/Argument\s+[`'\"]([^`'\"]+)[`'\"]:\s*Invalid value provided\. Expected ([^,\r\n]+), provided ([^.\r\n]+)\./i)
    const invalidArgument = ngoaiLe.message.match(/Argument\s+[`'\"]([^`'\"]+)[`'\"]\s+(is missing|is invalid|has invalid)/i)
    return {
      invocation: invocation?.[1],
      validationIssue: unknown ? `${unknown[1]}:${unknown[2]}` : undefined,
      invalidArgument: invalidValue?.[1] && invalidValue[2] && invalidValue[3]
        ? `${invalidValue[1]}:expected ${invalidValue[2].trim()}, received ${invalidValue[3].trim()}`
        : invalidArgument ? `${invalidArgument[1]}:${invalidArgument[2]}` : undefined,
    }
  }

  private hinhDangQuery(query: Request['query']) {
    return Object.fromEntries(
      Object.entries(query).map(([key, value]) => [
        key,
        Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
      ]),
    )
  }
}
