import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarClock, ChevronLeft, ChevronRight, CircleUserRound, Ellipsis, History, Plus, RefreshCw, Search, ShieldAlert, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { DateTimePicker } from '@/shared/components/date-time'
import { useAuth } from '@/core/auth/auth-context'
import { coQuyenTruyCapNhatKyToanHeThong } from '@/core/auth/system-log-access'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { OrganizationUnitMultiPicker, OrganizationUnitPicker } from '@/shared/components/OrganizationUnitPicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/shared/components/ui/combobox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { LoadingState } from '@/shared/components/LoadingState'
import { accountsApi, type TaiKhoan } from '@/features/accounts/api/accounts.api'
import { authorizationApi, flattenOrganizationTree } from '../api/authorization.api'
import type { AccountOption, AssignmentItem, AssignmentUpdateInput, OrganizationNode, RoleItem } from '../types/authorization.types'

type ScopeKind = 'CAY_DON_VI' | 'DON_VI_CHI_DINH'
import { accountStatusLabel, assignmentState, branchFromAssignments, historyActionLabel, historyResultLabel, historySnapshot, isAssignmentActive, localVnInput, roleState, scopeLabel, scopeText, vnDateTime, vnInputToIso, type AssignmentHistory } from '../services/assignment-formatters'

