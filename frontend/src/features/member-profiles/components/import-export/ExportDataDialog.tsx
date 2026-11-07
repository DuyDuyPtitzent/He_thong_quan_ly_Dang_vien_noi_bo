import { Download, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { OrganizationUnitPicker } from '@/shared/components/OrganizationUnitPicker'
import { ExportFieldSelector, type ExportFieldOption } from '@/shared/components/data-transfer/ExportFieldSelector'
import type { ExportMode } from '../../hooks/useMemberExport'

type UnitOption = { ma: string; maDinhDanh: string | null; loaiDonVi: string; ten: string | null }
export function ExportDataDialog({ open, onOpenChange, mode, onModeChange, selectedCount, busy, error, onExport, fields, units, selectedFields, onFieldsChange, organizationId, onOrganizationChange }: { open: boolean; onOpenChange: (open: boolean) => void; mode: ExportMode; onModeChange: (mode: ExportMode) => void; selectedCount: number; busy: boolean; error: string; onExport: () => void; fields: ExportFieldOption[]; units: UnitOption[]; selectedFields: string[]; onFieldsChange: (fields: string[]) => void; organizationId: string; onOrganizationChange: (id: string) => void }) {
  const unitOptions = units.map((unit) => ({ value: unit.ma, label: `${unit.ten ?? 'Đơn vị'}${unit.maDinhDanh ? ` (${unit.maDinhDanh})` : ''} · ${unit.loaiDonVi === 'DANG_UY' ? 'Đảng ủy' : unit.loaiDonVi === 'CHI_BO' ? 'Chi bộ' : 'Tổ'}`, keywords: `${unit.maDinhDanh ?? ''} ${unit.loaiDonVi}` }))
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen) }}>
    <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl" onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onInteractOutside={(event) => { if (busy) event.preventDefault() }}>
      <DialogHeader className="shrink-0 border-b px-6 py-5"><DialogTitle className="flex items-center gap-2"><Download className="size-5" aria-hidden="true" />Xuất dữ liệu Đảng viên</DialogTitle><DialogDescription>Chọn danh sách và những thông tin bạn muốn tải về dưới dạng Excel.</DialogDescription></DialogHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {error && <Alert variant="destructive"><AlertTitle>Không thể xuất Excel</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <fieldset className="space-y-3"><legend className="text-sm font-medium">Danh sách cần xuất</legend><RadioGroup value={mode} onValueChange={(value) => onModeChange(value as ExportMode)} className="grid gap-2 sm:grid-cols-2">
          {([['selected','Các Đảng viên đã chọn',`${selectedCount} hồ sơ được chọn trên danh sách.`],['filtered','Danh sách đang được lọc trên trang','Xuất toàn bộ kết quả phù hợp, không chỉ trang đang xem.'],['organization','Theo đơn vị tổ chức','Chọn Đảng ủy, Chi bộ hoặc Tổ trong phạm vi được giao.'],['all','Tất cả Đảng viên trong phạm vi quản lý','Tải các hồ sơ thuộc phạm vi xuất dữ liệu được giao.']] as const).map(([value,title,description]) => <Label key={value} htmlFor={`export-${value}`} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${mode === value ? 'border-primary bg-accent/30' : 'border-border'} ${value === 'selected' && selectedCount === 0 ? 'cursor-not-allowed opacity-60' : ''}`}><RadioGroupItem id={`export-${value}`} value={value} disabled={value === 'selected' && selectedCount === 0} className="mt-0.5" /><span><span className="block font-medium">{title}</span><span className="text-sm text-muted-foreground">{description}</span></span></Label>)}
        </RadioGroup></fieldset>
        {mode === 'organization' && <div className="space-y-2"><Label htmlFor="export-organization">Đơn vị tổ chức</Label><OrganizationUnitPicker id="export-organization" label="Đơn vị tổ chức xuất dữ liệu" options={unitOptions} value={organizationId} onValueChange={onOrganizationChange} placeholder="Tìm và chọn Đảng ủy, Chi bộ hoặc Tổ" required /></div>}
        {fields.length ? <ExportFieldSelector fields={fields} value={selectedFields} onChange={onFieldsChange} /> : <Alert><AlertTitle>Chưa có thông tin được phép xuất</AlertTitle><AlertDescription>Liên hệ người quản lý để được phân công quyền xuất các nhóm thông tin cần thiết.</AlertDescription></Alert>}
        <Alert><FileSpreadsheet /><AlertTitle>Định dạng Excel (.xlsx)</AlertTitle><AlertDescription>Tệp chỉ gồm những cột đã chọn và thông tin bạn được phép xuất. Mật khẩu và thông tin đăng nhập bí mật không được đưa vào tệp.</AlertDescription></Alert>
      </div>
      <div className="flex shrink-0 justify-between gap-2 border-t bg-background px-6 py-4"><Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Hủy</Button><Button disabled={busy || selectedFields.length === 0 || (mode === 'selected' && selectedCount === 0) || (mode === 'organization' && !organizationId)} onClick={onExport}>{busy ? <><LoaderCircle className="animate-spin" />Đang tạo tệp…</> : <><Download />Xuất Excel</>}</Button></div>
    </DialogContent>
  </Dialog>
}
