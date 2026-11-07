import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useMemberImport } from '../../hooks/useMemberImport'
import { useMemberExport } from '../../hooks/useMemberExport'
import { Button } from '@/shared/components/ui/button'
import { Download, Upload } from 'lucide-react'
import { ImportDataDialog } from './ImportDataDialog'
import { ExportDataDialog } from './ExportDataDialog'
import { memberProfilesApi, type ExportConfiguration } from '../../api/member-profiles.api'

function saveFile(blob: Blob, name: string) {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    toast.error(`Không thể lưu tệp ${name} xuống thiết bị.`)
    return false
  }
}

export function MemberProfilesImportExport({ canImport, canExport, filters, selectedIds = [], onImported }: { canImport: boolean; canExport: boolean; filters: { tuKhoa?: string; maChiBo?: string; maTo?: string; trangThaiDangVien?: string }; selectedIds?: string[]; onImported?: () => void }) {
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [exportConfiguration, setExportConfiguration] = useState<ExportConfiguration | null>(null)
  const [configurationError, setConfigurationError] = useState(false)
  const importController = useMemberImport(onImported)
  const exportController = useMemberExport(selectedIds, filters, selectedFields, organizationId)
  useEffect(() => {
    if (!exportOpen || exportConfiguration) return
    void memberProfilesApi.exportConfiguration().then((configuration) => {
      setExportConfiguration(configuration)
      setSelectedFields(configuration.truong.filter((field) => field.group === 'Thông tin hồ sơ').map((field) => field.key))
    }).catch(() => { setConfigurationError(true); toast.error('Không tải được thông tin xuất dữ liệu. Vui lòng đóng và mở lại hộp thoại.') })
  }, [exportOpen, exportConfiguration])

  const exportData = async () => {
    const blob = await exportController.exportFile()
    if (!blob) return
    if (!saveFile(blob, 'danh-sach-ho-so-dang-vien.xlsx')) return
    toast.success('Đã tạo tệp Excel theo phạm vi đã chọn.')
    setExportOpen(false)
  }

  return <>
    {canImport && <Button variant="outline" onClick={() => setImportOpen(true)}><Upload />Nhập dữ liệu</Button>}
    {canExport && <Button variant="outline" onClick={() => { exportController.setMode(selectedIds.length ? 'selected' : 'filtered'); exportController.setError(''); setConfigurationError(false); setOrganizationId(''); setSelectedFields(exportConfiguration?.truong.filter((field) => field.group === 'Thông tin hồ sơ').map((field) => field.key) ?? []); setExportOpen(true) }}><Download />Xuất dữ liệu</Button>}
    <ImportDataDialog open={importOpen} onOpenChange={setImportOpen} controller={importController} />
    <ExportDataDialog open={exportOpen} onOpenChange={setExportOpen} mode={exportController.mode} onModeChange={exportController.setMode} selectedCount={selectedIds.length} busy={exportController.busy} error={exportController.error || (configurationError ? 'Không tải được danh sách thông tin xuất. Vui lòng đóng và mở lại.' : '')} onExport={() => void exportData()} fields={exportConfiguration?.truong ?? []} units={exportConfiguration?.donVi ?? []} selectedFields={selectedFields} onFieldsChange={setSelectedFields} organizationId={organizationId} onOrganizationChange={setOrganizationId} />
  </>
}
