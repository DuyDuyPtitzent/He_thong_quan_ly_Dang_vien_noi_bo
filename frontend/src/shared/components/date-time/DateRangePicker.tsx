import { useState } from 'react'
import { formatDateOnly } from './lib/date-utils'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/components/ui/popover'
import { Button } from '@/shared/components/ui/button'
import { PickerTrigger } from './components/PickerTrigger'
import { RangeCalendar } from './components/RangeCalendar'
import type { DateRangeValue, PickerProps } from './types'

export type DateRangePickerProps = PickerProps<DateRangeValue> & { confirmSelection?: boolean; numberOfMonths?: 1 | 2 }
export function DateRangePicker({ value = {}, onChange, disabled, readOnly, clearable = true, placeholder = 'Chọn khoảng ngày', minDate, maxDate, className, required, name, id, 'aria-label': ariaLabel, confirmSelection = false, numberOfMonths = 2 }: DateRangePickerProps) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState<DateRangeValue>(value)
  const display = value.from ? `${formatDateOnly(value.from)}${value.to ? ` – ${formatDateOnly(value.to)}` : ' – Chọn ngày kết thúc'}` : ''
  const handleOpen = (next: boolean) => { if (next) setDraft(value); else if (confirmSelection) setDraft(value); setOpen(next) }
  return <div><Popover open={open} onOpenChange={handleOpen}><PopoverAnchor asChild><PickerTrigger id={id} ariaLabel={ariaLabel} value={display} placeholder={placeholder} disabled={disabled} readOnly={readOnly} clearable={clearable} required={required} onClear={() => { onChange(undefined); setDraft({}) }} onClick={() => !readOnly && setOpen(!open)} className={className} /></PopoverAnchor><PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] p-3"><div className="max-w-[calc(100vw-2rem)] overflow-x-auto"><RangeCalendar value={draft} onChange={(next) => { setDraft(next); if (!confirmSelection && next.from && next.to) onChange(next) }} minDate={minDate} maxDate={maxDate} months={numberOfMonths} /></div>{confirmSelection && <div className="flex justify-end gap-2 border-t pt-3"><Button variant="outline" onClick={() => { setDraft(value); setOpen(false) }}>Hủy</Button><Button disabled={!draft.from || !draft.to} onClick={() => { onChange(draft); setOpen(false) }}>Xác nhận</Button></div>}</PopoverContent></Popover>{name && <input type="hidden" name={name} value={value.from && value.to ? `${value.from}/${value.to}` : ''} />}</div>
}
