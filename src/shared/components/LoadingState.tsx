import { Skeleton } from '@/shared/components/ui/skeleton'
export function LoadingState() {
  return (
    <div className="space-y-3" aria-label="Đang tải">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
