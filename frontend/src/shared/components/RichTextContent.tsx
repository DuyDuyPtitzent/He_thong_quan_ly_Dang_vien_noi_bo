import { sanitizeRichTextHtml } from '@/shared/lib/rich-text'

export function RichTextContent({ html, className = '' }: { html: string; className?: string }) {
  const safeHtml = sanitizeRichTextHtml(html)
  if (!safeHtml) return null

  return (
    <div
      className={`min-w-0 break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-1 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_th]:font-semibold [&_ul]:list-disc ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
