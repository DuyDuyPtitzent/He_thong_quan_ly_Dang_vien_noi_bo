import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Building2, ChevronRight, CircleHelp, FolderTree, Landmark, List, LoaderCircle,
  Network, Pencil, Plus, RefreshCw, Search, ShieldCheck, UsersRound,
} from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { Badge } from '@/shared/components/ui/badge'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  lamPhangCayDonVi, organizationsApi,
  type DonViTrongCay, type LoaiDonVi,
  type TrangThaiDonVi,
} from './organizations.api'

const maDonViGoc = 'PTIT_DANG_UY'
const tenDonViGoc = 'Đảng ủy Học viện Công nghệ Bưu chính Viễn thông'
const cayRong: DonViTrongCay[] = []
const tenLoaiDonVi: Record<LoaiDonVi, string> = { DANG_UY: 'Đảng ủy', CHI_BO: 'Chi bộ', TO: 'Tổ' }
const tenTrangThai: Record<TrangThaiDonVi, string> = {
  DANG_HOAT_DONG: 'Đang hoạt động',
  TAM_NGUNG: 'Tạm ngừng',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
}
const cacTrangThai: TrangThaiDonVi[] = ['DANG_HOAT_DONG', 'TAM_NGUNG', 'NGUNG_HOAT_DONG']

type KieuCuaSo = 'tao-goc' | 'tao' | 'sua' | 'doi-ten' | 'doi-don-vi-cha' | 'doi-trang-thai' | null
type XacNhan = { loai: 'trang-thai'; trangThai: TrangThaiDonVi } | { loai: 'xoa' } | null

function ngayHomNay() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function mocHieuLuc(ngay: string) {
  return `${ngay}T00:00:00+07:00`
}

function nhanLoi(error: unknown) {
  return normalizeApiError(error).message
}

function HuyHieuTrangThai({ trangThai }: { trangThai: TrangThaiDonVi }) {
  const variant = trangThai === 'DANG_HOAT_DONG' ? 'success' : trangThai === 'TAM_NGUNG' ? 'outline' : 'destructive'
  return <Badge variant={variant}>{tenTrangThai[trangThai]}</Badge>
}

function BieuTuongDonVi({ loai }: { loai: LoaiDonVi }) {
  const Icon = loai === 'DANG_UY' ? Landmark : loai === 'CHI_BO' ? Network : UsersRound
  return <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
}

function LocCay({
  nodes, tuKhoa, loai, trangThai,
}: {
  nodes: DonViTrongCay[]
  tuKhoa: string
  loai: 'TAT_CA' | LoaiDonVi
  trangThai: 'TAT_CA' | TrangThaiDonVi
}): DonViTrongCay[] {
  const needle = tuKhoa.trim().toLocaleLowerCase('vi')
  return nodes.flatMap((node) => {
    const donViCon = LocCay({ nodes: node.donViCon ?? [], tuKhoa, loai, trangThai })
    const khopTuKhoa = !needle || `${node.tenDonVi ?? ''} ${node.maDinhDanh ?? ''}`.toLocaleLowerCase('vi').includes(needle)
    const khopLoai = loai === 'TAT_CA' || node.loaiDonVi === loai
    const khopTrangThai = trangThai === 'TAT_CA' || node.trangThai === trangThai
    if ((khopTuKhoa && khopLoai && khopTrangThai) || donViCon.length > 0) return [{ ...node, donViCon }]
    return []
  })
}

function DonViTree({
  nodes, selectedId, onSelect,
}: {
  nodes: DonViTrongCay[]
  selectedId: string
  onSelect: (node: DonViTrongCay) => void
}) {
  if (!nodes.length) return <p className="px-3 py-8 text-center text-sm text-muted-foreground">Không tìm thấy đơn vị phù hợp.</p>
  return <div className="space-y-1">{nodes.map((node) => <DonViTreeNode key={node.maDonVi} node={node} selectedId={selectedId} onSelect={onSelect} />)}</div>
}

function DonViTreeNode({
  node, selectedId, onSelect,
}: {
  node: DonViTrongCay
  selectedId: string
  onSelect: (node: DonViTrongCay) => void
}) {
  const hasChildren = node.donViCon.length > 0
  return (
    <Collapsible defaultOpen={node.loaiDonVi !== 'TO'}>
      <div className="flex min-w-0 items-center gap-1">
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="group/collapsible" aria-label={`Mở hoặc thu gọn ${node.tenDonVi ?? tenLoaiDonVi[node.loaiDonVi]}`}>
              <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </Button>
          </CollapsibleTrigger>
        ) : <span className="size-8 shrink-0" aria-hidden="true" />}
        <Button
          type="button"
          variant={selectedId === node.maDonVi ? 'secondary' : 'ghost'}
          className="h-auto min-h-9 min-w-0 flex-1 justify-start gap-2 px-2 py-2 text-left"
          aria-current={selectedId === node.maDonVi ? 'true' : undefined}
          onClick={() => onSelect(node)}
        >
          <BieuTuongDonVi loai={node.loaiDonVi} />
          <span className="min-w-0 flex-1 truncate">{node.tenDonVi ?? 'Đơn vị chưa có tên'}</span>
          {node.trangThai !== 'DANG_HOAT_DONG' && <HuyHieuTrangThai trangThai={node.trangThai} />}
        </Button>
      </div>
      {hasChildren && <CollapsibleContent><div className="ml-4 border-l pl-2"><DonViTree nodes={node.donViCon} selectedId={selectedId} onSelect={onSelect} /></div></CollapsibleContent>}
    </Collapsible>
  )
}

