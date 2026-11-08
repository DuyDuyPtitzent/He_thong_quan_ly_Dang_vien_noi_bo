import 'dotenv/config'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/infrastructure/database/generated/prisma/client'
import { cauHinhUngDung } from '../src/app.config'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { DichVuPrisma } from '../src/infrastructure/database/prisma.service'
import { NamHocController } from '../src/modules/school-years/school-years.controller'
import { NamHocService } from '../src/modules/school-years/school-years.service'
import { PhanQuyenService } from '../src/modules/authorization/authorization.service'

const enabled = process.env.CHAY_KIEM_THU_NAM_HOC_HTTP === '1'
const integration = enabled ? describe : describe.skip

integration('HTTP Quản lý năm học với Permission + Assignment PostgreSQL hiện hành', () => {
  let prisma: PrismaClient
  let app: INestApplication
  let actor: { maTaiKhoan: string; maPhien: string; loaiPhamVi: string }

  beforeAll(async () => {
    const url = process.env.KET_NOI_CO_SO_DU_LIEU
    if (!url) throw new Error('Thiếu KET_NOI_CO_SO_DU_LIEU.')
    prisma = new PrismaClient({ adapter: new PrismaPg(url) })
    const sessions = await prisma.$queryRaw<Array<{ maTaiKhoan: string; maPhien: string; loaiPhamVi: string }>>`
      SELECT p.ma_tai_khoan AS "maTaiKhoan", p.ma_phien AS "maPhien", a.loai_pham_vi AS "loaiPhamVi"
      FROM phien_dang_nhap p
      JOIN phan_cong_vai_tro a ON a.ma_phan_cong = p.ma_phan_cong_vai_tro_dang_hoat_dong
      JOIN vai_tro r ON r.ma_vai_tro = a.ma_vai_tro
      JOIN vai_tro_quyen vr ON vr.ma_vai_tro = r.ma_vai_tro
      JOIN quyen q ON q.ma_quyen = vr.ma_quyen
      WHERE p.thu_hoi_luc IS NULL AND p.het_han_luc > NOW()
        AND a.ngay_hieu_luc_tu <= NOW() AND (a.ngay_hieu_luc_den IS NULL OR a.ngay_hieu_luc_den > NOW())
        AND a.ngay_thu_hoi IS NULL AND r.trang_thai = 'DANG_HOAT_DONG'
        AND a.loai_pham_vi IN ('CAY_DON_VI', 'DON_VI_CHI_DINH', 'TOAN_HE_THONG')
        AND q.ma_quyen_noi_bo = 'NAM_HOC_XEM'
      ORDER BY CASE WHEN a.loai_pham_vi = 'TOAN_HE_THONG' THEN 1 ELSE 0 END, p.ngay_tao DESC LIMIT 1
    `
    if (!sessions[0]) throw new Error('Không tìm thấy phiên/Assignment hiện hành có Permission NAM_HOC_XEM.')
    actor = sessions[0]
    const testingModule = await Test.createTestingModule({
      controllers: [NamHocController],
      providers: [NamHocService, PhanQuyenService, { provide: DichVuPrisma, useValue: prisma }],
    }).overrideGuard(XacThucGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { taiKhoanDaXacThuc?: unknown } } }) => {
      context.switchToHttp().getRequest().taiKhoanDaXacThuc = actor
      return true
    } }).compile()
    app = testingModule.createNestApplication()
    cauHinhUngDung(app)
    await app.init()
  })

  afterAll(async () => { await app?.close(); await prisma?.$disconnect() })

  it('returns the current year list and statistics over HTTP using the selected live Assignment', async () => {
    expect(actor.loaiPhamVi).not.toBe('TOAN_HE_THONG')
    const response = await request(app.getHttpServer()).get('/api/v1/nam-hoc').expect(200)
    expect(response.body).toEqual(expect.objectContaining({ duLieu: expect.any(Array), phanTrang: expect.any(Object), thongKe: expect.objectContaining({ tongSo: expect.any(Number), dangDienRa: expect.any(Number), sapDienRa: expect.any(Number), daKetThuc: expect.any(Number) }) }))
    expect(response.body.phanTrang.tongSo).toBe(response.body.duLieu.length)
  })
})
