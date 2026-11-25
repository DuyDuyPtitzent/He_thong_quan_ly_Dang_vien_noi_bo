import 'reflect-metadata'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { ThongKeHocTapNghiQuyetController } from '../src/modules/resolution-learning/statistics.controller'
import { ThongKeHocTapNghiQuyetService } from '../src/modules/resolution-learning/statistics.service'

describe('Resolution learning statistics API HTTP contract', () => {
  let app: INestApplication | undefined
  afterEach(async () => { await app?.close(); app = undefined })

  it('routes the five approved endpoints through authenticated service methods with validated filters', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { theoDot: vi.fn().mockResolvedValue({ tongLuot: 0 }), theoBuoi: vi.fn().mockResolvedValue({ tongThuocDien: 0 }), theoChiBo: vi.fn().mockResolvedValue({ duLieu: [] }), xuHuong: vi.fn().mockResolvedValue({ duLieu: [] }), mucDoThamGia: vi.fn().mockResolvedValue({ tongDangVienTrongTapApDung: 0 }) }
    const module = await Test.createTestingModule({ controllers: [ThongKeHocTapNghiQuyetController], providers: [{ provide: ThongKeHocTapNghiQuyetService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })); await app.init()
    const dotId = '00000000-0000-4000-8000-000000000010'; const buoiId = '00000000-0000-4000-8000-000000000011'
    await request(app.getHttpServer()).get(`/api/v1/thong-ke/dot/${dotId}?maChiBo=${dotId}`).expect(200)
    await request(app.getHttpServer()).get(`/api/v1/thong-ke/buoi/${buoiId}`).expect(200)
    await request(app.getHttpServer()).get(`/api/v1/thong-ke/theo-chi-bo?maDot=${dotId}`).expect(200)
    await request(app.getHttpServer()).get(`/api/v1/thong-ke/xu-huong?tuLuc=2026-01-01T00:00:00Z`).expect(200)
    await request(app.getHttpServer()).get(`/api/v1/thong-ke/muc-do-tham-gia?maDot=${dotId}`).expect(200)
    await request(app.getHttpServer()).get('/api/v1/thong-ke/muc-do-tham-gia?maDot=bad').expect(400)
    expect(service.theoDot).toHaveBeenCalledWith(actor, dotId, expect.objectContaining({ maChiBo: dotId }))
    expect(service.theoBuoi).toHaveBeenCalledWith(actor, buoiId)
    expect(service.theoChiBo).toHaveBeenCalledWith(actor, expect.objectContaining({ maDot: dotId }))
    expect(service.xuHuong).toHaveBeenCalledWith(actor, expect.objectContaining({ tuLuc: '2026-01-01T00:00:00Z' }))
    expect(service.mucDoThamGia).toHaveBeenCalledWith(actor, expect.objectContaining({ maDot: dotId }))
  })
})
