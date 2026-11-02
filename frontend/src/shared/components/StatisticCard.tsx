import type { ReactNode } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'

type StatisticCardProps = {
  label: string
  value: number | string
  icon?: ReactNode
}

/** Compact summary card that sizes itself to its content instead of filling a tall grid row. */
export function StatisticCard({ label, value, icon }: StatisticCardProps) {
  return (
    <Card className="h-fit self-start gap-0 py-0">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        {icon && <div className="shrink-0 rounded-md bg-muted p-2 text-primary">{icon}</div>}
      </CardContent>
    </Card>
  )
}
