import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDownUp, CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, Ellipsis, FileSpreadsheet, KeyRound, Link2, Plus, RefreshCw, Search, ShieldCheck, UserRound, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { useAuth } from '@/core/auth/auth-context'
import { coQuyenTruyCapNhatKyToanHeThong } from '@/core/auth/system-log-access'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { OrganizationUnitPicker } from '@/shared/components/OrganizationUnitPicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { AccountConfirmDialog, AccountDetailSheet, AccountFormSheet, AccountHistorySheet, ProfileLinkSheet, ResetPasswordSheet, StatusBadge, type AccountConfirmAction, type AccountFormValues } from '../components/AccountSheets'
import { AccountImportDialog } from '../components/AccountImportDialog'
import { accountsApi } from '../api/accounts.api'
import { toAccountRecord, toMemberProfile } from '../services/account-mappers'
import type { AccountRecord, AccountStatus } from '../types/accounts.models'

const statusLabel: Record<AccountStatus, string> = { DANG_HOAT_DONG: 'Đang hoạt động', TAM_KHOA: 'Tạm khóa', NGUNG_HOAT_DONG: 'Ngừng hoạt động' }

export function AccountsPage() {
  const auth = useAuth()
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [branch, setBranch] = useState('all')
  const [status, setStatus] = useState('all')
  const [linkStatus, setLinkStatus] = useState('all')
  const [assignmentStatus, setAssignmentStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('10')
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ all: 0, active: 0, blocked: 0, unlinked: 0 })
  const [branchNames, setBranchNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null)
  const [detailAccount, setDetailAccount] = useState<AccountRecord | null>(null)
  const [linkAccount, setLinkAccount] = useState<AccountRecord | null>(null)
  const [historyAccount, setHistoryAccount] = useState<AccountRecord | null>(null)
  const [resetAccount, setResetAccount] = useState<AccountRecord | null>(null)
  const [confirmAction, setConfirmAction] = useState<AccountConfirmAction>(null)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    const timer = window.setTimeout(() => {
      const params: Record<string, string | number> = { tuKhoa: keyword.trim(), trang: page, gioiHan: Number(pageSize) }
      if (status !== 'all') params.trangThai = status
      if (linkStatus !== 'all') params.tinhTrangLienKet = linkStatus === 'linked' ? 'DA_LIEN_KET' : 'CHUA_LIEN_KET'
      if (assignmentStatus !== 'all') params.coPhanCong = assignmentStatus === 'assigned' ? 'CO' : 'KHONG'
      if (branch !== 'all') params.maChiBo = branch
      void accountsApi.list(params).then((result) => {
        if (!current) return
        setAccounts(result.duLieu.map(toAccountRecord))
        setTotal(result.phanTrang.tongSo)
        const lastPage = Math.max(1, Math.ceil(result.phanTrang.tongSo / Number(pageSize)))
        if (page > lastPage) setPage(lastPage)
        setStats({ all: result.thongKe.tongTaiKhoan, active: result.thongKe.dangHoatDong, blocked: result.thongKe.khoaHoacVoHieuHoa, unlinked: result.thongKe.chuaLienKetHoSo })
        setBranchNames(Object.fromEntries(result.danhMucChiBo.map((item) => [item.ma, item.ten ?? item.ma])))
      }).catch((cause: unknown) => { if (current) { setAccounts([]); setError(normalizeApiError(cause).message) } }).finally(() => { if (current) setLoading(false) })
    }, keyword ? 250 : 0)
    return () => { current = false; window.clearTimeout(timer) }
  }, [assignmentStatus, branch, keyword, linkStatus, page, pageSize, refreshKey, status])

  const permissions = auth.taiKhoan?.quyenDangHoatDong ?? []
  const can = (permission: string) => permissions.includes(permission)
  const canViewSystemLogs = coQuyenTruyCapNhatKyToanHeThong(auth.taiKhoan)
  useEffect(() => {
    if (!canViewSystemLogs) {
      setHistoryAccount(null)
      setDetailAccount((current) => current ? { ...current, sessions: [] } : null)
    }
  }, [canViewSystemLogs])
  const totalPages = Math.max(1, Math.ceil(total / Number(pageSize)))
  const safePage = Math.min(page, totalPages)
  const detail = accounts.find(({ id }) => id === detailAccount?.id) ?? detailAccount
  const linkTarget = accounts.find(({ id }) => id === linkAccount?.id) ?? linkAccount
  const historyTarget = accounts.find(({ id }) => id === historyAccount?.id) ?? historyAccount
  const resetTarget = accounts.find(({ id }) => id === resetAccount?.id) ?? resetAccount

  function openCreate() { setEditingAccount(null); setFormOpen(true) }
  function openEdit(account: AccountRecord) { setEditingAccount(account); setFormOpen(true) }
  async function openDetail(account: AccountRecord) {
    setDetailAccount(account)
    try {
      const result = await accountsApi.detail(account.id)
      setDetailAccount({ ...account, createdAt: result.ngayTao, updatedAt: result.ngayCapNhat, lockedUntil: result.khoaDen, passwordResetRequired: result.doiMatKhauLanDau, profile: result.hoSoDangVien ? toMemberProfile(result.hoSoDangVien) : result.daLienKetHoSo ? account.profile : null, sessions: result.phienDangNhap.map((session) => ({ device: 'Phiên đăng nhập', location: session.diaChiIp ?? 'Không ghi nhận địa chỉ IP', lastSeen: session.ngayTao, current: false })) })
    } catch (cause) { toast.error(normalizeApiError(cause).message) }
  }
  function resetFilters() { setKeyword(''); setBranch('all'); setStatus('all'); setLinkStatus('all'); setAssignmentStatus('all'); setPage(1) }
  function applyStatisticFilter(nextStatus: string, nextLinkStatus: string) { setKeyword(''); setBranch('all'); setAssignmentStatus('all'); setStatus(nextStatus); setLinkStatus(nextLinkStatus); setPage(1) }
  function refresh() { setRefreshKey((value) => value + 1) }
  function reload() { setRefreshKey((value) => value + 1) }

  async function saveAccount(values: AccountFormValues) {
    try {
      if (editingAccount) {
        await accountsApi.update(editingAccount.id, { tenDangNhap: values.login, email: values.email || null, ...(values.status !== editingAccount.status ? { trangThai: values.status } : {}) })
        toast.success('Đã lưu thay đổi vào cơ sở dữ liệu.')
      } else {
        await accountsApi.create({ tenDangNhap: values.login, email: values.email || undefined, matKhauBanDau: values.password, maHoSo: values.profileId || undefined, trangThai: values.status })
        toast.success('Đã tạo tài khoản thành công.')
      }
      setFormOpen(false)
      reload()
    } catch (cause) { toast.error(normalizeApiError(cause).message); throw cause }
  }

  async function saveLink(profileId: string | null) {
    if (!linkTarget) return
    try {
      await accountsApi.linkProfile(linkTarget.id, profileId)
      setLinkAccount(null)
      toast.success('Đã lưu liên kết hồ sơ vào cơ sở dữ liệu.')
      reload()
    } catch (cause) { toast.error(normalizeApiError(cause).message) }
  }

  async function openHistory(account: AccountRecord) {
    try {
      const rows = await accountsApi.history(account.id)
      setHistoryAccount({ ...account, audit: rows.map((entry) => ({ at: entry.thoiDiem, actor: entry.maNguoiThucHien ?? 'Hệ thống', action: entry.hanhDong, change: entry.lyDo ?? ([entry.duLieuTruoc, entry.duLieuSau].filter(Boolean).map((item) => JSON.stringify(item)).join(' → ') || '—'), result: entry.ketQua === 'THANH_CONG' ? 'Thành công' : 'Từ chối' })) })
    } catch (cause) { toast.error(normalizeApiError(cause).message) }
  }

  async function confirmStatusOrDelete(reason?: string) {
    if (!confirmAction) return
    const { kind, account } = confirmAction
    try {
      if (kind === 'delete') {
        await accountsApi.remove(account.id)
        toast.success('Đã xóa tài khoản khỏi cơ sở dữ liệu.')
      } else {
        const nextStatus: AccountStatus = kind === 'lock' ? 'TAM_KHOA' : kind === 'deactivate' ? 'NGUNG_HOAT_DONG' : 'DANG_HOAT_DONG'
        await accountsApi.status(account.id, nextStatus, reason)
        toast.success(`Đã cập nhật trạng thái: ${statusLabel[nextStatus].toLocaleLowerCase('vi-VN')}.`)
      }
      setConfirmAction(null)
      reload()
    } catch (cause) { toast.error(normalizeApiError(cause).message) }
  }

  async function resetPassword(password: string) {
    if (!resetTarget) return
    try {
      await accountsApi.update(resetTarget.id, { matKhauMoi: password, yeuCauDoiMatKhau: false })
      setResetAccount(null)
      toast.success('Đã đặt lại mật khẩu trong cơ sở dữ liệu.')
      reload()
    } catch (cause) { toast.error(normalizeApiError(cause).message) }
  }

  return <main className="space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Quản lý tài khoản</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Quản lý tài khoản" description="Quản lý tài khoản đăng nhập, trạng thái sử dụng và liên kết hồ sơ Đảng viên trong phạm vi được phân quyền." actions={<div className="flex items-center gap-2"><Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />Làm mới</Button>{can('TAI_KHOAN_TAO') && <><Button variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet />Nhập Excel</Button><Button onClick={openCreate}><Plus />Thêm tài khoản</Button></>}</div>} />

    <section aria-label="Thống kê tài khoản" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatisticFilterCard label="Tổng tài khoản" active={status === 'all' && linkStatus === 'all' && branch === 'all' && assignmentStatus === 'all' && !keyword} onClick={() => applyStatisticFilter('all', 'all')}><StatisticCard label="Tổng tài khoản" value={loading ? '—' : stats.all.toLocaleString('vi-VN')} icon={<UsersRound className="size-5" />} description="Tài khoản trong phạm vi quản lý" /></StatisticFilterCard>
      <StatisticFilterCard label="Đang hoạt động" active={status === 'DANG_HOAT_DONG' && linkStatus === 'all' && branch === 'all' && assignmentStatus === 'all' && !keyword} onClick={() => applyStatisticFilter('DANG_HOAT_DONG', 'all')}><StatisticCard label="Đang hoạt động" value={loading ? '—' : stats.active.toLocaleString('vi-VN')} icon={<UserRoundCheck className="size-5" />} description="Có thể đăng nhập hệ thống" /></StatisticFilterCard>
      <StatisticFilterCard label="Bị khóa / ngừng" active={status === 'TAM_KHOA_HOAC_NGUNG_HOAT_DONG' && linkStatus === 'all' && branch === 'all' && assignmentStatus === 'all' && !keyword} onClick={() => applyStatisticFilter('TAM_KHOA_HOAC_NGUNG_HOAT_DONG', 'all')}><StatisticCard label="Bị khóa / ngừng" value={loading ? '—' : stats.blocked.toLocaleString('vi-VN')} icon={<UserRoundX className="size-5" />} description="Tạm khóa hoặc ngừng hoạt động" /></StatisticFilterCard>
      <StatisticFilterCard label="Chưa liên kết hồ sơ" active={linkStatus === 'unlinked' && status === 'all' && branch === 'all' && assignmentStatus === 'all' && !keyword} onClick={() => applyStatisticFilter('all', 'unlinked')}><StatisticCard label="Chưa liên kết hồ sơ" value={loading ? '—' : stats.unlinked.toLocaleString('vi-VN')} icon={<Link2 className="size-5" />} description="Tài khoản chưa gắn hồ sơ Đảng viên" /></StatisticFilterCard>
    </section>

    <Card className="gap-0 py-0"><CardHeader className="border-b px-4 py-4 sm:px-5"><div className="grid gap-3 xl:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(150px,1fr))_auto]">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm tài khoản" placeholder="Họ tên, tên đăng nhập hoặc email" className="pl-9" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} /></div>
      <OrganizationUnitPicker label="Chi bộ" value={branch} onValueChange={(value) => { setBranch(value); setPage(1) }} allOption={{ value: 'all', label: 'Tất cả Chi bộ' }} options={Object.entries(branchNames).map(([value, label]) => ({ value, label }))} placeholder="Tất cả Chi bộ" />
      <FilterSelect label="Trạng thái tài khoản" value={status} onValueChange={(value) => { setStatus(value); setPage(1) }} options={ [['all', 'Tất cả trạng thái'], ['DANG_HOAT_DONG', 'Đang hoạt động'], ['TAM_KHOA', 'Tạm khóa'], ['NGUNG_HOAT_DONG', 'Ngừng hoạt động'], ['TAM_KHOA_HOAC_NGUNG_HOAT_DONG', 'Bị khóa / ngừng']] } />
      <FilterSelect label="Liên kết hồ sơ" value={linkStatus} onValueChange={(value) => { setLinkStatus(value); setPage(1) }} options={ [['all', 'Tất cả liên kết'], ['linked', 'Đã liên kết'], ['unlinked', 'Chưa liên kết']] } />
      <FilterSelect label="Tình trạng phân quyền" value={assignmentStatus} onValueChange={(value) => { setAssignmentStatus(value); setPage(1) }} options={ [['all', 'Tất cả phân quyền'], ['assigned', 'Có phân quyền'], ['unassigned', 'Chưa phân quyền']] } />
      <Button variant="ghost" onClick={resetFilters} disabled={!keyword && branch === 'all' && status === 'all' && linkStatus === 'all' && assignmentStatus === 'all'}>Đặt lại bộ lọc</Button>
    </div></CardHeader><CardContent className="p-0">
      {loading ? <LoadingRows /> : <div className="overflow-x-auto"><Table className="min-w-[1100px]"><TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead className="w-14">STT</TableHead><TableHead>Họ và tên</TableHead><TableHead>CCCD</TableHead><TableHead>Tên đăng nhập</TableHead><TableHead>Chi bộ</TableHead><TableHead>Trạng thái tài khoản</TableHead><TableActionHead className="w-14 text-right">Thao tác</TableActionHead></TableRow></TableHeader>
        <TableBody>{accounts.map((account, index) => <TableRow key={account.id}><TableCell className="text-muted-foreground">{(safePage - 1) * Number(pageSize) + index + 1}</TableCell><TableCell>{account.profile?.name ?? <span className="text-muted-foreground">Chưa liên kết</span>}</TableCell><TableCell>{account.profile?.cccd ?? '—'}</TableCell><TableCell><button className="text-left font-semibold text-foreground hover:text-primary hover:underline" onClick={() => void openDetail(account)}>{account.login}</button></TableCell><TableCell>{account.profile?.partyBranch ?? '—'}</TableCell><TableCell><StatusBadge status={account.status} /></TableCell><TableActionCell className="text-right"><AccountActions account={account} can={can} canViewSystemLogs={canViewSystemLogs} onView={() => void openDetail(account)} onEdit={() => openEdit(account)} onStatus={(kind) => setConfirmAction({ kind, account })} onReset={() => setResetAccount(account)} onLink={() => setLinkAccount(account)} onHistory={() => void openHistory(account)} onDelete={() => setConfirmAction({ kind: 'delete', account })} /></TableActionCell></TableRow>)}</TableBody>
      </Table></div>}
      {error && <p role="alert" className="px-5 py-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && !accounts.length && <div className="flex flex-col items-center gap-2 px-4 py-14 text-center"><div className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Search className="size-5" /></div><p className="font-medium">Không có tài khoản phù hợp</p><p className="max-w-sm text-sm text-muted-foreground">Danh sách được tải trực tiếp từ cơ sở dữ liệu trong phạm vi quyền của bạn.</p><Button variant="outline" size="sm" onClick={resetFilters}>Đặt lại bộ lọc</Button></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5"><div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>{total.toLocaleString('vi-VN')} tài khoản</span><span aria-hidden="true">·</span><Label htmlFor="accounts-page-size" className="font-normal text-muted-foreground">Số dòng</Label><Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(1) }}><SelectTrigger id="accounts-page-size" className="h-8 w-[82px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span>Trang {safePage} / {totalPages}</span></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={safePage <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft />Trước</Button><Button variant="outline" size="sm" disabled={safePage >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Sau<ChevronRight /></Button></div></div>
    </CardContent></Card>

    <AccountFormSheet open={formOpen} account={editingAccount} availableProfiles={[]} onOpenChange={setFormOpen} onSubmit={saveAccount} canChangeStatus={can('TAI_KHOAN_KHOA_MO_KHOA')} onManageLink={can('TAI_KHOAN_LIEN_KET_HO_SO') ? () => { const account = editingAccount; setFormOpen(false); if (account) setLinkAccount(account) } : undefined} />
    <AccountDetailSheet account={detail} open={Boolean(detailAccount)} onOpenChange={(open) => { if (!open) setDetailAccount(null) }} onEdit={() => { if (detail) { setDetailAccount(null); openEdit(detail) } }} onLink={() => { if (detail) setLinkAccount(detail) }} onHistory={() => { if (detail) void openHistory(detail) }} canManageAssignments={can('PHAN_CONG_VAI_TRO_XEM')} canEdit={can('TAI_KHOAN_SUA_THONG_TIN')} canLink={can('TAI_KHOAN_LIEN_KET_HO_SO')} canViewHistory={canViewSystemLogs && can('NHAT_KY_KIEM_TOAN_XEM')} canViewProfile={can('HO_SO_DANG_VIEN_XEM_TONG_QUAN')} canViewPersonal={can('HO_SO_CA_NHAN_XEM')} canViewSessions={canViewSystemLogs && can('NHAT_KY_BAO_MAT_XEM')} />
    <ProfileLinkSheet account={linkTarget} open={Boolean(linkAccount)} availableProfiles={[]} onOpenChange={(open) => { if (!open) setLinkAccount(null) }} onSave={saveLink} />
    <AccountHistorySheet account={historyTarget} open={Boolean(historyAccount)} onOpenChange={(open) => { if (!open) setHistoryAccount(null) }} />
    <ResetPasswordSheet account={resetTarget} open={Boolean(resetAccount)} onOpenChange={(open) => { if (!open) setResetAccount(null) }} onConfirm={resetPassword} />
    <AccountConfirmDialog action={confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null) }} onConfirm={confirmStatusOrDelete} />
    <AccountImportDialog open={importOpen} onOpenChange={setImportOpen} canLinkProfiles={can('TAI_KHOAN_LIEN_KET_HO_SO')} onImported={reload} onFilter={(kind) => { if (kind === 'all') { setLinkStatus('all'); setStatus('all') } else { setLinkStatus(kind); setStatus('all') }; setPage(1) }} />
  </main>
}

