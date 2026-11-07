import { useMemo, useState } from 'react'
import { Search, Component, Layers3, RotateCcw, FileText } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/shared/components/ui/avatar'
import { ButtonGroup, ButtonGroupText } from '@/shared/components/ui/button-group'
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/shared/components/ui/pagination'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { AspectRatio } from '@/shared/components/ui/aspect-ratio'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { EmptyState } from '@/shared/components/EmptyState'
import { LoadingState } from '@/shared/components/LoadingState'
import { StandardSheet } from '@/shared/components/StandardSheet'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { StatisticCard } from '@/shared/components/StatisticCard'
import { PageHeader } from '@/shared/components/PageHeader'
import { PageContainer } from '@/shared/components/PageContainer'
import { DatePicker, DateTimePicker } from '@/shared/components/date-time'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { Calendar } from '@/shared/components/ui/calendar'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/shared/components/ui/input-otp'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog'
import { Toggle } from '@/shared/components/ui/toggle'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/shared/components/ui/input-group'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/shared/components/ui/combobox'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/shared/components/ui/drawer'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/shared/components/ui/breadcrumb'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card'
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd'
import { Spinner } from '@/shared/components/ui/spinner'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Bubble, BubbleContent, BubbleGroup } from '@/shared/components/ui/bubble'
import { Message, MessageContent, MessageFooter, MessageGroup, MessageHeader } from '@/shared/components/ui/message'
import { MessageScroller, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from '@/shared/components/ui/message-scroller'
import { Marker, MarkerContent, MarkerIcon } from '@/shared/components/ui/marker'
import { Toaster } from '@/shared/components/ui/sonner'
import { toast } from 'sonner'
import { vi } from 'date-fns/locale'
import { Field, FieldDescription, FieldError, FieldLabel, FieldSet, FieldLegend } from '@/shared/components/ui/field'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/shared/components/ui/carousel'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/resizable'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/shared/components/ui/command'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/shared/components/ui/menubar'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '@/shared/components/ui/navigation-menu'
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/shared/components/ui/item'
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from '@/shared/components/ui/attachment'
import { StatusBadge } from '@/features/accounts/components/AccountSheets'
import { ChartContainer, type ChartConfig } from '@/shared/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar'
import { Progress } from '@/shared/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Slider } from '@/shared/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'
import { DateTimeLibrarySection } from './DateTimeLibrarySection'

type Entry = { file: string; path: string; group: string; description: string }

type DemoRow = { id: string; ten: string; trangThai: string }
const demoColumns: DataColumn<DemoRow>[] = [
  { id: 'ten', header: 'Tên minh họa', cell: (row) => row.ten },
  { id: 'trangThai', header: 'Trạng thái', cell: (row) => <Badge variant={row.trangThai === 'Đang hoạt động' ? 'success' : 'secondary'}>{row.trangThai}</Badge> },
]
const demoRows: DemoRow[] = [
  { id: 'mau-01', ten: 'Nguyễn An', trangThai: 'Đang hoạt động' },
  { id: 'mau-02', ten: 'Trần Bình', trangThai: 'Bản nháp' },
  { id: 'mau-03', ten: 'Lê Chi', trangThai: 'Đang hoạt động' },
]
const chartConfig: ChartConfig = { soLuong: { label: 'Số lượng', color: 'var(--primary)' } }

const files = Object.keys(import.meta.glob('/src/**/*.tsx'))
  .filter((file) => !['/src/features/developer/ComponentLibraryPage.tsx', '/src/features/developer/DateTimeLibrarySection.tsx', '/src/main.tsx', '/src/app/router/router.tsx'].includes(file) && !file.startsWith('/src/shared/components/date-time/'))
  .sort()

const groupFor = (path: string) => {
  if (path.includes('/ui/')) {
    const file = path.split('/').pop() ?? ''
    if (/button|toggle/.test(file)) return 'Nút bấm và thao tác'
    if (/input|textarea|label|field|input-otp/.test(file)) return 'Nhập liệu và biểu mẫu'
    if (/checkbox|radio|switch|select|combobox|calendar|slider|command/.test(file)) return 'Lựa chọn và bộ lọc'
    if (/table|pagination|chart/.test(file)) return 'Bảng dữ liệu và phân trang'
    if (/dialog|sheet|drawer|popover|alert-dialog/.test(file)) return 'Hộp thoại và bảng trượt'
    if (/navigation|breadcrumb|menubar|dropdown|context-menu|tabs|accordion|collapsible/.test(file)) return 'Điều hướng'
    if (/card|badge|avatar|item|statistic/.test(file)) return 'Thẻ thông tin và thống kê'
    if (/alert|message|bubble|attachment|empty|kbd|marker|progress|skeleton|spinner|sonner/.test(file)) return 'Thông báo và trạng thái'
    return 'Thành phần dùng chung'
  }
  if (/(DataTable|EmptyState|LoadingState|StandardSheet|ConfirmDialog|StatisticCard|PageHeader|NotFoundPage)\.tsx$/.test(path)) return 'Thành phần dùng chung'
  if (path.includes('/features/auth/')) return 'Xác thực'
  if (path.includes('/features/accounts/')) return 'Tài khoản và hồ sơ'
  if (path.includes('/features/authorization/')) return 'Phân quyền'
  if (path.includes('/features/organizations/')) return 'Tổ chức'
  if (path.includes('/features/dashboard/')) return 'Tổng quan'
  if (path.includes('/features/settings/')) return 'Cài đặt'
  if (path.includes('/features/')) return 'Thành phần đặc thù của hệ thống'
  if (path.includes('/layouts/')) return 'Bố cục ứng dụng'
  return 'Thành phần dùng chung'
}

const entries: Entry[] = files.map((path) => {
  const file = path.split('/').pop() ?? path
  const group = groupFor(path)
  const descriptions: Record<string, string> = {
    'Nút bấm và thao tác': 'Điều khiển thao tác hoặc trạng thái lựa chọn trong giao diện.',
    'Nhập liệu và biểu mẫu': 'Nhận văn bản, ngày tháng và lựa chọn từ người dùng.',
    'Lựa chọn và bộ lọc': 'Cho phép chọn một hoặc nhiều giá trị để điều chỉnh trạng thái hiển thị.',
    'Bảng dữ liệu và phân trang': 'Trình bày dữ liệu có cấu trúc, phân trang hoặc trực quan hóa.',
    'Hộp thoại và bảng trượt': 'Hiển thị nội dung phủ hoặc vùng thao tác bên cạnh trang.',
    'Điều hướng và chuyển nội dung': 'Hỗ trợ di chuyển, mở mục hoặc chuyển giữa các vùng nội dung.',
    'Hiển thị thông tin và phản hồi': 'Hiển thị trạng thái, thông báo, tiến trình hoặc dữ liệu tóm tắt.',
    'Bố cục và tiện ích': 'Khối trình bày hoặc tiện ích giao diện dùng chung.',
    'Thành phần dùng chung': 'Thành phần giao diện được chia sẻ giữa các khu vực ứng dụng.',
    'Bố cục ứng dụng': 'Khung điều hướng và vùng hiển thị nội dung ứng dụng.',
    'Thành phần đặc thù của hệ thống': 'Thành phần thuộc một phân hệ nghiệp vụ; xem ghi chú về phụ thuộc dữ liệu và quyền.',
  }
  return { file, path: path.replace(/^\/src\//, 'frontend/src/'), group, description: descriptions[group] ?? `Thành phần giao diện thuộc khu vực ${group.toLocaleLowerCase('vi')}.` }
})

function Preview({ file }: { file: string }) {
  const [checked, setChecked] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [value, setValue] = useState([42])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showRows, setShowRows] = useState(true)
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 10, 3))
  if (file === 'button-group.tsx') return <ButtonGroup><Button variant="outline" onClick={() => setValue([Math.max(0, (value[0] ?? 0) - 1)])}>−</Button><ButtonGroupText>{value[0] ?? 0}</ButtonGroupText><Button variant="outline" onClick={() => setValue([Math.min(99, (value[0] ?? 0) + 1)])}>+</Button></ButtonGroup>
  if (file === 'button.tsx') return <div className="flex flex-wrap items-center gap-2"><Button onClick={() => setEnabled(!enabled)}>{enabled ? 'Nút chính' : 'Đã bấm'}</Button><Button variant="secondary">Phụ</Button><Button variant="outline">Viền</Button><Button variant="destructive">Cảnh báo</Button><Button variant="ghost">Nhẹ</Button><Button variant="link">Liên kết</Button><Button disabled>Vô hiệu hóa</Button><Button disabled><Spinner/>Đang xử lý</Button></div>
  if (file === 'toggle.tsx') return <div className="flex gap-2"><Toggle pressed={enabled} onPressedChange={setEnabled}>Bật / tắt</Toggle><Toggle variant="outline" pressed={!enabled} onPressedChange={(pressed) => setEnabled(!pressed)}>Có viền</Toggle></div>
  if (file === 'badge.tsx') return <div className="flex flex-wrap gap-2"><Badge>Đang hoạt động</Badge><Badge variant="secondary">Bản nháp</Badge><Badge variant="success">Thành công</Badge><Badge variant="destructive">Lỗi</Badge><Badge variant="outline">Viền</Badge></div>
  if (file === 'input.tsx') return <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="demo-input">Ô văn bản</Label><Input id="demo-input" placeholder="Nhập tên minh họa" /></div><div className="space-y-2"><Label htmlFor="demo-password">Mật khẩu</Label><Input id="demo-password" type="password" placeholder="Nhập mật khẩu mẫu" /></div><div className="space-y-2"><Label htmlFor="demo-date">Ngày</Label><DatePicker id="demo-date" aria-label="Ngày minh họa" onChange={() => undefined} /></div><div className="space-y-2"><Label htmlFor="demo-datetime">Ngày và giờ</Label><DateTimePicker id="demo-datetime" aria-label="Ngày giờ minh họa" onChange={() => undefined} /></div></div>
  if (file === 'input-group.tsx') return <InputGroup><InputGroupAddon><InputGroupText>Mã mẫu</InputGroupText></InputGroupAddon><InputGroupInput aria-label="Giá trị mẫu" placeholder="Nhập giá trị"/><InputGroupAddon align="inline-end"><InputGroupText>ký tự</InputGroupText></InputGroupAddon></InputGroup>
  if (file === 'textarea.tsx') return <Textarea aria-label="Nội dung minh họa" placeholder="Nhập nội dung nhiều dòng" />
  if (file === 'checkbox.tsx') return <label className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} /><span>Chọn tùy chọn minh họa</span></label>
  if (file === 'switch.tsx') return <label className="flex items-center gap-3"><Switch checked={enabled} onCheckedChange={setEnabled} /><span>{enabled ? 'Đang bật' : 'Đang tắt'}</span></label>
  if (file === 'select.tsx') return <Select defaultValue="mot"><SelectTrigger className="w-full"><SelectValue placeholder="Chọn một mục" /></SelectTrigger><SelectContent><SelectItem value="mot">Lựa chọn thứ nhất</SelectItem><SelectItem value="hai">Lựa chọn thứ hai</SelectItem></SelectContent></Select>
  if (file === 'combobox.tsx') return <Combobox items={['Chi bộ mẫu A', 'Chi bộ mẫu B', 'Chi bộ mẫu C']}><ComboboxInput placeholder="Tìm và chọn chi bộ mẫu"/><ComboboxContent><ComboboxEmpty>Không có lựa chọn phù hợp.</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox>
  if (file === 'tabs.tsx') return <Tabs defaultValue="mot"><TabsList><TabsTrigger value="mot">Thông tin</TabsTrigger><TabsTrigger value="hai">Lịch sử</TabsTrigger></TabsList><TabsContent value="mot" className="pt-3 text-sm text-muted-foreground">Nội dung tab thông tin minh họa.</TabsContent><TabsContent value="hai" className="pt-3 text-sm text-muted-foreground">Nội dung tab lịch sử minh họa.</TabsContent></Tabs>
  if (file === 'dialog.tsx') return <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><Button variant="outline" onClick={() => setDialogOpen(true)}>Mở hộp thoại</Button><DialogContent><DialogHeader><DialogTitle>Hộp thoại minh họa</DialogTitle><DialogDescription>Thử mở và đóng hộp thoại. Không có dữ liệu nghiệp vụ được gửi đi.</DialogDescription></DialogHeader><Button className="w-fit" onClick={() => setDialogOpen(false)}>Đóng</Button></DialogContent></Dialog>
  if (file === 'alert-dialog.tsx') return <AlertDialog><AlertDialogTrigger asChild><Button variant="outline">Mở hộp thoại xác nhận</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận thao tác minh họa?</AlertDialogTitle><AlertDialogDescription>Thao tác này chỉ thay đổi trạng thái hiển thị trong trang thư viện.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => setEnabled(!enabled)}>Xác nhận thử</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  if (file === 'sheet.tsx') return <Sheet><SheetTrigger asChild><Button variant="outline">Mở bảng trượt</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Bảng trượt minh họa</SheetTitle><SheetDescription>Ví dụ tương tác cục bộ trong thư viện.</SheetDescription></SheetHeader></SheetContent></Sheet>
  if (file === 'drawer.tsx') return <Drawer><DrawerTrigger asChild><Button variant="outline">Mở ngăn trượt</Button></DrawerTrigger><DrawerContent><DrawerHeader><DrawerTitle>Ngăn trượt minh họa</DrawerTitle><DrawerDescription>Nội dung tương tác tại chỗ, không gửi dữ liệu.</DrawerDescription></DrawerHeader><div className="px-4 py-6"><Input placeholder="Trường minh họa"/></div><DrawerFooter><DrawerClose asChild><Button variant="outline">Đóng</Button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
  if (file === 'card.tsx') return <Card><CardHeader><CardTitle>Thẻ thông tin</CardTitle><CardDescription>Mô tả ngắn cho thẻ.</CardDescription></CardHeader><CardContent className="text-sm">Nội dung minh họa của Card.</CardContent></Card>
  if (file === 'alert.tsx') return <div className="space-y-2"><Alert><AlertTitle>Thông tin</AlertTitle><AlertDescription>Đây là thông báo trung tính.</AlertDescription></Alert><Alert variant="destructive"><AlertTitle>Cần chú ý</AlertTitle><AlertDescription>Ví dụ trạng thái cảnh báo.</AlertDescription></Alert></div>
  if (file === 'accordion.tsx') return <Accordion type="single" collapsible><AccordionItem value="muc"><AccordionTrigger>Mở nội dung</AccordionTrigger><AccordionContent>Nội dung mở rộng minh họa.</AccordionContent></AccordionItem></Accordion>
  if (file === 'radio-group.tsx') return <RadioGroup defaultValue="mot"><label className="flex items-center gap-2"><RadioGroupItem value="mot" />Lựa chọn một</label><label className="flex items-center gap-2"><RadioGroupItem value="hai" />Lựa chọn hai</label></RadioGroup>
  if (file === 'slider.tsx') return <div className="space-y-3"><Slider value={value} onValueChange={setValue} max={100} aria-label="Giá trị minh họa" /><p className="text-xs text-muted-foreground">Giá trị: {value[0] ?? 0}</p></div>
  if (file === 'progress.tsx') return <div className="space-y-2"><Progress value={68} /><p className="text-xs text-muted-foreground">Tiến trình minh họa · 68%</p></div>
  if (file === 'separator.tsx') return <div className="space-y-3"><span>Nội dung phía trên</span><Separator /><span>Nội dung phía dưới</span></div>
  if (file === 'avatar.tsx') return <AvatarGroup><Avatar><AvatarFallback>NA</AvatarFallback></Avatar><Avatar><AvatarFallback>BT</AvatarFallback></Avatar><AvatarGroupCount>+3</AvatarGroupCount></AvatarGroup>
  if (file === 'pagination.tsx') return <Pagination aria-label="Phân trang minh họa"><PaginationContent><PaginationItem><PaginationLink href="#" aria-label="Trang trước" onClick={(event) => {event.preventDefault(); setValue([Math.max(1, (value[0] ?? 1) - 1)])}}>‹</PaginationLink></PaginationItem><PaginationItem><PaginationLink href="#" isActive onClick={(event) => event.preventDefault()}>{value[0] ?? 1}</PaginationLink></PaginationItem><PaginationItem><PaginationLink href="#" aria-label="Trang tiếp theo" onClick={(event) => {event.preventDefault(); setValue([(value[0] ?? 1) + 1])}}>›</PaginationLink></PaginationItem></PaginationContent></Pagination>
  if (file === 'popover.tsx') return <Popover><PopoverTrigger asChild><Button variant="outline">Mở popover</Button></PopoverTrigger><PopoverContent><PopoverHeader><PopoverTitle>Tùy chọn</PopoverTitle><PopoverDescription>Các thay đổi chỉ để xem thử.</PopoverDescription></PopoverHeader><Input className="mt-3" placeholder="Nội dung minh họa" /></PopoverContent></Popover>
  if (file === 'tooltip.tsx') return <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline">Di chuột hoặc nhấn Tab</Button></TooltipTrigger><TooltipContent>Tooltip từ component nguồn</TooltipContent></Tooltip></TooltipProvider>
  if (file === 'collapsible.tsx') return <Collapsible open={enabled} onOpenChange={setEnabled}><CollapsibleTrigger asChild><Button variant="outline">{enabled ? 'Đóng nội dung' : 'Mở nội dung'}</Button></CollapsibleTrigger><CollapsibleContent className="pt-3 text-sm">Vùng nội dung có thể thu gọn.</CollapsibleContent></Collapsible>
  if (file === 'aspect-ratio.tsx') return <AspectRatio ratio={16 / 5} className="flex items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">Khung tỷ lệ 16:5</AspectRatio>
  if (file === 'table.tsx') return <Table><TableHeader><TableRow><TableHead>Mục</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Mẫu A</TableCell><TableCell>Hoạt động</TableCell></TableRow><TableRow><TableCell>Mẫu B</TableCell><TableCell>Bản nháp</TableCell></TableRow></TableBody></Table>
  if (file === 'empty.tsx') return <Empty><EmptyHeader><EmptyTitle>Chưa có dữ liệu</EmptyTitle><EmptyDescription>Đây là trạng thái rỗng minh họa.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={() => setEnabled(!enabled)}>{enabled ? 'Thử lại' : 'Đã thử'}</Button></Empty>
  if (file === 'breadcrumb.tsx') return <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbPage>Tổng quan</BreadcrumbPage></BreadcrumbItem><BreadcrumbSeparator/><BreadcrumbItem><BreadcrumbPage>Thư viện</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
  if (file === 'hover-card.tsx') return <HoverCard><HoverCardTrigger asChild><Button variant="link">Di chuột hoặc tập trung để xem</Button></HoverCardTrigger><HoverCardContent><p className="font-medium">Thông tin minh họa</p><p className="text-sm text-muted-foreground">Nội dung thẻ khi rê chuột.</p></HoverCardContent></HoverCard>
  if (file === 'kbd.tsx') return <div className="flex items-center gap-2 text-sm">Phím tắt <KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup></div>
  if (file === 'spinner.tsx') return <div className="flex items-center gap-2"><Spinner/><span className="text-sm text-muted-foreground">Đang xử lý</span></div>
  if (file === 'bubble.tsx') return <BubbleGroup><Bubble><BubbleContent>Xin chào, đây là tin nhắn mẫu.</BubbleContent></Bubble><Bubble align="end" variant="secondary"><BubbleContent>Tôi có thể tương tác với bong bóng này.</BubbleContent></Bubble></BubbleGroup>
  if (file === 'message.tsx') return <MessageGroup><Message><MessageHeader>Người gửi · vừa xong</MessageHeader><MessageContent><p className="rounded-xl bg-muted px-3 py-2 text-sm">Thông điệp mẫu hiển thị bằng Message.</p></MessageContent><MessageFooter>Trạng thái minh họa</MessageFooter></Message></MessageGroup>
  if (file === 'message-scroller.tsx') return <MessageScrollerProvider><MessageScroller className="h-48 rounded-md border"><MessageScrollerViewport><MessageScrollerContent className="gap-3 p-3">{Array.from({ length: 6 }, (_, index) => <MessageScrollerItem key={index} className="rounded-md bg-muted p-3 text-sm">Tin nhắn minh họa {index + 1}</MessageScrollerItem>)}</MessageScrollerContent></MessageScrollerViewport></MessageScroller></MessageScrollerProvider>
  if (file === 'marker.tsx') return <div className="space-y-3"><Marker><MarkerIcon><span className="size-2 rounded-full bg-primary"/></MarkerIcon><MarkerContent>Đang hoạt động</MarkerContent></Marker><Marker variant="border"><MarkerContent>Phân cách bằng viền</MarkerContent></Marker><Marker variant="separator"><MarkerContent>Mục được phân tách</MarkerContent></Marker></div>
  if (file === 'sonner.tsx') return <div className="flex items-center gap-3"><Toaster/><Button variant="outline" onClick={() => toast.success('Thông báo minh họa')}>Hiện thông báo</Button><Button variant="ghost" onClick={() => toast.error('Thông báo lỗi minh họa')}>Thử trạng thái lỗi</Button></div>
  if (file === 'field.tsx') return <FieldSet><FieldLegend>Thông tin minh họa</FieldLegend><Field><FieldLabel htmlFor="field-demo">Tên hiển thị</FieldLabel><Input id="field-demo" placeholder="Nhập tên"/><FieldDescription>Trường dữ liệu chỉ dùng thử tại thư viện.</FieldDescription><FieldError>Thông báo kiểm tra mẫu.</FieldError></Field></FieldSet>
  if (file === 'label.tsx') return <div className="space-y-2"><Label htmlFor="label-demo">Nhãn gắn với trường nhập</Label><Input id="label-demo" placeholder="Nhập nội dung"/></div>
  if (file === 'carousel.tsx') return <div className="mx-auto w-[85%]"><Carousel opts={{ loop: true }}><CarouselContent>{['Mục thứ nhất', 'Mục thứ hai', 'Mục thứ ba'].map((text) => <CarouselItem key={text} className="basis-1/2"><div className="rounded-md border bg-card p-6 text-center text-sm">{text}</div></CarouselItem>)}</CarouselContent><CarouselPrevious/><CarouselNext/></Carousel></div>
  if (file === 'scroll-area.tsx') return <ScrollArea className="h-40 rounded-md border p-4">{Array.from({ length: 10 }, (_, index) => <p className="border-b py-3 text-sm" key={index}>Dòng nội dung cuộn minh họa {index + 1}</p>)}</ScrollArea>
  if (file === 'resizable.tsx') return <ResizablePanelGroup orientation="horizontal" className="min-h-36 rounded-md border"><ResizablePanel defaultSize={50}><div className="grid h-full place-items-center p-3 text-sm">Kéo thanh chia để đổi kích thước</div></ResizablePanel><ResizableHandle withHandle/><ResizablePanel defaultSize={50}><div className="grid h-full place-items-center bg-muted/40 p-3 text-sm">Vùng thứ hai</div></ResizablePanel></ResizablePanelGroup>
  if (file === 'command.tsx') return <Command className="rounded-lg border shadow-sm"><CommandInput placeholder="Tìm lựa chọn…"/><CommandList><CommandEmpty>Không tìm thấy kết quả.</CommandEmpty><CommandGroup heading="Tác vụ mẫu"><CommandItem onSelect={() => setEnabled(true)}>Xem chi tiết</CommandItem><CommandItem onSelect={() => setEnabled(false)}>Chỉnh sửa</CommandItem></CommandGroup></CommandList></Command>
  if (file === 'context-menu.tsx') return <ContextMenu><ContextMenuTrigger className="grid min-h-24 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">Nhấp chuột phải hoặc chạm giữ tại đây</ContextMenuTrigger><ContextMenuContent><ContextMenuItem onSelect={() => setEnabled(true)}>Xem chi tiết</ContextMenuItem><ContextMenuItem onSelect={() => setEnabled(true)}>Chỉnh sửa</ContextMenuItem><ContextMenuItem onSelect={() => setEnabled(false)}>Xóa minh họa</ContextMenuItem></ContextMenuContent></ContextMenu>
  if (file === 'menubar.tsx') return <Menubar><MenubarMenu><MenubarTrigger>Tác vụ</MenubarTrigger><MenubarContent><MenubarItem onSelect={() => setEnabled(true)}>Xem chi tiết</MenubarItem><MenubarItem onSelect={() => setEnabled(true)}>Chỉnh sửa</MenubarItem><MenubarItem onSelect={() => setEnabled(false)}>Xóa minh họa</MenubarItem></MenubarContent></MenubarMenu></Menubar>
  if (file === 'navigation-menu.tsx') return <NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Mở nhóm</NavigationMenuTrigger><NavigationMenuContent className="p-4"><p className="w-48 text-sm">Nội dung điều hướng mẫu.</p></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>
  if (file === 'item.tsx') return <Item variant="outline"><ItemContent><ItemTitle>Tiêu đề mục</ItemTitle><ItemDescription>Mô tả ngắn về thành phần Item.</ItemDescription></ItemContent><Button variant="outline" size="sm" onClick={() => setEnabled(!enabled)}>{enabled ? 'Chọn' : 'Đã chọn'}</Button></Item>
  if (file === 'attachment.tsx') return <div className="space-y-2"><Attachment state="done"><AttachmentMedia><FileText/></AttachmentMedia><AttachmentContent><AttachmentTitle>tai-lieu-minh-hoa.pdf</AttachmentTitle><AttachmentDescription>Đã tải lên · 1,2 MB</AttachmentDescription></AttachmentContent></Attachment><Attachment state="uploading"><AttachmentMedia><Spinner/></AttachmentMedia><AttachmentContent><AttachmentTitle>tep-dang-tai.docx</AttachmentTitle><AttachmentDescription>Đang tải · 64%</AttachmentDescription></AttachmentContent></Attachment><Attachment state="error"><AttachmentMedia><FileText/></AttachmentMedia><AttachmentContent><AttachmentTitle>tep-loi.txt</AttachmentTitle><AttachmentDescription>Không thể tải tệp</AttachmentDescription></AttachmentContent></Attachment></div>
  if (file === 'chart.tsx') return <ChartContainer config={chartConfig} className="min-h-40 w-full"><BarChart accessibilityLayer data={[{ thang: 'Tháng 1', soLuong: 18 }, { thang: 'Tháng 2', soLuong: 27 }, { thang: 'Tháng 3', soLuong: 22 }]}><CartesianGrid vertical={false}/><XAxis dataKey="thang" tickLine={false} axisLine={false}/><Bar dataKey="soLuong" fill="var(--color-soLuong)" radius={4}/></BarChart></ChartContainer>
  if (file === 'sidebar.tsx') return <SidebarProvider className="min-h-40 rounded-md border"><Sidebar collapsible="none" className="min-h-40"><SidebarContent><SidebarGroup><SidebarGroupLabel>Nhóm minh họa</SidebarGroupLabel><SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive>Tổng quan</SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton>Danh sách mẫu</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent></Sidebar><main className="flex-1 p-4"><SidebarTrigger/><p className="mt-3 text-sm">Vùng nội dung</p></main></SidebarProvider>
  if (file === 'DataTable.tsx') return <div className="space-y-3"><div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => setShowRows(!showRows)}>{showRows ? 'Thử trạng thái trống' : 'Hiện dữ liệu mẫu'}</Button></div><DataTable columns={demoColumns} rows={showRows ? demoRows : []} getRowId={(row) => row.id} emptyTitle="Chưa có dữ liệu minh họa" /></div>
  if (file === 'EmptyState.tsx') return <EmptyState title="Chưa có hồ sơ minh họa" description="Khi có dữ liệu, danh sách sẽ xuất hiện tại đây." />
  if (file === 'LoadingState.tsx') return <div className="rounded-md border p-4"><LoadingState /></div>
  if (file === 'StandardSheet.tsx') return <><Button onClick={() => setSheetOpen(true)}>Mở bảng trượt</Button><StandardSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Thêm Đảng viên · khung minh họa" description="Bố cục dùng tại biểu mẫu thêm mới Đảng viên." size="wide" footer={<><Button variant="outline" onClick={() => setSheetOpen(false)}>Hủy</Button><Button onClick={() => setSheetOpen(false)}>Lưu minh họa</Button></>}><div className="space-y-6"><Card><CardHeader><CardTitle>Thông tin cá nhân</CardTitle><CardDescription>Dữ liệu mẫu, không gửi đi.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Họ và tên</Label><Input defaultValue="Nguyễn An" /></div><div className="space-y-2"><Label>Ngày sinh</Label><DatePicker aria-label="Ngày sinh minh họa" value="2000-01-15" onChange={() => undefined} /></div><div className="space-y-2 sm:col-span-2"><Label>Ghi chú</Label><Textarea placeholder="Nhập nội dung minh họa" /></div></CardContent></Card><Card><CardHeader><CardTitle>Cuộn nội dung</CardTitle></CardHeader><CardContent className="space-y-3">{Array.from({ length: 5 }, (_, index) => <p key={index} className="rounded-md border p-4 text-sm">Nội dung mẫu {index + 1} để kiểm tra vùng cuộn của bảng trượt.</p>)}</CardContent></Card></div></StandardSheet></>
  if (file === 'ConfirmDialog.tsx') return <ConfirmDialog trigger={<Button variant="destructive">Mở hộp thoại xác nhận</Button>} title="Xác nhận thao tác minh họa" description="Đây chỉ là thao tác thử tại thư viện. Không có dữ liệu nào bị xóa hoặc cập nhật." confirmLabel="Xác nhận thử" destructive onConfirm={() => setEnabled(false)} />
  if (file === 'StatisticCard.tsx') return <StatisticCard label="Hồ sơ minh họa" value="128" description="Số liệu mẫu tại thư viện" icon={<Component className="size-4" />} />
  if (file === 'AccountSheets.tsx') return <div className="flex flex-wrap items-center gap-3"><StatusBadge status="DANG_HOAT_DONG"/><StatusBadge status="TAM_KHOA"/><StatusBadge status="NGUNG_HOAT_DONG"/><p className="w-full text-xs text-muted-foreground">Các biểu mẫu còn lại trong tệp gọi API tìm hồ sơ khi mở nên không được kích hoạt tại thư viện.</p></div>
  if (file === 'PageHeader.tsx') return <PageHeader title="Tiêu đề trang mẫu" description="Mô tả ngắn của khu vực nội dung." actions={<Button size="sm">Thao tác</Button>} />
  if (file === 'PageContainer.tsx') return <div className="rounded-md border"><PageContainer><p className="rounded-md bg-muted p-3 text-sm">Nội dung bên trong vùng trang.</p></PageContainer></div>
  if (file === 'NotFoundPage.tsx') return <div className="max-h-72 overflow-auto rounded-md border"><NotFoundPage /></div>
  if (file === 'calendar.tsx') return <Calendar locale={vi} mode="single" selected={date} onSelect={setDate} className="mx-auto rounded-md border" />
  if (file === 'input-otp.tsx') return <InputOTP maxLength={6} defaultValue="123456"><InputOTPGroup><InputOTPSlot index={0}/><InputOTPSlot index={1}/><InputOTPSlot index={2}/></InputOTPGroup><InputOTPSeparator/><InputOTPGroup><InputOTPSlot index={3}/><InputOTPSlot index={4}/><InputOTPSlot index={5}/></InputOTPGroup></InputOTP>
  if (file === 'dropdown-menu.tsx') return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Mở danh sách thao tác</Button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => setEnabled(true)}>Xem chi tiết</DropdownMenuItem><DropdownMenuItem onSelect={() => setEnabled(true)}>Chỉnh sửa</DropdownMenuItem><DropdownMenuItem onSelect={() => setEnabled(false)}>Xóa minh họa</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  if (file === 'skeleton.tsx') return <div className="space-y-3"><Skeleton className="h-5 w-2/3"/><Skeleton className="h-4 w-full"/><Skeleton className="h-16 w-full"/></div>
  const reasons: Record<string, string> = {
    'App.tsx': 'Điểm ghép RouterProvider cùng toàn bộ provider ứng dụng; render lần nữa sẽ khởi tạo phiên và truy vấn thật.',
    'AppProviders.tsx': 'Khởi tạo QueryClient, giao diện và AuthProvider; AuthProvider đọc phiên đăng nhập thật.',
    'AuthProvider.tsx': 'Quản lý phiên đăng nhập và gọi API phiên khi được khởi tạo.',
    'RequireAuth.tsx': 'Đọc phiên thật và có thể chuyển tuyến hoặc mở luồng đổi mật khẩu.',
    'theme-provider.tsx': 'Cung cấp trạng thái giao diện toàn ứng dụng; lồng thêm sẽ tác động toàn trang.',
    'direction.tsx': 'Cung cấp ngữ cảnh chiều hiển thị cho các phần tử con; riêng tệp này không vẽ giao diện độc lập.',
    'RouteErrorPage.tsx': 'Dùng useRouteError chỉ hợp lệ bên trong error boundary của Router.',
    'AuthorizationPageHeader.tsx': 'Phụ thuộc tuyến đường hiện tại; thao tác tab sẽ điều hướng phân hệ thật.',
    'AdminLayout.tsx': 'Dùng phiên hiện tại, Sidebar và menu tài khoản; lồng khung lần nữa sẽ tạo điều hướng lồng nhau.',
    'UserDropdown.tsx': 'Hiển thị tài khoản và thao tác phiên thật; không đưa thông tin tài khoản vào khu vực minh họa.',
    'ChangePasswordDialog.tsx': 'Biểu mẫu có thể gọi API đổi mật khẩu thật; không mở trong thư viện.',
    'ChangePasswordPage.tsx': 'Thực hiện đổi mật khẩu qua API thật; không khởi tạo luồng này trong thư viện.',
    'LoginPage.tsx': 'Gửi thông tin đăng nhập tới API xác thực thật; không khởi tạo luồng này trong thư viện.',
    'AccountAssignmentsPage.tsx': 'Đọc và thay đổi Assignment theo quyền thật; không tải dữ liệu hoặc mở thao tác nghiệp vụ.',
    'AccountsPage.tsx': 'Đọc và thay đổi tài khoản qua API thật; không tải dữ liệu hoặc mở thao tác nghiệp vụ.',
    'MemberProfilesPage.tsx': 'Tải dữ liệu hồ sơ và có thể gửi tạo/sửa tới API thật; phần Sheet dùng StandardSheet.tsx được trình diễn riêng bằng dữ liệu cục bộ.',
    'PermissionCatalogPage.tsx': 'Đọc danh mục quyền từ API theo quyền phiên hiện tại.',
    'RoleDetailPage.tsx': 'Đọc và cập nhật vai trò/quyền thật qua API.',
    'RoleListPage.tsx': 'Đọc và thay đổi vai trò thật qua API.',
    'DashboardPage.tsx': 'Tải số liệu tổng quan theo phiên đăng nhập thật.',
    'OrganizationsPage.tsx': 'Đọc và thay đổi cơ cấu tổ chức qua API thật.',
    'SettingsPage.tsx': 'Gắn với cấu hình và trạng thái ứng dụng hiện hành.',
  }
  return <div className="rounded-md border border-dashed p-4 text-sm"><p className="font-medium">Chưa thể chạy độc lập an toàn</p><p className="mt-1 text-muted-foreground">{reasons[file] ?? 'Tệp này xuất tiện ích hoặc hook cần ngữ cảnh được tạo ở nơi sử dụng; không có giao diện độc lập để trình bày.'}</p></div>
}

