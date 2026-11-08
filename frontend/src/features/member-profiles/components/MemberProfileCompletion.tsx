import { useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import type { TienDoHoSo, TruongTienDoHoSo } from '../services/profile-completion.service'

const groupNames: Record<TruongTienDoHoSo['nhom'], string> = {
  THONG_TIN_CA_NHAN: 'Thông tin cá nhân',
  THONG_TIN_SINH_VIEN: 'Thông tin sinh viên',
  THONG_TIN_DANG_VIEN: 'Thông tin Đảng viên',
}
const groupOrder: TruongTienDoHoSo['nhom'][] = ['THONG_TIN_CA_NHAN', 'THONG_TIN_SINH_VIEN', 'THONG_TIN_DANG_VIEN']

export function MemberProfileCompletion({ progress, unavailableReason, onSelectField, mode = 'full' }: {
  progress?: TienDoHoSo
  unavailableReason?: string
  onSelectField?: (field: string) => void
  mode?: 'full' | 'summary' | 'notice'
}) {
  const [expanded, setExpanded] = useState(false)
  const shownMissing = useMemo(() => {
    if (!progress) return []
    return expanded ? progress.truongConThieu : progress.truongConThieu.slice(0, 4)
  }, [expanded, progress])
  const groups = groupOrder.map((group) => ({ group, fields: shownMissing.filter((field) => field.nhom === group) })).filter(({ fields }) => fields.length)
  const hiddenCount = (progress?.truongConThieu.length ?? 0) - shownMissing.length

  if (mode === 'summary') return <div className="space-y-3" data-testid="member-profile-completion-summary">
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Mức độ hoàn thiện hồ sơ</span><span className="font-medium tabular-nums">{progress ? <>{progress.tyLe}% <span className="font-normal text-muted-foreground">({progress.soTruongDaHoanThien}/{progress.tongSoTruongBatBuoc} trường thông tin bắt buộc)</span></> : 'Chưa thể tính'}</span></div>
    {progress ? <Progress value={progress.tyLe} role="progressbar" aria-label={`Mức độ hoàn thiện hồ sơ: ${progress.tyLe}%`} aria-valuenow={progress.tyLe} aria-valuemin={0} aria-valuemax={100}/> : <p className="text-sm text-muted-foreground">{unavailableReason ?? 'Chưa đủ quyền xem dữ liệu để tính chính xác.'}</p>}
  </div>

  if (mode === 'notice' && !progress) return <Alert variant="warning"><AlertTriangle/><AlertTitle>Chưa thể tính mức độ hoàn thiện</AlertTitle><AlertDescription>{unavailableReason ?? 'Bạn chưa được cấp quyền xem đầy đủ các nhóm thông tin cần thiết.'}</AlertDescription></Alert>
  if (!progress) return <Alert variant="warning"><AlertTriangle/><AlertTitle>Chưa thể tính mức độ hoàn thiện</AlertTitle><AlertDescription>{unavailableReason ?? 'Bạn chưa được cấp quyền xem đầy đủ các nhóm thông tin cần thiết.'}</AlertDescription></Alert>

  const notice = progress.tyLe === 100
    ? <Alert variant="success"><BadgeCheck/><AlertTitle>Hồ sơ đã hoàn thiện</AlertTitle><AlertDescription>Hồ sơ đã hoàn thiện đầy đủ các thông tin bắt buộc.</AlertDescription></Alert>
    : <Alert variant="warning" className="min-w-0"><AlertTriangle/><AlertTitle className="min-w-0 break-words">Hồ sơ của bạn chưa hoàn thiện</AlertTitle><AlertDescription className="min-w-0 break-words">
        <p>Bạn còn thiếu {progress.truongConThieu.length} trường thông tin cần bổ sung.</p>
        <div className="mt-1 space-y-2">
          {groups.map(({ group, fields }) => <section key={group} className="min-w-0"><h3 className="break-words font-medium">{groupNames[group]}</h3><ul className="list-disc space-y-0.5 pl-5">{fields.map((field) => <li key={field.ma} className="break-words">{onSelectField ? <button type="button" className="max-w-full whitespace-normal break-words text-left underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelectField(field.ma)}>{field.ten}</button> : field.ten}</li>)}</ul></section>)}
        </div>
        {progress.truongConThieu.length > 4 && <Button className="mt-2 h-auto max-w-full justify-start whitespace-normal p-0 text-left leading-5" variant="link" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Thu gọn danh sách' : `Xem tất cả trường còn thiếu${hiddenCount ? ` (${hiddenCount} nữa)` : ''}`}</Button>}
      </AlertDescription></Alert>

  if (mode === 'notice') return notice
  return <div className="space-y-3" data-testid="member-profile-completion">
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Mức độ hoàn thiện hồ sơ</span><span className="font-medium tabular-nums">{progress.tyLe}% <span className="font-normal text-muted-foreground">({progress.soTruongDaHoanThien}/{progress.tongSoTruongBatBuoc} trường thông tin bắt buộc)</span></span></div>
    <Progress value={progress.tyLe} role="progressbar" aria-label={`Mức độ hoàn thiện hồ sơ: ${progress.tyLe}%`} aria-valuenow={progress.tyLe} aria-valuemin={0} aria-valuemax={100}/>
    {notice}
  </div>
}