function FilterSelect({ label, value, options, onValueChange }: { label: string; value: string; options: [string, string][]; onValueChange: (value: string) => void }) {
  return <div><Label className="sr-only">{label}</Label><Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent></Select></div>
}

function StatisticFilterCard({ label, children, onClick, active }: { label: string; children: ReactNode; onClick: () => void; active: boolean }) {
  return <button type="button" onClick={onClick} aria-label={`Lọc danh sách: ${label}`} aria-pressed={active} className={`group rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>div]:transition-colors group-hover:[&>div]:border-primary/40 group-hover:[&>div]:bg-accent/30 ${active ? '[&>div]:border-primary/50 [&>div]:bg-accent/20' : ''}`} title="Lọc danh sách theo thống kê này">{children}</button>
}

function AccountActions({ account, can, canViewSystemLogs, onView, onEdit, onStatus, onReset, onLink, onHistory, onDelete }: { account: AccountRecord; can: (permission: string) => boolean; canViewSystemLogs: boolean; onView: () => void; onEdit: () => void; onStatus: (kind: 'lock' | 'unlock' | 'deactivate') => void; onReset: () => void; onLink: () => void; onHistory: () => void; onDelete: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Hành động với ${account.login}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56">
    <DropdownMenuItem onSelect={onView}><CircleUserRound />Xem chi tiết</DropdownMenuItem>
    {can('TAI_KHOAN_SUA_THONG_TIN') && <DropdownMenuItem onSelect={onEdit}><UserRound />Sửa thông tin</DropdownMenuItem>}
    {can('TAI_KHOAN_KHOA_MO_KHOA') && <><DropdownMenuSeparator />{account.status === 'DANG_HOAT_DONG' ? <DropdownMenuItem onSelect={() => onStatus('lock')}><ShieldCheck />Khóa tài khoản</DropdownMenuItem> : account.status === 'TAM_KHOA' ? <DropdownMenuItem onSelect={() => onStatus('unlock')}><ShieldCheck />Mở khóa tài khoản</DropdownMenuItem> : <DropdownMenuItem onSelect={() => onStatus('unlock')}><ShieldCheck />Kích hoạt tài khoản</DropdownMenuItem>}{account.status !== 'NGUNG_HOAT_DONG' && <DropdownMenuItem onSelect={() => onStatus('deactivate')}><UserRoundX />Ngừng hoạt động</DropdownMenuItem>}</>}
    {can('TAI_KHOAN_SUA_THONG_TIN') && <DropdownMenuItem onSelect={onReset}><KeyRound />Đặt lại mật khẩu</DropdownMenuItem>}
    {can('TAI_KHOAN_LIEN_KET_HO_SO') && <DropdownMenuItem onSelect={onLink}><Link2 />{account.profile ? 'Thay đổi liên kết hồ sơ' : 'Liên kết hồ sơ'}</DropdownMenuItem>}
    {can('PHAN_CONG_VAI_TRO_XEM') && <DropdownMenuItem asChild><Link to={`/phan-quyen-tai-khoan?maTaiKhoan=${account.id}`}><ArrowDownUp />Phân quyền tài khoản</Link></DropdownMenuItem>}
    {canViewSystemLogs && can('NHAT_KY_KIEM_TOAN_XEM') && <DropdownMenuItem onSelect={onHistory}><CalendarDays />Xem lịch sử</DropdownMenuItem>}
    {can('TAI_KHOAN_XOA') && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={onDelete}><UserRoundX />Xóa tài khoản</DropdownMenuItem></>}
  </DropdownMenuContent></DropdownMenu>
}

function LoadingRows() { return <div className="space-y-3 p-5" aria-live="polite" aria-label="Đang tải danh sách tài khoản">{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-4 gap-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /><div className="h-4 animate-pulse rounded bg-muted" /><div className="h-4 animate-pulse rounded bg-muted" /><div className="h-4 animate-pulse rounded bg-muted" /></div>)}</div> }
