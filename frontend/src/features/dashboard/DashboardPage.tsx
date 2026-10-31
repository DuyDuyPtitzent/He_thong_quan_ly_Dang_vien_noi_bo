import { ArrowDownRight, ArrowUpRight, Users, Wallet, Activity, Clock3 } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { EmptyState } from '@/shared/components/EmptyState'

const metrics = [
  { label: 'Tổng người dùng', value: '2.480', change: '+12,8%', icon: Users, up: true },
  { label: 'Yêu cầu xử lý', value: '184', change: '+8,2%', icon: Activity, up: true },
  { label: 'Tỷ lệ hoàn thành', value: '96,4%', change: '+2,4%', icon: Wallet, up: true },
  { label: 'Thời gian phản hồi', value: '2,4 giờ', change: '-0,6 giờ', icon: Clock3, up: false },
]
const activity = [
  { name: 'Nguyễn Minh Anh', action: 'đã tạo hồ sơ mới', time: '5 phút trước', status: 'Hoàn tất' },
  {
    name: 'Trần Hoàng Nam',
    action: 'đã cập nhật thông tin',
    time: '22 phút trước',
    status: 'Đang xử lý',
  },
  { name: 'Lê Thu Hà', action: 'đã gửi yêu cầu hỗ trợ', time: '1 giờ trước', status: 'Mới' },
  {
    name: 'Phạm Quốc Bảo',
    action: 'đã hoàn thành biểu mẫu',
    time: '2 giờ trước',
    status: 'Hoàn tất',
  },
]
export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Chào mừng trở lại. Đây là tình hình hoạt động gần đây."
        actions={<Button variant="outline">Tải báo cáo</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{item.label}</CardDescription>
              <item.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{item.value}</div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {item.up ? (
                  <ArrowUpRight className="size-3 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="size-3 text-emerald-600" />
                )}
                <span className="font-medium text-emerald-600">{item.change}</span> so với tháng
                trước
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Cập nhật mới nhất từ các module trong hệ thống.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Hoạt động</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'Hoàn tất' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Tiến độ công việc</CardTitle>
            <CardDescription>Tổng hợp các yêu cầu trong tuần này.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex h-48 items-end justify-around gap-3"
              role="img"
              aria-label="Biểu đồ cột hoạt động trong tuần"
            >
              {[42, 68, 52, 88, 61, 76, 94].map((height, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t-sm bg-primary/80"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {'T2 T3 T4 T5 T6 T7 CN'.split(' ')[i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-2xl font-semibold">1.284</p>
                <p className="text-xs text-muted-foreground">Yêu cầu đã xử lý</p>
              </div>
              <Badge variant="outline">7 ngày qua</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <EmptyState
          title="Khu vực module mở rộng"
          description="Thêm các widget nghiệp vụ tại feature tương ứng khi bắt đầu dự án mới."
        />
      </div>
    </>
  )
}
