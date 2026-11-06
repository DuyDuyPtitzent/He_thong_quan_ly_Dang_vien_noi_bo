import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, CalendarDays, Check, KeyRound, Link2, Monitor, ShieldCheck, UserRound, X } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/shared/components/ui/combobox'
import { cn } from 'cn'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { accountsApi } from './accounts.api'
import { type AccountAuditEntry, type AccountRecord, type AccountStatus, type MemberProfile } from './accounts.models'

export type AccountFormValues = { login: string; email: string; status: AccountStatus; password: string; profileId: string | null }

const statusLabels: Record<AccountStatus, string> = { DANG_HOAT_DONG: 'Đang hoạt động', TAM_KHOA: 'Tạm khóa', NGUNG_HOAT_DONG: 'Ngừng hoạt động' }
const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }) : 'Chưa ghi nhận'

export function AccountFormSheet({ open, account, availableProfiles, onOpenChange, onSubmit, onManageLink, canChangeStatus = false }: {
  open: boolean
  account: AccountRecord | null
  availableProfiles: MemberProfile[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AccountFormValues) => Promise<void>
  onManageLink?: () => void
  canChangeStatus?: boolean
}) {
  const editing = Boolean(account)
  const [mode, setMode] = useState<'linked' | 'independent'>('linked')
  const [search, setSearch] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<AccountStatus>('DANG_HOAT_DONG')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [searchedProfiles, setSearchedProfiles] = useState<MemberProfile[]>([])

  useEffect(() => {
    if (!open) return
    setMode(account?.profile ? 'linked' : 'independent')
    setSelectedProfileId(account?.profile?.id ?? '')
    setLogin(account?.login ?? '')
    setEmail(account?.email ?? '')
    setStatus(account?.status ?? 'DANG_HOAT_DONG')
    setPassword('')
    setConfirmPassword('')
    setSearch('')
    setError('')
    setShowPassword(false)
  }, [open, account])

  useEffect(() => {
    let current = true
    if (!open || search.trim().length < 2) { setSearchedProfiles([]); return }
    const timer = window.setTimeout(() => {
      void accountsApi.searchProfiles(search.trim()).then((rows) => {
        if (current) setSearchedProfiles(rows.map((row) => ({ id: row.ma, code: row.maHoSoNoiBo, name: row.hoVaTen, cccd: null, birthDate: null, partyBranch: row.chiBoHienTai ?? 'Chưa ghi nhận Chi bộ', group: null, status: 'Chưa liên kết' })))
      }).catch(() => { if (current) setSearchedProfiles([]) })
    }, 250)
    return () => { current = false; window.clearTimeout(timer) }
  }, [open, search])

  const filteredProfiles = useMemo(() => searchedProfiles.length ? searchedProfiles : availableProfiles, [availableProfiles, searchedProfiles])
  const selectedProfile = filteredProfiles.find(({ id }) => id === selectedProfileId) ?? account?.profile ?? null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!editing && password.length < 12) return setError('Mật khẩu khởi tạo cần có ít nhất 12 ký tự.')
    if (!editing && password !== confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.')
    if (!editing && mode === 'linked' && !selectedProfileId) return setError('Hãy chọn hồ sơ Đảng viên chưa liên kết.')
    try {
      await onSubmit({ login: login.trim(), email: email.trim(), status: editing && !canChangeStatus ? account?.status ?? status : status, password, profileId: !editing && mode === 'linked' ? selectedProfileId : null })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu tài khoản.') }
  }

  return <StandardSheet
    open={open}
    size="compact"
    onOpenChange={onOpenChange}
    title={editing ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản'}
    description={editing ? 'Cập nhật thông tin đăng nhập. Thông tin hồ sơ được quản lý riêng.' : 'Tạo tài khoản đăng nhập mới, có thể liên kết hồ sơ Đảng viên đã tồn tại.'}
    footer={<><Button type="button" variant="outline" className="h-10 px-5" onClick={() => onOpenChange(false)}>Hủy</Button><Button type="submit" form="account-form" className="h-10 px-6">{editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}</Button></>}
  >
      <form id="account-form" onSubmit={submit} className="contents">
          {!editing && <section className="space-y-3">
            <div><h3 className="text-sm font-semibold">Hình thức cấp tài khoản</h3><p className="mt-1 text-sm text-muted-foreground">Hồ sơ cá nhân không được nhập lại tại màn hình này.</p></div>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'linked' | 'independent')} className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="account-mode-linked" className={cn('flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors', mode === 'linked' && 'border-border bg-accent/40')}>
                <RadioGroupItem id="account-mode-linked" value="linked" className="mt-0.5" />
                <span><span className="block text-sm font-medium">Cấp cho Đảng viên có hồ sơ</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Tìm hồ sơ chưa liên kết và đối chiếu thông tin.</span></span>
              </label>
              <label htmlFor="account-mode-independent" className={cn('flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors', mode === 'independent' && 'border-border bg-accent/40')}>
                <RadioGroupItem id="account-mode-independent" value="independent" className="mt-0.5" />
                <span><span className="block text-sm font-medium">Tạo tài khoản độc lập</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Có thể liên kết hồ sơ sau qua luồng xác minh.</span></span>
              </label>
            </RadioGroup>
          </section>}

          {!editing && mode === 'linked' && <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start gap-2"><UserRound className="mt-0.5 size-4 text-primary" /><div><h3 className="text-sm font-semibold">Chọn hồ sơ Đảng viên</h3><p className="text-xs text-muted-foreground">Kết quả được tìm trực tiếp trong hồ sơ chưa liên kết thuộc phạm vi được cấp.</p></div></div>
            <Combobox items={filteredProfiles.map(({ id }) => id)} value={selectedProfileId || null} onValueChange={(value) => setSelectedProfileId(typeof value === 'string' ? value : '')}>
              <ComboboxInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập ít nhất 2 ký tự để tìm hồ sơ" showClear />
              <ComboboxContent><ComboboxList>{filteredProfiles.map((profile) => <ComboboxItem key={profile.id} value={profile.id}><span className="min-w-0"><span className="block font-medium">{profile.name} · {profile.code}</span><span className="block truncate text-xs text-muted-foreground">{profile.partyBranch}</span></span></ComboboxItem>)}</ComboboxList><ComboboxEmpty>Không tìm thấy hồ sơ chưa liên kết.</ComboboxEmpty></ComboboxContent>
            </Combobox>
            {selectedProfile && <Card className="gap-0 border-border bg-background py-0"><CardContent className="grid gap-2 p-4 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Mã hồ sơ</p><p className="font-medium">{selectedProfile.code}</p></div><div><p className="text-xs text-muted-foreground">Họ và tên</p><p className="font-medium">{selectedProfile.name}</p></div><div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Chi bộ</p><p>{selectedProfile.partyBranch}</p></div><div className="sm:col-span-2"><Badge variant="outline" className="gap-1"><Check className="size-3" />Chưa liên kết tài khoản</Badge></div></CardContent></Card>}
          </section>}

          {editing && <section className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start gap-2"><Link2 className="mt-0.5 size-4 text-primary" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Liên kết hồ sơ</h3><p className="mt-1 text-sm text-muted-foreground">{account?.profile ? `${account.profile.name} · ${account.profile.code}` : 'Tài khoản chưa liên kết hồ sơ Đảng viên.'}</p></div>{onManageLink && <Button type="button" variant="outline" size="sm" onClick={onManageLink}>Quản lý liên kết</Button>}</div>
          </section>}

          <section className="space-y-4">
            <div><h3 className="text-sm font-semibold">Thông tin đăng nhập</h3><p className="mt-1 text-sm text-muted-foreground">Các trường có dấu * là bắt buộc.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="account-login">Tên đăng nhập *</Label><Input id="account-login" className="h-10 bg-muted" autoComplete="off" required minLength={3} maxLength={100} value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Ví dụ: ten.ho" /></div>
              <div className="space-y-2"><Label htmlFor="account-email">Email đăng nhập</Label><Input id="account-email" className="h-10 bg-muted" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@ptit.edu.vn" /></div>
            </div>
            {!editing && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="account-password">Mật khẩu khởi tạo *</Label><div className="relative"><Input className="h-10 bg-muted pr-20" id="account-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-7" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</Button></div><p className="text-xs text-muted-foreground">Tối thiểu 12 ký tự.</p></div>
              <div className="space-y-2"><Label htmlFor="account-confirm-password">Xác nhận mật khẩu *</Label><Input id="account-confirm-password" className="h-10 bg-muted" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>
            </div>}
            {(!editing || canChangeStatus) && <div className="space-y-2"><Label>{editing ? 'Trạng thái tài khoản' : 'Trạng thái ban đầu'}</Label><Select value={status} onValueChange={(value) => setStatus(value as AccountStatus)}><SelectTrigger className="h-10 w-full bg-muted"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DANG_HOAT_DONG">Đang hoạt động</SelectItem><SelectItem value="TAM_KHOA">Tạm khóa</SelectItem><SelectItem value="NGUNG_HOAT_DONG">Ngừng hoạt động</SelectItem></SelectContent></Select></div>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </section>
      </form>
  </StandardSheet>
}

export function AccountDetailSheet({ account, open, onOpenChange, onEdit, onLink, onHistory, canManageAssignments, canEdit, canLink, canViewHistory, canViewProfile, canViewPersonal, canViewSessions }: {
  account: AccountRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onLink: () => void
  onHistory: () => void
  canManageAssignments: boolean
  canEdit: boolean
  canLink: boolean
  canViewHistory: boolean
  canViewProfile: boolean
  canViewPersonal: boolean
  canViewSessions: boolean
}) {
  return <StandardSheet
    open={open}
    size="detail"
    onOpenChange={onOpenChange}
    title={<span className="flex flex-wrap items-center gap-2">{account?.login ?? 'Thông tin tài khoản'}{account && <StatusBadge status={account.status} />}</span>}
    description={`Mã tài khoản: ${account?.id ?? '—'}`}
    bodyClassName="space-y-0 p-0"
    footerClassName="sm:justify-between"
    footer={<>{canViewHistory ? <Button variant="ghost" onClick={onHistory}>Xem lịch sử quản trị</Button> : <span /> }<div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>{canEdit && <Button onClick={onEdit}>Chỉnh sửa tài khoản</Button>}</div></>}
  >
    {account && <>
        <Tabs defaultValue="account" className="min-h-0 gap-0">
          <TabsList variant="line" className="sticky top-0 z-10 w-full border-b bg-background px-6 py-0">
            <TabsTrigger value="account">Tài khoản & bảo mật</TabsTrigger>
            <TabsTrigger value="profile">Hồ sơ & phân quyền</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="space-y-8 px-6 py-6">
        <section className="space-y-4"><SectionTitle icon={<UserRound />} title="Thông tin tài khoản" /><div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Info label="Tên đăng nhập" value={account.login} /><Info label="Email đăng nhập" value={account.email || 'Chưa thiết lập'} /><Info label="Ngày tạo" value={formatDate(account.createdAt)} /><Info label="Cập nhật gần nhất" value={formatDate(account.updatedAt)} /><Info label="Lần đăng nhập cuối" value={formatDate(account.lastLogin)} />
        </div></section>
        <section className="space-y-4"><SectionTitle icon={<ShieldCheck />} title="Thông tin bảo mật" /><div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><span className="text-muted-foreground">Trạng thái khóa</span><span>{account.status === 'TAM_KHOA' ? 'Đang khóa' : 'Không khóa'}</span></div>
          {account.lockedUntil && <div className="flex items-center justify-between gap-3 border-b pb-3"><span className="text-muted-foreground">Thời hạn khóa đến</span><span>{formatDate(account.lockedUntil)}</span></div>}
          <div className="flex items-center justify-between gap-3 border-b pb-3"><span className="text-muted-foreground">Yêu cầu đổi mật khẩu</span><Badge variant={account.passwordResetRequired ? 'outline' : 'secondary'}>{account.passwordResetRequired ? 'Đang yêu cầu' : 'Không yêu cầu'}</Badge></div>
          {canViewSessions ? <div><p className="mb-2 font-medium">Phiên đăng nhập đang hoạt động</p>{account.sessions.length ? <div className="divide-y">{account.sessions.map((session, index) => <div key={`${session.device}-${index}`} className="flex flex-wrap items-center gap-3 py-3"><Monitor className="size-4 text-muted-foreground" /><div><p className="font-medium">{session.device}{session.current && <Badge className="ml-2" variant="outline">Phiên hiện tại</Badge>}</p><p className="text-xs text-muted-foreground">{session.location} · {formatDate(session.lastSeen)}</p></div></div>)}</div> : <p className="text-muted-foreground">Không có phiên hoạt động.</p>}</div> : <p className="text-xs text-muted-foreground">Thông tin phiên đăng nhập không thuộc quyền xem hiện tại.</p>}
          <p className="text-xs text-muted-foreground">Không hiển thị mật khẩu hoặc dữ liệu xác thực.</p>
        </div></section>
          </TabsContent>
          <TabsContent value="profile" className="space-y-8 px-6 py-6">
        <section className="space-y-4"><SectionTitle icon={<Building2 />} title="Hồ sơ Đảng viên liên kết" />{account.profile ? <><div className="grid gap-x-8 gap-y-5 border-b pb-5 sm:grid-cols-2"><Info label="Mã hồ sơ Đảng viên" value={account.profile.code} /><Info label="Họ và tên" value={account.profile.name} /><Info label="CCCD" value={canViewPersonal ? account.profile.cccd ?? 'Chưa cập nhật' : 'Không có quyền xem'} /><Info label="Ngày sinh" value={canViewPersonal ? formatDate(account.profile.birthDate) : 'Không có quyền xem'} /><Info label="Chi bộ sinh hoạt hiện tại" value={account.profile.partyBranch} />{account.profile.group && <Info label="Tổ sinh hoạt" value={account.profile.group} />}<Info label="Trạng thái liên kết hồ sơ" value="Đã liên kết" /><Info label="Trạng thái hồ sơ" value={account.profile.status} /></div><div className="flex justify-end">{canViewProfile && <Button asChild variant="outline"><Link to={`/ho-so-dang-vien/${account.profile.id}`}>Xem hồ sơ Đảng viên</Link></Button>}</div></> : <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><p className="text-sm text-muted-foreground">Tài khoản chưa liên kết hồ sơ Đảng viên</p>{canLink && <Button variant="outline" size="sm" onClick={onLink}>Liên kết hồ sơ</Button>}</div>}</section>
        <section className="space-y-4"><SectionTitle icon={<ShieldCheck />} title="Phân quyền" />{account.assignments.length ? <div className="divide-y">{account.assignments.map((assignment, index) => <div key={`${assignment.role}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{assignment.role}</p><p className="text-sm text-muted-foreground">{assignment.scope} · {assignment.expiresAt ? `Đến ${formatDate(assignment.expiresAt)}` : 'Không thời hạn'}</p></div><Badge variant={assignment.active ? 'success' : 'outline'}>{assignment.active ? 'Hiệu lực' : 'Hết hiệu lực'}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">Chưa có Assignment.</p>}{canManageAssignments && <Button asChild variant="outline"><Link to={`/phan-quyen-tai-khoan?maTaiKhoan=${account.id}`}>Quản lý phân quyền</Link></Button>}</section>
          </TabsContent>
        </Tabs>
    </>}
  </StandardSheet>
}

export function ProfileLinkSheet({ account, open, availableProfiles, onOpenChange, onSave }: {
  account: AccountRecord | null
  open: boolean
  availableProfiles: MemberProfile[]
  onOpenChange: (open: boolean) => void
  onSave: (profileId: string | null) => void
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [searchedProfiles, setSearchedProfiles] = useState<MemberProfile[]>([])
  useEffect(() => { if (open) { setSearch(''); setSelectedId(account?.profile?.id ?? '') } }, [open, account])
  useEffect(() => {
    let current = true
    if (!open || search.trim().length < 2) { setSearchedProfiles([]); return }
    const timer = window.setTimeout(() => {
      void accountsApi.searchProfiles(search.trim()).then((rows) => {
        if (!current) return
        const found = rows.map((row) => ({ id: row.ma, code: row.maHoSoNoiBo, name: row.hoVaTen, cccd: null, birthDate: null, partyBranch: row.chiBoHienTai ?? 'Chưa ghi nhận Chi bộ', group: null, status: 'Chưa liên kết' }))
        setSearchedProfiles(account?.profile && `${account.profile.code} ${account.profile.name}`.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')) ? [account.profile, ...found] : found)
      }).catch(() => { if (current) setSearchedProfiles([]) })
    }, 250)
    return () => { current = false; window.clearTimeout(timer) }
  }, [account, open, search])
  const choices = searchedProfiles.length ? searchedProfiles : availableProfiles
  const selected = selectedId ? choices.find(({ id }) => id === selectedId) ?? account?.profile ?? null : null
  const hasChanged = (account?.profile?.id ?? '') !== selectedId
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[min(94vw,560px)] sm:max-w-[560px] gap-0 p-0"><SheetHeader className="border-b px-6 py-5"><SheetTitle>Liên kết hồ sơ Đảng viên</SheetTitle><SheetDescription>{account?.login} · Chọn hồ sơ đúng; không ghép tự động theo tên.</SheetDescription></SheetHeader><SheetBody className="space-y-5 px-6 py-5">
    <div className="space-y-2"><Label>Tìm hồ sơ chưa liên kết</Label><Combobox items={choices.map(({ id }) => id)} value={selectedId || null} onValueChange={(value) => setSelectedId(typeof value === 'string' ? value : '')}><ComboboxInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập ít nhất 2 ký tự để tìm hồ sơ" showClear /><ComboboxContent><ComboboxList>{choices.map((profile) => <ComboboxItem key={profile.id} value={profile.id}><span><span className="block font-medium">{profile.name} · {profile.code}</span><span className="text-xs text-muted-foreground">{profile.partyBranch}</span></span></ComboboxItem>)}</ComboboxList><ComboboxEmpty>Không có hồ sơ phù hợp.</ComboboxEmpty></ComboboxContent></Combobox></div>
    {selected && <Card className="gap-0 py-0"><CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2"><Info label="Mã hồ sơ" value={selected.code} /><Info label="Họ tên" value={selected.name} /><Info label="Chi bộ" value={selected.partyBranch} /><Info label="Tổ" value={selected.group ?? 'Chưa phân tổ'} /><div className="sm:col-span-2"><Badge variant="outline">{selected.status}</Badge></div></CardContent></Card>}
    {account?.profile && selectedId === account.profile.id && <Button variant="outline" className="w-full" onClick={() => setSelectedId('')}><X className="size-4" />Hủy liên kết hiện tại</Button>}
    <p className="rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Họ tên, ngày sinh và thông tin sinh hoạt lấy từ hồ sơ Đảng viên. Màn hình tài khoản không chỉnh sửa các dữ liệu này.</p>
  </SheetBody><SheetFooter className="flex-row justify-end border-t px-6 py-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button disabled={!hasChanged} onClick={() => onSave(selectedId || null)}>{selectedId ? account?.profile ? 'Xác nhận thay đổi liên kết' : 'Xác nhận liên kết' : 'Xác nhận hủy liên kết'}</Button></SheetFooter></SheetContent></Sheet>
}

export function AccountHistorySheet({ account, open, onOpenChange }: { account: AccountRecord | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[min(94vw,640px)] sm:max-w-[640px] gap-0 p-0"><SheetHeader className="border-b px-6 py-5"><SheetTitle>Lịch sử quản trị tài khoản</SheetTitle><SheetDescription>{account?.login} · Chỉ hiển thị sự kiện quản trị, không hiển thị dữ liệu bí mật.</SheetDescription></SheetHeader><SheetBody className="px-6 py-5">{account?.audit.length ? <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[7px] before:top-2 before:w-px before:bg-border">{account.audit.map((entry, index) => <AuditItem key={`${entry.at}-${index}`} entry={entry} />)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">Chưa có lịch sử quản trị.</p>}</SheetBody><SheetFooter className="border-t px-6 py-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button></SheetFooter></SheetContent></Sheet>
}

export function ResetPasswordSheet({ account, open, onOpenChange, onConfirm }: { account: AccountRecord | null; open: boolean; onOpenChange: (open: boolean) => void; onConfirm: (password: string) => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setPassword(''); setConfirmation(''); setError(''); setShow(false) } }, [open, account])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 12) return setError('Mật khẩu cần có ít nhất 12 ký tự.')
    if (password !== confirmation) return setError('Mật khẩu xác nhận chưa khớp.')
    onConfirm(password)
  }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-[min(94vw,520px)] sm:max-w-[520px] gap-0 p-0"><SheetHeader className="border-b px-6 py-5"><SheetTitle>Đặt lại mật khẩu</SheetTitle><SheetDescription>Tài khoản: {account?.login}</SheetDescription></SheetHeader><form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><SheetBody className="space-y-4 px-6 py-5"><div className="flex gap-3 rounded-lg border border-accent-foreground/20 bg-accent/30 p-4 text-sm"><KeyRound className="mt-0.5 size-4 shrink-0" /><p>Không yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên. Không nhập hoặc hiển thị mật khẩu hiện tại.</p></div><div className="space-y-2"><Label htmlFor="reset-password">Mật khẩu mới</Label><Input id="reset-password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><Button type="button" variant="link" className="h-auto px-0" onClick={() => setShow((value) => !value)}>{show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Button></div><div className="space-y-2"><Label htmlFor="reset-password-confirm">Xác nhận mật khẩu mới</Label><Input id="reset-password-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</SheetBody><SheetFooter className="flex-row justify-end border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button type="submit">Xác nhận đặt lại</Button></SheetFooter></form></SheetContent></Sheet>
}

export type AccountConfirmAction = { kind: 'lock' | 'unlock' | 'deactivate' | 'delete'; account: AccountRecord } | null
export function AccountConfirmDialog({ action, onOpenChange, onConfirm }: { action: AccountConfirmAction; onOpenChange: (open: boolean) => void; onConfirm: (reason?: string) => void }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (action) setReason('') }, [action])
  const deleting = action?.kind === 'delete'
  const locked = action?.kind === 'lock'
  const title = deleting ? 'Xóa tài khoản?' : locked ? 'Khóa tài khoản?' : action?.kind === 'unlock' ? 'Mở khóa tài khoản?' : 'Ngừng hoạt động tài khoản?'
  const blocked = deleting && action?.account.deletable === false
  return <AlertDialog open={Boolean(action)} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2">{(deleting || locked) && <AlertTriangle className="size-5 text-destructive" />}{title}</AlertDialogTitle><AlertDialogDescription>
    {deleting ? <>{action?.account.login} sẽ bị xóa vật lý. Hồ sơ Đảng viên, Assignment, lịch sử và nhật ký kiểm toán không bị xóa dây chuyền.{blocked && <span className="mt-3 block rounded-md bg-destructive/10 p-3 text-destructive">Không thể xóa: tài khoản còn dữ liệu hoặc ràng buộc cần bảo toàn. Có thể khóa hoặc ngừng hoạt động thay thế.</span>}</> : locked ? <>{action?.account.login} sẽ không thể tiếp tục sử dụng các phiên đăng nhập theo chính sách bảo mật.</> : action?.kind === 'unlock' ? <>{action.account.login} được phép đăng nhập lại.</> : <>{action?.account.login} sẽ chuyển sang trạng thái ngừng hoạt động.</>}
  </AlertDialogDescription></AlertDialogHeader>
  {!deleting && locked && <div className="space-y-2"><Label htmlFor="status-reason">Lý do (không bắt buộc)</Label><Input id="status-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do khóa tài khoản" /></div>}
  <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction variant={deleting || locked ? 'destructive' : 'default'} disabled={blocked} onClick={(event) => { event.preventDefault(); onConfirm(reason.trim() || undefined) }}>{deleting ? 'Xóa tài khoản' : locked ? 'Xác nhận khóa' : action?.kind === 'unlock' ? 'Mở khóa tài khoản' : 'Ngừng hoạt động'}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  const variant = status === 'DANG_HOAT_DONG' ? 'success' : status === 'TAM_KHOA' ? 'outline' : 'destructive'
  return <Badge variant={variant}>{statusLabels[status]}</Badge>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="text-primary">{icon}</span>{title}</h3>
}

function AuditItem({ entry }: { entry: AccountAuditEntry }) {
  return <div className="relative flex gap-4 pb-6 last:pb-2"><span className="relative z-10 mt-1.5 size-4 shrink-0 rounded-full border-4 border-background bg-primary" /><div className="min-w-0 flex-1 rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{entry.action}</p><p className="text-sm text-muted-foreground">{entry.change}</p></div><Badge variant={entry.result === 'Thành công' ? 'success' : 'destructive'}>{entry.result}</Badge></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(entry.at)}</span><span className="inline-flex items-center gap-1"><UserRound className="size-3.5" />{entry.actor}</span></div></div></div>
}

export function ProfileChoiceLabel({ profile }: { profile: MemberProfile }) {
  return <span className="flex min-w-0 flex-col"><span className="truncate font-medium">{profile.name} · {profile.code}</span><span className="truncate text-xs text-muted-foreground">{profile.partyBranch}</span></span>
}

