import axios from 'axios'
import { appConfig } from '@/core/config/app.config'

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})
export type ApiError = { message: string; status?: number; code?: string; correlationId?: string }

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const duLieu =
      typeof error.response?.data === 'object' && error.response.data !== null
        ? (error.response.data as {
            thongBao?: unknown
            message?: unknown
            maLoi?: unknown
            maTuongQuan?: unknown
          })
        : undefined
    const maTuongQuan =
      typeof duLieu?.maTuongQuan === 'string'
        ? duLieu.maTuongQuan
        : error.response?.headers['x-correlation-id']

    return {
      message:
        (typeof duLieu?.thongBao === 'string' && duLieu.thongBao) ||
        (typeof duLieu?.message === 'string' && duLieu.message) ||
        error.message ||
        'Đã xảy ra lỗi kết nối',
      ...(error.response?.status === undefined ? {} : { status: error.response.status }),
      ...(typeof duLieu?.maLoi === 'string'
        ? { code: duLieu.maLoi }
        : error.code === undefined
          ? {}
          : { code: error.code }),
      ...(typeof maTuongQuan === 'string' ? { correlationId: maTuongQuan } : {}),
    }
  }
  return { message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định' }
}
