import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { EmptyState } from '@/shared/components/EmptyState'

export type DataColumn<Row> = {
  id: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  className?: string
}
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  emptyTitle,
}: {
  columns: DataColumn<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  emptyTitle?: string
}) {
  if (!rows.length) return <EmptyState title={emptyTitle ?? 'Chưa có dữ liệu'} />
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
