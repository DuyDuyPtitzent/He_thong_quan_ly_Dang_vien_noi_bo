import 'reflect-metadata'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { DotHocNghiQuyetController } from '../src/modules/resolution-learning/learning.controller'
import { HocTapNghiQuyetService } from '../src/modules/resolution-learning/learning.service'

describe('Resolution learning API integration', () => {
  let app: INestApplication | undefined
  afterEach(async () => { await app?.close(); app = undefined })

  it('routes authenticated campaign list requests through DTO transformation to the service', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { danhSachDot: vi.fn().mockResolvedValue({ duLieu: [], phanTrang: { trang: 2, gioiHan: 20, tongSo: 0 } }) }
    const module = await Test.createTestingModule({ controllers: [DotHocNghiQuyetController], providers: [{ provide: HocTapNghiQuyetService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } })
      .compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
    await request(app.getHttpServer()).get('/api/v1/dot?trang=2&gioiHan=20').expect(200)
    expect(service.danhSachDot).toHaveBeenCalledWith(actor, expect.objectContaining({ trang: 2, gioiHan: 20 }))
  })

  it('rejects malformed UUIDs at the HTTP boundary without calling business services', async () => {
    const service = { chiTietDot: vi.fn() }
    const module = await Test.createTestingModule({ controllers: [DotHocNghiQuyetController], providers: [{ provide: HocTapNghiQuyetService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: () => true }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.init()
    await request(app.getHttpServer()).get('/api/v1/dot/not-a-uuid').expect(400)
    expect(service.chiTietDot).not.toHaveBeenCalled()
  })

  it('rejects a create-session request without hinhThuc before entering the service', async () => {
    const service = { taoBuoi: vi.fn() }
    const module = await Test.createTestingModule({ controllers: [DotHocNghiQuyetController], providers: [{ provide: HocTapNghiQuyetService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: () => true }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
    await request(app.getHttpServer()).post('/api/v1/dot/00000000-0000-4000-8000-000000000012/buoi').send({
      ten: 'Buổi học', batDauLuc: '2026-11-20T08:00:00+07:00', ketThucLuc: '2026-11-20T10:00:00+07:00',
      phamViDonVi: ['00000000-0000-4000-8000-000000000011'], moTheoKeHoachLuc: '2026-11-20T08:00:00+07:00', dongTheoKeHoachLuc: '2026-11-20T10:00:00+07:00',
    }).expect(400)
    expect(service.taoBuoi).not.toHaveBeenCalled()
  })

  it('routes roster reads with validated pagination and filters', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { danhSachThamGia: vi.fn().mockResolvedValue({ duLieu: [], phanTrang: { trang: 1, gioiHan: 20, tongSo: 0 } }) }
    const module = await Test.createTestingModule({ controllers: [DotHocNghiQuyetController], providers: [{ provide: HocTapNghiQuyetService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } })
      .compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
    await request(app.getHttpServer()).get('/api/v1/buoi/00000000-0000-4000-8000-000000000012/danh-sach?trang=1&gioiHan=20&tuKhoa=Lan&trangThai=DA_LOAI').expect(200)
    expect(service.danhSachThamGia).toHaveBeenCalledWith(actor, '00000000-0000-4000-8000-000000000012', expect.objectContaining({ trang: 1, gioiHan: 20, tuKhoa: 'Lan', trangThai: 'DA_LOAI' }))
  })

  it('rejects roster confirmation without an expected version before entering the service', async () => {
    const service = { xacNhanDanhSach: vi.fn() }
    const module = await Test.createTestingModule({ controllers: [DotHocNghiQuyetController], providers: [{ provide: HocTapNghiQuyetService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: () => true }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
    await request(app.getHttpServer()).post('/api/v1/buoi/00000000-0000-4000-8000-000000000012/danh-sach/xac-nhan-du-kien').send({}).expect(400)
    expect(service.xacNhanDanhSach).not.toHaveBeenCalled()
  })
})
