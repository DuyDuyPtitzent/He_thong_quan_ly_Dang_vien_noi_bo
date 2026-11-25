import 'reflect-metadata'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CongKhaiDiemDanhController, VanHanhDiemDanhController } from '../src/modules/resolution-learning/attendance.controller'
import { VanHanhDiemDanhService } from '../src/modules/resolution-learning/attendance-operations.service'
import { XuLyYeuCauDiemDanhService } from '../src/modules/resolution-learning/attendance-requests.service'
import { DiemDanhThuCongService } from '../src/modules/resolution-learning/attendance-manual.service'
import { ChotDiemDanhService } from '../src/modules/resolution-learning/attendance-finalization.service'
import { XacThucService } from '../src/modules/auth/auth.service'

describe('Public attendance API HTTP contract', () => {
  let app: INestApplication | undefined
  afterEach(async () => { await app?.close(); app = undefined })

  async function start(service: Record<string, ReturnType<typeof vi.fn>>) {
    const module = await Test.createTestingModule({ controllers: [CongKhaiDiemDanhController], providers: [{ provide: VanHanhDiemDanhService, useValue: service }] }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
  }

  it('accepts the fixed required fields without CCCD and returns 202 without authentication', async () => {
    const service = { guiYeuCauCongKhai: vi.fn().mockResolvedValue({ maTiepNhan: 'receipt', trangThai: 'DA_TIEP_NHAN' }) }
    await start(service)
    await request(app!.getHttpServer()).post('/api/v1/cong-khai/yeu-cau').set('Idempotency-Key', 'A-unique-key-0001').send({ token: 'signed-token', hoVaTen: 'Nguyễn Văn A', maChiBo: '00000000-0000-4000-8000-000000000020', namSinh: 1990 }).expect(202)
    expect(service.guiYeuCauCongKhai).toHaveBeenCalledWith(expect.objectContaining({ hoVaTen: 'Nguyễn Văn A', maChiBo: '00000000-0000-4000-8000-000000000020', namSinh: 1990, cccd: undefined }), 'A-unique-key-0001')
  })

  it('rejects missing required fields, invalid CCCD and missing idempotency key before service', async () => {
    const service = { guiYeuCauCongKhai: vi.fn() }
    await start(service)
    const path = '/api/v1/cong-khai/yeu-cau'
    await request(app!.getHttpServer()).post(path).set('Idempotency-Key', 'A-unique-key-0001').send({ token: 'signed-token', hoVaTen: '', maChiBo: 'bad', namSinh: 1800 }).expect(400)
    await request(app!.getHttpServer()).post(path).set('Idempotency-Key', 'A-unique-key-0001').send({ token: 'signed-token', hoVaTen: 'Nguyễn Văn A', maChiBo: '00000000-0000-4000-8000-000000000020', namSinh: 1990, cccd: 'not-a-number' }).expect(400)
    await request(app!.getHttpServer()).post(path).send({ token: 'signed-token', hoVaTen: 'Nguyễn Văn A', maChiBo: '00000000-0000-4000-8000-000000000020', namSinh: 1990 }).expect(400)
    expect(service.guiYeuCauCongKhai).not.toHaveBeenCalled()
  })

  it('serves the token access endpoint without introducing an auth guard', async () => {
    const service = { truyCapCongKhai: vi.fn().mockResolvedValue({ tenBuoi: 'Buổi học' }) }
    await start(service)
    await request(app!.getHttpServer()).post('/api/v1/cong-khai/cua-so/truy-cap').send({ token: 'qr-token' }).expect(200)
    expect(service.truyCapCongKhai).toHaveBeenCalledWith(expect.objectContaining({ token: 'qr-token' }))
  })

  it('marks the internal QR token response as non-cacheable', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { qr: vi.fn().mockResolvedValue({ token: 'short-lived-token' }), tuDiemDanh: vi.fn().mockResolvedValue({ ketQua: 'CO_MAT' }) }
    const module = await Test.createTestingModule({ controllers: [VanHanhDiemDanhController], providers: [{ provide: VanHanhDiemDanhService, useValue: service }, { provide: XuLyYeuCauDiemDanhService, useValue: {} }, { provide: DiemDanhThuCongService, useValue: {} }, { provide: ChotDiemDanhService, useValue: {} }] })
      .overrideGuard((await import('../src/modules/auth/auth.guard')).XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } })
      .compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.init()
    const response = await request(app.getHttpServer()).get('/api/v1/buoi/00000000-0000-4000-8000-000000000010/qr').expect(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers.pragma).toBe('no-cache')
    expect(service.qr).toHaveBeenCalledWith(actor, '00000000-0000-4000-8000-000000000010')
  })

  it('routes authenticated self-attendance using only a QR token and rejects client-supplied profile identifiers', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const service = { tuDiemDanh: vi.fn().mockResolvedValue({ ketQua: 'CO_MAT', choPheDuyet: false }) }
    const module = await Test.createTestingModule({ controllers: [VanHanhDiemDanhController], providers: [{ provide: VanHanhDiemDanhService, useValue: service }, { provide: XuLyYeuCauDiemDanhService, useValue: {} }, { provide: DiemDanhThuCongService, useValue: {} }, { provide: ChotDiemDanhService, useValue: {} }] })
      .overrideGuard((await import('../src/modules/auth/auth.guard')).XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })); await app.init()
    const path = '/api/v1/buoi/00000000-0000-4000-8000-000000000010/tu-diem-danh'
    await request(app.getHttpServer()).post(path).send({ token: 'signed-qr-token' }).expect(200)
    expect(service.tuDiemDanh).toHaveBeenCalledWith(actor, '00000000-0000-4000-8000-000000000010', { token: 'signed-qr-token' }, expect.any(String))
    await request(app.getHttpServer()).post(path).send({ token: 'signed-qr-token', maHoSo: '00000000-0000-4000-8000-000000000099' }).expect(400)
    await request(app.getHttpServer()).post('/api/v1/buoi/not-a-uuid/tu-diem-danh').send({ token: 'signed-qr-token' }).expect(400)
    expect(service.tuDiemDanh).toHaveBeenCalledOnce()
  })

  it('rejects self-attendance without a valid authenticated session', async () => {
    const service = { tuDiemDanh: vi.fn() }
    const module = await Test.createTestingModule({ controllers: [VanHanhDiemDanhController], providers: [
      { provide: VanHanhDiemDanhService, useValue: service }, { provide: XuLyYeuCauDiemDanhService, useValue: {} },
      { provide: DiemDanhThuCongService, useValue: {} }, { provide: ChotDiemDanhService, useValue: {} },
      { provide: XacThucService, useValue: { layTokenPhien: () => null, layPhien: vi.fn().mockResolvedValue(null) } },
    ] }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.init()
    await request(app.getHttpServer()).post('/api/v1/buoi/00000000-0000-4000-8000-000000000010/tu-diem-danh').send({ token: 'signed-qr-token' }).expect(401)
    expect(service.tuDiemDanh).not.toHaveBeenCalled()
  })

  it('routes authenticated request list/detail/verify calls through the request service and validates verify decisions', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const requestService = { danhSach: vi.fn().mockResolvedValue({ duLieu: [], phanTrang: { trang: 1, gioiHan: 5, tongSo: 0 } }), chiTiet: vi.fn().mockResolvedValue({ ma: 'request-1' }), xoa: vi.fn().mockResolvedValue({ ma: 'request-1', daXoa: true }), xacMinh: vi.fn().mockResolvedValue({ ma: 'request-1', trangThai: 'CHO_PHE_DUYET' }) }
    const module = await Test.createTestingModule({ controllers: [VanHanhDiemDanhController], providers: [{ provide: VanHanhDiemDanhService, useValue: {} }, { provide: XuLyYeuCauDiemDanhService, useValue: requestService }, { provide: DiemDanhThuCongService, useValue: {} }, { provide: ChotDiemDanhService, useValue: {} }] })
      .overrideGuard((await import('../src/modules/auth/auth.guard')).XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } })
      .compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    await app.init()
    const sessionId = '00000000-0000-4000-8000-000000000010'
    const requestId = '00000000-0000-4000-8000-000000000011'
    await request(app.getHttpServer()).get(`/api/v1/buoi/${sessionId}/yeu-cau?trang=1&gioiHan=5`).expect(200)
    await request(app.getHttpServer()).get(`/api/v1/yeu-cau/${requestId}`).expect(200)
    await request(app.getHttpServer()).delete(`/api/v1/yeu-cau/${requestId}`).expect(200)
    await request(app.getHttpServer()).post(`/api/v1/yeu-cau/${requestId}/xac-minh`).send({ ketQuaXacMinh: 'KHONG_HOP_LE' }).expect(201)
    await request(app.getHttpServer()).post(`/api/v1/yeu-cau/${requestId}/xac-minh`).send({}).expect(400)
    expect(requestService.danhSach).toHaveBeenCalledWith(actor, sessionId, expect.objectContaining({ trang: 1, gioiHan: 5 }))
    expect(requestService.chiTiet).toHaveBeenCalledWith(actor, requestId)
    expect(requestService.xoa).toHaveBeenCalledWith(actor, requestId, expect.any(String))
    await request(app.getHttpServer()).delete('/api/v1/yeu-cau/not-a-uuid').expect(400)
    expect(requestService.xacMinh).toHaveBeenCalledWith(actor, requestId, expect.objectContaining({ ketQuaXacMinh: 'KHONG_HOP_LE' }), expect.any(String))
  })

  it('routes the three manual attendance endpoints to the manual service', async () => {
    const actor = { maTaiKhoan: '00000000-0000-4000-8000-000000000001', maPhien: '00000000-0000-4000-8000-000000000002' }
    const manualService = { danhSach: vi.fn().mockResolvedValue({ duLieu: [], phanTrang: { trang: 1, gioiHan: 50, tongSo: 0 } }), capNhat: vi.fn().mockResolvedValue({ ketQua: 'CO_MAT' }), capNhatLo: vi.fn().mockResolvedValue([]), capNhatSauChot: vi.fn().mockResolvedValue({ ketQua: 'VANG_CO_PHEP' }) }
    const finalizationService = { kiemTra: vi.fn().mockResolvedValue({ duDieuKienChot: true }), chot: vi.fn().mockResolvedValue({ ma: 'chot' }), xemChot: vi.fn().mockResolvedValue({ ma: 'chot' }), lichSu: vi.fn().mockResolvedValue({ duLieu: [] }) }
    const module = await Test.createTestingModule({ controllers: [VanHanhDiemDanhController], providers: [{ provide: VanHanhDiemDanhService, useValue: {} }, { provide: XuLyYeuCauDiemDanhService, useValue: {} }, { provide: DiemDanhThuCongService, useValue: manualService }, { provide: ChotDiemDanhService, useValue: finalizationService }] })
      .overrideGuard((await import('../src/modules/auth/auth.guard')).XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => { context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor; return true } }).compile()
    app = module.createNestApplication(); app.setGlobalPrefix('api/v1'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })); await app.init()
    const buoiId = '00000000-0000-4000-8000-000000000010'; const profileId = '00000000-0000-4000-8000-000000000011'
    await request(app.getHttpServer()).get(`/api/v1/buoi/${buoiId}/ket-qua`).expect(200)
    await request(app.getHttpServer()).put(`/api/v1/buoi/${buoiId}/ket-qua/${profileId}`).send({ ketQua: 'CO_MAT' }).expect(200)
    await request(app.getHttpServer()).post(`/api/v1/buoi/${buoiId}/ket-qua/lo`).send({ ketQua: [{ maHoSo: profileId, ketQua: 'VANG_CO_PHEP' }] }).expect(201)
    await request(app.getHttpServer()).get(`/api/v1/buoi/${buoiId}/chot/kiem-tra`).expect(200)
    await request(app.getHttpServer()).post(`/api/v1/buoi/${buoiId}/chot`).send({ phienBanXemTruoc: 'a'.repeat(64) }).expect(201)
    await request(app.getHttpServer()).get(`/api/v1/buoi/${buoiId}/chot`).expect(200)
    await request(app.getHttpServer()).get(`/api/v1/buoi/${buoiId}/ket-qua/lich-su?trang=1&gioiHan=50`).expect(200)
    await request(app.getHttpServer()).post(`/api/v1/buoi/${buoiId}/ket-qua/${profileId}/dieu-chinh-sau-chot`).send({ ketQua: 'CHUA_DIEM_DANH' }).expect(201)
    expect(manualService.danhSach).toHaveBeenCalledWith(actor, buoiId, expect.objectContaining({ trang: 1 }))
    expect(manualService.capNhat).toHaveBeenCalledWith(actor, buoiId, expect.objectContaining({ maHoSo: profileId }), expect.any(String))
    expect(manualService.capNhatLo).toHaveBeenCalledWith(actor, buoiId, expect.objectContaining({ ketQua: expect.any(Array) }), expect.any(String))
    expect(finalizationService.kiemTra).toHaveBeenCalledWith(actor, buoiId)
    expect(finalizationService.chot).toHaveBeenCalledWith(actor, buoiId, { phienBanXemTruoc: 'a'.repeat(64) }, expect.any(String))
    expect(finalizationService.xemChot).toHaveBeenCalledWith(actor, buoiId)
    expect(finalizationService.lichSu).toHaveBeenCalledWith(actor, buoiId, expect.objectContaining({ trang: 1, gioiHan: 50 }))
    expect(manualService.capNhatSauChot).toHaveBeenCalledWith(actor, buoiId, profileId, { ketQua: 'CHUA_DIEM_DANH' }, expect.any(String))
  })
})
