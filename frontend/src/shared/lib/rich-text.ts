import DOMPurify from 'dompurify'

const allowedTags = [
  'a', 'b', 'blockquote', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'li', 'ol', 'p', 's', 'span', 'strong', 'sub', 'sup', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]
const allowedAttributes = [
  'align', 'border', 'cellpadding', 'cellspacing', 'colspan', 'href', 'rel', 'rowspan',
  'scope', 'style', 'target', 'title', 'width',
]

export function sanitizeRichTextHtml(value: string) {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#|\.\.?\/|[^:/?#]+(?:[/?#]|$))/i,
  })
}

export function richTextPlainText(value: string) {
  const sanitized = sanitizeRichTextHtml(value)
  const parsed = new DOMParser().parseFromString(sanitized, 'text/html')
  return (parsed.body.textContent ?? '').replace(/[\u00a0\u200b-\u200d\ufeff]/g, ' ').trim()
}

export function hasRichTextContent(value: string) {
  return richTextPlainText(value).length > 0
}
