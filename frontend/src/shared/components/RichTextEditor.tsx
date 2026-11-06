import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { LoaderCircle } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/lib/utils'
import { hasRichTextContent, richTextPlainText } from '@/shared/lib/rich-text'

export type RichTextEditorMode = 'simple' | 'full'
type TinyEditorInstance = Parameters<NonNullable<ComponentProps<typeof Editor>['onInit']>>[1]

export interface RichTextEditorProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  mode?: RichTextEditorMode
  readOnly?: boolean
  required?: boolean
  maxLength?: number
  disabled?: boolean
  error?: string
  height?: number
  placeholder?: string
  className?: string
}

const simpleToolbar = 'undo redo | bold italic underline | bullist numlist | link | removeformat'
const fullToolbar = 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link table hr | removeformat'
const allowedElements = 'a[href|title|target|rel],b,strong,i,em,u,s,sub,sup,p[style],div[style],span[style],blockquote[style],br,hr,h1[style],h2[style],h3[style],h4[style],h5[style],h6[style],ul[style],ol[style],li[style],table[style|border|cellpadding|cellspacing|width],thead,tbody,tfoot,tr,th[colspan|rowspan|scope|style|width|align],td[colspan|rowspan|style|width|align]'

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  onBlur,
  mode = 'simple',
  readOnly = false,
  required = false,
  maxLength,
  disabled = false,
  error,
  height,
  placeholder,
  className,
}: RichTextEditorProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [touched, setTouched] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const lastAcceptedValue = useRef(value)
  const editorId = useMemo(() => id ?? `rich-text-${crypto.randomUUID()}`, [id])
  const labelId = `${editorId}-label`
  const errorId = `${editorId}-error`

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setDark(root.classList.contains('dark')))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    lastAcceptedValue.current = value
  }, [value])

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
  }, [dark, mode, readOnly, disabled])

  const visibleError = error || (required && touched && !hasRichTextContent(value) ? 'Trường này là bắt buộc.' : undefined)
  const init = useMemo<ComponentProps<typeof Editor>['init']>(() => {
    const styles = getComputedStyle(document.documentElement)
    const background = styles.getPropertyValue('--background').trim() || '#ffffff'
    const foreground = styles.getPropertyValue('--foreground').trim() || '#111827'
    const readonlyToolbar = readOnly || disabled

    return {
      language: 'vi',
      language_url: '/tinymce/langs/vi.js',
      skin: dark ? 'oxide-dark' : 'oxide',
      content_css: 'default',
      content_style: `body { background-color: ${background}; color: ${foreground}; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.6; } table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #9ca3af; padding: 6px; }`,
      plugins: 'advlist lists link table',
      toolbar: readonlyToolbar ? false : mode === 'full' ? fullToolbar : simpleToolbar,
      menubar: readonlyToolbar || mode === 'simple' ? false : 'file edit view insert format tools table',
      toolbar_mode: 'wrap',
      height: height ?? (mode === 'simple' ? 220 : 420),
      statusbar: false,
      resize: false,
      placeholder,
      iframe_attrs: { title: `${label ?? 'Trình soạn thảo văn bản'} - vùng nội dung` },
      aria_label: label ?? 'Trình soạn thảo văn bản',
      valid_elements: allowedElements,
      valid_styles: {
        '*': 'color,background-color,font-size,font-family,text-align,text-decoration,font-weight,font-style,margin-left',
      },
      paste_data_images: false,
      automatic_uploads: false,
      block_unsupported_drop: true,
      font_size_formats: '10pt 11pt 12pt 13pt 14pt 16pt 18pt 20pt 24pt 28pt 36pt',
      font_family_formats: 'Arial=Arial,Helvetica,sans-serif;Times New Roman=Times New Roman,Times,serif;Georgia=Georgia,serif;Inter=Inter,Arial,sans-serif;Tahoma=Tahoma,Arial,sans-serif;Verdana=Verdana,Geneva,sans-serif',
      font_size_input_default_unit: 'pt',
      elementpath: false,
    }
  }, [dark, disabled, height, label, mode, placeholder, readOnly])

  const onEditorChange = useCallback((html: string, editor: TinyEditorInstance) => {
    if (maxLength !== undefined && richTextPlainText(html).length > maxLength) {
      editor.undoManager.ignore(() => editor.setContent(lastAcceptedValue.current))
      return
    }
    lastAcceptedValue.current = html
    onChange(html)
  }, [maxLength, onChange])

  return (
    <div className={cn('min-w-0 space-y-2', className)} aria-busy={loading}>
      {label && <Label id={labelId} htmlFor={editorId}>{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</Label>}
      <div className={cn('relative min-w-0 overflow-hidden rounded-md border border-input bg-background', visibleError && 'border-destructive')}>
        <Editor
          key={`${dark ? 'dark' : 'light'}-${mode}-${readOnly}-${disabled}`}
          id={editorId}
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          licenseKey="gpl"
          value={value}
          disabled={disabled || readOnly}
          init={init}
          onInit={() => { setLoading(false); setLoadError(false) }}
          onEditorChange={onEditorChange}
          onBlur={() => { setTouched(true); onBlur?.() }}
          onScriptsLoadError={() => { setLoading(false); setLoadError(true) }}
          textareaName={id}
        />
        {loading && <div role="status" className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/90 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Đang tải trình soạn thảo…</div>}
      </div>
      {loadError && <p role="alert" className="text-sm text-destructive">Không tải được TinyMCE tự lưu trữ. Hãy làm mới trang hoặc liên hệ quản trị viên.</p>}
      {maxLength !== undefined && <p className="text-right text-xs text-muted-foreground">{richTextPlainText(value).length}/{maxLength} ký tự</p>}
      {visibleError && <p id={errorId} role="alert" className="text-sm text-destructive">{visibleError}</p>}
    </div>
  )
}
