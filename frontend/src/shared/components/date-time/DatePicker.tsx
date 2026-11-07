import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/components/ui/popover'
import { Calendar } from '@/shared/components/ui/calendar'
import { Input } from '@/shared/components/ui/input'
import { PickerTrigger } from './components/PickerTrigger'
import { formatDateOnly, isWithinLimits, parseDateOnly, parseDirectDate, toDateOnly } from './lib/date-utils'
import type { PickerProps, DateOnly } from './types'

export type DatePickerProps = PickerProps<DateOnly> & { showOutsideDays?: boolean }
export function DatePicker({ value, onChange, disabled, readOnly, clearable = true, placeholder = 'dd/MM/yyyy', minDate, maxDate, className, required, name, id, 'aria-label': ariaLabel, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy, showOutsideDays = true }: DatePickerProps) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState(''); const [error, setError] = useState('')
  const commitText = () => { const parsed = parseDirectDate(draft); if (!parsed || !isWithinLimits(parsed, minDate, maxDate)) { setError('Ngày không hợp lệ hoặc nằm ngoài giới hạn.'); return }
    onChange(parsed); setDraft(''); setError(''); setOpen(false) }
  return <div className="space-y-1">
    <Popover open={open} onOpenChange={setOpen}><PopoverAnchor asChild><PickerTrigger id={id} ariaLabel={ariaLabel} ariaInvalid={ariaInvalid} ariaDescribedBy={ariaDescribedBy} value={formatDateOnly(value)} placeholder={placeholder} disabled={disabled} readOnly={readOnly} clearable={clearable} required={required} onClear={() => onChange(undefined)} onClick={() => !readOnly && setOpen(!open)} className={className} /></PopoverAnchor>
      <PopoverContent align="start" className="w-auto p-0"><div className="space-y-2 p-3 pb-0"><label className="text-xs font-medium" htmlFor={name ? `${name}-direct` : undefined}>Nhập ngày trực tiếp</label><div className="flex gap-2"><Input id={name ? `${name}-direct` : undefined} value={draft} onChange={(e) => { setDraft(e.target.value); setError('') }} onKeyDown={(e) => { if (e.key === 'Enter') commitText() }} placeholder="dd/MM/yyyy" aria-invalid={Boolean(error)} /><button type="button" onClick={commitText} className="rounded-md border px-3 text-sm">Áp dụng</button></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>
        <Calendar mode="single" locale={vi} selected={parseDateOnly(value)} onSelect={(date) => { const next = toDateOnly(date); if (next && isWithinLimits(next, minDate, maxDate)) { onChange(next); setOpen(false) } }} disabled={(date) => !isWithinLimits(toDateOnly(date)!, minDate, maxDate)} defaultMonth={parseDateOnly(value)} startMonth={parseDateOnly(minDate) ?? new Date(1900, 0, 1)} endMonth={parseDateOnly(maxDate) ?? new Date(2100, 11, 31)} showOutsideDays={showOutsideDays} captionLayout="dropdown" formatters={{ formatCaption: (date) => format(date, 'LLLL yyyy', { locale: vi }) }} />
      </PopoverContent></Popover>
    {name && <input type="hidden" name={name} value={value ?? ''} />}
  </div>
}
