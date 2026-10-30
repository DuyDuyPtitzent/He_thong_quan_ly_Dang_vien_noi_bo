import axios from 'axios'
import { appConfig } from '@/core/config/app.config'

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})
export type ApiError = { message: string; status?: number; code?: string }
export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error))
    return {
      message: error.response?.data?.message ?? error.message ?? 'Đã xảy ra lỗi kết nối',
      ...(error.response?.status === undefined ? {} : { status: error.response.status }),
      ...(error.code === undefined ? {} : { code: error.code }),
    }
  return { message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định' }
}
