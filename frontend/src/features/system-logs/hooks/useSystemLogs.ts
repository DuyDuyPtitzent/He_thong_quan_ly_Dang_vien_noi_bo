import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/core/auth/auth-context'
import { systemLogsApi } from '../api/system-logs.api'
import type { LogFilters, LogType } from '../types/system-logs'

export function useSystemLogs(type: LogType, filters: LogFilters) {
  const scopeKey = useLogScopeKey()
  const list = useQuery({ queryKey: ['system-logs', scopeKey, type, filters], queryFn: () => systemLogsApi.list(type, filters) })
  const stats = useQuery({ queryKey: ['system-logs', scopeKey, type, 'stats', filters.maDonVi], queryFn: () => systemLogsApi.stats(type, filters.maDonVi) })
  const actions = useQuery({ queryKey: ['system-logs', scopeKey, type, 'actions', filters.maDonVi], queryFn: () => systemLogsApi.actions(type, filters.maDonVi) })
  const units = useQuery({ queryKey: ['system-logs', scopeKey, type, 'units'], queryFn: () => systemLogsApi.units(type) })
  return { list, stats, actions, units }
}
export function useSystemLogDetail(type: LogType, id: string | null) {
  const scopeKey = useLogScopeKey()
  return useQuery({ queryKey: ['system-logs', scopeKey, type, 'detail', id], queryFn: () => systemLogsApi.detail(type, id!), enabled: Boolean(id) })
}

function useLogScopeKey() {
  const account = useAuth().taiKhoan
  const assignment = account?.phanCongHopLe.find((item) => item.maPhanCong === account.maPhanCongVaiTroDangHoatDong)
  return JSON.stringify([account?.maTaiKhoan, assignment?.maPhanCong, assignment?.loaiPhamVi, assignment?.maDonViGoc, assignment?.donViChiDinh, account?.quyenDangHoatDong])
}
