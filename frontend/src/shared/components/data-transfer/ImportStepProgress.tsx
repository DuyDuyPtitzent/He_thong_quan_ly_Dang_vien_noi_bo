import { Check } from 'lucide-react'
import { Progress } from '@/shared/components/ui/progress'

export function ImportStepProgress({ activeIndex, steps, ariaLabel }: { activeIndex: number; steps: string[]; ariaLabel: string }) {
  const progress = Math.round(((activeIndex + 1) / Math.max(steps.length, 1)) * 100)
  return <div className="shrink-0 space-y-3 border-b px-6 py-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Bước {activeIndex + 1} / {steps.length} · {steps[activeIndex]}</p><span className="text-xs text-muted-foreground">{progress}%</span></div>
    <Progress value={progress} aria-label={`${ariaLabel}: bước ${activeIndex + 1} trên ${steps.length}`} />
    <ol className="grid grid-cols-4 gap-2" aria-label={ariaLabel}>{steps.map((label, index) => <li key={label} aria-current={index === activeIndex ? 'step' : undefined} className={`flex items-center gap-2 text-xs ${index === activeIndex ? 'font-semibold text-foreground' : index < activeIndex ? 'text-primary' : 'text-muted-foreground'}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${index < activeIndex ? 'border-primary bg-primary text-primary-foreground' : index === activeIndex ? 'border-primary text-primary' : 'border-border'}`}>{index < activeIndex ? <Check className="size-3.5" aria-label="Hoàn tất" /> : index + 1}</span><span className="hidden sm:inline">{label}</span></li>)}</ol>
  </div>
}