export function AccountAssignmentsPage() {
  const auth = useAuth()
  const client = useQueryClient()
  const [searchParams] = useSearchParams()
  const linkedAccountId = searchParams.get('maTaiKhoan') ?? ''
  const openedLinkedAccount = useRef('')
  const [keyword, setKeyword] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [roleId, setRoleId] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState('20')
  const [selectedAccount, setSelectedAccount] = useState<TaiKhoan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState('assignments')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AssignmentItem | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  useEffect(() => { const timer = window.setTimeout(() => setSearchTerm(keyword.trim()), 250); return () => window.clearTimeout(timer) }, [keyword])
  const can = (code: string) => (auth.taiKhoan?.quyenDangHoatDong ?? []).includes(code)
  const canViewSystemLogs = coQuyenTruyCapNhatKyToanHeThong(auth.taiKhoan)
  useEffect(() => {
    if (!canViewSystemLogs) {
      setDetailTab('assignments')
      void client.removeQueries({ queryKey: ['authorization', 'assignment-history'] })
    }
  }, [canViewSystemLogs, client])
  const rowsQuery = useQuery({
    queryKey: ['account-assignment-list', linkedAccountId, searchTerm, branchId, roleId, assignmentFilter, page, pageSize],
    queryFn: () => accountsApi.list({ ...(linkedAccountId ? { maTaiKhoan: linkedAccountId } : {}), tuKhoa: searchTerm, ...(branchId !== 'all' ? { maChiBo: branchId } : {}), ...(roleId !== 'all' ? { maVaiTro: roleId } : {}), ...(assignmentFilter !== 'all' ? { coPhanCong: assignmentFilter === 'assigned' ? 'CO' : 'KHONG' } : {}), trang: page, gioiHan: Number(pageSize) }),
  })
  const rolesQuery = useQuery({ queryKey: ['authorization', 'roles'], queryFn: authorizationApi.roles })
  const orgsQuery = useQuery({ queryKey: ['authorization', 'organization-tree'], queryFn: authorizationApi.organizationTree })
  const assignmentsQuery = useQuery({ queryKey: ['authorization', 'assignments', selectedAccount?.maTaiKhoan], queryFn: () => authorizationApi.assignments(selectedAccount!.maTaiKhoan), enabled: detailOpen && !!selectedAccount })
  const historyQuery = useQuery({ queryKey: ['authorization', 'assignment-history', selectedAccount?.maTaiKhoan], queryFn: () => authorizationApi.assignmentHistory(selectedAccount!.maTaiKhoan), enabled: detailOpen && detailTab === 'history' && !!selectedAccount && canViewSystemLogs && can('NHAT_KY_KIEM_TOAN_XEM') })
  const units = useMemo(() => flattenOrganizationTree(orgsQuery.data ?? []).filter((unit) => unit.trangThai === 'DANG_HOAT_DONG'), [orgsQuery.data])
  const unitNames = useMemo(() => new Map(units.map((unit) => [unit.maDonVi, unit.tenDonVi ?? unit.maDinhDanh ?? unit.maDonVi])), [units])
  const availableRoles = useMemo(() => (rolesQuery.data ?? []).filter((role) => role.trangThai === 'DANG_HOAT_DONG' && !role.laVaiTroHeThong), [rolesQuery.data])
  const accounts = rowsQuery.data?.duLieu ?? []
  const total = rowsQuery.data?.phanTrang.tongSo ?? 0
  const pageCount = Math.max(1, Math.ceil(total / Number(pageSize)))
  const branches = rowsQuery.data?.danhMucChiBo ?? []

  useEffect(() => {
    if (!linkedAccountId || !rowsQuery.data || openedLinkedAccount.current === linkedAccountId) return
    openedLinkedAccount.current = linkedAccountId
    const account = rowsQuery.data.duLieu.find((item) => item.maTaiKhoan === linkedAccountId)
    if (account) openDetails(account)
  }, [linkedAccountId, rowsQuery.data])

  const createAssignment = useMutation({
    mutationFn: authorizationApi.createAssignment,
    onSuccess: async () => { toast.success('Đã gán vai trò và ghi nhật ký.'); setEditorOpen(false); await invalidateData() },
    onError: (error) => toast.error(normalizeApiError(error).message),
  })
  const updateAssignment = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignmentUpdateInput }) => authorizationApi.updateAssignment(id, input),
    onSuccess: async () => { toast.success('Đã cập nhật Assignment và lưu lịch sử.'); setEditorOpen(false); setEditingAssignment(null); await invalidateData() },
    onError: (error) => toast.error(normalizeApiError(error).message),
  })
  const revokeAssignment = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => authorizationApi.revokeAssignment(id, reason),
    onSuccess: async () => { toast.success('Đã thu hồi phân quyền và lưu lịch sử.'); setRevokeTarget(null); setRevokeReason(''); setDetailTab(canViewSystemLogs && can('NHAT_KY_KIEM_TOAN_XEM') ? 'history' : 'assignments'); await invalidateData() },
    onError: (error) => toast.error(normalizeApiError(error).message),
  })

  async function invalidateData() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['account-assignment-list'] }),
      client.invalidateQueries({ queryKey: ['authorization', 'assignments', selectedAccount?.maTaiKhoan] }),
      client.invalidateQueries({ queryKey: ['authorization', 'assignment-history', selectedAccount?.maTaiKhoan] }),
    ])
  }

  function openDetails(account: TaiKhoan, tab = 'assignments') {
    setSelectedAccount(account)
    setDetailTab(tab)
    setDetailOpen(true)
  }
  function openGrant(account?: TaiKhoan) {
    setSelectedAccount(account ?? null)
    setEditingAssignment(null)
    setEditorOpen(true)
  }
  function openEdit(item: AssignmentItem) { setEditingAssignment(item); setEditorOpen(true) }
  function resetFilters() { setKeyword(''); setBranchId('all'); setRoleId('all'); setAssignmentFilter('all'); setPage(1) }

  function saveAssignment(input: AssignmentEditorInput) {
    if (editingAssignment) {
      const update: AssignmentUpdateInput = { loaiPhamVi: input.loaiPhamVi, ...(input.loaiPhamVi === 'CAY_DON_VI' ? { maDonViGoc: input.maDonViGoc } : { danhSachMaDonVi: input.danhSachMaDonVi }), ngayHieuLucDen: input.ngayHieuLucDen ?? null, lyDo: input.lyDo }
      updateAssignment.mutate({ id: editingAssignment.maPhanCong, input: update })
    } else createAssignment.mutate(input as Parameters<typeof authorizationApi.createAssignment>[0])
  }

  return <main className="space-y-5 pb-8">
    <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Phân quyền tài khoản</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
    <PageHeader title="Phân quyền tài khoản" description="Quản lý vai trò và phạm vi quyền hạn được phân công cho các tài khoản trong hệ thống." actions={<div className="flex gap-2"><Button variant="outline" onClick={() => { void rowsQuery.refetch(); void rolesQuery.refetch(); void orgsQuery.refetch() }} disabled={rowsQuery.isFetching}><RefreshCw className={rowsQuery.isFetching ? 'animate-spin' : ''} />Làm mới</Button>{can('PHAN_CONG_VAI_TRO_TAO') && <Button onClick={() => openGrant()}><Plus />Gán vai trò</Button>}</div>} />

    <section aria-label="Thống kê phân quyền" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatisticCard label="Tổng tài khoản" value={rowsQuery.isPending ? '—' : (rowsQuery.data?.thongKePhanQuyen.tongTaiKhoan ?? 0).toLocaleString('vi-VN')} icon={<UsersRound className="size-5" />} description="Trong phạm vi được quản lý" />
      <StatisticCard label="Đã phân quyền" value={rowsQuery.isPending ? '—' : (rowsQuery.data?.thongKePhanQuyen.daPhanQuyen ?? 0).toLocaleString('vi-VN')} icon={<UserRoundCheck className="size-5" />} description="Có Assignment đang hiệu lực" />
      <StatisticCard label="Chưa phân quyền" value={rowsQuery.isPending ? '—' : (rowsQuery.data?.thongKePhanQuyen.chuaPhanQuyen ?? 0).toLocaleString('vi-VN')} icon={<UserRoundX className="size-5" />} description="Không có Assignment hiệu lực" />
      <StatisticCard label="Sắp hết hạn" value={rowsQuery.isPending ? '—' : (rowsQuery.data?.thongKePhanQuyen.sapHetHan ?? 0).toLocaleString('vi-VN')} icon={<CalendarClock className="size-5" />} description="Assignment hết hạn trong 30 ngày" />
    </section>

    <Card className="gap-0 py-0"><CardHeader className="border-b px-4 py-4 sm:px-5"><div className="grid gap-3 xl:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(155px,1fr))_auto]">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm tài khoản" className="pl-9" placeholder="Tìm họ tên hoặc tên đăng nhập" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} /></div>
      <OrganizationUnitPicker label="Chi bộ" value={branchId} onValueChange={(value) => { setBranchId(value); setPage(1) }} allOption={{ value: 'all', label: 'Tất cả Chi bộ' }} options={branches.map((branch) => ({ value: branch.ma, label: branch.ten ?? branch.ma }))} placeholder="Tất cả Chi bộ" />
      <FilterSelect label="Vai trò" value={roleId} onValueChange={(value) => { setRoleId(value); setPage(1) }} options={ [['all', 'Tất cả vai trò'], ...availableRoles.map((role) => [role.ma, role.ten] as [string, string])] } />
      <FilterSelect label="Trạng thái phân quyền" value={assignmentFilter} onValueChange={(value) => { setAssignmentFilter(value); setPage(1) }} options={ [['all', 'Tất cả trạng thái'], ['assigned', 'Đã phân quyền'], ['unassigned', 'Chưa phân quyền']] } />
      <Button variant="ghost" disabled={!keyword && branchId === 'all' && roleId === 'all' && assignmentFilter === 'all'} onClick={resetFilters}>Đặt lại bộ lọc</Button>
    </div></CardHeader><CardContent className="p-0">
      {rowsQuery.isPending ? <LoadingState /> : <div className="overflow-x-auto"><Table className="min-w-[1040px]"><TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead className="w-16">STT</TableHead><TableHead>Họ và tên</TableHead><TableHead>Tên đăng nhập</TableHead><TableHead>Chi bộ</TableHead><TableHead>Vai trò</TableHead><TableHead>Trạng thái</TableHead><TableActionHead className="w-16 text-right">Thao tác</TableActionHead></TableRow></TableHeader><TableBody>
        {accounts.map((account, index) => <TableRow key={account.maTaiKhoan}>
          <TableCell className="text-muted-foreground">{(page - 1) * Number(pageSize) + index + 1}</TableCell>
          <TableCell>{account.hoVaTen ?? <span className="text-muted-foreground">Chưa liên kết hồ sơ</span>}</TableCell>
          <TableCell className="font-medium">{account.tenDangNhap}</TableCell>
          <TableCell>{account.chiBoHienTai ?? <span className="text-muted-foreground">—</span>}</TableCell>
          <TableCell>{account.phamViPhanCong.length ? <span>{account.phamViPhanCong[0]?.tenVaiTro}{account.phamViPhanCong.length > 1 && <span className="ml-1 text-sm text-muted-foreground">+{account.phamViPhanCong.length - 1} vai trò</span>}</span> : <span className="text-muted-foreground">Chưa có</span>}</TableCell>
          <TableCell><Badge variant={roleState(account) ? 'success' : 'outline'}>{roleState(account) ? 'Đã phân quyền' : 'Chưa phân quyền'}</Badge></TableCell>
          <TableActionCell className="text-right"><RowActions account={account} can={can} canViewSystemLogs={canViewSystemLogs} onDetail={() => openDetails(account)} onGrant={() => openGrant(account)} onHistory={() => openDetails(account, 'history')} /></TableActionCell>
        </TableRow>)}
      </TableBody></Table></div>}
      {rowsQuery.isError && <p role="alert" className="px-5 py-4 text-sm text-destructive">{normalizeApiError(rowsQuery.error).message}</p>}
      {!rowsQuery.isPending && !rowsQuery.isError && !accounts.length && <div className="px-4 py-14 text-center"><p className="font-medium">Không tìm thấy tài khoản phù hợp</p><p className="mt-1 text-sm text-muted-foreground">Danh sách chỉ bao gồm tài khoản trong phạm vi được cấp.</p></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span>{total.toLocaleString('vi-VN')} tài khoản</span><Label htmlFor="assignment-page-size" className="font-normal text-muted-foreground">Số dòng</Label><Select value={pageSize} onValueChange={(value) => { setPageSize(value); setPage(1) }}><SelectTrigger id="assignment-page-size" className="h-8 w-[82px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span>Trang {page} / {pageCount}</span></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || rowsQuery.isFetching} onClick={() => setPage((value) => value - 1)}><ChevronLeft />Trước</Button><Button variant="outline" size="sm" disabled={page >= pageCount || rowsQuery.isFetching} onClick={() => setPage((value) => value + 1)}>Sau<ChevronRight /></Button></div></div>
    </CardContent></Card>

    <AssignmentDetailSheet account={selectedAccount} open={detailOpen} onOpenChange={setDetailOpen} initialTab={detailTab} assignments={assignmentsQuery.data ?? []} assignmentsLoading={assignmentsQuery.isPending} assignmentsError={assignmentsQuery.isError ? normalizeApiError(assignmentsQuery.error).message : ''} history={historyQuery.data ?? []} historyLoading={historyQuery.isPending} historyError={historyQuery.isError ? normalizeApiError(historyQuery.error).message : ''} unitNames={unitNames} canViewHistory={canViewSystemLogs && can('NHAT_KY_KIEM_TOAN_XEM')} canGrant={can('PHAN_CONG_VAI_TRO_TAO')} canEdit={can('PHAN_CONG_VAI_TRO_SUA')} canRevoke={can('PHAN_CONG_VAI_TRO_THU_HOI')} onGrant={() => openGrant(selectedAccount ?? undefined)} onEdit={openEdit} onRevoke={(item) => { setRevokeTarget(item); setRevokeReason('') }} />
    <AssignmentEditorSheet open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditingAssignment(null) }} account={selectedAccount} assignment={editingAssignment} roles={availableRoles} roleError={rolesQuery.isError ? normalizeApiError(rolesQuery.error).message : ''} units={units} unitsError={orgsQuery.isError ? normalizeApiError(orgsQuery.error).message : ''} saving={createAssignment.isPending || updateAssignment.isPending} onSubmit={saveAssignment} />
    <RevokeAssignmentDialog assignment={revokeTarget} accountName={selectedAccount?.tenDangNhap ?? ''} reason={revokeReason} unitNames={unitNames} onReasonChange={setRevokeReason} pending={revokeAssignment.isPending} onOpenChange={(open) => { if (!open) setRevokeTarget(null) }} onConfirm={() => { if (revokeTarget) revokeAssignment.mutate({ id: revokeTarget.maPhanCong, reason: revokeReason.trim() }) }} />
  </main>
}

