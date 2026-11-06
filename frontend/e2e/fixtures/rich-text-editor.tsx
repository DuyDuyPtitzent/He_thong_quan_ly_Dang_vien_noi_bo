import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RichTextEditor, type RichTextEditorMode } from '../../src/shared/components/RichTextEditor'
import '../../src/app/styles/globals.css'

function RichTextHarness() {
  const [mode, setMode] = useState<RichTextEditorMode>('simple')
  const [readOnly, setReadOnly] = useState(false)
  const [value, setValue] = useState('')
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode(mode === 'simple' ? 'full' : 'simple')}>Chuyển chế độ</button>
        <button type="button" onClick={() => setReadOnly((current) => !current)}>Đổi chỉ đọc</button>
        <button type="button" onClick={() => document.documentElement.classList.toggle('dark')}>Đổi giao diện</button>
      </div>
      <RichTextEditor id="tinymce-e2e" label="Lý do" value={value} onChange={setValue} mode={mode} required maxLength={1000} readOnly={readOnly}/>
      <output data-testid="saved-html">{value}</output>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<RichTextHarness />)
