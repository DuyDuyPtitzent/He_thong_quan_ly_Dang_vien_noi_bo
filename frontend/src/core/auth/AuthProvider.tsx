import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { authApi } from './auth.api'
import { AuthContext, type NguCanhXacThuc } from './auth-context'
import type { PhienHienTai, TaiKhoanPhien } from './auth.types'

const khoaTruyVanPhien = ['xac-thuc', 'phien-hien-tai'] as const

function taiKhoanTuPhien(session: PhienHienTai): TaiKhoanPhien {
  return {
    ...session.taiKhoan,
    maPhanCongVaiTroDangHoatDong: session.maPhanCongVaiTroDangHoatDong,
    phanCongHopLe: session.phanCongHopLe,
    quyenDangHoatDong: session.quyenDangHoatDong,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const phien = useQuery({
    queryKey: khoaTruyVanPhien,
    queryFn: async () => {
      try {
        const ketQua = await authApi.layPhienHienTai()
        return ketQua
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  })

  const giaTri: NguCanhXacThuc = {
    taiKhoan: phien.data ? taiKhoanTuPhien(phien.data) : null,
    dangTaiPhien: phien.isPending,
    loiTaiPhien: phien.isError,
    dangNhap: async (input) => {
      await authApi.dangNhap(input)
      const session = await authApi.layPhienHienTai()
      queryClient.setQueryData(khoaTruyVanPhien, session)
      return taiKhoanTuPhien(session)
    },
    dangXuat: async () => {
      await authApi.dangXuat()
      queryClient.setQueryData(khoaTruyVanPhien, null)
    },
    doiMatKhau: async (input) => {
      await authApi.doiMatKhau(input)
      queryClient.setQueryData<PhienHienTai | null>(khoaTruyVanPhien, (session) =>
        session
          ? { ...session, taiKhoan: { ...session.taiKhoan, doiMatKhauLanDau: false } }
          : null,
      )
    },
    taiLaiPhien: async () => {
      await queryClient.invalidateQueries({ queryKey: khoaTruyVanPhien })
    },
    chonPhanCong: async (maPhanCong) => {
      await queryClient.cancelQueries()
      await authApi.chonPhanCong(maPhanCong)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== khoaTruyVanPhien[0] })
      const session = await authApi.layPhienHienTai()
      queryClient.setQueryData(khoaTruyVanPhien, session)
    },
  }

  return <AuthContext.Provider value={giaTri}>{children}</AuthContext.Provider>
}
