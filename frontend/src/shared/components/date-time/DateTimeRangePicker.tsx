import { useRef, useState } from 'react'
import { parse } from 'date-fns'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/components/ui/popover'
import { PickerTrigger } from './components/PickerTrigger'
import { RangeCalendar } from './components/RangeCalendar'
import { TimeSelector } from './components/TimeSelector'
import { asLocalDateTime, formatLocalDateTime, parseDateOnly } from './lib/date-utils'
import type { DateTimeRangeValue, LocalDateTime, PickerProps } from './types'

export type DateTimeRangePickerProps = PickerProps<DateTimeRangeValue> & { confirmSelection?: boolean; minDateTime?: LocalDateTime; maxDateTime?: LocalDateTime }
function timeParts(value?: string) { const parsed = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : undefined; return { hour: parsed?.getHours() ?? 8, minute: parsed?.getMinutes() ?? 0 } }
export function DateTimeRangePicker({ value = {}, onChange, disabled, readOnly, clearable = true, placeholder = 'Chọn khoảng thời gian', minDate, maxDate, minDateTime, maxDateTime, className, required, name, id, 'aria-label': ariaLabel, confirmSelection = true }: DateTimeRangePickerProps) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState<DateTimeRangeValue>(value)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [fromTime, setFromTime] = useState(timeParts(value.from)); const [toTime, setToTime] = useState(timeParts(value.to))
  const fromDay = draft.from?.slice(0, 10); const toDay = draft.to?.slice(0, 10)
  const minRangeDate = minDateTime ? [minDate, minDateTime.slice(0, 10)].filter(Boolean).sort().at(-1) : minDate
  const maxRangeDate = maxDateTime ? [maxDate, maxDateTime.slice(0, 10)].filter(Boolean).sort()[0] : maxDate
  const isValidRange = (range: DateTimeRangeValue) => Boolean(range.from && range.to && range.to > range.from && (!minDateTime || range.from >= minDateTime) && (!maxDateTime || range.to <= maxDateTime))
  const changeDay = (range: { from?: string; to?: string }) => {
    const next: DateTimeRangeValue = { from: range.from ? asLocalDateTime(parseDateOnly(range.from)!, fromTime.hour, fromTime.minute) : undefined, to: range.to ? asLocalDateTime(parseDateOnly(range.to)!, toTime.hour, toTime.minute) : undefined }
    setDraft(next)
    if (!confirmSelection && isValidRange(next)) onChange(next)
  }
  const updateTime = (side: 'from' | 'to', nextTime: { hour: number; minute: number }) => {
    if (side === 'from') setFromTime(nextTime)
    else setToTime(nextTime)
    const day = side === 'from' ? fromDay : toDay
    if (!day) return
    const next = { ...draft, [side]: `${day}T${String(nextTime.hour).padStart(2, '0')}:${String(nextTime.minute).padStart(2, '0')}` }
    setDraft(next)
    if (!confirmSelection && isValidRange(next)) onChange(next)
  }
  const valid = isValidRange(draft)
  const display = value.from ? `${formatLocalDateTime(value.from)}${value.to ? ` – ${formatLocalDateTime(value.to)}` : ' – Chọn kết thúc'}` : ''
  return <div><Popover open={open} onOpenChange={(next) => { if (next) { setDraft(value); setFromTime(timeParts(value.from)); setToTime(timeParts(value.to)) } setOpen(next) }}><PopoverAnchor asChild><PickerTrigger id={id} ariaLabel={ariaLabel} value={display} placeholder={placeholder} disabled={disabled} readOnly={readOnly} clearable={clearable} required={required} onClear={() => { onChange(undefined); setDraft({}) }} onClick={() => !readOnly && setOpen(!open)} className={className} /></PopoverAnchor><PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-x-auto overflow-y-auto p-3"><div className="flex min-w-max flex-col gap-4 xl:flex-row"><div ref={calendarRef}><RangeCalendar value={{ from: fromDay, to: toDay }} onChange={changeDay} minDate={minRangeDate} maxDate={maxRangeDate} months={2} /></div><div className="grid gap-4 border-t pt-3 sm:grid-cols-2 xl:border-l xl:border-t-0 xl:pl-4"><TimeSelector label="Bắt đầu" {...fromTime} onHour={(hour) => updateTime('from', { ...fromTime, hour })} onMinute={(minute) => updateTime('from', { ...fromTime, minute })} matchHeightToRef={calendarRef} matchHeightAt="xl" /><TimeSelector label="Kết thúc" {...toTime} onHour={(hour) => updateTime('to', { ...toTime, hour })} onMinute={(minute) => updateTime('to', { ...toTime, minute })} matchHeightToRef={calendarRef} matchHeightAt="xl" /></div></div><div className="flex items-center justify-between gap-3 border-t pt-3"><p className="text-xs text-muted-foreground">{draft.from ? formatLocalDateTime(draft.from) : 'Chưa chọn bắt đầu'}{draft.to ? ` – ${formatLocalDateTime(draft.to)}` : ''}</p><div className="flex gap-2">{clearable && <Button variant="outline" onClick={() => { setDraft({}); onChange(undefined) }}>Xóa</Button>}{confirmSelection && <><Button variant="outline" onClick={() => { setDraft(value); setOpen(false) }}>Hủy</Button><Button disabled={!valid} onClick={() => { onChange(draft); setOpen(false) }}>Xác nhận</Button></>}</div></div></PopoverContent></Popover>{name && <input type="hidden" name={name} value={value.from && value.to ? `${value.from}/${value.to}` : ''} />}</div>
}
