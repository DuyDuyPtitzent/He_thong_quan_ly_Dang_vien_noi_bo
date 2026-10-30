import { Inbox } from 'lucide-react'
export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Nội dung sẽ xuất hiện tại đây khi có dữ liệu.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
      <Inbox className="mb-3 size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
