import 'reflect-metadata'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { HocTapCaNhanController } from '../src/modules/resolution-learning/personal-learning.controller'
import { HocTapCaNhanService } from '../src/modules/resolution-learning/personal-learning.service'

describe('Personal learning API HTTP contract', () => {
  let app: INestApplication | undefined
  afterEach(async () => { await app?.close(); app = undefined })
  it('exposes only the approved endpoints, validates pagination and rejects client-selected profiles', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { lich: vi.fn().mockResolvedValue({ duLieu: [], phanTrang: { trang: 2, gioiHan: 10, tongSo: 0 } }), chiTiet: vi.fn().mockResolvedValue({}), lichSu: vi.fn().mockResolvedValue({ duLieu: [] }) }
    const module = await Test.createTestingModule({ controllers: [HocTapCaNhanController], providers: [{ provide: HocTapCaNhanService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })); await app.init()
    const id = '00000000-0000-4000-8000-000000000010'
    await request(app.getHttpServer()).get('/api/v1/ca-nhan/lich?trang=2&gioiHan=10&phanLoai=DANG_DIEN_RA').expect(200)
    await request(app.getHttpServer()).get(`/api/v1/ca-nhan/buoi/${id}`).expect(200)
    await request(app.getHttpServer()).get('/api/v1/ca-nhan/lich-su?maHoSo=' + id).expect(400)
    await request(app.getHttpServer()).get('/api/v1/ca-nhan/lich?gioiHan=1000').expect(400)
    expect(service.lich).toHaveBeenCalledWith(actor, expect.objectContaining({ trang: 2, gioiHan: 10, phanLoai: 'DANG_DIEN_RA' }))
    expect(service.chiTiet).toHaveBeenCalledWith(actor, id)
    expect(service.lichSu).not.toHaveBeenCalled()
  })
})
