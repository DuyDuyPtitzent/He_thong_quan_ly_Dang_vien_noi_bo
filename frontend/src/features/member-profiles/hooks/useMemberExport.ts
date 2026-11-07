import { useState } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { memberProfilesApi } from '../api/member-profiles.api'

export type ExportMode = 'selected' | 'filtered' | 'organization' | 'all'

export function useMemberExport(selectedIds: string[], filters: { tuKhoa?: string; maChiBo?: string; maTo?: string; trangThaiDangVien?: string }, selectedFields: string[], organizationId: string) {
  const [mode, setMode] = useState<ExportMode>(selectedIds.length ? 'selected' : 'filtered')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const exportFile = async () => {
    if (busy || selectedFields.length === 0 || (mode === 'selected' && selectedIds.length === 0) || (mode === 'organization' && !organizationId)) return null
    setBusy(true)
    setError('')
    const request = { cheDo: mode, truong: selectedFields, ...(mode === 'selected' ? { maHoSo: selectedIds } : {}), ...(mode === 'filtered' ? filters : {}), ...(mode === 'organization' ? { maDonVi: organizationId } : {}) }
    try {
      return await memberProfilesApi.exportExcel(request)
    } catch (cause) {
      const message = normalizeApiError(cause).message || 'Không thể xuất dữ liệu trong phạm vi được cấp.'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setBusy(false)
    }
  }

  return { mode, setMode, busy, error, setError, exportFile }
}
