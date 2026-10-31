import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { authApi } from './auth.api'
import { AuthContext, type NguCanhXacThuc } from './auth-context'
import type { TaiKhoanPhien } from './auth.types'

const khoaTruyVanPhien = ['xac-thuc', 'phien-hien-tai'] as const

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const phien = useQuery({
    queryKey: khoaTruyVanPhien,
    queryFn: async () => {
      try {
        const ketQua = await authApi.layPhienHienTai()
        return ketQua.taiKhoan
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
  })

  const giaTri: NguCanhXacThuc = {
    taiKhoan: phien.data ?? null,
    dangTaiPhien: phien.isPending,
    loiTaiPhien: phien.isError,
    dangNhap: async (input) => {
      const ketQua = await authApi.dangNhap(input)
      queryClient.setQueryData(khoaTruyVanPhien, ketQua.taiKhoan)
      return ketQua.taiKhoan
    },
    dangXuat: async () => {
      await authApi.dangXuat()
      queryClient.setQueryData(khoaTruyVanPhien, null)
    },
    doiMatKhau: async (input) => {
      await authApi.doiMatKhau(input)
      queryClient.setQueryData<TaiKhoanPhien | null>(khoaTruyVanPhien, (taiKhoan) =>
        taiKhoan ? { ...taiKhoan, doiMatKhauLanDau: false } : null,
      )
    },
    taiLaiPhien: async () => {
      await queryClient.invalidateQueries({ queryKey: khoaTruyVanPhien })
    },
  }

  return <AuthContext.Provider value={giaTri}>{children}</AuthContext.Provider>
}
