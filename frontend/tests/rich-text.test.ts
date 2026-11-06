import { describe, expect, it } from 'vitest'
import { hasRichTextContent, richTextPlainText, sanitizeRichTextHtml } from '@/shared/lib/rich-text'

describe('rich text HTML safety', () => {
  it('keeps supported formatting and strips executable markup and image uploads', () => {
    const html = sanitizeRichTextHtml('<p>Thiếu <strong>thông tin</strong></p><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(2)">Xem</a><img src="data:image/png;base64,AAAA">')
    expect(html).toContain('<strong>thông tin</strong>')
    expect(html).toContain('Xem')
    expect(html).not.toMatch(/script|javascript:|<img|onclick/i)
  })

  it('treats empty HTML, whitespace and non-breaking spaces as empty', () => {
    expect(hasRichTextContent('<p><br></p>')).toBe(false)
    expect(hasRichTextContent('<p>&nbsp; &#160;</p>')).toBe(false)
    expect(hasRichTextContent('<p>  Lý do hợp lệ  </p>')).toBe(true)
    expect(richTextPlainText('<p>  Lý do hợp lệ  </p>')).toBe('Lý do hợp lệ')
  })
})
