import 'reflect-metadata'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { XuatKetQuaDiemDanhController } from '../src/modules/resolution-learning/attendance-export.controller'
import { XuatKetQuaDiemDanhService } from '../src/modules/resolution-learning/attendance-export.service'

describe('Attendance export HTTP contract', () => {
  let app: INestApplication | undefined
  afterEach(async () => { await app?.close(); app = undefined })
  it('routes approved config/export APIs, validates body, and sends a private xlsx attachment', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { cauHinh: vi.fn().mockResolvedValue({ truong: [{ key: 'stt', label: 'STT', group: 'Danh sách' }], boLoc: {} }), xuat: vi.fn().mockResolvedValue(Buffer.from('xlsx')) }
    const module = await Test.createTestingModule({ controllers: [XuatKetQuaDiemDanhController], providers: [{ provide: XuatKetQuaDiemDanhService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })); await app.init()
    await request(app.getHttpServer()).get('/api/v1/xuat/cau-hinh').expect(200)
    const id = '00000000-0000-4000-8000-000000000010'
    const response = await request(app.getHttpServer()).post('/api/v1/xuat').send({ maBuoi: id, truong: ['stt'], baoGomBuoiDaHuy: true }).expect(200)
    expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(response.headers['content-disposition']).toContain('ket-qua-diem-danh.xlsx')
    expect(response.headers['cache-control']).toContain('no-store')
    expect(service.xuat).toHaveBeenCalledWith(actor, expect.objectContaining({ maBuoi: id, truong: ['stt'], baoGomBuoiDaHuy: true }))
    await request(app.getHttpServer()).post('/api/v1/xuat').send({ maBuoi: id, truong: ['stt'], fieldDatabase: 'so_cccd' }).expect(400)
    await request(app.getHttpServer()).post('/api/v1/xuat').send({ maBuoi: id, truong: ['stt', 'stt'] }).expect(400)
  })
})
