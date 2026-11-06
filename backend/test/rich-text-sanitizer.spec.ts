import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it } from 'vitest'
import { TuChoiYeuCauDto } from '../src/modules/member-profiles/member-profile-updates.dto'
import { sanitizeRejectionHtml } from '../src/modules/member-profiles/rich-text-sanitizer'

describe('lọc HTML lý do từ chối', () => {
  it('giữ định dạng hợp lệ và loại script, ảnh, event handler cùng URL nguy hiểm', () => {
    const result = sanitizeRejectionHtml('<p>Thiếu <strong>thông tin</strong>.</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">Xem hướng dẫn</a><img src=x onerror=alert(3)>')
    expect(result).toContain('<strong>thông tin</strong>')
    expect(result).toContain('Xem hướng dẫn')
    expect(result).not.toMatch(/script|javascript:|<img|onerror|onclick/i)
  })

  it.each(['', '   ', '<p><br></p>', '<p>&nbsp;</p>', '<script>alert(1)</script>'])('từ chối nội dung rỗng sau làm sạch: %s', async (lyDo) => {
    const dto = plainToInstance(TuChoiYeuCauDto, { lyDo })
    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'lyDo')).toBe(true)
  })

  it('từ chối HTML sau làm sạch vượt quá giới hạn hiện có 1.000 ký tự', async () => {
    const dto = plainToInstance(TuChoiYeuCauDto, { lyDo: `<p>${'a'.repeat(1000)}</p>` })
    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'lyDo')).toBe(true)
  })
})
