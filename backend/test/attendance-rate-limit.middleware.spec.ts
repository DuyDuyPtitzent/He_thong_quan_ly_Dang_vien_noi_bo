import { describe, expect, it, vi } from 'vitest'
import { GioiHanDiemDanhCongKhaiMiddleware } from '../src/modules/resolution-learning/attendance-rate-limit.middleware'

function create(allowed: boolean | Error) {
  const prisma = { $transaction: vi.fn(async (work: (tx: object) => Promise<boolean>) => { if (allowed instanceof Error) throw allowed; return work({}) }) }
  const security = { gioiHan: vi.fn().mockResolvedValue(allowed) }
  const middleware = new GioiHanDiemDanhCongKhaiMiddleware(prisma as never, security as never)
  const req = { method: 'POST', path: '/api/v1/cong-khai/yeu-cau', ip: '192.0.2.4' }
  const response = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as unknown, setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; return this }, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  const next = vi.fn()
  return { middleware, prisma, security, req, response, next }
}

describe('GioiHanDiemDanhCongKhaiMiddleware', () => {
  it('counts public requests before DTO validation and returns 429 with retry guidance', async () => {
    const ctx = create(false)
    await ctx.middleware.use(ctx.req as never, ctx.response as never, ctx.next)
    expect(ctx.security.gioiHan).toHaveBeenCalledWith({}, '192.0.2.4', 'GUI_YEU_CAU')
    expect(ctx.response.statusCode).toBe(429)
    expect(ctx.response.headers['retry-after']).toBe('60')
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('fails closed when the shared database limiter is unavailable', async () => {
    const ctx = create(new Error('database unavailable'))
    await ctx.middleware.use(ctx.req as never, ctx.response as never, ctx.next)
    expect(ctx.response.statusCode).toBe(503)
    expect(JSON.stringify(ctx.response.body)).not.toContain('database unavailable')
    expect(ctx.next).not.toHaveBeenCalled()
  })

  it('lets allowed requests through and ignores routes outside the two public endpoints', async () => {
    const allowed = create(true)
    await allowed.middleware.use(allowed.req as never, allowed.response as never, allowed.next)
    expect(allowed.next).toHaveBeenCalledOnce()
    const other = create(true); other.req.path = '/api/v1/cong-khai/khac'
    await other.middleware.use(other.req as never, other.response as never, other.next)
    expect(other.prisma.$transaction).not.toHaveBeenCalled()
    expect(other.next).toHaveBeenCalledOnce()
  })
})
