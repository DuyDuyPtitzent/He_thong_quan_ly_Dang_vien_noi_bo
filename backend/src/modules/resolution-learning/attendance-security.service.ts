import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Prisma } from '../../infrastructure/database/generated/prisma/client'
import { DichVuPrisma } from '../../infrastructure/database/prisma.service'

export type MucDichTokenDiemDanh = 'QR' | 'BIEU_MAU'
export type PayloadTokenDiemDanh = { mucDich: MucDichTokenDiemDanh; maBuoi: string; maCuaSo: string; hetHanGiay: number; bucket?: number; phienBan?: number; maPhienQr?: string }

@Injectable()
export class BaoMatDiemDanhService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService, @Inject(DichVuPrisma) private readonly prisma: DichVuPrisma) {}

  private keyRing() {
    const current = this.config.get<string>('HOC_TAP_NGHI_QUYET_HMAC_KEY_HIEN_TAI')
    const raw = this.config.get<string>('HOC_TAP_NGHI_QUYET_HMAC_KEYS')
    if (!current || !raw) throw new ServiceUnavailableException({ maLoi: 'CHUA_CAU_HINH_KHOA_DIEM_DANH', thongBao: 'Dịch vụ điểm danh trực tuyến chưa được cấu hình khóa bảo mật.' })
    const keys = new Map<string, Buffer>()
    for (const entry of raw.split(';')) {
      const [id, value, extra] = entry.split(':')
      if (!id || !value || extra !== undefined || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) continue
      const key = Buffer.from(value, 'base64url')
      if (key.length >= 32 && key.toString('base64url') === value) keys.set(id, key)
    }
    if (!keys.has(current)) throw new ServiceUnavailableException({ maLoi: 'CAU_HINH_KHOA_DIEM_DANH_KHONG_HOP_LE', thongBao: 'Danh sách khóa bảo mật điểm danh không hợp lệ.' })
    return { current, keys }
  }

  private digest(key: Buffer, purpose: string, value: string) {
    const derived = createHmac('sha256', key).update(`PTIT:HOC_TAP_NGHI_QUYET:${purpose}:V1`).digest()
    return createHmac('sha256', derived).update(value).digest('hex')
  }

  token(payload: PayloadTokenDiemDanh) {
    const { current, keys } = this.keyRing()
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const key = keys.get(current)!
    return `${current}.${body}.${this.digest(key, `TOKEN_${payload.mucDich}`, `${current}.${body}`)}`
  }

  xacMinhToken(token: string, mucDich: MucDichTokenDiemDanh, now = new Date()): PayloadTokenDiemDanh | null {
    if (token.length > 4096) return null
    const [keyId, body, signature, extra] = token.split('.')
    if (!keyId || !body || !signature || extra !== undefined) return null
    let payload: PayloadTokenDiemDanh
    try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PayloadTokenDiemDanh } catch { return null }
    if (payload.mucDich !== mucDich || !payload.maBuoi || !payload.maCuaSo || !Number.isSafeInteger(payload.hetHanGiay) || payload.hetHanGiay <= Math.floor(now.getTime() / 1000)) return null
    if (mucDich === 'QR' && (!Number.isSafeInteger(payload.bucket) || payload.bucket! < 0 || !payload.maPhienQr)) return null
    if (mucDich === 'BIEU_MAU' && (!Number.isSafeInteger(payload.phienBan) || payload.phienBan! < 1)) return null
    const { keys } = this.keyRing()
    const key = keys.get(keyId)
    if (!key) return null
    const expected = Buffer.from(this.digest(key, `TOKEN_${mucDich}`, `${keyId}.${body}`), 'hex')
    let supplied: Buffer
    try { supplied = Buffer.from(signature, 'hex') } catch { return null }
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) return null
    return payload
  }

  fingerprintCandidates(purpose: 'IDEMPOTENCY' | 'CO_BAN' | 'CCCD', value: string) {
    const { current, keys } = this.keyRing()
    return [...keys].sort(([left], [right]) => left === current ? -1 : right === current ? 1 : left.localeCompare(right)).map(([version, key]) => ({ version, hash: this.digest(key, purpose, value) }))
  }

  hashCurrent(purpose: string, value: string) {
    const { current, keys } = this.keyRing()
    return this.digest(keys.get(current)!, purpose, value)
  }

  async gioiHan(tx: Prisma.TransactionClient, ip: string, route: 'TRUY_CAP' | 'GUI_YEU_CAU', now = new Date()) {
    const windowMs = 60_000
    const bucket = Math.floor(now.getTime() / windowMs)
    const limit = this.config.get<number>(route === 'TRUY_CAP' ? 'HOC_TAP_GIOI_HAN_TRUY_CAP_MOI_PHUT' : 'HOC_TAP_GIOI_HAN_GUI_MOI_PHUT', route === 'TRUY_CAP' ? 60 : 5)
    const key = this.hashCurrent('RATE_LIMIT', `${route}\0${ip}\0${bucket}`)
    const hetHanLuc = new Date((bucket + 2) * windowMs)
    const rows = await tx.$queryRaw<{ so_yeu_cau: number }[]>`
      INSERT INTO bo_dem_cong_khai_diem_danh (ma_khoa, so_yeu_cau, het_han_luc)
      VALUES (${key}, 1, ${hetHanLuc})
      ON CONFLICT (ma_khoa) DO UPDATE SET so_yeu_cau = bo_dem_cong_khai_diem_danh.so_yeu_cau + 1
      RETURNING so_yeu_cau
    `
    if (Number(rows[0]?.so_yeu_cau) === 1) await tx.$executeRaw`DELETE FROM bo_dem_cong_khai_diem_danh WHERE het_han_luc < ${now}`
    return Number(rows[0]?.so_yeu_cau ?? 0) <= limit
  }

  get retentionHours() { return this.config.get<number>('HOC_TAP_LUU_IDEMPOTENCY_GIO', 24) }
}
