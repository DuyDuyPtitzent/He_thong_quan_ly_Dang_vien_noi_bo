export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'HỆ THỐNG QUẢN LÝ ĐẢNG VIÊN NỘI BỘ',
  description: 'Nền tảng quản trị nội bộ',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
} as const
