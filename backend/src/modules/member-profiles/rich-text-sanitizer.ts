import sanitizeHtml from 'sanitize-html'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'a', 'b', 'blockquote', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'i', 'li', 'ol', 'p', 's', 'span', 'strong', 'sub', 'sup', 'table', 'tbody',
    'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    p: ['style'], div: ['style'], span: ['style'], blockquote: ['style'],
    h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'], h6: ['style'],
    ul: ['style'], ol: ['style'], li: ['style'],
    table: ['style', 'border', 'cellpadding', 'cellspacing', 'width'],
    td: ['colspan', 'rowspan', 'style', 'width', 'align'],
    th: ['colspan', 'rowspan', 'scope', 'style', 'width', 'align'],
  },
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^hsla?\([\d\s.,%deg]+\)$/i],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^hsla?\([\d\s.,%deg]+\)$/i],
      'font-size': [/^\d+(?:\.\d+)?(?:pt|px|em|rem|%)$/i],
      'font-family': [/^[\w\s,'"-]{1,80}$/],
      'text-align': [/^(?:left|right|center|justify)$/i],
      'text-decoration': [/^(?:underline|line-through|none)$/i],
      'font-weight': [/^(?:bold|normal|[1-9]00)$/i],
      'font-style': [/^(?:italic|normal)$/i],
      'margin-left': [/^\d+(?:\.\d+)?(?:pt|px|em|rem)$/i],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
}

export function sanitizeRejectionHtml(value: string) {
  const html = sanitizeHtml(value, sanitizeOptions)
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;|&#0*160;|&#x0*a0;|&thinsp;|&ensp;|&emsp;/gi, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .trim()
  return text ? html : ''
}