type AssignmentEditorInput = { maTaiKhoan: string; maVaiTro: string; loaiPhamVi: ScopeKind; maDonViGoc?: string; danhSachMaDonVi?: string[]; ngayHieuLucTu?: string; ngayHieuLucDen?: string | null; lyDo: string }

function AssignmentEditorSheet({ open, onOpenChange, account, assignment, roles, roleError, units, unitsError, saving, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; account: TaiKhoan | null; assignment: AssignmentItem | null; roles: RoleItem[]; roleError: string; units: Array<OrganizationNode & { level: number }>; unitsError: string; saving: boolean; onSubmit: (input: AssignmentEditorInput) => void
}) {
  const [accountSearch, setAccountSearch] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accountChoice, setAccountChoice] = useState<AccountOption | null>(null)
  const [roleId, setRoleId] = useState('')
  const [scope, setScope] = useState<ScopeKind>('CAY_DON_VI')
  const [rootUnit, setRootUnit] = useState('')
  const [unitIds, setUnitIds] = useState<string[]>([])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const accountOptions = useQuery({ queryKey: ['authorization', 'account-picker', accountSearch], queryFn: () => authorizationApi.searchAccounts(accountSearch), enabled: open && !assignment && !account && accountSearch.trim().length >= 2 })

  useEffect(() => {
    if (!open) return
    setAccountSearch('')
    setAccountId(account?.maTaiKhoan ?? '')
    setAccountChoice(account ? { maTaiKhoan: account.maTaiKhoan, tenDangNhap: account.tenDangNhap, hoVaTen: account.hoVaTen, maHoSoNoiBo: account.hoSoDangVien?.maHoSoNoiBo ?? null, chiBoHienTai: account.chiBoHienTai } : null)
    setRoleId(assignment ? roles.find((role) => role.maDinhDanh === assignment.maVaiTro)?.ma ?? '' : '')
    setScope(assignment?.loaiPhamVi === 'DON_VI_CHI_DINH' ? 'DON_VI_CHI_DINH' : 'CAY_DON_VI')
    setRootUnit(assignment?.maDonViGoc ?? '')
    setUnitIds(assignment?.danhSachMaDonVi ?? [])
    setStart(localVnInput(assignment?.ngayHieuLucTu) || localVnInput(new Date().toISOString()))
    setEnd(localVnInput(assignment?.ngayHieuLucDen))
    setReason('')
    setError('')
  }, [open, account, assignment, roles])

  const accountName = accountChoice?.hoVaTen || accountChoice?.tenDangNhap || account?.tenDangNhap || ''
  const pickedRole = roles.find((role) => role.ma === roleId)
  const endAfterStart = !end || !start || vnInputToIso(end) > vnInputToIso(start)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!assignment && !accountId) return setError('Hãy chọn tài khoản.')
    if (!assignment && !roleId) return setError('Hãy chọn vai trò.')
    if (scope === 'CAY_DON_VI' && !rootUnit) return setError('Hãy chọn đơn vị gốc.')
    if (scope === 'DON_VI_CHI_DINH' && unitIds.length === 0) return setError('Hãy chọn ít nhất một đơn vị.')
    if (!assignment && !start) return setError('Hãy nhập thời điểm bắt đầu hiệu lực.')
    if (!endAfterStart) return setError('Thời điểm kết thúc phải sau thời điểm bắt đầu.')
    if (reason.trim().length < 3) return setError('Lý do cần có ít nhất 3 ký tự.')
    onSubmit({ maTaiKhoan: accountId, maVaiTro: roleId, loaiPhamVi: scope, ...(scope === 'CAY_DON_VI' ? { maDonViGoc: rootUnit } : { danhSachMaDonVi: unitIds }), ...(!assignment ? { ngayHieuLucTu: vnInputToIso(start) } : {}), ngayHieuLucDen: end ? vnInputToIso(end) : null, lyDo: reason.trim() })
  }

  return <StandardSheet
    open={open}
    size="compact"
    onOpenChange={onOpenChange}
    title={assignment ? 'Chỉnh sửa phân quyền' : 'Gán vai trò cho tài khoản'}
    description={assignment ? 'Chỉ sửa phạm vi và thời hạn được Backend cho phép; lịch sử phân quyền vẫn được giữ.' : 'Backend sẽ kiểm tra quyền cấp, vai trò, phạm vi và thời hạn trước khi ghi dữ liệu.'}
    footer={<><Button type="button" variant="outline" className="h-10 px-5" onClick={() => onOpenChange(false)}>Hủy</Button><Button type="submit" form="assignment-form" className="h-10 px-6" disabled={saving || (!assignment && (!roles.length || !units.length))}>{saving ? 'Đang lưu…' : assignment ? 'Lưu thay đổi' : 'Xác nhận gán'}</Button></>}
  >
    <form id="assignment-form" onSubmit={submit} className="contents">
    <section className="space-y-3"><h3 className="text-sm font-semibold">1. Tài khoản</h3>{assignment || account ? <div className="rounded-md bg-muted/40 p-3 text-sm"><p className="font-medium">{accountName}</p><p className="text-muted-foreground">Tên đăng nhập: {accountChoice?.tenDangNhap ?? account?.tenDangNhap} · Chi bộ: {accountChoice?.chiBoHienTai ?? account?.chiBoHienTai ?? '—'}</p></div> : <div className="space-y-2"><Label htmlFor="assignment-account-search">Tìm tài khoản</Label><Combobox items={(accountOptions.data ?? []).map((item) => item.maTaiKhoan)} value={accountId || null} onValueChange={(value) => { const id = typeof value === 'string' ? value : ''; setAccountId(id); setAccountChoice(accountOptions.data?.find((item) => item.maTaiKhoan === id) ?? null) }}><ComboboxInput id="assignment-account-search" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Nhập ít nhất 2 ký tự" showClear /><ComboboxContent><ComboboxList>{(accountOptions.data ?? []).map((item) => <ComboboxItem key={item.maTaiKhoan} value={item.maTaiKhoan}><span className="min-w-0"><span className="block font-medium">{item.hoVaTen ?? 'Chưa liên kết hồ sơ'} · {item.tenDangNhap}</span><span className="text-xs text-muted-foreground">Chi bộ: {item.chiBoHienTai ?? '—'}{item.maHoSoNoiBo ? ` · Mã hồ sơ ${item.maHoSoNoiBo}` : ''}</span></span></ComboboxItem>)}</ComboboxList><ComboboxEmpty>{accountOptions.isFetching ? 'Đang tìm tài khoản…' : 'Không tìm thấy tài khoản trong phạm vi được cấp.'}</ComboboxEmpty></ComboboxContent></Combobox>{accountOptions.isError && <p role="alert" className="text-sm text-destructive">{normalizeApiError(accountOptions.error).message}</p>}</div>}</section>

    <section className="space-y-3"><h3 className="text-sm font-semibold">2. Vai trò</h3>{assignment ? <div className="rounded-md bg-muted/40 p-3 text-sm"><p className="font-medium">{assignment.tenVaiTro}</p><p className="text-muted-foreground">Mã vai trò: {assignment.maVaiTro}</p></div> : <div className="space-y-2"><Label htmlFor="assignment-role">Vai trò đang hoạt động</Label><Select value={roleId} onValueChange={setRoleId}><SelectTrigger id="assignment-role" className="h-10 w-full bg-muted"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role.ma} value={role.ma}>{role.ten} · {role.maDinhDanh}</SelectItem>)}</SelectContent></Select>{roleError && <p role="alert" className="text-sm text-destructive">{roleError}</p>}</div>}<p className="text-xs text-muted-foreground">Vai trò hệ thống không cấp qua API thông thường. Backend kiểm tra từng quyền trong vai trò với phân quyền hiện có.</p></section>

    <section className="space-y-3"><h3 className="text-sm font-semibold">3. Phạm vi áp dụng</h3><div className="space-y-2"><Label>Loại phạm vi</Label><Select value={scope} onValueChange={(value) => { setScope(value as ScopeKind); setRootUnit(''); setUnitIds([]) }}><SelectTrigger className="h-10 w-full bg-muted"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CAY_DON_VI">Cây đơn vị</SelectItem><SelectItem value="DON_VI_CHI_DINH">Đơn vị chỉ định</SelectItem></SelectContent></Select></div>{scope === 'CAY_DON_VI' ? <div className="space-y-2"><Label>Đơn vị gốc</Label><OrganizationUnitPicker label="Đơn vị gốc" value={rootUnit} onValueChange={setRootUnit} options={units.map((unit) => ({ value: unit.maDonVi, label: `${'　'.repeat(unit.level)}${unit.tenDonVi ?? unit.maDinhDanh ?? unit.loaiDonVi}` }))} placeholder="Chọn đơn vị gốc" className="h-10 w-full bg-muted" /><p className="text-xs text-muted-foreground">Áp dụng cho đơn vị gốc và các đơn vị trực thuộc.</p></div> : <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Các đơn vị được chỉ định</legend><OrganizationUnitMultiPicker label="các đơn vị trong phạm vi phân quyền" options={units.map((unit) => ({ value: unit.maDonVi, label: `${'　'.repeat(unit.level)}${unit.tenDonVi ?? unit.maDinhDanh ?? unit.loaiDonVi}` }))} value={unitIds} onValueChange={setUnitIds} /></fieldset>}{unitsError && <p role="alert" className="text-sm text-destructive">{unitsError}</p>}<p className="text-xs text-muted-foreground">Phạm vi cá nhân và toàn hệ thống chỉ thay đổi theo quy trình/quyền quản trị đặc biệt, không cấp từ giao diện thông thường.</p></section>

    <section className="space-y-3"><h3 className="text-sm font-semibold">4. Thời hạn và lý do</h3>{!assignment && <div className="space-y-2"><Label htmlFor="assignment-start">Bắt đầu hiệu lực (giờ Việt Nam)</Label><DateTimePicker id="assignment-start" aria-label="Bắt đầu hiệu lực phân quyền" className="h-10 bg-muted" value={start || undefined} onChange={(value) => setStart(value ?? '')} required clearable={false} /></div>}<div className="space-y-2"><Label htmlFor="assignment-end">Kết thúc hiệu lực (để trống nếu không thời hạn)</Label><DateTimePicker id="assignment-end" aria-label="Kết thúc hiệu lực phân quyền" className="h-10 bg-muted" value={end || undefined} onChange={(value) => setEnd(value ?? '')} /></div><div className="space-y-2"><Label htmlFor="assignment-reason">Lý do</Label><Input id="assignment-reason" className="h-10 bg-muted" required minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do giao hoặc thay đổi phân quyền" /></div></section>

    <section className="rounded-md bg-muted/40 p-4 text-sm"><h3 className="mb-2 font-semibold">Tóm tắt phân công</h3><p>Tài khoản: {accountName || 'Chưa chọn'}</p><p>Role: {pickedRole?.ten ?? assignment?.tenVaiTro ?? 'Chưa chọn'}</p><p>Permission: {pickedRole?.quyen.length ? pickedRole.quyen.map(({ quyen }) => `${quyen.ten} (${quyen.maDinhDanh})`).join(', ') : assignment?.danhSachMaQuyen.join(', ') || 'Chưa chọn Role'}</p><p>Loại Scope: {scopeLabel(scope)}</p><p>Đơn vị áp dụng: {scope === 'CAY_DON_VI' ? (units.find((unit) => unit.maDonVi === rootUnit)?.tenDonVi ?? 'Chưa chọn đơn vị gốc') : `${unitIds.length} đơn vị được chỉ định`}</p><p>Thời hạn: {end ? vnDateTime(vnInputToIso(end)) : 'Không thời hạn'}</p></section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </StandardSheet>
}

