import { useState, type MouseEvent } from 'react'
import { AlertTriangle, LoaderCircle, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import type { HoSoRow } from '../types/member-profiles.types'
import { useDeleteMemberProfile } from '../hooks/useDeleteMemberProfile'

export function MemberProfileDeleteDialog({ profile, onOpenChange, onDeleted }: { profile: HoSoRow | null; onOpenChange: (open: boolean) => void; onDeleted: (id: string) => void }) {
  const deletion = useDeleteMemberProfile()
  const [submitting, setSubmitting] = useState(false)
  const open = Boolean(profile)

  const confirmDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!profile || deletion.isPending || submitting) return
    setSubmitting(true)
    try {
      await deletion.mutateAsync(profile.maHoSo)
      onDeleted(profile.maHoSo)
      onOpenChange(false)
    } catch {
      // The mutation hook reports the server's specific reason; leave the dialog open for correction.
    } finally {
      setSubmitting(false)
    }
  }

  return <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!deletion.isPending && !submitting) onOpenChange(nextOpen) }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" />Xác nhận xóa vật lý hồ sơ</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3">
            <p>Hồ sơ sẽ bị xóa vĩnh viễn cùng thông tin cá nhân, địa chỉ, thông tin sinh viên và các bản ghi sinh hoạt/quá trình Đảng ban đầu. Nhật ký kiểm toán được giữ nguyên. Thao tác không thể hoàn tác.</p>
            {profile && <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border p-3 text-sm text-foreground">
              <dt className="text-muted-foreground">Họ và tên</dt><dd className="font-medium">{profile.hoVaTen}</dd>
              <dt className="text-muted-foreground">Mã hồ sơ</dt><dd>{profile.maHoSoNoiBo}</dd>
              <dt className="text-muted-foreground">Chi bộ hiện tại</dt><dd>{profile.chiBo ?? 'Chưa xác định'}</dd>
            </dl>}
            {profile?.daLienKetTaiKhoan && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">Tài khoản đăng nhập sẽ được giữ lại nhưng tạm khóa; mọi phân công vai trò và phiên đăng nhập sẽ bị thu hồi.</p>}
            <p className="font-medium text-destructive">Chỉ được xóa nếu hồ sơ không có lịch sử phát sinh, phân công chức vụ hoặc yêu cầu cập nhật cần bảo lưu. Máy chủ sẽ kiểm tra lại trước khi xóa.</p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={deletion.isPending || submitting}>Hủy</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={!profile || deletion.isPending || submitting} onClick={(event) => void confirmDelete(event)}>
          {deletion.isPending || submitting ? <><LoaderCircle className="animate-spin" />Đang xóa…</> : <><Trash2 />Xác nhận xóa</>}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
