import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class TepTaiLenExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const code = typeof exception === 'object' && exception !== null && 'code' in exception ? String((exception as { code: unknown }).code) : ''
    if (code === 'LIMIT_FILE_SIZE' || (exception instanceof HttpException && exception.getStatus() === HttpStatus.PAYLOAD_TOO_LARGE)) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({ maLoi: 'TEP_VUOT_QUA_DUNG_LUONG', thongBao: 'Dung lượng mỗi tệp tối đa là 10 MB.' })
      return
    }
    if (code === 'LIMIT_FILE_COUNT' || code === 'LIMIT_UNEXPECTED_FILE') {
      response.status(HttpStatus.BAD_REQUEST).json({ maLoi: 'CHI_MOT_TEP_DUOC_PHEP', thongBao: 'Mỗi lần chỉ được tải lên một tệp trong trường “tep”.' })
      return
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse())
      return
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ maLoi: 'TAI_TEP_KHONG_THANH_CONG', thongBao: 'Không thể xử lý tệp tải lên. Vui lòng thử lại.' })
  }
}
