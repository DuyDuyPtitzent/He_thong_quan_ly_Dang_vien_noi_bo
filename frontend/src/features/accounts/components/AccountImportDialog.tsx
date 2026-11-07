import { useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { ImportStepProgress } from '@/shared/components/data-transfer/ImportStepProgress'
import { ImportSummaryCard } from '@/shared/components/data-transfer/ImportSummaryCard'
import { AccountImportRowsTable } from './AccountImportRowsTable'
import { accountsApi, type AccountImportMode, type AccountImportPreview, type AccountImportResult } from '../api/accounts.api'

const steps = ['Chuẩn bị tệp', 'Kiểm tra dữ liệu', 'Xác nhận nhập', 'Kết quả']
type PreviewFilter = 'ALL' | 'VALID' | 'ERROR' | 'EXISTS' | 'ACCOUNT_TYPE'
const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
const errorText = (cause: unknown) => {
  const normalized = normalizeApiError(cause)
  return normalized.correlationId ? `${normalized.message} (Mã tra cứu: ${normalized.correlationId})` : normalized.message
}

export function AccountImportDialog({ open, onOpenChange, canLinkProfiles, onImported, onFilter }: { open: boolean; onOpenChange: (open: boolean) => void; canLinkProfiles: boolean; onImported: () => void; onFilter: (kind: 'all' | 'linked' | 'unlinked') => void }) {
  const [mode, setMode] = useState<AccountImportMode>('DOC_LAP')
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<AccountImportPreview | null>(null)
  const [result, setResult] = useState<AccountImportResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [askDiscard, setAskDiscard] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('ALL')

  const clear = () => { setMode('DOC_LAP'); setStep(0); setFile(null); setPreview(null); setResult(null); setConfirmed(false); setPreviewFilter('ALL'); setError('') }
  const close = (next: boolean) => { if (next) { onOpenChange(true); return }; if (busy) return; if (step === 3) { clear(); onOpenChange(false); return }; if (file || preview) setAskDiscard(true); else onOpenChange(false) }
  const discard = () => { setAskDiscard(false); clear(); onOpenChange(false) }
  const chooseFile = (next?: File) => {
    setError(''); setPreview(null); setResult(null); setStep(0); setConfirmed(false); setPreviewFilter('ALL')
    if (!next) { setFile(null); return }
    if (!next.name.toLowerCase().endsWith('.xlsx') || next.size > 5 * 1024 * 1024) { setFile(null); setError('Chọn tệp .xlsx hợp lệ, tối đa 5 MB.'); toast.error('Chọn tệp .xlsx hợp lệ, tối đa 5 MB.'); return }
    setFile(next); toast.success(`Đã chọn tệp ${next.name}.`)
  }
  const downloadTemplate = async () => {
    setBusy(true); setError('')
    try { saveBlob(await accountsApi.importTemplate(mode), `mau-nhap-tai-khoan-${mode.toLowerCase()}.xlsx`); toast.success('Đã tải Excel mẫu.') }
    catch (cause) { const message = errorText(cause); setError(message); toast.error(message) }
    finally { setBusy(false) }
  }
  const validateFile = async () => {
    if (!file) return
    setBusy(true); setError('')
    try { const data = await accountsApi.validateImport(file, mode); setPreview(data); setStep(1); if (data.loi.length) toast.warning(`Tệp có ${data.loi.length} lỗi cần xử lý.`); else toast.success(`Đã kiểm tra ${data.tongSo} tài khoản, không phát hiện lỗi.`) }
    catch (cause) { const message = errorText(cause); setError(message); toast.error(message) }
    finally { setBusy(false) }
  }
  const downloadErrors = async () => {
    if (!preview) return
    setBusy(true); setError('')
    try { saveBlob(await accountsApi.importErrorReport(preview.loi), 'bao-cao-loi-nhap-tai-khoan.xlsx'); toast.success('Đã tải báo cáo lỗi.') }
    catch (cause) { const message = errorText(cause); setError(message); toast.error(message) }
    finally { setBusy(false) }
  }
  const confirmImport = async () => {
    if (!preview?.maPhienNhap || !confirmed) return
    setBusy(true); setError('')
    try { const data = await accountsApi.confirmImport(preview.maPhienNhap); setResult(data); setStep(3); onImported(); toast.success('Các tài khoản đã được tạo thành công và lưu vào hệ thống.') }
    catch (cause) { const message = errorText(cause); setError(message); toast.error(message) }
    finally { setBusy(false) }
  }
  const filterAndClose = (kind: 'all' | 'linked' | 'unlinked') => { onFilter(kind); clear(); onOpenChange(false) }
  const togglePreviewFilter = (next: PreviewFilter) => setPreviewFilter(next)
  const previewRows = (preview?.duLieu ?? []).filter((row) => previewFilter === 'ALL'
    || (previewFilter === 'VALID' && row.hopLe)
    || (previewFilter === 'ERROR' && !row.hopLe)
    || (previewFilter === 'EXISTS' && row.trangThaiTonTai === 'DA_TON_TAI')
    || (previewFilter === 'ACCOUNT_TYPE' && (mode === 'DOC_LAP' ? !row.lienKetHoSo : row.lienKetHoSo)))

  return <>
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90dvh] w-[min(96vw,960px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]" onEscapeKeyDown={(event) => { if (busy || file || preview || result) { event.preventDefault(); close(false) } }} onInteractOutside={(event) => { if (busy || file || preview || result) { event.preventDefault(); if (!busy) close(false) } }}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14"><DialogTitle className="flex items-center gap-2"><Upload className="size-5" />Nhập tài khoản bằng Excel</DialogTitle><DialogDescription>Tạo tài khoản độc lập hoặc liên kết với hồ sơ Đảng viên có sẵn.</DialogDescription></DialogHeader>
        <ImportStepProgress activeIndex={step} steps={steps} ariaLabel="Các bước nhập tài khoản" />
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Cần xử lý</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {step === 0 && <>
            <Alert><FileSpreadsheet /><AlertTitle>Hướng dẫn nhập</AlertTitle><AlertDescription>Không gán Role, Permission hoặc phân công quyền tự động. Mật khẩu không xuất hiện trong xem trước hoặc báo cáo lỗi. Chọn đúng mẫu cho hình thức nhập.</AlertDescription></Alert>
            <div className="space-y-2"><Label htmlFor="account-import-mode">Hình thức nhập</Label><Select value={mode} disabled={busy || Boolean(file)} onValueChange={(value) => setMode(value as AccountImportMode)}><SelectTrigger id="account-import-mode" aria-label="Hình thức nhập"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DOC_LAP">Tạo tài khoản độc lập</SelectItem>{canLinkProfiles && <SelectItem value="LIEN_KET_HO_SO">Cấp tài khoản cho hồ sơ Đảng viên có sẵn</SelectItem>}</SelectContent></Select></div>
            <Card className="py-0"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><FileSpreadsheet className="size-5 text-primary" /><div><p className="font-medium">Mẫu nhập tài khoản</p><p className="text-sm text-muted-foreground">Bao gồm sheet hướng dẫn, định dạng và danh sách trạng thái hợp lệ.</p></div></div><Button variant="outline" disabled={busy} onClick={() => void downloadTemplate()}><Download />Tải Excel mẫu</Button></CardContent></Card>
            {mode === 'LIEN_KET_HO_SO' && <p className="text-sm text-muted-foreground">Nhập mã hồ sơ nội bộ đã có và chưa được liên kết. Không nhập lại thông tin cá nhân.</p>}
            <section className="space-y-3 rounded-lg border border-dashed p-5"><Label htmlFor="account-import-file" className="flex cursor-pointer flex-col items-center gap-2 text-center"><Upload className="size-6" /><span className="font-medium">Chọn tệp Excel để tải lên</span><span className="text-sm text-muted-foreground">.xlsx · tối đa 5 MB · 200 tài khoản</span></Label><Input id="account-import-file" aria-label="Tệp Excel cần nhập" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => chooseFile(event.target.files?.[0])} /></section>
            {file && <p className="text-sm">Đã chọn: <span className="font-medium">{file.name}</span> ({Math.max(1, Math.round(file.size / 1024))} KB)</p>}
          </>}
          {step === 1 && preview && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ImportSummaryCard label="Tổng số dòng" value={preview.tongSo} variant="total" onClick={() => togglePreviewFilter('ALL')} selected={previewFilter === 'ALL'} />
              <ImportSummaryCard label="Hợp lệ" value={preview.hopLe} variant="success" onClick={() => togglePreviewFilter('VALID')} selected={previewFilter === 'VALID'} />
              <ImportSummaryCard label="Có lỗi" value={preview.coLoi} variant="destructive" onClick={() => togglePreviewFilter('ERROR')} selected={previewFilter === 'ERROR'} />
              <ImportSummaryCard label="Tài khoản đã tồn tại" value={preview.soDaTonTai ?? 0} variant="exists" onClick={() => togglePreviewFilter('EXISTS')} selected={previewFilter === 'EXISTS'} />
              <ImportSummaryCard label={mode === 'LIEN_KET_HO_SO' ? 'Tài khoản liên kết' : 'Tài khoản độc lập'} value={mode === 'LIEN_KET_HO_SO' ? preview.soTaiKhoanLienKet : preview.soTaiKhoanDocLap} variant={mode === 'LIEN_KET_HO_SO' ? 'linked' : 'independent'} onClick={() => togglePreviewFilter('ACCOUNT_TYPE')} selected={previewFilter === 'ACCOUNT_TYPE'} />
            </div>
            {(preview.loi.length > 0 || Boolean(preview.loiTep?.length)) && <Alert variant="destructive"><AlertCircle /><AlertTitle>Phát hiện lỗi</AlertTitle><AlertDescription>{preview.coLoi > 0 ? `${preview.coLoi} dòng có lỗi${preview.loi.length !== preview.coLoi ? ` (${preview.loi.length} vấn đề cần sửa)` : ''}. ` : ''}{preview.loiTep?.map((item) => `${item.field}: ${item.message}`).join(' · ')}Mật khẩu được loại trừ khỏi báo cáo.</AlertDescription></Alert>}
            <AccountImportRowsTable rows={previewRows} label="Bảng xem trước tài khoản" />
            <p className="text-sm text-muted-foreground">Phiên kiểm tra có hiệu lực 10 phút. Mật khẩu chỉ được giữ dạng đã băm trong phiên tạm.</p>
          </>}
          {step === 2 && preview && <><Alert><AlertTitle>Xác nhận ghi dữ liệu</AlertTitle><AlertDescription>Tất cả tài khoản hợp lệ sẽ được tạo trong một giao dịch. Hệ thống kiểm tra lại quyền, tên đăng nhập, email và liên kết hồ sơ trước khi lưu.</AlertDescription></Alert><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ImportSummaryCard label="Tổng tài khoản" value={preview.tongSo} variant="total" /><ImportSummaryCard label="Hợp lệ" value={preview.hopLe} variant="success" /><ImportSummaryCard label="Đã tồn tại" value={preview.soDaTonTai} variant="exists" /><ImportSummaryCard label={mode === 'LIEN_KET_HO_SO' ? 'Liên kết hồ sơ' : 'Độc lập'} value={mode === 'LIEN_KET_HO_SO' ? preview.soTaiKhoanLienKet : preview.soTaiKhoanDocLap} variant={mode === 'LIEN_KET_HO_SO' ? 'linked' : 'independent'} /></div><AccountImportRowsTable rows={preview.duLieu} label="Danh sách tài khoản xác nhận nhập" /><Label className="flex items-start gap-3 rounded-md border p-4 font-normal"><Checkbox checked={confirmed} disabled={busy} onCheckedChange={(value) => setConfirmed(value === true)} /><span>Tôi xác nhận tạo các tài khoản theo danh sách đã kiểm tra.</span></Label></>}
          {step === 3 && result && <><Alert><CheckCircle2 /><AlertTitle>Nhập thành công</AlertTitle><AlertDescription>Các tài khoản đã được tạo thành công và lưu vào hệ thống.</AlertDescription></Alert><div className="grid gap-3 sm:grid-cols-3"><ImportSummaryCard label="Tổng tài khoản đã tạo" value={result.tongSo} variant="success" onClick={() => filterAndClose('all')} /><ImportSummaryCard label="Liên kết hồ sơ Đảng viên" value={result.soTaiKhoanLienKet} variant="linked" onClick={() => filterAndClose('linked')} /><ImportSummaryCard label="Tài khoản độc lập" value={result.soTaiKhoanDocLap} variant="independent" onClick={() => filterAndClose('unlinked')} /></div><AccountImportRowsTable rows={result.duLieu} label="Kết quả nhập tài khoản" /><p className="text-sm text-muted-foreground">Chọn một thẻ để đóng hộp thoại và lọc danh sách tài khoản tương ứng.</p></>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-6 py-4"><Button variant="outline" disabled={busy} onClick={() => close(false)}>{step === 3 ? 'Đóng' : 'Hủy'}</Button><div className="flex flex-wrap justify-end gap-2">{step === 1 && <>{preview?.loi.length ? <Button variant="outline" disabled={busy} onClick={() => void downloadErrors()}><Download />Tải báo cáo lỗi</Button> : null}<Button variant="outline" disabled={busy} onClick={() => setStep(0)}><ChevronLeft />Quay lại</Button><Button disabled={busy || !preview?.maPhienNhap || Boolean(preview.loi.length)} onClick={() => setStep(2)}>Tiếp tục xác nhận<ChevronRight /></Button></>}{step === 0 && <Button disabled={!file || busy} onClick={() => void validateFile()}>{busy ? <><LoaderCircle className="animate-spin" />Đang kiểm tra…</> : <>Tiếp tục kiểm tra<ChevronRight /></>}</Button>}{step === 2 && <><Button variant="outline" disabled={busy} onClick={() => setStep(1)}><ChevronLeft />Quay lại</Button><Button disabled={busy || !confirmed || !preview?.maPhienNhap} onClick={() => void confirmImport()}>{busy ? <><LoaderCircle className="animate-spin" />Đang nhập…</> : <>Xác nhận nhập<Check /></>}</Button></>}{step === 3 && <Button onClick={() => { clear(); onOpenChange(false) }}>Hoàn tất</Button>}</div></div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={askDiscard} onOpenChange={setAskDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Đóng cửa sổ nhập?</AlertDialogTitle><AlertDialogDescription>Tệp, bản xem trước và phiên nhập chưa xác nhận sẽ bị xóa khỏi phiên làm việc.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Tiếp tục nhập</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={discard}>Đóng và xóa dữ liệu tạm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>
}
