import { forwardRef } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from 'cn'

type PickerTriggerProps = {
  value: string; placeholder: string; disabled?: boolean; readOnly?: boolean; clearable?: boolean; required?: boolean
  onClear?: () => void; onClick: () => void; className?: string; id?: string; ariaLabel?: string; ariaInvalid?: boolean; ariaDescribedBy?: string
}

export const PickerTrigger = forwardRef<HTMLDivElement, PickerTriggerProps>(function PickerTrigger({ value, placeholder, disabled, readOnly, clearable, onClear, onClick, className, required, id, ariaLabel, ariaInvalid, ariaDescribedBy, ...anchorProps }, ref) {
  return <div ref={ref} {...anchorProps} className={cn('relative flex', className)}>
    <Button id={id} type="button" variant="outline" disabled={disabled} aria-label={ariaLabel} aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy} aria-haspopup="dialog" aria-required={required} onClick={onClick} className="w-full justify-start pr-16 font-normal">
      <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className={cn('truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span>
    </Button>
    {value && clearable && !readOnly && <Button type="button" variant="ghost" size="icon-xs" aria-label="Xóa lựa chọn" className="absolute right-9 top-1/2 -translate-y-1/2" onClick={onClear}><X aria-hidden="true" /></Button>}
  </div>
})
