import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Building2, ChevronRight, CircleHelp, Ellipsis, FolderTree, Landmark, List,
  LoaderCircle, Network, Plus, RefreshCw, Search, ShieldCheck, UsersRound,
} from 'lucide-react'
import { normalizeApiError } from '@/core/api/client'
import { Badge } from '@/shared/components/ui/badge'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { OrganizationUnitPicker } from '@/shared/components/OrganizationUnitPicker'
import { DateTimePicker } from '@/shared/components/date-time'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/resizable'
import { Separator } from '@/shared/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table, TableActionCell, TableActionHead, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  lamPhangCayDonVi, organizationsApi,
  type DonViTrongCay, type LoaiDonVi,
  type TrangThaiDonVi,
} from './organizations.api'

const tenDonViGoc = 'Đảng ủy Học viện Công nghệ Bưu chính Viễn thông'
const cayRong: DonViTrongCay[] = []
const tenLoaiDonVi: Record<LoaiDonVi, string> = { DANG_UY: 'Đảng ủy', CHI_BO: 'Chi bộ', TO: 'Tổ' }
const tenTrangThai: Record<TrangThaiDonVi, string> = {
  DANG_HOAT_DONG: 'Đang hoạt động',
  TAM_NGUNG: 'Tạm ngừng',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
}
const cacTrangThai: TrangThaiDonVi[] = ['DANG_HOAT_DONG', 'TAM_NGUNG', 'NGUNG_HOAT_DONG']

type KieuCuaSo = 'tao-goc' | 'tao' | 'sua' | 'doi-trang-thai' | null
type XacNhan = { loai: 'trang-thai'; trangThai: TrangThaiDonVi } | { loai: 'xoa' } | null

function ngayHomNay() {
  return giaTriNgayGioVietNam(new Date())
}

function giaTriNgayGioVietNam(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}

function mocHieuLuc(value: string) {
  return new Date(`${value}:00+07:00`).toISOString()
}

