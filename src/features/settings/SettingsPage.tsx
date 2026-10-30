import { PageHeader } from '@/shared/components/PageHeader'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { appConfig } from '@/core/config/app.config'

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt" description="Quản lý cấu hình cơ bản của không gian làm việc." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Thông tin hệ thống</CardTitle>
          <CardDescription>Các giá trị mặc định có thể được thay đổi theo dự án.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="app-name">Tên ứng dụng</Label>
            <Input id="app-name" defaultValue={appConfig.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-description">Mô tả</Label>
            <Input id="app-description" defaultValue={appConfig.description} />
          </div>
          <Button>Lưu thay đổi</Button>
        </CardContent>
      </Card>
    </>
  )
}
