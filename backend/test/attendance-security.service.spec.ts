import { describe, expect, it, vi } from 'vitest'
import { BaoMatDiemDanhService } from '../src/modules/resolution-learning/attendance-security.service'

const secret = Buffer.alloc(32, 41).toString('base64url')
function createSecurity() {
  const config = { get: (key: string, fallback?: unknown) => ({ HOC_TAP_NGHI_QUYET_HMAC_KEY_HIEN_TAI: 'k1', HOC_TAP_NGHI_QUYET_HMAC_KEYS: `k1:${secret};k0:${Buffer.alloc(32, 12).toString('base64url')}`, HOC_TAP_GIOI_HAN_TRUY_CAP_MOI_PHUT: 2, HOC_TAP_GIOI_HAN_GUI_MOI_PHUT: 1 } as Record<string, unknown>)[key] ?? fallback }
  return new BaoMatDiemDanhService(config as never, {} as never)
}

describe('BaoMatDiemDanhService', () => {
  it('signs and verifies a QR token while rejecting expiration, purpose mismatch and tampering', () => {
    const service = createSecurity()
    const now = new Date('2026-11-11T10:00:00Z')
    const token = service.token({ mucDich: 'QR', maBuoi: 'session', maCuaSo: 'window', maPhienQr: 'nonce', bucket: 10, hetHanGiay: Math.floor(now.getTime() / 1000) + 15 })
    expect(service.xacMinhToken(token, 'QR', now)?.maPhienQr).toBe('nonce')
    expect(service.xacMinhToken(token, 'BIEU_MAU', now)).toBeNull()
    expect(service.xacMinhToken(token, 'QR', new Date(now.getTime() + 20_000))).toBeNull()
    expect(service.xacMinhToken(`${token.slice(0, -1)}0`, 'QR', now)).toBeNull()
  })

  it('requires a QR nonce and a versioned form token', () => {
    const service = createSecurity()
    const now = new Date('2026-11-11T10:00:00Z')
    const noNonce = service.token({ mucDich: 'QR', maBuoi: 'session', maCuaSo: 'window', bucket: 10, hetHanGiay: Math.floor(now.getTime() / 1000) + 15 })
    const form = service.token({ mucDich: 'BIEU_MAU', maBuoi: 'session', maCuaSo: 'window', phienBan: 3, hetHanGiay: Math.floor(now.getTime() / 1000) + 60 })
    expect(service.xacMinhToken(noNonce, 'QR', now)).toBeNull()
    expect(service.xacMinhToken(form, 'BIEU_MAU', now)?.phienBan).toBe(3)
  })

  it('returns current and previous key fingerprints for rotation-safe matching', () => {
    const service = createSecurity()
    const candidates = service.fingerprintCandidates('CO_BAN', 'payload')
    expect(candidates.map(item => item.version)).toEqual(['k1', 'k0'])
    expect(new Set(candidates.map(item => item.hash)).size).toBe(2)
  })

  it('uses an atomic PostgreSQL bucket and returns whether the configured limit remains', async () => {
    const service = createSecurity()
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ so_yeu_cau: 2 }]), $executeRaw: vi.fn().mockResolvedValue(0) }
    expect(await service.gioiHan(tx as never, '127.0.0.1', 'TRUY_CAP', new Date('2026-11-11T10:00:00Z'))).toBe(true)
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    tx.$queryRaw.mockResolvedValue([{ so_yeu_cau: 3 }])
    expect(await service.gioiHan(tx as never, '127.0.0.1', 'TRUY_CAP', new Date('2026-11-11T10:00:00Z'))).toBe(false)
  })
})
