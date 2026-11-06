import type { ReactNode } from 'react'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/components/ui/sheet'

/**
 * Khung Sheet chuẩn theo giao diện Thêm Đảng viên.
 * Các feature chỉ cung cấp nội dung và hành động; kích thước, cuộn và
 * vị trí chân trang được giữ thống nhất tại đây.
 */
export function StandardSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  size = 'wide',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer: ReactNode
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  size?: 'compact' | 'detail' | 'wide'
}) {
  const sizeClassName = {
    compact: 'sm:w-[min(94vw,680px)] sm:min-w-0',
    detail: 'sm:w-[min(94vw,780px)] sm:min-w-0',
    wide: 'sm:w-[min(72vw,1340px)] sm:min-w-[min(780px,100vw)]',
  }[size]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`w-screen max-w-none gap-0 bg-modal text-modal-foreground p-0 ${sizeClassName} sm:max-w-none ${contentClassName ?? ''}`}>
        <SheetHeader className={`h-[74px] shrink-0 justify-center border-b bg-modal px-6 py-3 pr-14 shadow-sm sm:px-6 ${headerClassName ?? ''}`}>
          <SheetTitle className="text-base font-bold tracking-tight">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody className={`space-y-6 bg-modal px-6 py-6 ${bodyClassName ?? ''}`}>{children}</SheetBody>
        <SheetFooter className={`mt-0 min-h-20 shrink-0 flex-col items-stretch justify-end gap-3 border-t bg-modal px-6 py-4 shadow-sm sm:flex-row sm:items-center ${footerClassName ?? ''}`}>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
