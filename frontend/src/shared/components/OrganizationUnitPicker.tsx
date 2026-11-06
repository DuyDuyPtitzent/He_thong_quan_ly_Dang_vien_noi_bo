import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from 'cn'

export type OrganizationUnitChoice = { value: string; label: string; keywords?: string }

type Props = {
  id?: string
  label: string
  options: OrganizationUnitChoice[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  allOption?: { value: string; label: string }
  clearOption?: { value: string; label: string }
  disabled?: boolean
  required?: boolean
  className?: string
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi-VN').trim()

export function OrganizationUnitPicker({ id, label, options, value, onValueChange, placeholder = 'Chọn đơn vị', allOption, clearOption, disabled, required, className }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const query = normalize(search)
    return query ? options.filter((option) => normalize(`${option.label} ${option.keywords ?? ''}`).includes(query)) : options
  }, [options, search])

  function choose(next: string) {
    onValueChange(next)
    setSearch('')
    setOpen(false)
  }

  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch('') }}>
    <PopoverTrigger asChild>
      <Button id={id} type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} aria-required={required} disabled={disabled} className={cn('h-auto min-h-10 w-full justify-between py-2 text-left font-normal', !selected && 'text-muted-foreground', className)}>
        <span className="min-w-0 whitespace-normal break-words">{selected?.label ?? (allOption?.value === value ? allOption.label : clearOption?.value === value ? clearOption.label : placeholder)}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={4} className="w-[max(var(--radix-popover-trigger-width),24rem)] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
      <Command shouldFilter={false}>
        <CommandInput aria-label={`Tìm ${label.toLocaleLowerCase('vi-VN')}`} placeholder="Nhập tên đơn vị để tìm kiếm..." value={search} onValueChange={setSearch} />
        <CommandList className="max-h-72 overscroll-contain">
          <CommandEmpty>Không tìm thấy đơn vị phù hợp</CommandEmpty>
          {(allOption || clearOption) && !search && <CommandGroup heading="Lựa chọn">
            {allOption && <CommandItem value={allOption.value} onSelect={() => choose(allOption.value)}>
              <Check className={cn('size-4', value === allOption.value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />{allOption.label}
            </CommandItem>}
            {clearOption && <CommandItem value={clearOption.value} onSelect={() => choose(clearOption.value)}>
              <X className="size-4" aria-hidden="true" />{clearOption.label}
            </CommandItem>}
          </CommandGroup>}
          <CommandGroup heading="Đơn vị">
            {filtered.map((option) => <CommandItem key={option.value} value={option.value} onSelect={() => choose(option.value)} className="items-start">
              <Check className={cn('size-4', value === option.value ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
              <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}

export function OrganizationUnitMultiPicker({ label, options, value, onValueChange, disabled }: {
  label: string
  options: OrganizationUnitChoice[]
  value: string[]
  onValueChange: (value: string[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedNames = options.filter((option) => value.includes(option.value)).map((option) => option.label)
  const filtered = useMemo(() => {
    const query = normalize(search)
    return query ? options.filter((option) => normalize(`${option.label} ${option.keywords ?? ''}`).includes(query)) : options
  }, [options, search])

  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch('') }}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} disabled={disabled} className="h-auto min-h-10 w-full justify-between bg-background py-2 text-left font-normal">
        <span className="min-w-0 whitespace-normal break-words">{selectedNames.length ? selectedNames.join(', ') : 'Chọn đơn vị'}</span><ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={4} className="w-[max(var(--radix-popover-trigger-width),24rem)] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
      <Command shouldFilter={false}>
        <CommandInput aria-label={`Tìm ${label.toLocaleLowerCase('vi-VN')}`} placeholder="Nhập tên đơn vị để tìm kiếm..." value={search} onValueChange={setSearch} />
        <CommandList className="max-h-72 overscroll-contain">
          <CommandEmpty>Không tìm thấy đơn vị phù hợp</CommandEmpty>
          {value.length > 0 && !search && <CommandGroup heading="Lựa chọn">
            <CommandItem value="__clear_all__" onSelect={() => onValueChange([])}><X className="size-4" aria-hidden="true" />Bỏ chọn tất cả đơn vị</CommandItem>
          </CommandGroup>}
          <CommandGroup heading="Đơn vị">
            {filtered.map((option) => {
              const checked = value.includes(option.value)
              return <CommandItem key={option.value} value={option.value} onSelect={() => onValueChange(checked ? value.filter((item) => item !== option.value) : [...value, option.value])} className="items-start">
                <Check className={cn('size-4', checked ? 'opacity-100' : 'opacity-0')} aria-hidden="true" /><span className="min-w-0 whitespace-normal break-words">{option.label}</span>
              </CommandItem>
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}