export function OrganizationsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'cay' | 'danh-sach'>('cay')
  const [chiTietTab, setChiTietTab] = useState('tong-quan')
  const [tuKhoa, setTuKhoa] = useState('')
  const [loaiLoc, setLoaiLoc] = useState<'TAT_CA' | LoaiDonVi>('TAT_CA')
  const [trangThaiLoc, setTrangThaiLoc] = useState<'TAT_CA' | TrangThaiDonVi>('TAT_CA')
  const [trang, setTrang] = useState(1)
  const [maDonViDangChon, setMaDonViDangChon] = useState('')
  const [cuaSo, setCuaSo] = useState<KieuCuaSo>(null)
  const [xacNhan, setXacNhan] = useState<XacNhan>(null)
  const [tenMoi, setTenMoi] = useState('')
  const [maMoi, setMaMoi] = useState('')
  const [loaiMoi, setLoaiMoi] = useState<LoaiDonVi>('CHI_BO')
  const [maChaMoi, setMaChaMoi] = useState('')
  const [ngayHieuLuc, setNgayHieuLuc] = useState(ngayHomNay())
  const [trangThaiDich, setTrangThaiDich] = useState<TrangThaiDonVi>('TAM_NGUNG')

  const treeQuery = useQuery({ queryKey: ['organizations', 'tree'], queryFn: organizationsApi.cay })
  const nodes = treeQuery.data ?? cayRong
  const flatNodes = useMemo(() => lamPhangCayDonVi(nodes), [nodes])
  const filteredTree = useMemo(() => LocCay({ nodes, tuKhoa, loai: loaiLoc, trangThai: trangThaiLoc }), [nodes, tuKhoa, loaiLoc, trangThaiLoc])
  const listQuery = useQuery({
    queryKey: ['organizations', 'list', trang, loaiLoc, trangThaiLoc, tuKhoa],
    queryFn: () => organizationsApi.danhSach({
      trang, gioiHan: 20,
      ...(loaiLoc === 'TAT_CA' ? {} : { loaiDonVi: loaiLoc }),
      ...(trangThaiLoc === 'TAT_CA' ? {} : { trangThai: trangThaiLoc }),
      ...(tuKhoa.trim() ? { tuKhoa: tuKhoa.trim() } : {}),
    }),
    enabled: view === 'danh-sach',
  })

  useEffect(() => {
    if (treeQuery.isFetching) return
    if (!maDonViDangChon && nodes[0]) setMaDonViDangChon(nodes[0].maDonVi)
    if (maDonViDangChon && !flatNodes.some((item) => item.maDonVi === maDonViDangChon) && nodes[0]) setMaDonViDangChon(nodes[0].maDonVi)
    if (!nodes.length) setMaDonViDangChon('')
  }, [nodes, flatNodes, maDonViDangChon, treeQuery.isFetching])

  const detailQuery = useQuery({
    queryKey: ['organizations', 'unit', maDonViDangChon],
    queryFn: () => organizationsApi.chiTiet(maDonViDangChon),
    enabled: Boolean(maDonViDangChon),
  })
  const historyQuery = useQuery({
    queryKey: ['organizations', 'relationships', maDonViDangChon],
    queryFn: () => organizationsApi.lichSuQuanHe(maDonViDangChon),
    enabled: Boolean(maDonViDangChon) && chiTietTab === 'lich-su',
  })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['organizations', 'tree'] }),
      queryClient.invalidateQueries({ queryKey: ['organizations', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['organizations', 'unit'] }),
      queryClient.invalidateQueries({ queryKey: ['organizations', 'relationships'] }),
    ])
  }
  const afterMutation = async (message: string, id?: string) => {
    if (id) setMaDonViDangChon(id)
    setCuaSo(null)
    await refresh()
    toast.success(message)
  }
  const mutationError = (error: unknown) => toast.error(nhanLoi(error))

  const createMutation = useMutation({ mutationFn: organizationsApi.tao, onSuccess: (data) => afterMutation('Đã tạo đơn vị thành công.', data.maDonVi), onError: mutationError })
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: { maDinhDanh?: string | null; loaiDonVi?: LoaiDonVi } }) => organizationsApi.sua(id, input), onSuccess: () => afterMutation('Đã cập nhật thông tin đơn vị.', maDonViDangChon), onError: mutationError })
  const renameMutation = useMutation({ mutationFn: ({ id, tenDonVi, ngay }: { id: string; tenDonVi: string; ngay: string }) => organizationsApi.doiTen(id, { tenDonVi, ngayHieuLucTu: mocHieuLuc(ngay) }), onSuccess: () => afterMutation('Đã đổi tên đơn vị và ghi nhận hiệu lực.', maDonViDangChon), onError: mutationError })
  const parentMutation = useMutation({ mutationFn: ({ id, maDonViCha, ngay }: { id: string; maDonViCha: string; ngay: string }) => organizationsApi.doiQuanHeCha(id, { maDonViCha, ngayHieuLucTu: mocHieuLuc(ngay) }), onSuccess: () => afterMutation('Đã cập nhật đơn vị cấp trên.', maDonViDangChon), onError: mutationError })
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: TrangThaiDonVi }) => organizationsApi.doiTrangThai(id, status), onSuccess: async () => { await afterMutation('Đã cập nhật trạng thái đơn vị.', maDonViDangChon); setXacNhan(null) }, onError: mutationError })
  const deleteMutation = useMutation({ mutationFn: organizationsApi.xoa, onSuccess: async () => { setMaDonViDangChon(''); await refresh(); setXacNhan(null); toast.success('Đã xóa đơn vị.') }, onError: mutationError })

  const selected = detailQuery.data ?? flatNodes.find((node) => node.maDonVi === maDonViDangChon) ?? null
  const selectedNode = flatNodes.find((node) => node.maDonVi === maDonViDangChon) ?? null
  const parentNode = selectedNode ? flatNodes.find((node) => node.donViCon.some((child) => child.maDonVi === selectedNode.maDonVi)) : null
  const selectedParentId = selected ? ('maDonViCha' in selected ? selected.maDonViCha : parentNode?.maDonVi ?? null) : null
  const visibleChildren = selectedNode?.donViCon ?? []
  const directChildren = visibleChildren.map((unit) => flatNodes.find((node) => node.maDonVi === unit.maDonVi)).filter((item): item is (DonViTrongCay & { level: number }) => Boolean(item))
  const stats = flatNodes.reduce((result, node) => {
    result[node.loaiDonVi] += 1
    if (node.trangThai === 'DANG_HOAT_DONG') result.active += 1
    return result
  }, { DANG_UY: 0, CHI_BO: 0, TO: 0, active: 0 })
  const parentOptions = flatNodes.filter((node) => node.loaiDonVi === 'DANG_UY' || node.loaiDonVi === 'CHI_BO')
  const danhSachTrang = listQuery.data?.phanTrang
  const listPages = Math.max(1, Math.ceil((danhSachTrang?.tongSo ?? 0) / (danhSachTrang?.gioiHan ?? 20)))

  function moTaoDonVi() {
    const selectedParent = selectedNode ? flatNodes.find((node) => node.donViCon.some((child) => child.maDonVi === selectedNode.maDonVi)) : null
    const parent = selectedNode?.loaiDonVi === 'CHI_BO'
      ? selectedNode
      : selectedNode?.loaiDonVi === 'TO'
        ? selectedParent
        : selectedNode ?? flatNodes.find((node) => node.loaiDonVi === 'DANG_UY')
    const validParent = parent?.loaiDonVi === 'DANG_UY' || parent?.loaiDonVi === 'CHI_BO' ? parent : null
    const type = validParent?.loaiDonVi === 'DANG_UY' ? 'CHI_BO' : 'TO'
    setTenMoi('')
    setMaMoi('')
    setLoaiMoi(type)
    setMaChaMoi(validParent?.maDonVi ?? '')
    setNgayHieuLuc(ngayHomNay())
    setCuaSo('tao')
  }

  function moTaoGoc() {
    setTenMoi(tenDonViGoc)
    setMaMoi(maDonViGoc)
    setLoaiMoi('DANG_UY')
    setMaChaMoi('')
    setNgayHieuLuc(ngayHomNay())
    setCuaSo('tao-goc')
  }

  function moSua() {
    if (!selected) return
    setMaMoi(selected.maDinhDanh ?? '')
    setLoaiMoi(selected.loaiDonVi)
    setCuaSo('sua')
  }

  function moDoiTen() {
    if (!selected) return
    setTenMoi(selected.tenDonVi ?? '')
    setNgayHieuLuc(ngayHomNay())
    setCuaSo('doi-ten')
  }

  function moDoiDonViCha() {
    if (!selected || selected.loaiDonVi === 'DANG_UY') return
    setMaChaMoi(selectedParentId ?? '')
    setNgayHieuLuc(ngayHomNay())
    setCuaSo('doi-don-vi-cha')
  }

  function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (cuaSo === 'tao-goc') {
      createMutation.mutate({ loaiDonVi: 'DANG_UY', maDinhDanh: maDonViGoc, tenDonVi: tenDonViGoc, trangThai: 'DANG_HOAT_DONG', ngayHieuLucTu: mocHieuLuc(ngayHieuLuc) })
    } else if (cuaSo === 'tao') {
      if (!maChaMoi) return toast.error('Hãy chọn đơn vị cấp trên.')
      const parent = flatNodes.find((node) => node.maDonVi === maChaMoi)
      if (!parent) return toast.error('Đơn vị cấp trên không còn trong cây hiện tại. Hãy làm mới dữ liệu.')
      createMutation.mutate({ loaiDonVi: parent.loaiDonVi === 'DANG_UY' ? 'CHI_BO' : 'TO', maDinhDanh: maMoi.trim() || undefined, tenDonVi: tenMoi.trim(), maDonViCha: parent.maDonVi, ngayHieuLucTu: mocHieuLuc(ngayHieuLuc) })
    } else if (cuaSo === 'sua' && selected) {
      updateMutation.mutate({ id: selected.maDonVi, input: { maDinhDanh: maMoi.trim() || null, loaiDonVi: loaiMoi } })
    } else if (cuaSo === 'doi-ten' && selected) {
      renameMutation.mutate({ id: selected.maDonVi, tenDonVi: tenMoi.trim(), ngay: ngayHieuLuc })
    } else if (cuaSo === 'doi-don-vi-cha' && selected) {
      parentMutation.mutate({ id: selected.maDonVi, maDonViCha: maChaMoi, ngay: ngayHieuLuc })
    } else if (cuaSo === 'doi-trang-thai') {
      setCuaSo(null)
      setXacNhan({ loai: 'trang-thai', trangThai: trangThaiDich })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending || renameMutation.isPending || parentMutation.isPending
  const treeError = treeQuery.error ? nhanLoi(treeQuery.error) : ''
  const detailError = detailQuery.error ? nhanLoi(detailQuery.error) : ''

  return (
    <div className="space-y-5">
      <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Trang chủ</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><span>Cấu hình hệ thống</span></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Cơ cấu tổ chức</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-3">
          <Building2 aria-hidden="true" className="size-8 shrink-0 text-primary" />
          <div><h1 className="text-2xl font-semibold tracking-tight">Quản lý cơ cấu tổ chức</h1><p className="text-sm text-muted-foreground">Đảng ủy, Chi bộ và Tổ trong phạm vi bạn được giao quản lý.</p></div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-44 space-y-1"><Label htmlFor="filter-type">Loại đơn vị</Label><Select value={loaiLoc} onValueChange={(value) => { setLoaiLoc(value as typeof loaiLoc); setTrang(1) }}><SelectTrigger id="filter-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TAT_CA">Tất cả loại</SelectItem>{Object.entries(tenLoaiDonVi).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-44 space-y-1"><Label htmlFor="filter-status">Trạng thái</Label><Select value={trangThaiLoc} onValueChange={(value) => { setTrangThaiLoc(value as typeof trangThaiLoc); setTrang(1) }}><SelectTrigger id="filter-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TAT_CA">Tất cả trạng thái</SelectItem>{cacTrangThai.map((value) => <SelectItem key={value} value={value}>{tenTrangThai[value]}</SelectItem>)}</SelectContent></Select></div>
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={treeQuery.isFetching || listQuery.isFetching}><RefreshCw className={treeQuery.isFetching || listQuery.isFetching ? 'animate-spin' : ''} />Làm mới</Button>
          {nodes.length > 0 && <Button type="button" onClick={moTaoDonVi}><Plus />Thêm đơn vị</Button>}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard label="Đảng ủy trong phạm vi" value={stats.DANG_UY} icon={<Landmark aria-hidden="true" />} />
        <StatisticCard label="Chi bộ trong phạm vi" value={stats.CHI_BO} icon={<Network aria-hidden="true" />} />
        <StatisticCard label="Tổ trong phạm vi" value={stats.TO} icon={<UsersRound aria-hidden="true" />} />
        <StatisticCard label="Đơn vị đang hoạt động" value={stats.active} icon={<ShieldCheck aria-hidden="true" />} />
      </div>

      {treeError && <Card role="alert"><CardContent className="flex items-start gap-3 p-4"><CircleHelp className="mt-0.5 size-5 text-destructive" /><div><p className="font-medium">Không tải được cây tổ chức</p><p className="text-sm text-muted-foreground">{treeError}</p></div><Button className="ml-auto" variant="outline" onClick={() => void treeQuery.refetch()}>Thử lại</Button></CardContent></Card>}

      {!treeError && treeQuery.isPending && <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.32fr)_minmax(0,0.68fr)]"><Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-4/5" /></CardContent></Card><Card><CardHeader><Skeleton className="h-7 w-2/5" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-32 w-full" /></CardContent></Card></div>}

      {!treeError && !treeQuery.isPending && !nodes.length && (
        <Card>
          <CardHeader><CardTitle>Chưa có đơn vị trong cây tổ chức</CardTitle><CardDescription>Quản trị viên toàn hệ thống có thể tạo Đảng ủy gốc theo thông tin đã được phê duyệt. Đơn vị gốc không cần được tạo sẵn để mở màn hình này.</CardDescription></CardHeader>
          <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center"><div className="flex-1 rounded-md bg-muted p-4 text-sm"><p><span className="font-medium">Mã đơn vị:</span> {maDonViGoc}</p><p><span className="font-medium">Tên đơn vị:</span> {tenDonViGoc}</p><p><span className="font-medium">Loại:</span> Đảng ủy · <span className="font-medium">Trạng thái:</span> Đang hoạt động · <span className="font-medium">Đơn vị cha:</span> Không có</p></div><Button onClick={moTaoGoc}><Plus />Tạo Đảng ủy gốc</Button></CardContent>
        </Card>
      )}

      {!treeError && !treeQuery.isPending && nodes.length > 0 && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.34fr)_minmax(0,0.66fr)]">
          <Card className="min-w-0">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3"><div><CardTitle>Cấu trúc đơn vị</CardTitle><CardDescription>Chọn một đơn vị để xem thông tin.</CardDescription></div><Badge variant="outline">{flatNodes.length} đơn vị</Badge></div>
              <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm theo tên hoặc mã đơn vị" className="pl-9" placeholder="Tìm theo tên hoặc mã đơn vị" value={tuKhoa} onChange={(event) => { setTuKhoa(event.target.value); setTrang(1) }} /></div>
              <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
                <TabsList variant="line" className="w-full justify-start border-b"><TabsTrigger value="cay"><FolderTree />Cây tổ chức</TabsTrigger><TabsTrigger value="danh-sach"><List />Danh sách</TabsTrigger></TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="min-w-0 px-3">
              {view === 'cay' ? <div className="max-h-[62vh] min-h-64 overflow-auto pr-1"><DonViTree nodes={filteredTree} selectedId={maDonViDangChon} onSelect={(node) => { setMaDonViDangChon(node.maDonVi); setChiTietTab('tong-quan') }} /></div> : (
                <div className="space-y-3">
                  {listQuery.isPending ? <div className="space-y-3 p-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : listQuery.isError ? <div role="alert" className="p-4 text-sm text-destructive">{nhanLoi(listQuery.error)} <Button variant="link" onClick={() => void listQuery.refetch()}>Tải lại</Button></div> : (
                    <>
                      <Table>
                        <TableHeader><TableRow><TableHead>Đơn vị</TableHead><TableHead>Loại</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
                        <TableBody>{listQuery.data?.duLieu.map((unit) => <TableRow key={unit.ma} data-state={maDonViDangChon === unit.ma ? 'selected' : undefined}>
                          <TableCell className="whitespace-normal"><Button type="button" variant="link" className="h-auto p-0 text-left" onClick={() => { setMaDonViDangChon(unit.ma); setChiTietTab('tong-quan') }}><span className="min-w-0"><span className="block font-medium">{unit.tenDonVi ?? 'Đơn vị chưa có tên'}</span><span className="font-mono text-xs text-muted-foreground">{unit.maDinhDanh ?? 'Chưa có mã'}</span></span></Button></TableCell>
                          <TableCell><Badge variant="outline">{tenLoaiDonVi[unit.loaiDonVi]}</Badge></TableCell><TableCell><HuyHieuTrangThai trangThai={unit.trangThai} /></TableCell>
                        </TableRow>)}</TableBody>
                      </Table>
                      {!listQuery.data?.duLieu.length && <p className="p-6 text-center text-sm text-muted-foreground">Không có đơn vị phù hợp với bộ lọc.</p>}
                      <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Trang {danhSachTrang?.trang ?? 1} / {listPages} · {danhSachTrang?.tongSo ?? 0} đơn vị</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={trang <= 1 || listQuery.isFetching} onClick={() => setTrang((current) => current - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={trang >= listPages || listQuery.isFetching} onClick={() => setTrang((current) => current + 1)}>Sau</Button></div></div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            {!maDonViDangChon ? <CardContent className="p-10 text-center text-sm text-muted-foreground">Chọn đơn vị trong cây để xem thông tin.</CardContent> : detailQuery.isPending ? <CardContent className="space-y-4 p-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-36 w-full" /></CardContent> : detailError ? <CardContent role="alert" className="space-y-3 p-6"><p className="font-medium">Không tải được chi tiết đơn vị</p><p className="text-sm text-destructive">{detailError}</p><Button variant="outline" onClick={() => void detailQuery.refetch()}>Thử lại</Button></CardContent> : selected ? (
              <>
                <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{tenLoaiDonVi[selected.loaiDonVi]}</Badge><HuyHieuTrangThai trangThai={selected.trangThai} /></div><CardTitle className="break-words text-xl">{selected.tenDonVi ?? 'Đơn vị chưa có tên'}</CardTitle><CardDescription className="font-mono">{selected.maDinhDanh ?? 'Chưa có mã định danh'}</CardDescription></div>
                  <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={moSua}><Pencil />Sửa thông tin</Button><Button type="button" variant="outline" onClick={moDoiTen}>Đổi tên</Button><Button type="button" variant="outline" disabled={selected.loaiDonVi === 'DANG_UY'} onClick={moDoiDonViCha}>Đổi đơn vị cấp trên</Button><Button type="button" variant="outline" onClick={() => { setTrangThaiDich(selected.trangThai); setCuaSo('doi-trang-thai') }}>Đổi trạng thái</Button></div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <Tabs value={chiTietTab} onValueChange={setChiTietTab}>
                    <TabsList variant="line" className="w-full flex-wrap justify-start border-b"><TabsTrigger value="tong-quan">Tổng quan</TabsTrigger><TabsTrigger value="truc-thuoc">Đơn vị trực thuộc <Badge variant="secondary">{visibleChildren.length}</Badge></TabsTrigger><TabsTrigger value="lich-su">Lịch sử quan hệ</TabsTrigger></TabsList>
                    <TabsContent value="tong-quan" className="pt-5">
                      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                        <div><dt className="text-sm text-muted-foreground">Mã đơn vị</dt><dd className="mt-1 break-all font-mono">{selected.maDinhDanh ?? 'Chưa có mã định danh'}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Tên đơn vị hiện hành</dt><dd className="mt-1 font-medium">{selected.tenDonVi ?? 'Chưa có tên đơn vị'}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Cấp tổ chức</dt><dd className="mt-1">{tenLoaiDonVi[selected.loaiDonVi]}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Trạng thái</dt><dd className="mt-1"><HuyHieuTrangThai trangThai={selected.trangThai} /></dd></div>
                        <div><dt className="text-sm text-muted-foreground">Đơn vị cấp trên</dt><dd className="mt-1">{parentNode?.tenDonVi ?? (selectedParentId ? 'Đơn vị cấp trên không thuộc phạm vi đang xem' : 'Không có · Đơn vị gốc')}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Số đơn vị trực thuộc trong phạm vi đang xem</dt><dd className="mt-1">{visibleChildren.length}</dd></div>
                      </dl>
                      <Separator className="my-5" />
                      <p className="text-sm text-muted-foreground">Thẻ tổng quan chỉ đếm đơn vị Backend trả về trong phạm vi tài khoản đang xem. API hiện không cung cấp số đảng viên, email hoặc số điện thoại của đơn vị.</p>
                    </TabsContent>
                    <TabsContent value="truc-thuoc" className="pt-5">
                      {directChildren.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-16">STT</TableHead><TableHead>Mã đơn vị</TableHead><TableHead>Tên đơn vị</TableHead><TableHead>Đơn vị con</TableHead></TableRow></TableHeader><TableBody>{directChildren.map((child, index) => <TableRow key={child.maDonVi}><TableCell className="tabular-nums">{index + 1}</TableCell><TableCell className="font-mono text-sm">{child.maDinhDanh ?? '—'}</TableCell><TableCell><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="link" className="h-auto p-0 font-medium whitespace-normal text-left" onClick={() => { setMaDonViDangChon(child.maDonVi); setChiTietTab('tong-quan') }}>{child.tenDonVi ?? 'Đơn vị chưa có tên'}</Button><HuyHieuTrangThai trangThai={child.trangThai} /></div></TableCell><TableCell className="whitespace-normal">{child.donViCon.length ? <div className="flex flex-wrap gap-1.5">{child.donViCon.map((unit) => <Badge key={unit.maDonVi} variant="outline">{unit.tenDonVi ?? 'Đơn vị chưa có tên'}</Badge>)}</div> : <span className="text-muted-foreground">—</span>}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="py-10 text-center text-sm text-muted-foreground">Đơn vị này chưa có đơn vị trực thuộc trong phạm vi đang xem.</p>}
                    </TabsContent>
                    <TabsContent value="lich-su" className="pt-5">
                      {historyQuery.isPending ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : historyQuery.isError ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{nhanLoi(historyQuery.error)}</p><p className="text-sm text-muted-foreground">Lịch sử quan hệ yêu cầu quyền xem lịch sử riêng.</p></div> : historyQuery.data?.length ? <Table><TableHeader><TableRow><TableHead>Đơn vị cấp trên</TableHead><TableHead>Hiệu lực từ</TableHead><TableHead>Hiệu lực đến</TableHead></TableRow></TableHeader><TableBody>{historyQuery.data.map((relation) => <TableRow key={relation.ma}><TableCell className="whitespace-normal">{flatNodes.find((node) => node.maDonVi === relation.maDonViCha)?.tenDonVi ?? 'Đơn vị ngoài phạm vi hiện tại'}</TableCell><TableCell>{new Date(relation.ngayHieuLucTu).toLocaleString('vi-VN')}</TableCell><TableCell>{relation.ngayHieuLucDen ? new Date(relation.ngayHieuLucDen).toLocaleString('vi-VN') : <Badge variant="success">Đang áp dụng</Badge>}</TableCell></TableRow>)}</TableBody></Table> : <p className="py-10 text-center text-sm text-muted-foreground">Chưa có lịch sử quan hệ được trả về.</p>}
                      <p className="mt-4 text-xs text-muted-foreground">Tab này hiển thị lịch sử quan hệ cha-con từ API; chưa phải nhật ký kiểm toán và không hiển thị lịch sử đổi tên.</p>
                    </TabsContent>
                  </Tabs>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">Các thao tác bị kiểm tra Permission và Scope tại Backend. Nếu không đủ quyền, máy chủ từ chối và giao diện báo lỗi.</p><Button type="button" variant="destructive" onClick={() => setXacNhan({ loai: 'xoa' })}>Xóa đơn vị</Button></div>
                </CardContent>
              </>
            ) : <CardContent className="p-10 text-center text-sm text-muted-foreground">Chọn một đơn vị để xem thông tin.</CardContent>}
          </Card>
        </div>
      )}

      <Dialog open={cuaSo !== null} onOpenChange={(open) => { if (!open && !isSaving) setCuaSo(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cuaSo === 'tao-goc' ? 'Tạo Đảng ủy gốc' : cuaSo === 'tao' ? 'Thêm đơn vị' : cuaSo === 'sua' ? 'Sửa thông tin đơn vị' : cuaSo === 'doi-ten' ? 'Đổi tên đơn vị' : cuaSo === 'doi-trang-thai' ? 'Chọn trạng thái mới' : 'Đổi đơn vị cấp trên'}</DialogTitle>
            <DialogDescription>{cuaSo === 'tao-goc' ? 'Thông tin gốc đã được duyệt và được điền cố định.' : cuaSo === 'tao' ? 'Đơn vị mới mặc định ở trạng thái đang hoạt động.' : cuaSo === 'doi-ten' ? 'Tên cũ được giữ trong lịch sử; ngày hiệu lực không được ở tương lai.' : cuaSo === 'doi-don-vi-cha' ? 'Chỉ chọn đơn vị cha đúng tầng trong cây hiện tại.' : 'Các trường cập nhật sẽ được Backend kiểm tra theo Permission và Scope.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitDialog}>
            {(cuaSo === 'tao' || cuaSo === 'tao-goc' || cuaSo === 'doi-ten') && <div className="space-y-2"><Label htmlFor="org-unit-name">Tên đơn vị</Label><Input id="org-unit-name" required maxLength={200} value={tenMoi} readOnly={cuaSo === 'tao-goc'} onChange={(event) => setTenMoi(event.target.value)} /></div>}
            {(cuaSo === 'tao' || cuaSo === 'tao-goc' || cuaSo === 'sua') && <div className="space-y-2"><Label htmlFor="org-unit-code">Mã định danh{cuaSo !== 'tao-goc' && ' (không bắt buộc)'}</Label><Input id="org-unit-code" maxLength={50} required={cuaSo === 'tao-goc'} value={maMoi} readOnly={cuaSo === 'tao-goc'} placeholder="Có thể để trống" onChange={(event) => setMaMoi(event.target.value)} /></div>}
            {(cuaSo === 'tao' || cuaSo === 'tao-goc') && <>
              {cuaSo === 'tao' ? <div className="space-y-2"><Label htmlFor="org-parent">Đơn vị cấp trên</Label><Select required value={maChaMoi} onValueChange={(value) => { setMaChaMoi(value); const parent = flatNodes.find((node) => node.maDonVi === value); setLoaiMoi(parent?.loaiDonVi === 'DANG_UY' ? 'CHI_BO' : 'TO') }}><SelectTrigger id="org-parent" className="w-full"><SelectValue placeholder="Chọn đơn vị cấp trên" /></SelectTrigger><SelectContent>{parentOptions.map((parent) => <SelectItem key={parent.maDonVi} value={parent.maDonVi}>{'　'.repeat(parent.level)}{parent.tenDonVi ?? parent.maDinhDanh ?? tenLoaiDonVi[parent.loaiDonVi]}</SelectItem>)}</SelectContent></Select></div> : <div className="space-y-2"><Label>Đơn vị cấp trên</Label><Input value="Không có · Đơn vị gốc" readOnly /></div>}
              <div className="space-y-2"><Label>Loại đơn vị</Label><Input value={cuaSo === 'tao-goc' ? 'Đảng ủy' : tenLoaiDonVi[loaiMoi]} readOnly /></div>
              <div className="space-y-2"><Label>Trạng thái ban đầu</Label><Input value="Đang hoạt động" readOnly /></div>
            </>}
            {cuaSo === 'sua' && <div className="space-y-2"><Label htmlFor="org-unit-type">Loại đơn vị</Label><Select disabled={selected?.loaiDonVi === 'DANG_UY'} value={loaiMoi} onValueChange={(value) => setLoaiMoi(value as LoaiDonVi)}><SelectTrigger id="org-unit-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(tenLoaiDonVi).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Đổi loại có thể bị từ chối nếu làm sai cấu trúc cây hoặc lịch sử liên quan.</p></div>}
            {cuaSo === 'doi-don-vi-cha' && selected && <div className="space-y-2"><Label htmlFor="org-new-parent">Đơn vị cấp trên mới</Label><Select value={maChaMoi} onValueChange={setMaChaMoi}><SelectTrigger id="org-new-parent" className="w-full"><SelectValue placeholder="Chọn đơn vị cấp trên" /></SelectTrigger><SelectContent>{parentOptions.filter((parent) => parent.loaiDonVi === (selected.loaiDonVi === 'CHI_BO' ? 'DANG_UY' : 'CHI_BO') && parent.maDonVi !== selected.maDonVi).map((parent) => <SelectItem key={parent.maDonVi} value={parent.maDonVi}>{parent.tenDonVi ?? parent.maDinhDanh ?? tenLoaiDonVi[parent.loaiDonVi]}</SelectItem>)}</SelectContent></Select></div>}
            {cuaSo === 'doi-trang-thai' && <div className="space-y-2"><Label htmlFor="org-status-target">Trạng thái đơn vị</Label><Select value={trangThaiDich} onValueChange={(value) => setTrangThaiDich(value as TrangThaiDonVi)}><SelectTrigger id="org-status-target" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{cacTrangThai.map((status) => <SelectItem key={status} value={status}>{tenTrangThai[status]}</SelectItem>)}</SelectContent></Select></div>}
            {(cuaSo === 'tao' || cuaSo === 'tao-goc' || cuaSo === 'doi-ten' || cuaSo === 'doi-don-vi-cha') && <div className="space-y-2"><Label htmlFor="org-effective-date">Ngày hiệu lực từ</Label><Input id="org-effective-date" type="date" required max={ngayHomNay()} value={ngayHieuLuc} onChange={(event) => setNgayHieuLuc(event.target.value)} /></div>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={isSaving} onClick={() => setCuaSo(null)}>Hủy</Button><Button type="submit" disabled={isSaving || (cuaSo === 'doi-don-vi-cha' && !maChaMoi)}>{isSaving && <LoaderCircle className="animate-spin" />}{cuaSo === 'tao-goc' || cuaSo === 'tao' ? 'Tạo đơn vị' : cuaSo === 'doi-trang-thai' ? 'Tiếp tục' : 'Lưu thay đổi'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={xacNhan !== null} onOpenChange={(open) => { if (!open && !statusMutation.isPending && !deleteMutation.isPending) setXacNhan(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{xacNhan?.loai === 'xoa' ? 'Xóa đơn vị này?' : 'Xác nhận thay đổi trạng thái?'}</AlertDialogTitle><AlertDialogDescription>{xacNhan?.loai === 'xoa' ? `Bạn đang yêu cầu xóa “${selected?.tenDonVi ?? 'đơn vị đã chọn'}”. Backend sẽ từ chối nếu còn dữ liệu tham chiếu; hệ thống không tự xóa dây chuyền.` : `Đơn vị “${selected?.tenDonVi ?? ''}” sẽ chuyển sang trạng thái “${tenTrangThai[xacNhan?.loai === 'trang-thai' ? xacNhan.trangThai : 'TAM_NGUNG']}”. Dữ liệu và lịch sử được giữ nguyên.`}</AlertDialogDescription></AlertDialogHeader>
          {xacNhan?.loai === 'trang-thai' && <div className="space-y-2"><Label htmlFor="org-status-target">Trạng thái mới</Label><Select value={xacNhan.trangThai} onValueChange={(value) => setXacNhan({ loai: 'trang-thai', trangThai: value as TrangThaiDonVi })}><SelectTrigger id="org-status-target" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{cacTrangThai.map((status) => <SelectItem key={status} value={status}>{tenTrangThai[status]}</SelectItem>)}</SelectContent></Select></div>}
          <AlertDialogFooter><AlertDialogCancel disabled={statusMutation.isPending || deleteMutation.isPending}>Hủy</AlertDialogCancel><AlertDialogAction variant={xacNhan?.loai === 'xoa' ? 'destructive' : 'default'} disabled={statusMutation.isPending || deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (!selected || !xacNhan) return; if (xacNhan.loai === 'xoa') deleteMutation.mutate(selected.maDonVi); else statusMutation.mutate({ id: selected.maDonVi, status: xacNhan.trangThai }) }}>{statusMutation.isPending || deleteMutation.isPending ? 'Đang xử lý…' : xacNhan?.loai === 'xoa' ? 'Xóa đơn vị' : 'Xác nhận thay đổi'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