export function ComponentLibraryPage() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('Tất cả nhóm')
  const groups = useMemo(() => [...new Set(entries.map((item) => item.group))], [])
  const filtered = entries.filter((entry) => `${entry.file} ${entry.path}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) && (group === 'Tất cả nhóm' || entry.group === group))
  const grouped = groups.map((name) => [name, filtered.filter((entry) => entry.group === name)] as const).filter(([, items]) => items.length)
  return <main className="mx-auto max-w-7xl space-y-8 pb-12">
    <header className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Component className="size-4" /> Thư viện phát triển</div><h1 className="text-3xl font-semibold tracking-tight">Thư viện thành phần giao diện</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Xem trước và trải nghiệm các thành phần giao diện đang được sử dụng trong hệ thống.</p></div><div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"><Layers3 className="size-5 text-primary"/><div><div className="text-2xl font-semibold leading-none">{entries.length}</div><div className="mt-1 text-xs text-muted-foreground">thành phần đã tìm thấy</div></div></div></div>
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_260px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Tìm theo tên file…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Tìm theo tên file" /></div><Select value={group} onValueChange={(value) => setGroup(value ?? 'Tất cả nhóm')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Tất cả nhóm">Tất cả nhóm</SelectItem>{groups.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => { setQuery(''); setGroup('Tất cả nhóm') }}><RotateCcw className="size-4"/>Đặt lại</Button></div>
      <p className="text-sm text-muted-foreground">Đang hiển thị <span className="font-medium text-foreground">{filtered.length}</span> / {entries.length} thành phần · Tương tác trên trang chỉ dùng dữ liệu minh họa.</p>
    </header>
    {grouped.length ? grouped.map(([name, items]) => <section key={name} className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{name}</h2><Badge variant="secondary">{items.length}</Badge></div><div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <Card key={item.path} className="min-w-0 overflow-hidden"><CardHeader className="gap-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><CardTitle className="font-mono text-sm">{item.file}</CardTitle><CardDescription className="mt-2">{item.description}</CardDescription></div><Badge variant="outline">{item.group}</Badge></div><code className="block break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{item.path}</code></CardHeader><CardContent><div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Minh họa trực tiếp</div><div className="min-h-20 rounded-lg border bg-background p-4"><Preview file={item.file}/></div></CardContent></Card>)}</div></section>) : <div className="rounded-xl border border-dashed p-12 text-center"><p className="font-medium">Không tìm thấy thành phần phù hợp</p><p className="mt-1 text-sm text-muted-foreground">Thử từ khóa khác hoặc đặt lại bộ lọc.</p></div>}
    <DateTimeLibrarySection />
  </main>
}
