import { useEffect, useRef, useState } from 'react'
import { format, parse } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/components/ui/popover'
import { Calendar } from '@/shared/components/ui/calendar'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { PickerTrigger } from './components/PickerTrigger'
import { TimeSelector } from './components/TimeSelector'
import { asLocalDateTime, formatLocalDateTime, isWithinLimits, parseDateOnly, parseDirectDateTime, toDateOnly } from './lib/date-utils'
import type { LocalDateTime, PickerProps } from './types'

export function DateTimePicker({ value, onChange, disabled, readOnly, clearable = true, placeholder = 'dd/MM/yyyy HH:mm', minDate, maxDate, className, required, name, id, 'aria-label': ariaLabel }: PickerProps<LocalDateTime>) {
  const [open, setOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [directValue, setDirectValue] = useState(''); const [error, setError] = useState('')
  const parsed = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : undefined
  const [hour, setHour] = useState(parsed?.getHours() ?? 8); const [minute, setMinute] = useState(parsed?.getMinutes() ?? 0)
  useEffect(() => { const current = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : undefined; setHour(current?.getHours() ?? 8); setMinute(current?.getMinutes() ?? 0) }, [value])
  const updateTime = (date: Date | undefined, h = hour, m = minute) => { if (!date) return; const key = toDateOnly(date)!; if (isWithinLimits(key, minDate, maxDate)) onChange(asLocalDateTime(date, h, m)) }
  const applyDirect = () => { const next = parseDirectDateTime(directValue); if (!next || !isWithinLimits(next.slice(0, 10), minDate, maxDate)) { setError('Ngày giờ không hợp lệ hoặc nằm ngoài giới hạn.'); return } onChange(next); const nextDate = parse(next, "yyyy-MM-dd'T'HH:mm", new Date()); setHour(nextDate.getHours()); setMinute(nextDate.getMinutes()); setError(''); setOpen(false) }
  return <div><Popover open={open} onOpenChange={setOpen}><PopoverAnchor asChild><PickerTrigger id={id} ariaLabel={ariaLabel} value={formatLocalDateTime(value)} placeholder={placeholder} disabled={disabled} readOnly={readOnly} clearable={clearable} required={required} onClear={() => onChange(undefined)} onClick={() => !readOnly && setOpen(!open)} className={className} /></PopoverAnchor><PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto p-3"><div className="mb-3 space-y-1"><label className="text-xs font-medium">Nhập ngày giờ trực tiếp</label><div className="flex gap-2"><Input value={directValue} onChange={(e) => { setDirectValue(e.target.value); setError('') }} placeholder="dd/MM/yyyy HH:mm" onKeyDown={(e) => e.key === 'Enter' && applyDirect()} aria-invalid={Boolean(error)} /><Button variant="secondary" onClick={applyDirect}>Áp dụng</Button></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div><div className="flex flex-col gap-3 sm:flex-row"><div ref={calendarRef}><Calendar mode="single" locale={vi} selected={parsed} onSelect={(date) => updateTime(date)} disabled={(date) => !isWithinLimits(toDateOnly(date)!, minDate, maxDate)} defaultMonth={parsed ?? parseDateOnly(minDate) ?? new Date()} startMonth={parseDateOnly(minDate) ?? new Date(1900, 0, 1)} endMonth={parseDateOnly(maxDate) ?? new Date(2100, 11, 31)} captionLayout="dropdown" formatters={{ formatCaption: (date) => format(date, 'LLLL yyyy', { locale: vi }) }} /></div><TimeSelector label="Thời gian" hour={hour} minute={minute} onHour={(h) => { setHour(h); updateTime(parsed, h, minute) }} onMinute={(m) => { setMinute(m); updateTime(parsed, hour, m) }} matchHeightToRef={calendarRef} matchHeightAt="sm" /></div><div className="flex justify-end border-t pt-3"><Button disabled={!parsed} onClick={() => setOpen(false)}>Xác nhận</Button></div></PopoverContent></Popover>{name && <input type="hidden" name={name} value={value ?? ''} />}</div>
}
