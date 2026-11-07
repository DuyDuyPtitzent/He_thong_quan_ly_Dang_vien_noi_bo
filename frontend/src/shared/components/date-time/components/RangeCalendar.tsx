import { useState } from 'react'
import { vi } from 'date-fns/locale'
import { Calendar, CalendarDayButton } from '@/shared/components/ui/calendar'
import { cn } from 'cn'
import type { DateRangeValue } from '../types'
import { isWithinLimits, parseDateOnly, toDateOnly } from '../lib/date-utils'

export function RangeCalendar({ value, onChange, minDate, maxDate, months = 2 }: {
  value: DateRangeValue; onChange: (value: DateRangeValue) => void; minDate?: string; maxDate?: string; months?: number
}) {
  const [hover, setHover] = useState<Date>()
  const from = parseDateOnly(value.from)
  const to = parseDateOnly(value.to)
  const selectingEnd = Boolean(from && !to)
  const previewEnd = selectingEnd ? hover : to
  const reverse = Boolean(from && previewEnd && toDateOnly(previewEnd)! < toDateOnly(from)!)
  const normalizedEnd = reverse ? from : previewEnd
  const normalizedStart = reverse ? previewEnd : from
  const startKey = toDateOnly(normalizedStart)
  const endKey = toDateOnly(normalizedEnd)
  const preview = (date: Date) => {
    const key = toDateOnly(date)
    setHover((current) => toDateOnly(current) === key ? current : parseDateOnly(key))
  }
  const disabled = (date: Date) => !isWithinLimits(toDateOnly(date)!, minDate, maxDate)
  const choose = (date?: Date) => {
    if (!date) return
    const key = toDateOnly(date)!
    if (!isWithinLimits(key, minDate, maxDate)) return
    if (!from || to) onChange({ from: key })
    else if (value.from && key < value.from) onChange({ from: key, to: value.from })
    else onChange({ from: value.from, to: key })
  }
  return <div onMouseLeave={() => { if (selectingEnd) setHover(undefined) }}><Calendar mode="range" locale={vi} numberOfMonths={months} defaultMonth={from ?? new Date()}
    modifiers={{ rangePreviewStart: (date) => toDateOnly(date) === startKey, rangePreviewEnd: (date) => Boolean(endKey && toDateOnly(date) === endKey), rangePreviewMiddle: (date) => { const key = toDateOnly(date); return Boolean(startKey && endKey && key && key > startKey && key < endKey) } }}
    disabled={disabled} onDayClick={choose}
    components={{ DayButton: (props) => {
      const { rangePreviewStart, rangePreviewEnd, rangePreviewMiddle } = props.modifiers
      return <CalendarDayButton {...props} className={cn(props.className, rangePreviewStart && 'rounded-l-md bg-primary text-primary-foreground', rangePreviewEnd && 'rounded-r-md bg-primary text-primary-foreground', rangePreviewMiddle && 'rounded-none bg-primary/15 text-foreground')} data-range-preview={rangePreviewStart ? 'start' : rangePreviewEnd ? 'end' : rangePreviewMiddle ? 'middle' : undefined} onMouseEnter={(event) => { props.onMouseEnter?.(event); if (selectingEnd) preview(props.day.date) }} onMouseMove={(event) => { props.onMouseMove?.(event); if (selectingEnd) preview(props.day.date) }} />
    } }}
    className="mx-auto" classNames={{ range_middle: 'rounded-none bg-primary/15 text-foreground', range_start: 'rounded-l-md bg-primary text-primary-foreground', range_end: 'rounded-r-md bg-primary text-primary-foreground' }} /></div>
}
