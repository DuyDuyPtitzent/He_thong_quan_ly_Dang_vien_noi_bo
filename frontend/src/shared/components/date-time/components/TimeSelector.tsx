import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { cn } from 'cn'
import { Button } from '@/shared/components/ui/button'

export function TimeSelector({ hour, minute, onHour, onMinute, label, matchHeightToRef, matchHeightAt }: { hour: number; minute: number; onHour: (v: number) => void; onMinute: (v: number) => void; label: string; matchHeightToRef?: RefObject<HTMLElement | null>; matchHeightAt?: 'sm' | 'xl' }) {
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)
  const [matchedHeight, setMatchedHeight] = useState(0)
  useEffect(() => {
    for (const column of [hourRef.current, minuteRef.current]) {
      const selected = column?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!column || !selected) continue
      const columnBox = column.getBoundingClientRect()
      const selectedBox = selected.getBoundingClientRect()
      column.scrollTop += selectedBox.top - columnBox.top - (column.clientHeight - selected.clientHeight) / 2
    }
  }, [hour, minute])
  useLayoutEffect(() => {
    const target = matchHeightToRef?.current
    if (!target) return
    const updateHeight = () => setMatchedHeight(target.getBoundingClientRect().height)
    updateHeight()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateHeight)
    observer.observe(target)
    return () => observer.disconnect()
  }, [matchHeightToRef])
  const layoutClasses = matchHeightAt === 'xl'
    ? { section: 'xl:flex xl:min-h-0 xl:flex-col xl:h-[var(--time-selector-height)]', row: 'xl:min-h-0 xl:flex-1', group: 'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col', list: 'xl:h-auto xl:max-h-none xl:min-h-0 xl:flex-1' }
    : matchHeightAt === 'sm'
      ? { section: 'sm:flex sm:min-h-0 sm:flex-col sm:h-[var(--time-selector-height)]', row: 'sm:min-h-0 sm:flex-1', group: 'sm:flex sm:min-h-0 sm:flex-1 sm:flex-col', list: 'sm:h-auto sm:max-h-none sm:min-h-0 sm:flex-1' }
      : { section: '', row: '', group: '', list: '' }
  const sectionStyle: CSSProperties & { '--time-selector-height'?: string } = matchedHeight > 0 ? { '--time-selector-height': `${matchedHeight}px` } : {}
  const column = (ref: typeof hourRef, selected: number, count: number, change: (n: number) => void, title: string) => <div ref={ref} role="listbox" aria-label={title} className={cn('h-48 max-h-[min(12rem,calc(100dvh-8rem))] w-14 shrink-0 overflow-y-auto overscroll-contain rounded-md border p-1', layoutClasses.list)}>
    {Array.from({ length: count }, (_, i) => <Button key={i} type="button" size="sm" variant={selected === i ? 'secondary' : 'ghost'} aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} role="option" onKeyDown={(event) => { const next = event.key === 'ArrowDown' ? (i + 1) % count : event.key === 'ArrowUp' ? (i - 1 + count) % count : undefined; if (next !== undefined) { event.preventDefault(); change(next); ref.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[next]?.focus() } }} onClick={() => change(i)} className={cn('mb-0.5 h-8 w-full px-0 tabular-nums')}>{String(i).padStart(2, '0')}</Button>)}
  </div>
  return <section aria-label={label} style={sectionStyle} className={cn('space-y-2', layoutClasses.section)}><h3 className="text-sm font-medium">{label}</h3><div className={cn('flex gap-2', layoutClasses.row)}><div className={cn('space-y-1', layoutClasses.group)}><span className="text-xs text-muted-foreground">Giờ</span>{column(hourRef, hour, 24, onHour, `${label}: giờ`)}</div><div className={cn('space-y-1', layoutClasses.group)}><span className="text-xs text-muted-foreground">Phút</span>{column(minuteRef, minute, 60, onMinute, `${label}: phút`)}</div></div></section>
}
