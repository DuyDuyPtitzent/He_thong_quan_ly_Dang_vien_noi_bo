import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DatePicker, DateRangePicker, DateTimePicker, DateTimeRangePicker, MonthPicker, YearPicker } from '@/shared/components/date-time'
import type { DateOnly, DateRangeValue, DateTimeRangeValue, LocalDateTime } from '@/shared/components/date-time'

const items = [
  { name: 'DatePicker', file: 'DatePicker.tsx', description: 'Chọn ngày dd/MM/yyyy; hỗ trợ nhập trực tiếp, giới hạn ngày và lịch chọn nhanh tháng/năm.', props: 'value · onChange · minDate · maxDate · clearable · readOnly' },
  { name: 'MonthPicker', file: 'MonthPicker.tsx', description: 'Chọn riêng tháng/năm, không tự gán ngày đầu hoặc cuối tháng.', props: 'value (yyyy-MM) · onChange · minDate · maxDate · clearable' },
  { name: 'YearPicker', file: 'YearPicker.tsx', description: 'Chọn năm theo nhóm 12 năm, có thể nhập trực tiếp và giới hạn.', props: 'value (number) · onChange · minDate · maxDate · clearable' },
  { name: 'DateTimePicker', file: 'DateTimePicker.tsx', description: 'Chọn ngày cùng giờ và phút theo định dạng 24 giờ.', props: 'value (yyyy-MM-ddTHH:mm) · onChange · minDate · maxDate' },
  { name: 'DateRangePicker', file: 'DateRangePicker.tsx', description: 'Chọn khoảng ngày với dải hover liên tục; màu khoảng cố định khi chọn ngày kết thúc.', props: 'value · onChange · confirmSelection · numberOfMonths · minDate · maxDate' },
  { name: 'DateTimeRangePicker', file: 'DateTimeRangePicker.tsx', description: 'Hai lịch liên tiếp, giờ/phút riêng cho đầu và cuối; hover xem trước rồi xác nhận.', props: 'value · onChange · minDateTime · maxDateTime · confirmSelection' },
]

export function DateTimeLibrarySection() {
  const [date, setDate] = useState<DateOnly>()
  const [month, setMonth] = useState<string>()
  const [year, setYear] = useState<number>()
  const [dateTime, setDateTime] = useState<LocalDateTime>()
  const [range, setRange] = useState<DateRangeValue>()
  const [dateTimeRange, setDateTimeRange] = useState<DateTimeRangeValue>()
  const values = [date, month, year, dateTime, range, dateTimeRange]
  const previews = [
    <DatePicker value={date} onChange={setDate} minDate="1900-01-01" maxDate="2099-12-31" />,
    <MonthPicker value={month} onChange={setMonth} minDate="1900-01-01" maxDate="2099-12-31" />,
    <YearPicker value={year} onChange={setYear} minDate="1900-01-01" maxDate="2099-12-31" />,
    <DateTimePicker value={dateTime} onChange={setDateTime} minDate="1900-01-01" maxDate="2099-12-31" />,
    <DateRangePicker value={range} onChange={setRange} confirmSelection numberOfMonths={2} />,
    <DateTimeRangePicker value={dateTimeRange} onChange={setDateTimeRange} />,
  ]
  return <section className="space-y-4"><div><h2 className="text-lg font-semibold">Bộ chọn ngày và thời gian</h2><p className="mt-1 text-sm text-muted-foreground">Mẫu tương tác cục bộ. Với bộ chọn khoảng, chọn ngày đầu rồi rê chuột để xem dải màu trước khi chọn ngày cuối.</p></div><div className="grid gap-4 lg:grid-cols-2">{items.map((item, index) => <Card key={item.name}><CardHeader><CardTitle className="font-mono text-sm">{item.name}</CardTitle><CardDescription>{item.description}</CardDescription><code className="block break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">frontend/src/shared/components/date-time/{item.file}</code></CardHeader><CardContent className="space-y-3"><div className="rounded-lg border bg-background p-4">{previews[index]}</div><p className="text-xs text-muted-foreground">Trạng thái: {JSON.stringify(values[index] ?? 'Chưa chọn')}</p><code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">{`<${item.name} value={value} onChange={setValue} />`}</code><p className="text-xs"><span className="font-medium">Thuộc tính chính:</span> {item.props}</p></CardContent></Card>)}</div></section>
}
