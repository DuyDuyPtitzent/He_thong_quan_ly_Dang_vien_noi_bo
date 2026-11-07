import { useState } from 'react'
import { format, parse } from 'date-fns'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/components/ui/popover'
import { PickerTrigger } from './components/PickerTrigger'
import { parseDirectMonth } from './lib/date-utils'
import type { PickerProps } from './types'

export function MonthPicker({ value, onChange, disabled, readOnly, clearable = true, placeholder = 'MM/yyyy', minDate, maxDate, className, required, name, id, 'aria-label': ariaLabel }: PickerProps<string>) {
  const [open, setOpen] = useState(false); const selected = value ? parse(value, 'yyyy-MM', new Date()) : undefined; const [year, setYear] = useState(selected?.getFullYear() ?? new Date().getFullYear()); const [draft, setDraft] = useState(''); const [error, setError] = useState('')
  const permitted = (month: number) => { const key = `${year}-${String(month + 1).padStart(2, '0')}`; return (!minDate || key >= minDate.slice(0, 7)) && (!maxDate || key <= maxDate.slice(0, 7)) }
  const setMonth = (month: number) => { if (!permitted(month)) return; onChange(`${year}-${String(month + 1).padStart(2, '0')}`); setOpen(false) }
  const direct = () => { const parsed = parseDirectMonth(draft); if (!parsed || (minDate && parsed < minDate.slice(0, 7)) || (maxDate && parsed > maxDate.slice(0, 7))) { setError('Tháng không hợp lệ hoặc nằm ngoài giới hạn.'); return } onChange(parsed); setError(''); setOpen(false) }
  return <div className="space-y-1"><Popover open={open} onOpenChange={setOpen}><PopoverAnchor asChild><PickerTrigger id={id} ariaLabel={ariaLabel} value={value && selected ? format(selected, 'MM/yyyy') : ''} placeholder={placeholder} disabled={disabled} readOnly={readOnly} clearable={clearable} required={required} onClear={() => onChange(undefined)} onClick={() => !readOnly && setOpen(!open)} className={className} /></PopoverAnchor><PopoverContent align="start" className="w-72 space-y-3"><div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={() => setYear(year - 1)} aria-label="Năm trước">‹</Button><span className="font-medium">{year}</span><Button variant="ghost" size="sm" onClick={() => setYear(year + 1)} aria-label="Năm sau">›</Button></div><div className="grid grid-cols-3 gap-2">{Array.from({ length: 12 }, (_, i) => <Button key={i} type="button" variant={selected?.getMonth() === i && selected.getFullYear() === year ? 'default' : 'outline'} disabled={!permitted(i)} onClick={() => setMonth(i)}>Tháng {i + 1}</Button>)}</div><div className="space-y-1"><label className="text-xs font-medium">Nhập tháng</label><div className="flex gap-2"><Input value={draft} onChange={(e) => { setDraft(e.target.value); setError('') }} placeholder="MM/yyyy" onKeyDown={(e) => e.key === 'Enter' && direct()} /><Button variant="secondary" onClick={direct}>Áp dụng</Button></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div></PopoverContent></Popover>{name && <input type="hidden" name={name} value={value ?? ''} />}</div>
}
