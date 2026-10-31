import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { UngDungModule } from '../src/app.module'
import { cauHinhUngDung } from '../src/app.config'
import { DichVuPrisma } from '../src/infrastructure/database/prisma.service'

describe('GET /api/v1/suc-khoe', () => {
  let ungDung: INestApplication
  const dichVuPrisma = { kiemTraKetNoi: vi.fn() }

  beforeAll(async () => {
    const moDun = await Test.createTestingModule({ imports: [UngDungModule] })
      .overrideProvider(DichVuPrisma)
      .useValue(dichVuPrisma)
      .compile()

    ungDung = moDun.createNestApplication()
    cauHinhUngDung(ungDung)
    await ungDung.init()
  })

  afterAll(async () => {
    await ungDung.close()
  })

  it('trả sẵn sàng khi truy vấn cơ sở dữ liệu thành công', async () => {
    dichVuPrisma.kiemTraKetNoi.mockResolvedValue(undefined)

    const phanHoi = await request(ungDung.getHttpServer()).get('/api/v1/suc-khoe')

    expect(phanHoi.status).toBe(200)
    expect(phanHoi.body).toEqual({
      trangThaiMayChu: 'SAN_SANG',
      trangThaiCoSoDuLieu: 'SAN_SANG',
    })
    expect(phanHoi.headers['x-correlation-id']).toMatch(/^[A-Za-z0-9-]{1,64}$/)
  })

  it('trả lỗi an toàn khi cơ sở dữ liệu chưa sẵn sàng', async () => {
    dichVuPrisma.kiemTraKetNoi.mockRejectedValue(new Error('khong-duoc-lo-ra-ngoai'))

    const phanHoi = await request(ungDung.getHttpServer()).get('/api/v1/suc-khoe')

    expect(phanHoi.status).toBe(503)
    expect(phanHoi.body.maLoi).toBe('CO_SO_DU_LIEU_CHUA_SAN_SANG')
    expect(JSON.stringify(phanHoi.body)).not.toContain('khong-duoc-lo-ra-ngoai')
    expect(phanHoi.body.maTuongQuan).toBe(phanHoi.headers['x-correlation-id'])
  })
})