function AssignmentDetailSheet({ account, open, onOpenChange, initialTab, assignments, assignmentsLoading, assignmentsError, history, historyLoading, historyError, unitNames, canViewHistory, canGrant, canEdit, canRevoke, onGrant, onEdit, onRevoke }: {
  account: TaiKhoan | null; open: boolean; onOpenChange: (open: boolean) => void; initialTab: string; assignments: AssignmentItem[]; assignmentsLoading: boolean; assignmentsError: string; history: AssignmentHistory[]; historyLoading: boolean; historyError: string; unitNames: Map<string, string>; canViewHistory: boolean; canGrant: boolean; canEdit: boolean; canRevoke: boolean; onGrant: () => void; onEdit: (item: AssignmentItem) => void; onRevoke: (item: AssignmentItem) => void
}) {
  const [tab, setTab] = useState(initialTab)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const visibleAssignments = useMemo(() => assignments.filter((item) => !item.thuHoiLuc), [assignments])
  useEffect(() => { setTab(initialTab) }, [initialTab, account])
  useEffect(() => {
    if (!visibleAssignments.some((item) => item.maPhanCong === selectedAssignmentId)) setSelectedAssignmentId('')
  }, [visibleAssignments, selectedAssignmentId])
  const selectedAssignment = visibleAssignments.find((item) => item.maPhanCong === selectedAssignmentId) ?? null
  const canChangeSelected = selectedAssignment ? isMutableAssignment(selectedAssignment) : false
  return <StandardSheet
    open={open}
    size="detail"
    onOpenChange={onOpenChange}
    title={<span className="flex flex-wrap items-center gap-2">Chi tiết phân quyền tài khoản<Badge className="shrink-0" variant={account && roleState(account) ? 'success' : 'outline'}>{account && roleState(account) ? 'Đã phân quyền' : 'Chưa phân quyền'}</Badge></span>}
    description={`${account?.hoVaTen ?? 'Chưa liên kết hồ sơ'} · ${account?.tenDangNhap ?? ''}`}
    bodyClassName="space-y-0 p-0"
    footerClassName="sm:justify-between"
    footer={<><div className="min-w-0 text-xs text-muted-foreground">{selectedAssignment ? <>Đang chọn: <span className="font-medium text-foreground">{selectedAssignment.tenVaiTro}</span> · {scopeText(selectedAssignment, unitNames)}</> : 'Chọn một phân quyền để chỉnh sửa hoặc thu hồi.'}</div><div className="flex flex-wrap justify-end gap-2">{canGrant && <Button variant="outline" onClick={onGrant}><Plus />Gán vai trò</Button>}{canEdit && <Button variant="outline" disabled={!canChangeSelected} onClick={() => selectedAssignment && onEdit(selectedAssignment)}>Chỉnh sửa phân quyền</Button>}{canRevoke && <Button variant="destructive" disabled={!canChangeSelected} onClick={() => selectedAssignment && onRevoke(selectedAssignment)}>Thu hồi phân quyền</Button>}<Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button></div></>}
  >
    <Tabs value={tab} onValueChange={setTab} className="min-h-full gap-0"><TabsList variant="line" className="sticky top-0 z-10 w-full justify-start border-b bg-background px-6"><TabsTrigger value="assignments">Vai trò được phân công</TabsTrigger>{canViewHistory && <TabsTrigger value="history">Lịch sử phân quyền</TabsTrigger>}</TabsList><TabsContent value="assignments" className="space-y-6 px-6 py-5">
    {account && <section className="space-y-3"><h3 className="text-sm font-semibold">Thông tin tài khoản</h3><div className="grid gap-x-8 gap-y-3 border-b pb-4 sm:grid-cols-2"><Info label="Mã tài khoản" value={account.maTaiKhoan} /><Info label="Họ và tên" value={account.hoVaTen ?? 'Chưa liên kết hồ sơ'} /><Info label="Tên đăng nhập" value={account.tenDangNhap} /><Info label="Chi bộ hiện tại" value={(account.chiBoHienTai ?? branchFromAssignments(assignments)) || 'Chưa xác định — chưa liên kết hồ sơ'} /><Info label="Trạng thái tài khoản" value={accountStatusLabel(account.trangThai)} /><Info label="Liên kết hồ sơ" value={account.hoSoDangVien ? `Đã liên kết · ${account.hoSoDangVien.maHoSoNoiBo}` : 'Chưa liên kết hồ sơ'} /></div></section>}
    <section className="space-y-3"><h3 className="text-sm font-semibold">Vai trò được phân công</h3>{assignmentsLoading ? <LoadingState /> : assignmentsError ? <p role="alert" className="text-sm text-destructive">{assignmentsError}</p> : visibleAssignments.length ? <div className="space-y-3">{visibleAssignments.map((item) => <AssignmentCard key={item.maPhanCong} item={item} unitNames={unitNames} selected={item.maPhanCong === selectedAssignmentId} onSelect={() => setSelectedAssignmentId(item.maPhanCong)} />)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Tài khoản chưa có phân quyền đang được giao. Các phân quyền đã thu hồi được lưu trong tab Lịch sử phân quyền.</p>}</section>
  </TabsContent><TabsContent value="history" className="px-6 py-5">{historyLoading ? <LoadingState /> : historyError ? <p role="alert" className="text-sm text-destructive">{historyError}</p> : history.length ? <div className="divide-y">{history.map((entry, index) => <HistoryRow key={`${entry.maDoiTuong}-${entry.thoiDiem}-${index}`} item={entry} assignments={assignments} />)}</div> : <p className="py-10 text-center text-sm text-muted-foreground">Chưa có lịch sử phân quyền trong phạm vi được xem.</p>}</TabsContent></Tabs>
  </StandardSheet>
}

function isMutableAssignment(item: AssignmentItem) {
  return isAssignmentActive(item) && !item.laVaiTroHeThong && (item.loaiPhamVi === 'CAY_DON_VI' || item.loaiPhamVi === 'DON_VI_CHI_DINH')
}

function AssignmentCard({ item, unitNames, selected, onSelect }: { item: AssignmentItem; unitNames: Map<string, string>; selected: boolean; onSelect: () => void }) {
  const status = assignmentState(item)
  return <section className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="font-semibold">{item.tenVaiTro}</h4><p className="mt-1 text-sm text-muted-foreground">Mã Role: <span className="font-mono">{item.maVaiTro}</span></p></div><div className="flex items-center gap-2"><Badge className="shrink-0" variant={status === 'Đang có hiệu lực' ? 'success' : 'outline'}>{status}</Badge><Button size="sm" variant={selected ? 'secondary' : 'outline'} aria-pressed={selected} onClick={onSelect}>{selected ? 'Đang chọn' : 'Chọn'}</Button></div></div><div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2"><Info label="Scope" value={scopeLabel(item.loaiPhamVi)} /><Info label="Đơn vị áp dụng" value={scopeText(item, unitNames)} /><Info label="Permission của Role" value={item.danhSachMaQuyen.join(', ') || 'Role chưa có Permission'} /><Info label="Bắt đầu hiệu lực" value={vnDateTime(item.ngayHieuLucTu)} /><Info label="Kết thúc hiệu lực" value={vnDateTime(item.ngayHieuLucDen)} /><Info label="Người cấp" value={item.tenNguoiCap ?? item.maNguoiCap ?? 'Không ghi nhận'} /><Info label="Thời gian cấp" value={vnDateTime(item.ngayTao)} /></div>{item.lyDo && <p className="text-sm text-muted-foreground">Lý do: {item.lyDo}</p>}{item.thuHoiLuc && <p className="text-sm text-muted-foreground">Thu hồi lúc {vnDateTime(item.thuHoiLuc)}{item.tenNguoiThuHoi ? ` bởi ${item.tenNguoiThuHoi}` : ''}</p>}{item.laVaiTroHeThong && <p className="text-xs text-muted-foreground">Role hệ thống được quản lý bằng quy trình vận hành có kiểm soát.</p>}</section>
}

function RevokeAssignmentDialog({ assignment, accountName, reason, unitNames, onReasonChange, pending, onOpenChange, onConfirm }: { assignment: AssignmentItem | null; accountName: string; reason: string; unitNames: Map<string, string>; onReasonChange: (value: string) => void; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <AlertDialog open={Boolean(assignment)} onOpenChange={onOpenChange}><AlertDialogContent className="gap-5 sm:max-w-2xl"><AlertDialogHeader className="space-y-4 text-left"><AlertDialogTitle className="flex items-center gap-3 text-xl"><ShieldAlert className="size-6 shrink-0 text-destructive" aria-hidden="true" />Thu hồi vai trò</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-3 text-base leading-7"><p>Tài khoản <strong className="font-semibold text-foreground">{accountName}</strong> sẽ không còn được sử dụng vai trò <strong className="font-semibold text-foreground">“{assignment?.tenVaiTro}”</strong> trong phạm vi <strong className="font-semibold text-foreground">{assignment ? scopeText(assignment, unitNames) : ''}</strong>.</p><p>Thao tác này sẽ được ghi vào nhật ký kiểm toán. Lịch sử phân công vai trò vẫn được lưu giữ.</p></div></AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="assignment-revoke-reason">Lý do thu hồi</Label><Textarea id="assignment-revoke-reason" value={reason} onChange={(event) => onReasonChange(event.target.value)} minLength={3} maxLength={1000} required rows={4} className="min-h-32 resize-y" placeholder="Nhập lý do thu hồi vai trò..." /></div><AlertDialogFooter className="flex-row justify-end"><AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending || reason.trim().length < 3} onClick={(event) => { event.preventDefault(); onConfirm() }}>{pending ? 'Đang thu hồi…' : 'Xác nhận thu hồi'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}

function RowActions({ account, can, canViewSystemLogs, onDetail, onGrant, onHistory }: { account: TaiKhoan; can: (code: string) => boolean; canViewSystemLogs: boolean; onDetail: () => void; onGrant: () => void; onHistory: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Hành động với ${account.tenDangNhap}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onDetail}><CircleUserRound />Xem chi tiết</DropdownMenuItem>{can('PHAN_CONG_VAI_TRO_TAO') && <DropdownMenuItem onSelect={onGrant}><Plus />Gán vai trò</DropdownMenuItem>}{canViewSystemLogs && can('NHAT_KY_KIEM_TOAN_XEM') && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={onHistory}><History />Xem lịch sử</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
}

function FilterSelect({ label, value, options, onValueChange }: { label: string; value: string; options: [string, string][]; onValueChange: (value: string) => void }) {
  return <div><Label className="sr-only">{label}</Label><Select value={value} onValueChange={onValueChange}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent></Select></div>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div> }

function HistoryRow({ item, assignments, unitNames = new Map() }: { item: AssignmentHistory; assignments: AssignmentItem[]; unitNames?: Map<string, string> }) {
  const assignment = assignments.find(({ maPhanCong }) => maPhanCong === item.maDoiTuong)
  const before = historySnapshot(item.duLieuTruoc, assignment, unitNames)
  const after = historySnapshot(item.duLieuSau, assignment, unitNames)
  const details = before && after ? `Trước: ${before} · Sau: ${after}` : after ? `Thông tin: ${after}` : before ? `Trước khi thay đổi: ${before}` : ''
  return <div className="space-y-1 py-4 text-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{historyActionLabel(item.hanhDong)}</p><p className="text-muted-foreground">Vai trò: {assignment?.tenVaiTro ?? 'Không còn thông tin vai trò'}{assignment ? ` · Phạm vi: ${scopeLabel(assignment.loaiPhamVi)}` : ''}</p></div><Badge variant={item.ketQua === 'THANH_CONG' ? 'success' : 'destructive'}>{historyResultLabel(item.ketQua)}</Badge></div>{details && <p className="break-words text-muted-foreground">{details}</p>}{item.lyDo && <p>Lý do: {item.lyDo}</p>}<p className="text-xs text-muted-foreground">{vnDateTime(item.thoiDiem)} · {item.tenNguoiThucHien}</p></div>
}
