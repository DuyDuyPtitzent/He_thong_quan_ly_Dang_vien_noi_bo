import { Logger } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '../src/infrastructure/database/generated/prisma/client'
import { BoLocLoiHttp } from '../src/common/errors/http-exception.filter'

describe('BoLocLoiHttp Prisma diagnostics', () => {
  it('logs the invalid Prisma argument and types without logging query values', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const response = { getHeader: () => 'correlation-2', status: vi.fn().mockReturnThis(), json: vi.fn() }
    const request = { query: { trang: '1', kichThuoc: '20' }, method: 'GET', url: '/api/v1/nhat-ky-he-thong/thao-tac' }
    const host = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) }
    const error = new Prisma.PrismaClientValidationError(
      'Invalid `prisma.nhatKyKiemToan.count()` invocation. Argument `take`: Invalid value provided. Expected Int, provided String. The rejected value was "PRIVATE_VALUE".',
      { clientVersion: 'test' },
    )

    new BoLocLoiHttp().catch(error, host as never)

    const logged = String(errorLog.mock.calls[0]?.[0])
    expect(logged).toContain('take:expected Int, received String')
    expect(logged).not.toContain('PRIVATE_VALUE')
    errorLog.mockRestore()
  })

  it('logs a known Prisma error code and safe constraint metadata without exposing arbitrary values', () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const response = { getHeader: () => 'correlation-1', status: vi.fn().mockReturnThis(), json: vi.fn() }
    const request = { query: {}, method: 'POST', url: '/api/v1/ho-so-dang-vien/nhap-xuat/xac-nhan' }
    const host = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) }
    const error = new Prisma.PrismaClientKnownRequestError('constraint failed', {
      code: 'P2003',
      clientVersion: 'test',
      meta: { modelName: 'LichSuDonViDangVien', field_name: 'maChiBo', target: ['ma_chi_bo'], sql: 'sensitive SQL value' },
    })

    new BoLocLoiHttp().catch(error, host as never)

    const logged = String(errorLog.mock.calls[0]?.[0])
    expect(logged).toContain('P2003')
    expect(logged).toContain('maChiBo')
    expect(logged).not.toContain('sensitive SQL value')
    expect(response.status).toHaveBeenCalledWith(500)
    errorLog.mockRestore()
  })
})
