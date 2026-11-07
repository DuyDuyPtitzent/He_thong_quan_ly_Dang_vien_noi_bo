import { useState } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '@/core/api/client'
import { memberProfilesApi, type ImportPreview, type ImportResult } from '../api/member-profiles.api'

type ImportStep = 'file' | 'preview' | 'confirm' | 'result'

function importErrorMessage(cause: unknown, fallback: string) {
  const error = normalizeApiError(cause)
  const message = error.message || fallback
  return error.correlationId ? `${message} (Mã tra cứu: ${error.correlationId})` : message
}

export function useMemberImport(onImported?: () => void) {
  const [step, setStep] = useState<ImportStep>('file')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [commonDate, setCommonDate] = useState('')

  const hasDraft = Boolean(file || preview || result)

  const chooseFile = (nextFile?: File) => {
    setError('')
    setPreview(null)
    setResult(null)
    setConfirmed(false)
    setStep('file')
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!nextFile.name.toLocaleLowerCase().endsWith('.xlsx')) {
      const message = 'Tệp không đúng định dạng .xlsx. Vui lòng chọn tệp Excel mẫu mới nhất.'
      setError(message)
      toast.error(message)
      setFile(null)
      return
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      const message = 'Tệp vượt quá giới hạn 5 MB. Hãy giảm kích thước rồi tải lại.'
      setError(message)
      toast.error(message)
      setFile(null)
      return
    }
    setFile(nextFile)
    toast.success(`Đã chọn tệp ${nextFile.name}.`)
  }

  const checkFile = async () => {
    if (!file || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await memberProfilesApi.validateImport(file)
      setPreview(response)
      setStep('preview')
      if (response.loi.length) toast.warning(`Đã kiểm tra tệp: tìm thấy ${response.loi.length} lỗi cần xử lý.`)
      else if (response.chuaCoNgay) toast.warning(`Đã kiểm tra ${response.tongSo} hồ sơ. Cần bổ sung ngày bắt đầu sinh hoạt cho ${response.chuaCoNgay} hồ sơ trước khi xác nhận.`)
      else toast.success(`Đã kiểm tra ${response.tongSo} hồ sơ. Tệp hợp lệ để tiếp tục.`)
    } catch (cause) {
      const message = importErrorMessage(cause, 'Không thể kiểm tra tệp Excel.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const applyDates = async (updates: { dong: number; ngaySinhHoatTu: string }[]) => {
    if (!preview?.maPhienNhap || !updates.length || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await memberProfilesApi.configureImportDates(preview.maPhienNhap, updates)
      const dates = new Map(response.ngaySinhHoat.map((item) => [item.dong, item.ngaySinhHoatTu]))
      setPreview({
        ...preview,
        chuaCoNgay: response.chuaCoNgay,
        canXacNhan: response.canXacNhan,
        duLieu: preview.duLieu.map((row) => dates.has(row.dong) ? { ...row, ngaySinhHoatTu: dates.get(row.dong) ?? null } : row),
      })
      setConfirmed(false)
      toast.success('Đã cập nhật ngày bắt đầu sinh hoạt trong bản xem trước.')
    } catch (cause) {
      const message = importErrorMessage(cause, 'Không thể cập nhật ngày bắt đầu sinh hoạt.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    if (!preview?.maPhienNhap || !preview.canXacNhan || preview.loi.length || !confirmed || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await memberProfilesApi.confirmImport(preview.maPhienNhap)
      setResult(response)
      setStep('result')
      onImported?.()
      toast.success(`Đã nhập thành công ${response.tongSo} hồ sơ Đảng viên.`)
    } catch (cause) {
      const message = importErrorMessage(cause, 'Không thể nhập dữ liệu. Hãy kiểm tra lỗi rồi thử lại.')
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = async () => {
    setBusy(true)
    setError('')
    try {
      return await memberProfilesApi.template()
    } catch (cause) {
      const message = importErrorMessage(cause, 'Không tải được tệp Excel mẫu.')
      setError(message)
      toast.error(message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const downloadErrors = async () => {
    if (!preview) return null
    setBusy(true)
    setError('')
    try {
      return await memberProfilesApi.importErrorReport(preview.loi)
    } catch (cause) {
      const message = importErrorMessage(cause, 'Không tải được báo cáo lỗi.')
      setError(message)
      toast.error(message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    setStep('file')
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    setConfirmed(false)
    setCommonDate('')
  }

  return {
    step, setStep, file, preview, result, error, setError, busy, confirmed, setConfirmed,
    commonDate, setCommonDate, hasDraft, chooseFile, checkFile, applyDates, confirmImport,
    downloadTemplate, downloadErrors, clear,
  }
}

export type MemberImportController = ReturnType<typeof useMemberImport>