function hienThiThoiDiem(value: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
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
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.matchMedia('(max-width: 1279px)').matches)
  const [view, setView] = useState<'cay' | 'danh-sach'>('cay')
  const [chiTietTab, setChiTietTab] = useState('tong-quan')
  const [tuKhoa, setTuKhoa] = useState('')
  const [loaiLoc, setLoaiLoc] = useState<'TAT_CA' | LoaiDonVi>('TAT_CA')
  const [trangThaiLoc, setTrangThaiLoc] = useState<'TAT_CA' | TrangThaiDonVi>('TAT_CA')
  const [trang, setTrang] = useState(1)
  const [tuKhoaDonViCon, setTuKhoaDonViCon] = useState('')
  const [trangDonViCon, setTrangDonViCon] = useState(1)
  const [gioiHanDonViCon, setGioiHanDonViCon] = useState('10')
  const [tuKhoaLichSu, setTuKhoaLichSu] = useState('')
  const [trangLichSu, setTrangLichSu] = useState(1)
  const [gioiHanLichSu, setGioiHanLichSu] = useState('10')
  const [maDonViDangChon, setMaDonViDangChon] = useState('')
  const [cuaSo, setCuaSo] = useState<KieuCuaSo>(null)
  const [xacNhan, setXacNhan] = useState<XacNhan>(null)
  const [tenMoi, setTenMoi] = useState('')
  const [maMoi, setMaMoi] = useState('')
  const [loaiMoi, setLoaiMoi] = useState<LoaiDonVi>('CHI_BO')
  const [maChaMoi, setMaChaMoi] = useState('')
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)')
    const updateLayout = () => setIsCompactLayout(media.matches)
    updateLayout()
    media.addEventListener('change', updateLayout)
    return () => media.removeEventListener('change', updateLayout)
  }, [])
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

  useEffect(() => {
    setTuKhoaDonViCon('')
    setTrangDonViCon(1)
    setTuKhoaLichSu('')
    setTrangLichSu(1)
  }, [maDonViDangChon])

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
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: { maDinhDanh?: string | null; loaiDonVi?: LoaiDonVi } }) => organizationsApi.sua(id, input), onError: mutationError })
  const renameMutation = useMutation({ mutationFn: ({ id, tenDonVi, ngay }: { id: string; tenDonVi: string; ngay: string }) => organizationsApi.doiTen(id, { tenDonVi, ngayHieuLucTu: mocHieuLuc(ngay) }), onError: mutationError })
  const parentMutation = useMutation({ mutationFn: ({ id, maDonViCha, ngay }: { id: string; maDonViCha: string; ngay: string }) => organizationsApi.doiQuanHeCha(id, { maDonViCha, ngayHieuLucTu: mocHieuLuc(ngay) }), onError: mutationError })
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: TrangThaiDonVi }) => organizationsApi.doiTrangThai(id, status), onSuccess: async () => { await afterMutation('Đã cập nhật trạng thái đơn vị.', maDonViDangChon); setXacNhan(null) }, onError: mutationError })
  const deleteMutation = useMutation({ mutationFn: organizationsApi.xoa, onSuccess: async () => { setMaDonViDangChon(''); await refresh(); setXacNhan(null); toast.success('Đã xóa đơn vị.') }, onError: mutationError })

  const selected = detailQuery.data ?? flatNodes.find((node) => node.maDonVi === maDonViDangChon) ?? null
  const selectedNode = flatNodes.find((node) => node.maDonVi === maDonViDangChon) ?? null
  const parentNode = selectedNode ? flatNodes.find((node) => node.donViCon.some((child) => child.maDonVi === selectedNode.maDonVi)) : null
  const selectedParentId = selected ? ('maDonViCha' in selected ? selected.maDonViCha : parentNode?.maDonVi ?? null) : null
  const directChildren = [...new Map((selectedNode?.donViCon ?? []).map((unit) => [unit.maDonVi, flatNodes.find((node) => node.maDonVi === unit.maDonVi)]).filter((entry): entry is [string, DonViTrongCay & { level: number }] => Boolean(entry[1])))].map(([, node]) => node)
  const normalizedChildSearch = tuKhoaDonViCon.trim().toLocaleLowerCase('vi')
  const filteredDirectChildren = directChildren.filter((unit) => `${unit.tenDonVi ?? ''} ${unit.maDinhDanh ?? ''}`.toLocaleLowerCase('vi').includes(normalizedChildSearch))
  const childPageSize = Number(gioiHanDonViCon)
  const childPages = Math.max(1, Math.ceil(filteredDirectChildren.length / childPageSize))
  const pagedDirectChildren = filteredDirectChildren.slice((trangDonViCon - 1) * childPageSize, trangDonViCon * childPageSize)
  const historyRows = (historyQuery.data ?? []).map((relation) => ({
    ...relation,
    tenDonViCha: flatNodes.find((node) => node.maDonVi === relation.maDonViCha)?.tenDonVi ?? 'Đơn vị ngoài phạm vi hiện tại',
    thoiDiemTu: hienThiThoiDiem(relation.ngayHieuLucTu),
    thoiDiemDen: relation.ngayHieuLucDen ? hienThiThoiDiem(relation.ngayHieuLucDen) : null,
  }))
  const normalizedHistorySearch = tuKhoaLichSu.trim().toLocaleLowerCase('vi')
  const filteredHistoryRows = historyRows.filter((row) => `${row.tenDonViCha} ${row.thoiDiemTu} ${row.thoiDiemDen ?? 'đang áp dụng'}`.toLocaleLowerCase('vi').includes(normalizedHistorySearch))
  const historyPageSize = Number(gioiHanLichSu)
  const historyPages = Math.max(1, Math.ceil(filteredHistoryRows.length / historyPageSize))
  const pagedHistoryRows = filteredHistoryRows.slice((trangLichSu - 1) * historyPageSize, trangLichSu * historyPageSize)
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
    setMaMoi('')
    setLoaiMoi('DANG_UY')
    setMaChaMoi('')
    setNgayHieuLuc(ngayHomNay())
    setCuaSo('tao-goc')
  }

  function moSua() {
    if (!selected) return
    setTenMoi(selected.tenDonVi ?? '')
    setMaMoi(selected.maDinhDanh ?? '')
    setLoaiMoi(selected.loaiDonVi)
    setMaChaMoi(selectedParentId ?? '')
    setNgayHieuLuc(ngayHomNay())
    setCuaSo('sua')
  }

  function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (cuaSo === 'tao-goc') {
      if (!maMoi.trim()) return toast.error('Hãy nhập mã đơn vị Đảng ủy.')
      createMutation.mutate({ loaiDonVi: 'DANG_UY', maDinhDanh: maMoi.trim(), tenDonVi: tenMoi.trim(), trangThai: 'DANG_HOAT_DONG', ngayHieuLucTu: mocHieuLuc(ngayHieuLuc) })
    } else if (cuaSo === 'tao') {
      if (!maChaMoi) return toast.error('Hãy chọn đơn vị cấp trên.')
      const parent = flatNodes.find((node) => node.maDonVi === maChaMoi)
      if (!parent) return toast.error('Đơn vị cấp trên không còn trong cây hiện tại. Hãy làm mới dữ liệu.')
      createMutation.mutate({ loaiDonVi: parent.loaiDonVi === 'DANG_UY' ? 'CHI_BO' : 'TO', maDinhDanh: maMoi.trim() || undefined, tenDonVi: tenMoi.trim(), maDonViCha: parent.maDonVi, ngayHieuLucTu: mocHieuLuc(ngayHieuLuc) })
    } else if (cuaSo === 'sua' && selected) {
      const edits: Promise<unknown>[] = []
      if (tenMoi.trim() !== (selected.tenDonVi ?? '')) edits.push(renameMutation.mutateAsync({ id: selected.maDonVi, tenDonVi: tenMoi.trim(), ngay: ngayHieuLuc }))
      if (selected.loaiDonVi !== 'DANG_UY' && maChaMoi && maChaMoi !== selectedParentId) edits.push(parentMutation.mutateAsync({ id: selected.maDonVi, maDonViCha: maChaMoi, ngay: ngayHieuLuc }))
      if (maMoi.trim() !== (selected.maDinhDanh ?? '') || loaiMoi !== selected.loaiDonVi) edits.push(updateMutation.mutateAsync({ id: selected.maDonVi, input: { maDinhDanh: maMoi.trim() || null, loaiDonVi: loaiMoi } }))
      void Promise.all(edits).then(() => { if (!edits.length) setCuaSo(null); else void afterMutation('Đã cập nhật thông tin đơn vị.', selected.maDonVi) }).catch(mutationError)
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

      {treeError && <Card className="gap-0 py-0" role="alert"><CardContent className="flex items-start gap-3 p-4"><CircleHelp className="mt-0.5 size-5 text-destructive" /><div><p className="font-medium">Không tải được cây tổ chức</p><p className="text-sm text-muted-foreground">{treeError}</p></div><Button className="ml-auto" variant="outline" onClick={() => void treeQuery.refetch()}>Thử lại</Button></CardContent></Card>}

      {!treeError && treeQuery.isPending && <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.32fr)_minmax(0,0.68fr)]"><Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-4/5" /></CardContent></Card><Card><CardHeader><Skeleton className="h-7 w-2/5" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-32 w-full" /></CardContent></Card></div>}

      {!treeError && !treeQuery.isPending && !nodes.length && (
        <Card>
          <CardHeader><CardTitle>Chưa có đơn vị trong cây tổ chức</CardTitle><CardDescription>Quản trị viên có thẩm quyền có thể tạo nút Đảng ủy gốc. Mã đơn vị được khai báo khi tạo và không quyết định phạm vi quyền.</CardDescription></CardHeader>
          <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center"><div className="flex-1 rounded-md bg-muted p-4 text-sm"><p><span className="font-medium">Loại:</span> Đảng ủy · <span className="font-medium">Đơn vị cấp trên:</span> Không có</p></div><Button onClick={moTaoGoc}><Plus />Tạo Đảng ủy gốc</Button></CardContent>
        </Card>
      )}

      {!treeError && !treeQuery.isPending && nodes.length > 0 && (
        <ResizablePanelGroup orientation={isCompactLayout ? 'vertical' : 'horizontal'} resizeTargetMinimumSize={{ coarse: 32, fine: 24 }} className={`min-w-0 rounded-md border ${isCompactLayout ? 'h-[1250px] min-h-[900px]' : 'h-[78vh] min-h-[680px]'}`}>
          <ResizablePanel defaultSize={`${isCompactLayout ? 35 : 30}%`} minSize={`${isCompactLayout ? 25 : 23}%`} maxSize={`${isCompactLayout ? 48 : 42}%`} className="min-h-0 min-w-0">
          <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-0 shadow-none">
            <CardHeader className="shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-3"><div><CardTitle>Cấu trúc đơn vị</CardTitle><CardDescription>Chọn một đơn vị để xem thông tin.</CardDescription></div><Badge variant="outline">{flatNodes.length} đơn vị</Badge></div>
              <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm theo tên hoặc mã đơn vị" className="pl-9" placeholder="Tìm theo tên hoặc mã đơn vị" value={tuKhoa} onChange={(event) => { setTuKhoa(event.target.value); setTrang(1) }} /></div>
              <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
                <TabsList variant="line" className="w-full justify-start border-b"><TabsTrigger value="cay"><FolderTree />Cây tổ chức</TabsTrigger><TabsTrigger value="danh-sach"><List />Danh sách</TabsTrigger></TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3">
              {view === 'cay' ? <div className="min-h-64 min-w-0 overflow-auto pr-1"><DonViTree nodes={filteredTree} selectedId={maDonViDangChon} onSelect={(node) => { setMaDonViDangChon(node.maDonVi); setChiTietTab('tong-quan') }} /></div> : (
                <div className="space-y-3">
                  {listQuery.isPending ? <div className="space-y-3 p-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : listQuery.isError ? <div role="alert" className="p-4 text-sm text-destructive">{nhanLoi(listQuery.error)} <Button variant="link" onClick={() => void listQuery.refetch()}>Tải lại</Button></div> : (
                    <>
                      <Table>
                        <TableHeader><TableRow><TableHead>Đơn vị</TableHead><TableHead>Loại</TableHead><TableHead>Trạng thái</TableHead><TableActionHead className="w-12"><span className="sr-only">Hành động</span></TableActionHead></TableRow></TableHeader>
                        <TableBody>{listQuery.data?.duLieu.map((unit) => <TableRow key={unit.ma} data-state={maDonViDangChon === unit.ma ? 'selected' : undefined}>
                          <TableCell className="whitespace-normal"><Button type="button" variant="link" className="h-auto p-0 text-left" onClick={() => { setMaDonViDangChon(unit.ma); setChiTietTab('tong-quan') }}><span className="min-w-0"><span className="block font-medium">{unit.tenDonVi ?? 'Đơn vị chưa có tên'}</span><span className="font-mono text-xs text-muted-foreground">{unit.maDinhDanh ?? 'Chưa có mã'}</span></span></Button></TableCell>
                          <TableCell><Badge variant="outline">{tenLoaiDonVi[unit.loaiDonVi]}</Badge></TableCell><TableCell><HuyHieuTrangThai trangThai={unit.trangThai} /></TableCell><TableActionCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Hành động với ${unit.tenDonVi ?? 'đơn vị'}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { setMaDonViDangChon(unit.ma); setTenMoi(unit.tenDonVi ?? ''); setMaMoi(unit.maDinhDanh ?? ''); setLoaiMoi(unit.loaiDonVi); const parent = flatNodes.find((node) => node.donViCon.some((child) => child.maDonVi === unit.ma)); setMaChaMoi(parent?.maDonVi ?? ''); setNgayHieuLuc(ngayHomNay()); setCuaSo('sua') }}>Sửa thông tin</DropdownMenuItem><DropdownMenuItem onSelect={() => { setMaDonViDangChon(unit.ma); const next = unit.trangThai === 'DANG_HOAT_DONG' ? 'TAM_NGUNG' : 'DANG_HOAT_DONG'; setTrangThaiDich(next); setXacNhan({ loai: 'trang-thai', trangThai: next }) }}>Đổi trạng thái</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => { setMaDonViDangChon(unit.ma); setXacNhan({ loai: 'xoa' }) }}>Xóa đơn vị</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableActionCell>
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
          </ResizablePanel>
          <ResizableHandle withHandle className={isCompactLayout ? 'z-10 h-1 w-full cursor-row-resize touch-none select-none hover:bg-primary/40' : 'z-10 w-1 cursor-col-resize touch-none select-none hover:bg-primary/40'} />
          <ResizablePanel defaultSize={`${isCompactLayout ? 65 : 70}%`} minSize={`${isCompactLayout ? 52 : 58}%`} maxSize={`${isCompactLayout ? 75 : 77}%`} className="min-h-0 min-w-0">
          <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-0 shadow-none">
            {!maDonViDangChon ? <CardContent className="p-10 text-center text-sm text-muted-foreground">Chọn đơn vị trong cây để xem thông tin.</CardContent> : detailQuery.isPending ? <CardContent className="space-y-4 p-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-36 w-full" /></CardContent> : detailError ? <CardContent role="alert" className="space-y-3 p-6"><p className="font-medium">Không tải được chi tiết đơn vị</p><p className="text-sm text-destructive">{detailError}</p><Button variant="outline" onClick={() => void detailQuery.refetch()}>Thử lại</Button></CardContent> : selected ? (
              <>
                <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{tenLoaiDonVi[selected.loaiDonVi]}</Badge><HuyHieuTrangThai trangThai={selected.trangThai} /></div><CardTitle className="break-words text-xl">{selected.tenDonVi ?? 'Đơn vị chưa có tên'}</CardTitle><CardDescription className="break-all font-mono">{selected.maDinhDanh ?? 'Chưa có mã định danh'}</CardDescription></div>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline"><Ellipsis />Hành động</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={moSua}>Sửa thông tin</DropdownMenuItem><DropdownMenuItem onSelect={() => { setTrangThaiDich(selected.trangThai === 'DANG_HOAT_DONG' ? 'TAM_NGUNG' : 'DANG_HOAT_DONG'); setCuaSo('doi-trang-thai') }}>Đổi trạng thái</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setXacNhan({ loai: 'xoa' })}>Xóa đơn vị</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </CardHeader>
                <CardContent className="min-h-0 min-w-0 flex-1 overflow-y-auto space-y-4 p-4 sm:p-6">
                  <Tabs value={chiTietTab} onValueChange={setChiTietTab}>
                    <TabsList variant="line" className="w-full flex-wrap justify-start border-b"><TabsTrigger value="tong-quan">Tổng quan</TabsTrigger><TabsTrigger value="truc-thuoc">Đơn vị trực thuộc <Badge variant="secondary">{directChildren.length}</Badge></TabsTrigger><TabsTrigger value="lich-su">Lịch sử quan hệ</TabsTrigger></TabsList>
                    <TabsContent value="tong-quan" className="pt-5">
                      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                        <div><dt className="text-sm text-muted-foreground">Mã đơn vị</dt><dd className="mt-1 break-all font-mono">{selected.maDinhDanh ?? 'Chưa có mã định danh'}</dd></div>
                        <div className="min-w-0"><dt className="text-sm text-muted-foreground">Tên đơn vị hiện hành</dt><dd className="mt-1 break-words font-medium">{selected.tenDonVi ?? 'Chưa có tên đơn vị'}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Cấp tổ chức</dt><dd className="mt-1">{tenLoaiDonVi[selected.loaiDonVi]}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Trạng thái</dt><dd className="mt-1"><HuyHieuTrangThai trangThai={selected.trangThai} /></dd></div>
                        <div><dt className="text-sm text-muted-foreground">Đơn vị cấp trên</dt><dd className="mt-1">{parentNode?.tenDonVi ?? (selectedParentId ? 'Đơn vị cấp trên không thuộc phạm vi đang xem' : 'Không có · Đơn vị gốc')}</dd></div>
                        <div><dt className="text-sm text-muted-foreground">Số đơn vị trực thuộc trong phạm vi đang xem</dt><dd className="mt-1">{directChildren.length}</dd></div>
                      </dl>
                      <Separator className="my-5" />
                      <p className="text-sm text-muted-foreground">Thẻ tổng quan chỉ đếm đơn vị Backend trả về trong phạm vi tài khoản đang xem. API hiện không cung cấp số đảng viên, email hoặc số điện thoại của đơn vị.</p>
                    </TabsContent>
                    <TabsContent value="truc-thuoc" className="pt-5">
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm đơn vị trực thuộc" className="pl-9" placeholder="Tìm theo tên hoặc mã đơn vị..." value={tuKhoaDonViCon} onChange={(event) => { setTuKhoaDonViCon(event.target.value); setTrangDonViCon(1) }} /></div><div className="flex items-center gap-2"><Label htmlFor="child-page-size" className="shrink-0 text-xs text-muted-foreground">Số dòng</Label><Select value={gioiHanDonViCon} onValueChange={(value) => { setGioiHanDonViCon(value); setTrangDonViCon(1) }}><SelectTrigger id="child-page-size" className="h-8 w-[76px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></div></div>
                      {pagedDirectChildren.length ? <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead className="w-16">STT</TableHead><TableHead className="w-[22%]">Mã đơn vị</TableHead><TableHead className="w-[38%]">Tên đơn vị</TableHead><TableHead className="w-32 text-center">Đơn vị con</TableHead><TableHead className="w-40">Trạng thái</TableHead></TableRow></TableHeader><TableBody>{pagedDirectChildren.map((child, index) => <TableRow key={child.maDonVi} tabIndex={0} aria-selected={maDonViDangChon === child.maDonVi} className="h-12 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setMaDonViDangChon(child.maDonVi); setChiTietTab('tong-quan') }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMaDonViDangChon(child.maDonVi); setChiTietTab('tong-quan') } }}><TableCell className="h-12 tabular-nums">{(trangDonViCon - 1) * childPageSize + index + 1}</TableCell><TableCell className="h-12 max-w-0 truncate font-mono text-sm" title={child.maDinhDanh ?? 'Chưa có mã định danh'}>{child.maDinhDanh ?? '—'}</TableCell><TableCell className="h-12 max-w-0 truncate font-medium" title={child.tenDonVi ?? 'Đơn vị chưa có tên'}>{child.tenDonVi ?? 'Đơn vị chưa có tên'}</TableCell><TableCell className="h-12 text-center tabular-nums">{new Set(child.donViCon.map((unit) => unit.maDonVi)).size}</TableCell><TableCell className="h-12"><Badge variant={child.trangThai === 'DANG_HOAT_DONG' ? 'success' : 'outline'}>{child.trangThai === 'DANG_HOAT_DONG' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge></TableCell></TableRow>)}</TableBody></Table></div> : <p className="py-10 text-center text-sm text-muted-foreground">{directChildren.length ? 'Không tìm thấy đơn vị phù hợp.' : 'Đơn vị này chưa có đơn vị trực thuộc trong phạm vi đang xem.'}</p>}
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Hiển thị {filteredDirectChildren.length ? (trangDonViCon - 1) * childPageSize + 1 : 0}–{Math.min(trangDonViCon * childPageSize, filteredDirectChildren.length)} trong {filteredDirectChildren.length} đơn vị</p><div className="flex items-center justify-end gap-2"><Button size="sm" variant="outline" disabled={trangDonViCon <= 1} onClick={() => setTrangDonViCon((current) => current - 1)}>Trước</Button><span className="min-w-20 text-center text-sm text-muted-foreground">Trang {trangDonViCon} / {childPages}</span><Button size="sm" variant="outline" disabled={trangDonViCon >= childPages} onClick={() => setTrangDonViCon((current) => current + 1)}>Sau</Button></div></div>
                    </TabsContent>
                    <TabsContent value="lich-su" className="pt-5">
                      {historyQuery.isPending ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : historyQuery.isError ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{nhanLoi(historyQuery.error)}</p><p className="text-sm text-muted-foreground">Lịch sử quan hệ yêu cầu quyền xem lịch sử riêng.</p></div> : <>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Tìm trong lịch sử quan hệ" className="pl-9" placeholder="Tìm theo đơn vị cấp trên hoặc thời điểm..." value={tuKhoaLichSu} onChange={(event) => { setTuKhoaLichSu(event.target.value); setTrangLichSu(1) }} /></div><div className="flex items-center gap-2"><Label htmlFor="history-page-size" className="shrink-0 text-xs text-muted-foreground">Số dòng</Label><Select value={gioiHanLichSu} onValueChange={(value) => { setGioiHanLichSu(value); setTrangLichSu(1) }}><SelectTrigger id="history-page-size" className="h-8 w-[76px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></div></div>
                        {pagedHistoryRows.length ? <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead className="w-16">STT</TableHead><TableHead>Đơn vị cấp trên</TableHead><TableHead className="w-44">Hiệu lực từ</TableHead><TableHead className="w-44">Hiệu lực đến</TableHead></TableRow></TableHeader><TableBody>{pagedHistoryRows.map((relation, index) => <TableRow key={relation.ma} className="h-12"><TableCell className="h-12 tabular-nums text-muted-foreground">{(trangLichSu - 1) * historyPageSize + index + 1}</TableCell><TableCell className="h-12 max-w-0 truncate" title={relation.tenDonViCha}>{relation.tenDonViCha}</TableCell><TableCell className="h-12 whitespace-nowrap">{relation.thoiDiemTu}</TableCell><TableCell className="h-12 whitespace-nowrap">{relation.thoiDiemDen ?? <Badge variant="success">Đang áp dụng</Badge>}</TableCell></TableRow>)}</TableBody></Table></div> : <p className="py-10 text-center text-sm text-muted-foreground">{historyRows.length ? 'Không tìm thấy mốc lịch sử phù hợp.' : 'Chưa có lịch sử quan hệ được trả về.'}</p>}
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Hiển thị {filteredHistoryRows.length ? (trangLichSu - 1) * historyPageSize + 1 : 0}–{Math.min(trangLichSu * historyPageSize, filteredHistoryRows.length)} trong {filteredHistoryRows.length} mốc lịch sử</p><div className="flex items-center justify-end gap-2"><Button size="sm" variant="outline" disabled={trangLichSu <= 1} onClick={() => setTrangLichSu((current) => current - 1)}>Trước</Button><span className="min-w-20 text-center text-sm text-muted-foreground">Trang {trangLichSu} / {historyPages}</span><Button size="sm" variant="outline" disabled={trangLichSu >= historyPages} onClick={() => setTrangLichSu((current) => current + 1)}>Sau</Button></div></div>
                      </>}
                      <p className="mt-4 text-xs text-muted-foreground">Tab này hiển thị lịch sử quan hệ cha-con từ API; chưa phải nhật ký kiểm toán và không hiển thị lịch sử đổi tên.</p>
                    </TabsContent>
                  </Tabs>
                  <div className="border-t pt-4"><p className="text-xs text-muted-foreground">Các thao tác được Backend kiểm tra Permission, Scope và ràng buộc lịch sử.</p></div>
                </CardContent>
              </>
            ) : <CardContent className="p-10 text-center text-sm text-muted-foreground">Chọn một đơn vị để xem thông tin.</CardContent>}
          </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <Sheet open={cuaSo !== null} onOpenChange={(open) => { if (!open && !isSaving) setCuaSo(null) }}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader><SheetTitle>{cuaSo === 'tao-goc' ? 'Tạo Đảng ủy gốc' : cuaSo === 'tao' ? 'Thêm đơn vị' : cuaSo === 'sua' ? 'Sửa thông tin đơn vị' : 'Chọn trạng thái mới'}</SheetTitle><SheetDescription>{cuaSo === 'tao-goc' ? 'Nhập mã nghiệp vụ do đơn vị có thẩm quyền lựa chọn.' : cuaSo === 'tao' ? 'Đơn vị mới mặc định ở trạng thái đang hoạt động.' : 'Các trường cập nhật được kiểm tra theo quyền và phạm vi tại Backend.'}</SheetDescription></SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitDialog}>
            <SheetBody className="space-y-4">
            {(cuaSo === 'tao' || cuaSo === 'tao-goc' || cuaSo === 'sua') && <div className="space-y-2"><Label htmlFor="org-unit-name">Tên đơn vị</Label><Input id="org-unit-name" required maxLength={200} value={tenMoi} onChange={(event) => setTenMoi(event.target.value)} /></div>}
            {(cuaSo === 'tao' || cuaSo === 'tao-goc' || cuaSo === 'sua') && <div className="space-y-2"><Label htmlFor="org-unit-code">Mã định danh{cuaSo !== 'tao-goc' && ' (không bắt buộc)'}</Label><Input id="org-unit-code" maxLength={50} required={cuaSo === 'tao-goc'} value={maMoi} placeholder={cuaSo === 'tao-goc' ? 'Nhập mã đơn vị' : 'Có thể để trống'} onChange={(event) => setMaMoi(event.target.value)} /></div>}
            {(cuaSo === 'tao' || cuaSo === 'tao-goc') && <>
              {cuaSo === 'tao' ? <div className="space-y-2"><Label htmlFor="org-parent">Đơn vị cấp trên</Label><OrganizationUnitPicker id="org-parent" label="Đơn vị cấp trên" required value={maChaMoi} onValueChange={(value) => { setMaChaMoi(value); const parent = flatNodes.find((node) => node.maDonVi === value); setLoaiMoi(parent?.loaiDonVi === 'DANG_UY' ? 'CHI_BO' : 'TO') }} options={parentOptions.map((parent) => ({ value: parent.maDonVi, label: `${'　'.repeat(parent.level)}${parent.tenDonVi ?? parent.maDinhDanh ?? tenLoaiDonVi[parent.loaiDonVi]}` }))} placeholder="Chọn đơn vị cấp trên" className="w-full" /></div> : <div className="space-y-2"><Label>Đơn vị cấp trên</Label><Input value="Không có · Đơn vị gốc" readOnly /></div>}
              <div className="space-y-2"><Label>Loại đơn vị</Label><Input value={cuaSo === 'tao-goc' ? 'Đảng ủy' : tenLoaiDonVi[loaiMoi]} readOnly /></div>
              <div className="space-y-2"><Label>Trạng thái ban đầu</Label><Input value="Đang hoạt động" readOnly /></div>
            </>}
            {cuaSo === 'sua' && <div className="space-y-2"><Label htmlFor="org-unit-type">Loại đơn vị</Label><Select disabled={selected?.loaiDonVi === 'DANG_UY'} value={loaiMoi} onValueChange={(value) => setLoaiMoi(value as LoaiDonVi)}><SelectTrigger id="org-unit-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(tenLoaiDonVi).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Đổi loại có thể bị từ chối nếu làm sai cấu trúc cây hoặc lịch sử liên quan.</p></div>}
            {cuaSo === 'sua' && selected && <>
              <div className="space-y-2"><Label htmlFor="org-new-parent">Đơn vị cấp trên</Label>{selected.loaiDonVi === 'DANG_UY' ? <Input value="Không có · Đơn vị gốc" readOnly /> : <OrganizationUnitPicker id="org-new-parent" label="Đơn vị cấp trên" value={maChaMoi} onValueChange={setMaChaMoi} options={parentOptions.filter((parent) => parent.loaiDonVi === (selected.loaiDonVi === 'CHI_BO' ? 'DANG_UY' : 'CHI_BO') && parent.maDonVi !== selected.maDonVi).map((parent) => ({ value: parent.maDonVi, label: `${'　'.repeat(parent.level)}${parent.tenDonVi ?? parent.maDinhDanh ?? tenLoaiDonVi[parent.loaiDonVi]}` }))} placeholder="Chọn đơn vị cấp trên" className="w-full" />}</div>
              <div className="space-y-2"><Label htmlFor="org-effective-date">Thời điểm hiệu lực</Label><DateTimePicker id="org-effective-date" aria-label="Thời điểm hiệu lực" required clearable={false} maxDate={ngayHomNay()} value={ngayHieuLuc || undefined} onChange={(value) => setNgayHieuLuc(value ?? "")} /><p className="text-xs text-muted-foreground">Nhập theo giờ Việt Nam; lịch sử tên và quan hệ được ghi nhận riêng.</p></div>
            </>}
            {cuaSo === 'doi-trang-thai' && <div className="space-y-2"><Label htmlFor="org-status-target">Trạng thái đơn vị</Label><Select value={trangThaiDich} onValueChange={(value) => setTrangThaiDich(value as TrangThaiDonVi)}><SelectTrigger id="org-status-target" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{cacTrangThai.map((status) => <SelectItem key={status} value={status}>{tenTrangThai[status]}</SelectItem>)}</SelectContent></Select></div>}
            {(cuaSo === 'tao' || cuaSo === 'tao-goc') && <div className="space-y-2"><Label htmlFor="org-effective-date">Thời điểm hiệu lực</Label><DateTimePicker id="org-effective-date" aria-label="Thời điểm hiệu lực" required clearable={false} maxDate={ngayHomNay()} value={ngayHieuLuc || undefined} onChange={(value) => setNgayHieuLuc(value ?? "")} /></div>}
            </SheetBody>
            <SheetFooter><Button type="button" variant="outline" disabled={isSaving} onClick={() => setCuaSo(null)}>Hủy</Button><Button type="submit" disabled={isSaving || (cuaSo === 'sua' && selected?.loaiDonVi !== 'DANG_UY' && !maChaMoi)}>{isSaving && <LoaderCircle className="animate-spin" />}{cuaSo === 'tao-goc' || cuaSo === 'tao' ? 'Tạo đơn vị' : cuaSo === 'doi-trang-thai' ? 'Tiếp tục' : 'Lưu thay đổi'}</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

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
