import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Eye, EyeOff, LoaderCircle, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { ImportStepProgress } from '@/shared/components/data-transfer/ImportStepProgress'
import { ImportSummaryCard } from '@/shared/components/data-transfer/ImportSummaryCard'
import { DatePicker } from '@/shared/components/date-time'
import type { ImportPreview } from '../../api/member-profiles.api'
import type { MemberImportController } from '../../hooks/useMemberImport'

const stepOrder = ['file', 'preview', 'confirm', 'result'] as const
const stepLabels = ['Chuẩn bị tệp', 'Kiểm tra dữ liệu', 'Xác nhận nhập', 'Kết quả']
type SummaryFilter = 'all' | 'valid' | 'errors' | 'exists' | 'create-account' | 'no-account'
const fieldLabels: Record<string, string> = { maHoSoNoiBo: 'Mã hồ sơ nội bộ', hoVaTen: 'Họ và tên', ngaySinh: 'Ngày sinh', soCccd: 'CCCD', gioiTinh: 'Giới tính', trangThaiDangVien: 'Trạng thái Đảng viên', ngayVaoDang: 'Ngày vào Đảng', maChiBo: 'Mã Chi bộ sinh hoạt', khoaDangVien: 'Khóa Đảng viên', ngaySinhHoatTu: 'Ngày bắt đầu sinh hoạt', maTo: 'Mã Tổ', tenDangNhap: 'Tên đăng nhập', emailTaiKhoan: 'Email đăng nhập' }
const money = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`

export function ImportDataDialog({ open, onOpenChange, controller }: { open: boolean; onOpenChange: (open: boolean) => void; controller: MemberImportController }) {
  const [askDiscard, setAskDiscard] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'errors'>('all')
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<number[]>([])
  const { step, setStep, file, preview, result, error, busy, confirmed, setConfirmed, commonDate, setCommonDate, hasDraft, chooseFile: chooseFileController, checkFile, applyDates, confirmImport, downloadTemplate, downloadErrors, clear: clearController } = controller
  const chooseFile = (next?: File) => { setSummaryFilter('all'); chooseFileController(next) }
  const clear = () => { setSummaryFilter('all'); clearController() }
  const stepIndex = stepOrder.indexOf(step)
  const errorsByRow = useMemo(() => {
    const grouped = new Map<number, ImportPreview['loi']>()
    for (const item of preview?.loi ?? []) grouped.set(item.row, [...(grouped.get(item.row) ?? []), item])
    return grouped
  }, [preview?.loi])
  const filteredRows = useMemo(() => (preview?.duLieu ?? []).filter((row) => {
    const text = `${row.maHoSoNoiBo} ${row.hoVaTen} ${row.soCccd ?? ''}`.toLocaleLowerCase()
    return (!query || text.includes(query.toLocaleLowerCase()))
      && (statusFilter === 'all' || (statusFilter === 'valid' ? row.hopLe : !row.hopLe))
      && (summaryFilter === 'all'
        || (summaryFilter === 'valid' && row.hopLe)
        || (summaryFilter === 'errors' && !row.hopLe)
        || (summaryFilter === 'exists' && row.daTonTai)
        || (summaryFilter === 'create-account' && row.taoTaiKhoan)
        || (summaryFilter === 'no-account' && !row.taoTaiKhoan))
  }), [preview?.duLieu, query, statusFilter, summaryFilter])
  const toggleSummaryFilter = (next: SummaryFilter) => setSummaryFilter(next)
  const requestClose = (nextOpen: boolean) => {
    if (nextOpen) { onOpenChange(true); return }
    if (busy) return
    if (hasDraft) { setAskDiscard(true); return }
    onOpenChange(false)
  }
  const discard = () => { setAskDiscard(false); clear(); onOpenChange(false) }
  const saveFile = (blob: Blob, filename: string) => {
    try {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      return true
    } catch {
      toast.error(`Không thể lưu tệp ${filename} xuống thiết bị.`)
      return false
    }
  }
  const handleTemplate = async () => {
    const blob = await downloadTemplate()
    if (blob && saveFile(blob, 'mau-nhap-ho-so-dang-vien.xlsx')) toast.success('Đã tải tệp Excel mẫu.')
  }
  const handleErrorReport = async () => {
    const blob = await downloadErrors()
    if (blob && saveFile(blob, 'bao-cao-loi-nhap-ho-so.xlsx')) toast.success('Đã tải báo cáo lỗi nhập Excel.')
  }
  const canAdvance = step === 'file' ? Boolean(file) : step === 'preview' ? Boolean(preview?.maPhienNhap && preview.canXacNhan && !preview.loi.length) : step === 'confirm' ? Boolean(preview?.maPhienNhap && preview.canXacNhan && !preview.loi.length && confirmed) : false

  return <>
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="flex max-h-[90dvh] w-[min(96vw,960px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]" onEscapeKeyDown={(event) => { if (busy || hasDraft) { event.preventDefault(); requestClose(false) } }} onInteractOutside={(event) => { if (busy || hasDraft) { event.preventDefault(); if (!busy) requestClose(false) } }}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2"><Upload className="size-5" aria-hidden="true" />Nhập dữ liệu Đảng viên</DialogTitle>
          <DialogDescription>Tải Excel, kiểm tra thông tin và xác nhận tạo hồ sơ trong phạm vi được cấp.</DialogDescription>
        </DialogHeader>
        <ImportStepProgress activeIndex={stepIndex} steps={stepLabels} ariaLabel="Các bước nhập dữ liệu" />
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Cần xử lý</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {step === 'file' && <>
            <Alert><FileSpreadsheet /><AlertTitle>Hướng dẫn nhập</AlertTitle><AlertDescription className="space-y-2"><p>Vui lòng sử dụng tệp Excel mẫu của hệ thống và điền đầy đủ các trường bắt buộc trước khi tải lên.</p><ol className="list-decimal space-y-1 pl-5 sm:columns-2"><li>Mã hồ sơ nội bộ</li><li>Họ và tên</li><li>Ngày sinh</li><li>Số CCCD</li><li>Trạng thái Đảng viên</li><li>Ngày vào Đảng</li><li>Mã Chi bộ sinh hoạt</li><li>Khóa Đảng viên (Dxx)</li></ol><p>Ở cột Mã Chi bộ sinh hoạt, nhập mã như CB-01 theo sheet Danh mục tham chiếu; không nhập tên Chi bộ. Ngày bắt đầu sinh hoạt không bắt buộc trong Excel; cần bổ sung ngày thực tế ở bước kiểm tra. Giới tính không bắt buộc; nếu nhập, chọn NAM/NU. CCCD gồm 12 chữ số và nhập dạng văn bản để giữ số 0 đầu.</p></AlertDescription></Alert>
            <Card className="py-0"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-md bg-muted"><FileSpreadsheet className="size-5" /></span><div><p className="font-medium">Mẫu nhập hồ sơ Đảng viên</p><p className="text-sm text-muted-foreground">Tệp có danh sách cột và hướng dẫn nhập dữ liệu.</p></div></div><Button variant="outline" disabled={busy} onClick={() => void handleTemplate()}><Download />Tải Excel mẫu</Button></CardContent></Card>
            <section className={`rounded-lg border border-dashed p-5 transition-colors ${dragging ? 'border-primary bg-accent/40' : 'border-border'}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]) }}>
              <div className="flex flex-col items-center gap-3 text-center"><span className="flex size-10 items-center justify-center rounded-full bg-muted"><Upload className="size-5" /></span><div><Label htmlFor="member-import-file" className="cursor-pointer font-medium">Kéo tệp vào đây hoặc chọn tệp</Label><p className="mt-1 text-sm text-muted-foreground">Chỉ nhận .xlsx, tối đa 5 MB và 200 hồ sơ.</p></div><Input id="member-import-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="max-w-md" disabled={busy} onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => chooseFile(event.target.files?.[0])} /></div>
            </section>
            {file && <Card className="py-0"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex min-w-0 items-center gap-3"><FileSpreadsheet className="size-5 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate font-medium">{file.name}</p><p className="text-sm text-muted-foreground">{money(file.size)} · Đã chọn, chờ kiểm tra</p></div></div><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => document.getElementById('member-import-file')?.click()}>Thay thế</Button><Button variant="ghost" disabled={busy} onClick={() => chooseFile(undefined)}>Xóa tệp</Button></div></CardContent></Card>}
          </>}

          {step === 'preview' && preview && <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <ImportSummaryCard label="Tổng số hồ sơ" value={preview.tongSo} variant="total" onClick={() => toggleSummaryFilter('all')} selected={summaryFilter === 'all'} />
              <ImportSummaryCard label="Hồ sơ hợp lệ" value={preview.hopLe} variant="success" onClick={() => toggleSummaryFilter('valid')} selected={summaryFilter === 'valid'} />
              <ImportSummaryCard label="Hồ sơ có lỗi" value={preview.coLoi} variant="destructive" onClick={() => toggleSummaryFilter('errors')} selected={summaryFilter === 'errors'} />
              <ImportSummaryCard label="Hồ sơ đã tồn tại" value={preview.soDaTonTai ?? 0} variant="exists" onClick={() => toggleSummaryFilter('exists')} selected={summaryFilter === 'exists'} />
              <ImportSummaryCard label="Tạo tài khoản" value={preview.taoTaiKhoan} variant="independent" onClick={() => toggleSummaryFilter('create-account')} selected={summaryFilter === 'create-account'} />
              <ImportSummaryCard label="Không tạo tài khoản" value={preview.tongSo - preview.taoTaiKhoan} variant="warning" onClick={() => toggleSummaryFilter('no-account')} selected={summaryFilter === 'no-account'} />
            </div>
            <div className="flex flex-wrap items-end gap-2"><div className="min-w-52 flex-1 space-y-1"><Label htmlFor="member-import-search">Tìm hồ sơ</Label><Input id="member-import-search" placeholder="Họ tên, mã hồ sơ hoặc CCCD" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="w-44 space-y-1"><Label htmlFor="member-import-filter">Trạng thái kiểm tra</Label><Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><SelectTrigger id="member-import-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="valid">Hợp lệ</SelectItem><SelectItem value="errors">Có lỗi</SelectItem></SelectContent></Select></div></div>
            {preview.chuaCoNgay > 0 && <Alert variant="warning"><AlertCircle /><AlertTitle>Bổ sung ngày bắt đầu sinh hoạt</AlertTitle><AlertDescription className="space-y-3"><p>{preview.chuaCoNgay} hồ sơ còn thiếu ngày. Nhập ngày thực tế cho từng hồ sơ ở phần chi tiết hoặc áp dụng một ngày cho các hồ sơ đang thiếu.</p><div className="flex flex-wrap items-end gap-2"><div className="space-y-1"><Label htmlFor="member-import-common-date">Ngày áp dụng hàng loạt</Label><DatePicker id="member-import-common-date" aria-label="Ngày áp dụng hàng loạt" value={commonDate || undefined} disabled={busy} onChange={(value) => setCommonDate(value ?? '')} /></div><Button variant="outline" disabled={busy || !commonDate} onClick={() => void applyDates(preview.duLieu.filter((row) => !row.ngaySinhHoatTu).map((row) => ({ dong: row.dong, ngaySinhHoatTu: commonDate })))}>Áp dụng cho hồ sơ thiếu ngày</Button></div></AlertDescription></Alert>}
            {preview.loi.length > 0 && <Alert variant="destructive"><AlertCircle /><AlertTitle>Tệp còn lỗi cần sửa</AlertTitle><AlertDescription>{preview.loi.length} lỗi ở {preview.coLoi} hồ sơ. Tải báo cáo lỗi hoặc mở chi tiết từng dòng; sau khi sửa Excel, hãy quay lại tải tệp mới.</AlertDescription></Alert>}
            <div className="max-w-full overflow-x-auto rounded-md border" role="region" aria-label="Bảng xem trước hồ sơ nhập Excel" tabIndex={0}><Table className="min-w-[1420px]"><TableHeader><TableRow>{['STT', 'Mã hồ sơ', 'Họ và tên', 'Ngày sinh', 'CCCD', 'Giới tính', 'Chi bộ', 'Khóa Đảng viên', 'Trạng thái Đảng viên', 'Tạo tài khoản', 'Kết quả kiểm tra', 'Thao tác'].map((heading) => <TableHead key={heading} className={heading === 'Thao tác' ? 'sticky right-0 z-10 bg-card' : undefined}>{heading}</TableHead>)}</TableRow></TableHeader><TableBody>
              {filteredRows.map((row) => <Fragment key={row.dong}>
                <TableRow key={row.dong}><TableCell>{row.dong - 2}</TableCell><TableCell>{row.maHoSoNoiBo}</TableCell><TableCell className="font-medium">{row.hoVaTen}</TableCell><TableCell>{row.ngaySinh ?? '—'}</TableCell><TableCell>{row.soCccd ?? '—'}</TableCell><TableCell>{row.gioiTinh ?? '—'}</TableCell><TableCell>{row.maChiBo ?? '—'}</TableCell><TableCell>{row.khoaDangVien ?? '—'}</TableCell><TableCell>{row.trangThaiDangVien}</TableCell><TableCell>{row.taoTaiKhoan ? 'Có' : 'Không'}</TableCell><TableCell><div className="flex flex-wrap gap-1"><Badge variant={row.hopLe ? 'success' : 'destructive'}>{row.hopLe ? 'Hợp lệ' : 'Có lỗi'}</Badge>{row.daTonTai && <Badge variant="outline" className="border-stat-exists text-stat-exists">Đã tồn tại</Badge>}</div></TableCell><TableCell className="sticky right-0 z-10 bg-card"><Button size="sm" variant="outline" aria-expanded={expandedRow === row.dong} onClick={() => setExpandedRow((current) => current === row.dong ? null : row.dong)}>{expandedRow === row.dong ? 'Ẩn chi tiết' : 'Xem chi tiết'}</Button></TableCell></TableRow>
                {expandedRow === row.dong && <TableRow key={`${row.dong}-detail`}><TableCell colSpan={12} className="bg-muted/30"><div className="grid gap-4 p-2 lg:grid-cols-2"><section className="space-y-2"><h3 className="font-semibold">Hồ sơ và thông tin cá nhân</h3><p>Mã hồ sơ: {row.maHoSoNoiBo} · Họ tên: {row.hoVaTen}</p><p>Ngày sinh: {row.ngaySinh ?? '—'} · CCCD: {row.soCccd ?? '—'} · Giới tính: {row.gioiTinh ?? '—'}</p><p>Trạng thái Đảng viên: {row.trangThaiDangVien} · Khóa: {row.khoaDangVien ?? '—'}</p></section><section className="space-y-2"><h3 className="font-semibold">Sinh hoạt Đảng và tài khoản</h3><p>Chi bộ: {row.maChiBo ?? '—'} · Tổ: {row.maTo ?? 'Chưa phân tổ'}</p><div className="flex flex-wrap items-end gap-2"><div className="space-y-1"><Label htmlFor={`membership-date-${row.dong}`}>Ngày bắt đầu sinh hoạt</Label><DatePicker id={`membership-date-${row.dong}`} aria-label={`Ngày bắt đầu sinh hoạt dòng ${row.dong}`} disabled={busy} value={row.ngaySinhHoatTu?.slice(0, 10) || undefined} onChange={(value) => { if (value) void applyDates([{ dong: row.dong, ngaySinhHoatTu: value }]) }} /></div><Badge variant={row.taoTaiKhoan ? 'secondary' : 'outline'}>{row.taoTaiKhoan ? 'Sẽ tạo tài khoản' : 'Không tạo tài khoản'}</Badge></div></section>{(errorsByRow.get(row.dong)?.length ?? 0) > 0 && <section className="space-y-1 lg:col-span-2"><h3 className="font-semibold text-destructive">Lỗi và hướng khắc phục</h3>{errorsByRow.get(row.dong)?.map((item, index) => <p key={`${item.field}-${index}`} role="alert">Dòng Excel {item.row} — {fieldLabels[item.field] ?? item.field}: {item.message}</p>)}</section>}</div></TableCell></TableRow>}
              </Fragment>)}
              {!filteredRows.length && <TableRow><TableCell colSpan={12} className="h-20 text-center text-muted-foreground">Không có hồ sơ khớp bộ lọc.</TableCell></TableRow>}
            </TableBody></Table></div>
            <p className="text-sm text-muted-foreground">Phiên kiểm tra có hiệu lực 10 phút.</p>
          </>}

          {step === 'confirm' && preview && <div className="space-y-5">
            <Alert variant="warning"><AlertCircle /><AlertTitle>Xác nhận ghi dữ liệu</AlertTitle><AlertDescription>Hồ sơ và tài khoản được tạo trong một giao dịch. Kiểm tra lại tổng hợp trước khi tiếp tục.</AlertDescription></Alert>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ImportSummaryCard label="Hồ sơ sẽ tạo" value={preview.tongSo} variant="total" /><ImportSummaryCard label="Tài khoản sẽ tạo" value={preview.taoTaiKhoan} variant="independent" /><ImportSummaryCard label="Không tạo tài khoản" value={preview.tongSo - preview.taoTaiKhoan} variant="warning" /><ImportSummaryCard label="Chi bộ liên quan" value={new Set(preview.duLieu.map((row) => row.maChiBo).filter(Boolean)).size} variant="linked" /></div>
            {preview.taoTaiKhoan > 0 ? <Alert><AlertTitle>Thiết lập tài khoản</AlertTitle><AlertDescription><p>{preview.taoTaiKhoan} tài khoản sẽ được tạo theo tên đăng nhập trong Excel và liên kết với hồ sơ tương ứng. Mỗi tài khoản có mật khẩu khởi tạo riêng; mật khẩu chỉ hiển thị một lần sau khi nhập thành công.</p></AlertDescription></Alert> : <p className="text-sm text-muted-foreground">Không có tài khoản đăng nhập nào được chọn để tạo.</p>}
            <div className="space-y-3 rounded-md border p-4"><Label className="flex items-start gap-3 font-normal"><Checkbox checked={confirmed} disabled={busy} onCheckedChange={(value) => setConfirmed(value === true)} /><span>Tôi đã kiểm tra dữ liệu và xác nhận tạo các hồ sơ Đảng viên cùng tài khoản được lựa chọn.</span></Label></div>
          </div>}

          {step === 'result' && result && <div className="space-y-5">
            <Alert variant="success"><CheckCircle2 /><AlertTitle>Nhập thành công</AlertTitle><AlertDescription>Dữ liệu Đảng viên đã được lưu thành công vào hệ thống.</AlertDescription></Alert>
            <div className="grid gap-3 sm:grid-cols-3"><ImportSummaryCard label="Hồ sơ đã tạo" value={result.tongSo} variant="success" /><ImportSummaryCard label="Tài khoản đã tạo" value={result.matKhauBanDau.length} variant="independent" /><ImportSummaryCard label="Không tạo tài khoản" value={result.tongSo - result.matKhauBanDau.length} variant="warning" /></div>
            {result.matKhauBanDau.length > 0 && <section className="space-y-3"><div><h3 className="font-semibold">Mật khẩu khởi tạo · chỉ hiển thị trong phiên này</h3><p className="text-sm text-muted-foreground">Lưu trữ và bàn giao theo quy trình an toàn của đơn vị. Không có tệp mật khẩu tự động được tạo.</p></div><div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>STT</TableHead><TableHead>Tên đăng nhập</TableHead><TableHead>Mật khẩu khởi tạo</TableHead><TableHead>Hiển thị</TableHead></TableRow></TableHeader><TableBody>{result.matKhauBanDau.map((item, index) => <TableRow key={item.tenDangNhap}><TableCell>{index + 1}</TableCell><TableCell>{item.tenDangNhap}</TableCell><TableCell className="font-mono">{visiblePasswords.includes(index) ? item.matKhau : '••••••••••••'}</TableCell><TableCell><Button variant="ghost" size="sm" aria-label={visiblePasswords.includes(index) ? `Ẩn mật khẩu ${item.tenDangNhap}` : `Hiện mật khẩu ${item.tenDangNhap}`} onClick={() => setVisiblePasswords((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}>{visiblePasswords.includes(index) ? <EyeOff /> : <Eye />}</Button></TableCell></TableRow>)}</TableBody></Table></div></section>}
          </div>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-6 py-4">
          <Button variant="outline" disabled={busy} onClick={() => requestClose(false)}>{step === 'result' ? 'Đóng' : 'Hủy'}</Button>
          <div className="flex flex-wrap justify-end gap-2">{step === 'preview' && <>{preview?.loi.length ? <Button variant="outline" disabled={busy} onClick={() => void handleErrorReport()}><Download />Tải báo cáo lỗi</Button> : null}<Button variant="outline" disabled={busy} onClick={() => setStep('file')}><ChevronLeft />Quay lại</Button></>}{step === 'confirm' && <Button variant="outline" disabled={busy} onClick={() => setStep('preview')}><ChevronLeft />Quay lại</Button>}{step === 'file' && <Button disabled={!file || busy} onClick={() => void checkFile()}>{busy ? <><LoaderCircle className="animate-spin" />Đang kiểm tra…</> : <>Tiếp tục kiểm tra<ChevronRight /></>}</Button>}{step === 'preview' && <Button disabled={!canAdvance || busy} onClick={() => setStep('confirm')}>Tiếp tục xác nhận<ChevronRight /></Button>}{step === 'confirm' && <Button disabled={!canAdvance || busy} onClick={() => void confirmImport()}>{busy ? <><LoaderCircle className="animate-spin" />Đang nhập…</> : <>Xác nhận nhập<Check /></>}</Button>}{step === 'result' && <><Button variant="outline" onClick={() => { clear(); onOpenChange(false) }}>Xem danh sách Đảng viên</Button><Button onClick={() => { clear(); onOpenChange(false) }}>Hoàn tất</Button></>}</div>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={askDiscard} onOpenChange={setAskDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Đóng cửa sổ nhập dữ liệu?</AlertDialogTitle><AlertDialogDescription>Tệp đã chọn, dữ liệu xem trước hoặc mật khẩu khởi tạo sẽ bị xóa khỏi phiên làm việc.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Tiếp tục nhập</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={discard}>Đóng và xóa dữ liệu tạm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>
}
