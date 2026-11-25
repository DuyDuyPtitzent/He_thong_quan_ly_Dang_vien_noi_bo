import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
export function PageHeader({
  title,
  description,
  actions,
  layout = 'default',
  leading,
  titleClassName,
}: {
  title: string
  description?: string
  actions?: ReactNode
  layout?: 'default' | 'split'
  leading?: ReactNode
  titleClassName?: string
}) {
  return (
    <div className={cn('mb-7 gap-4', layout === 'split' ? 'mb-0 grid min-w-0 grid-cols-1 items-start xl:grid-cols-[minmax(0,1fr)_auto]' : 'flex flex-wrap items-start justify-between')}>
      <div className="flex min-w-0 items-start gap-3">
        {leading && <span className="mt-0.5 shrink-0">{leading}</span>}
        <div className="min-w-0">
          <h1 className={cn('text-2xl font-semibold tracking-tight', titleClassName)}>{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className={cn(layout === 'split' && 'min-w-0 xl:justify-self-end')}>{actions}</div>}
    </div>
  )
}
