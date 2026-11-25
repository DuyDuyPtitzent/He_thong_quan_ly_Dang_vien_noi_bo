import type { ReactNode } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'

type StatisticCardProps = {
  label: string
  value: number | string
  icon?: ReactNode
  description?: string
  equalHeight?: boolean
  compact?: boolean
}

/** Compact summary card; equalHeight is opt-in for aligned KPI grids. */
export function StatisticCard({ label, value, icon, description, equalHeight = false, compact = false }: StatisticCardProps) {
  return (
    <Card className={`gap-0 py-0 ${equalHeight ? 'h-full self-stretch' : 'h-fit self-start'}`}>
      <CardContent className={`flex justify-between gap-2 ${compact ? 'p-3' : 'p-4'} ${equalHeight ? 'items-start' : 'items-center'}`}>
        <div className="min-w-0">
          <p className={`${compact ? 'text-[10px]' : 'text-sm'} text-muted-foreground`}>{label}</p>
          <p className={`${compact ? 'mt-1 text-xs leading-tight' : 'mt-1 text-2xl'} font-semibold tabular-nums break-words`}>{value}</p>
          {description && <p className={`${compact ? 'mt-1 text-[9px] leading-tight' : 'mt-1 text-xs'} text-muted-foreground`}>{description}</p>}
        </div>
        {icon && <div className={`shrink-0 rounded-md bg-muted text-primary ${compact ? 'p-1.5' : 'p-2'}`}>{icon}</div>}
      </CardContent>
    </Card>
  )
}
