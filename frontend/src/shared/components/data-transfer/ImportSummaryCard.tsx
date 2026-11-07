import { Card, CardContent } from '@/shared/components/ui/card'

type Variant = 'default' | 'total' | 'success' | 'destructive' | 'independent' | 'linked' | 'warning' | 'exists'
const tones: Record<Variant, { value: string; selected: string }> = {
  default: { value: 'text-foreground', selected: 'border-primary bg-accent' },
  total: { value: 'text-stat-total', selected: 'border-stat-total bg-stat-total-container' },
  success: { value: 'text-success', selected: 'border-success bg-success/10' },
  destructive: { value: 'text-destructive', selected: 'border-destructive bg-destructive/10' },
  independent: { value: 'text-stat-independent', selected: 'border-stat-independent bg-stat-independent-container' },
  linked: { value: 'text-stat-linked', selected: 'border-stat-linked bg-stat-linked-container' },
  warning: { value: 'text-warning', selected: 'border-warning bg-warning-container' },
  exists: { value: 'text-stat-exists', selected: 'border-stat-exists bg-stat-exists-container' },
}

export function ImportSummaryCard({ label, value, variant = 'default', onClick, selected = false, disabled = false, loading = false }: { label: string; value: number; variant?: Variant; onClick?: () => void; selected?: boolean; disabled?: boolean; loading?: boolean }) {
  const tone = tones[variant]
  const card = <Card className={`gap-1 py-0 ${selected ? tone.selected : ''}`}><CardContent className="p-3"><p className={`text-xs ${selected ? tone.value : 'text-muted-foreground'}`}>{label}</p><p className={`text-xl font-semibold tabular-nums ${tone.value}`}>{loading ? <span role="status" aria-label="Đang tải số liệu" className="inline-block h-6 w-10 animate-pulse rounded bg-muted align-middle" /> : value}</p></CardContent></Card>
  return onClick ? <button type="button" className="rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={onClick} aria-label={loading ? `Đang tải số liệu: ${label}` : `Lọc danh sách: ${label}, ${value}`} aria-pressed={selected} disabled={disabled || loading}>{card}</button> : card
}
