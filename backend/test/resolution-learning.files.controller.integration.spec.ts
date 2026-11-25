import 'reflect-metadata'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { TepDinhKemHocTapController } from '../src/modules/resolution-learning/learning-files.controller'
import { TepDinhKemHocTapService } from '../src/modules/resolution-learning/learning-files.service'

describe('Resolution learning attachment API HTTP contract', () => {
  let app: INestApplication | undefined
  afterEach(async () => { await app?.close(); app = undefined })

  it('routes authenticated multipart upload, private download and logical deletion', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const id = '00000000-0000-4000-8000-000000000010'
    const service = {
      taiLenDot: vi.fn().mockResolvedValue({ ma: id, tenTepGoc: 'tai-lieu.pdf', kieuNoiDung: 'application/pdf', kichThuoc: 8, ngayTao: new Date() }),
      taiLenBuoi: vi.fn().mockResolvedValue({ ma: id }),
      taiXuong: vi.fn().mockResolvedValue({ stream: Readable.from(Buffer.from('%PDF-1.7')), tenTepGoc: 'Tài liệu.pdf', kieuNoiDung: 'application/pdf' }),
      xoa: vi.fn().mockResolvedValue({ ma: id, trangThai: 'DA_XOA', ngayXoa: new Date() }),
    }
    const module = await Test.createTestingModule({ controllers: [TepDinhKemHocTapController], providers: [{ provide: TepDinhKemHocTapService, useValue: service }] })
      .overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.init()
    await request(app.getHttpServer()).post(`/api/v1/dot/${id}/tep`).attach('tep', Buffer.from('%PDF-1.7'), { filename: 'tai-lieu.pdf', contentType: 'application/pdf' }).expect(201)
    await request(app.getHttpServer()).post(`/api/v1/buoi/${id}/tep`).attach('tep', Buffer.from('%PDF-1.7'), { filename: 'buoi.pdf', contentType: 'application/pdf' }).expect(201)
    const tooLarge = Buffer.alloc(10 * 1024 * 1024 + 1, 0x20); Buffer.from('%PDF-', 'ascii').copy(tooLarge)
    const oversized = await request(app.getHttpServer()).post(`/api/v1/dot/${id}/tep`).attach('tep', tooLarge, { filename: 'lon.pdf', contentType: 'application/pdf' }).expect(413)
    expect(oversized.body).toMatchObject({ maLoi: 'TEP_VUOT_QUA_DUNG_LUONG', thongBao: expect.stringContaining('10 MB') })
    const download = await request(app.getHttpServer()).get(`/api/v1/tep/${id}`).expect(200)
    expect(download.headers['content-type']).toContain('application/pdf')
    expect(download.headers['cache-control']).toBe('private, no-store')
    expect(download.headers['x-content-type-options']).toBe('nosniff')
    expect(decodeURIComponent(download.headers['content-disposition'])).toContain('Tài liệu.pdf')
    await request(app.getHttpServer()).delete(`/api/v1/tep/${id}`).expect(200)
    expect(service.taiLenDot).toHaveBeenCalledWith(actor, id, expect.objectContaining({ originalname: 'tai-lieu.pdf', mimetype: 'application/pdf' }), expect.anything())
    expect(service.taiLenBuoi).toHaveBeenCalledOnce()
    expect(service.taiXuong).toHaveBeenCalledWith(actor, id)
    expect(service.xoa).toHaveBeenCalledWith(actor, id, expect.anything())
  })
})
