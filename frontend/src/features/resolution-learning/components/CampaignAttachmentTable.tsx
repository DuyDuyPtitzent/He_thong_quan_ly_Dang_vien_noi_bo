import { Download, FileText, Trash2 } from 'lucide-react'
import { DataTable, type DataColumn } from '@/shared/components/DataTable'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { formatDateTime, formatSize } from '../services/campaign-format'
import type { Attachment } from '../types/campaign'

export function CampaignAttachmentTable({ files, canDelete, deleting, onDownload, onDelete }: { files: Attachment[]; canDelete: boolean; deleting: boolean; onDownload: (file: Attachment) => void; onDelete: (id: string) => void }) {
  const columns: DataColumn<Attachment>[] = [
    { id: 'name', header: 'Tên tệp', className: 'min-w-52', cell: file => <span className="flex items-center gap-2"><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="break-all font-medium">{file.tenTepGoc}</span></span> },
    { id: 'type', header: 'Định dạng', cell: file => file.kieuNoiDung },
    { id: 'size', header: 'Dung lượng', cell: file => formatSize(file.kichThuoc) },
    { id: 'date', header: 'Ngày tải lên', cell: file => formatDateTime(file.ngayTao) },
    { id: 'actions', header: 'Thao tác', className: 'text-right', cell: file => <div className="flex justify-end gap-1"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={'Tải xuống ' + file.tenTepGoc} onClick={() => onDownload(file)}><Download /></Button></TooltipTrigger><TooltipContent>Tải xuống tệp</TooltipContent></Tooltip></TooltipProvider>{canDelete && <ConfirmDialog trigger={<Button variant="ghost" size="icon" aria-label={'Xóa ' + file.tenTepGoc}><Trash2 className="text-destructive" /></Button>} title="Đánh dấu xóa tệp?" description={'Tệp “' + file.tenTepGoc + '” sẽ không tải xuống được nữa. Metadata và audit được giữ lại.'} confirmLabel="Đánh dấu xóa" destructive loading={deleting} onConfirm={() => onDelete(file.ma)} />}</div> },
  ]
  return <div className="overflow-x-auto"><DataTable columns={columns} rows={files} getRowId={file => file.ma} /></div>
}
