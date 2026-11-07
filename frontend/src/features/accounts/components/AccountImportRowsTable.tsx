import { useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import type { AccountImportRow } from '../api/accounts.api'

const existenceLabels = {
  DA_TON_TAI: 'Đã tồn tại',
  CHUA_TON_TAI: 'Chưa tồn tại',
  CHUA_KIEM_TRA: 'Chưa kiểm tra',
} as const

export function AccountImportRowsTable({ rows, label }: { rows: AccountImportRow[]; label: string }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set())
  const toggleExpanded = (row: number) => setExpandedRows((current) => {
    const next = new Set(current)
    if (next.has(row)) next.delete(row)
    else next.add(row)
    return next
  })

  return <div className="max-w-full overflow-x-auto rounded-md border" role="region" aria-label={label} tabIndex={0}>
    <Table className="min-w-[1160px]">
      <TableHeader><TableRow>{['Dòng Excel', 'Tên đăng nhập', 'Email', 'Trạng thái ban đầu', 'Loại tài khoản', 'Kết quả', 'Trạng thái tồn tại', 'Lỗi chi tiết'].map((heading) => <TableHead key={heading}>{heading}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.length ? rows.map((row) => {
        const expanded = expandedRows.has(row.dong)
        const visibleErrors = expanded ? row.loi : row.loi.slice(0, 2)
        return <TableRow key={row.dong}>
          <TableCell>{row.dong}</TableCell>
          <TableCell className="font-medium">{row.tenDangNhap || '—'}</TableCell>
          <TableCell className="max-w-[260px] break-all">{row.email ?? '—'}</TableCell>
          <TableCell>{row.trangThai}</TableCell>
          <TableCell>{row.lienKetHoSo ? 'Liên kết hồ sơ' : 'Độc lập'}</TableCell>
          <TableCell><Badge variant={row.hopLe ? 'success' : 'destructive'}>{row.hopLe ? 'Hợp lệ' : 'Có lỗi'}</Badge></TableCell>
          <TableCell>{row.trangThaiTonTai === 'DA_TON_TAI'
            ? <Badge variant="outline" className="border-stat-exists text-stat-exists">{existenceLabels[row.trangThaiTonTai]}</Badge>
            : row.trangThaiTonTai === 'CHUA_KIEM_TRA'
              ? <Badge variant="secondary">{existenceLabels[row.trangThaiTonTai]}</Badge>
              : <span className="text-sm text-muted-foreground">{existenceLabels[row.trangThaiTonTai]}</span>}</TableCell>
          <TableCell className="max-w-[360px] whitespace-normal">
            {row.loi.length ? <div className="space-y-1">
              {visibleErrors.map((issue, index) => <p key={`${issue.field}-${index}`} className="text-sm text-destructive [overflow-wrap:anywhere]">{issue.field}: {issue.message}</p>)}
              {row.loi.length > 2 && <Button type="button" size="sm" variant="ghost" className="h-auto p-0 text-sm" aria-expanded={expanded} onClick={() => toggleExpanded(row.dong)}>{expanded ? 'Thu gọn' : `Xem thêm (${row.loi.length - 2})`}</Button>}
            </div> : <span className="text-muted-foreground">—</span>}
          </TableCell>
        </TableRow>
      }) : <TableRow><TableCell colSpan={8} className="h-20 text-center text-muted-foreground">Không có dòng phù hợp.</TableCell></TableRow>}</TableBody>
    </Table>
  </div>
}
