import { createContext, useContext } from 'react'
import type { TaiKhoanPhien } from './auth.types'

export type NguCanhXacThuc = {
  taiKhoan: TaiKhoanPhien | null
  dangTaiPhien: boolean
  loiTaiPhien: boolean
  dangNhap: (input: { tenDangNhap: string; matKhau: string }) => Promise<TaiKhoanPhien>
  dangXuat: () => Promise<void>
  doiMatKhau: (input: { matKhauHienTai: string; matKhauMoi: string }) => Promise<void>
  taiLaiPhien: () => Promise<void>
}

export const AuthContext = createContext<NguCanhXacThuc | null>(null)

export function useAuth() {
  const nguCanh = useContext(AuthContext)
  if (!nguCanh) throw new Error('useAuth phải được dùng bên trong AuthProvider.')
  return nguCanh
}
