import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { DatePicker } from '@/shared/components/date-time'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { flattenUnits, toLocalDateInput, toLocalDateTimeIso } from '../services/campaign-format'
import type { Campaign, CampaignInput, SchoolYear, UnitNode } from '../types/campaign'

const emptyForm = (): CampaignInput => ({ ten: '', maNamHoc: '', maDonViToChuc: '', phamViDonVi: [], ngayBatDau: '', ngayKetThuc: '', moTa: '' })

export function CampaignForm({ open, onOpenChange, campaign, years, units, yearsError, unitsError, saving, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; campaign: Campaign | null; years: SchoolYear[]; units: UnitNode[]
  yearsError: boolean; unitsError: boolean; saving: boolean; onSubmit: (value: CampaignInput) => void
}) {
  const initial: CampaignInput = campaign ? { ten: campaign.ten, moTa: campaign.moTa ?? '', maNamHoc: campaign.maNamHoc, maDonViToChuc: campaign.maDonViToChuc, maNguoiPhuTrach: campaign.maNguoiPhuTrach ?? undefined, phamViDonVi: campaign.phamVi.map((x) => x.maDonVi), ngayBatDau: toLocalDateInput(campaign.ngayBatDau), ngayKetThuc: toLocalDateInput(campaign.ngayKetThuc) } : emptyForm()
  const [form, setForm] = useState<CampaignInput>(initial)
  const [search, setSearch] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const flatUnits = useMemo(() => flattenUnits(units), [units])
  const visibleUnits = flatUnits.filter((unit) => unit.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
  const selectedUnits = new Set(form.phamViDonVi)
  const canSubmit = form.ten.trim() && form.maNamHoc && form.maDonViToChuc && form.phamViDonVi.length && form.ngayBatDau && form.ngayKetThuc && form.ngayBatDau <= form.ngayKetThuc && !saving && !yearsError && !unitsError
  const update = (patch: Partial<CampaignInput>) => setForm((current) => ({ ...current, ...patch }))
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const requestClose = (nextOpen: boolean) => {
    if (!nextOpen && dirty && !saving) { setConfirmDiscard(true); return }
    onOpenChange(nextOpen)
  }
  const toggleUnit = (id: string, checked: boolean) => update({ phamViDonVi: checked ? [...new Set([...form.phamViDonVi, id])] : form.phamViDonVi.filter((unit) => unit !== id) })
  return <><StandardSheet open={open} onOpenChange={requestClose} title={campaign ? 'Chỉnh sửa đợt học' : 'Tạo đợt học'} description="Nhập thông tin đúng theo phạm vi và quyền đang được cấp." size="wide" footer={<><Button variant="outline" onClick={() => requestClose(false)} disabled={saving}>Hủy</Button><Button disabled={!canSubmit} onClick={() => onSubmit({ ...form, ten: form.ten.trim(), moTa: form.moTa?.trim() || undefined, ngayBatDau: toLocalDateTimeIso(form.ngayBatDau), ngayKetThuc: toLocalDateTimeIso(form.ngayKetThuc) })}>{saving ? 'Đang lưu…' : campaign ? 'Lưu thay đổi' : 'Tạo đợt học'}</Button></>}>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4"><h2 className="text-sm font-semibold">Thông tin cơ bản</h2>
        <div className="space-y-2"><Label htmlFor="campaign-name">Tên đợt học <span className="text-destructive">*</span></Label><Input id="campaign-name" maxLength={200} value={form.ten} onChange={(e) => update({ ten: e.target.value })} autoComplete="off" /></div>
        <div className="space-y-2"><Label htmlFor="campaign-description">Mô tả</Label><Textarea id="campaign-description" maxLength={2000} rows={4} value={form.moTa ?? ''} onChange={(e) => update({ moTa: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="campaign-school-year">Năm học <span className="text-destructive">*</span></Label><Select value={form.maNamHoc} onValueChange={(value) => update({ maNamHoc: value })}><SelectTrigger id="campaign-school-year"><SelectValue placeholder={yearsError ? 'Không tải được danh sách năm học' : 'Chọn năm học'} /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year.ma} value={year.ma}>{year.maNamHoc} · {year.tenNamHoc}</SelectItem>)}</SelectContent></Select>{yearsError && <p role="alert" className="text-sm text-destructive">Không có quyền xem danh sách năm học hoặc dữ liệu chưa tải được. Hãy kiểm tra quyền và Assignment đang chọn.</p>}</div>
      </section>
      <section className="space-y-4"><h2 className="text-sm font-semibold">Đơn vị và phạm vi</h2>
        <div className="space-y-2"><Label htmlFor="campaign-organizer">Đơn vị tổ chức <span className="text-destructive">*</span></Label><Select value={form.maDonViToChuc} onValueChange={(value) => update({ maDonViToChuc: value })}><SelectTrigger id="campaign-organizer"><SelectValue placeholder={unitsError ? 'Không tải được danh sách tổ chức' : 'Chọn đơn vị tổ chức'} /></SelectTrigger><SelectContent>{flatUnits.filter((unit) => unit.active).map((unit) => <SelectItem key={unit.id} value={unit.id}>{'　'.repeat(unit.level)}{unit.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Phạm vi đợt <span className="text-destructive">*</span></Label><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Tìm đơn vị trong phạm vi" className="pl-9" placeholder="Tìm đơn vị" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2" aria-label="Chọn phạm vi đơn vị">{visibleUnits.filter((unit) => unit.active).map((unit) => <label key={unit.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 hover:bg-accent" style={{ paddingInlineStart: `${8 + unit.level * 16}px` }}><Checkbox checked={selectedUnits.has(unit.id)} onCheckedChange={(checked) => toggleUnit(unit.id, checked === true)} /><span className="text-sm">{unit.name}</span></label>)}{!visibleUnits.some((unit) => unit.active) && <p className="p-3 text-sm text-muted-foreground">Không tìm thấy đơn vị đang hoạt động.</p>}</div><p className="text-xs text-muted-foreground">Đã chọn {form.phamViDonVi.length} đơn vị. Backend sẽ xác minh toàn bộ phạm vi trước khi lưu.</p>{unitsError && <p role="alert" className="text-sm text-destructive">Không có quyền xem tổ chức hoặc không thể tải danh sách. Hãy kiểm tra quyền và Assignment đang chọn.</p>}</div>
      </section>
      <section className="space-y-4 lg:col-span-2"><h2 className="text-sm font-semibold">Thời gian</h2><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="campaign-start">Ngày bắt đầu <span className="text-destructive">*</span></Label><DatePicker id="campaign-start" required clearable={false} value={form.ngayBatDau || undefined} onChange={(value) => update({ ngayBatDau: value ?? '' })} /></div><div className="space-y-2"><Label htmlFor="campaign-end">Ngày kết thúc <span className="text-destructive">*</span></Label><DatePicker id="campaign-end" required clearable={false} value={form.ngayKetThuc || undefined} onChange={(value) => update({ ngayKetThuc: value ?? '' })} /></div></div>{form.ngayBatDau && form.ngayKetThuc && form.ngayBatDau > form.ngayKetThuc && <p role="alert" className="text-sm text-destructive">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>}</section>
    </div>
  </StandardSheet><AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bỏ thay đổi chưa lưu?</AlertDialogTitle><AlertDialogDescription>Các thông tin đã nhập sẽ không được lưu nếu bạn thoát biểu mẫu.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmDiscard(false); onOpenChange(false) }}>Thoát biểu mẫu</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>
}
