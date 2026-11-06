import { apiClient } from '@/core/api/client'
import type { KetQuaDangNhap, PhienHienTai } from './auth.types'

export const authApi = {
  async dangNhap(input: { tenDangNhap: string; matKhau: string }) {
    const { data } = await apiClient.post<KetQuaDangNhap>('/xac-thuc/dang-nhap', input)
    return data
  },

  async layPhienHienTai() {
    const { data } = await apiClient.get<PhienHienTai>('/xac-thuc/phien-hien-tai')
    return data
  },

  async doiMatKhau(input: { matKhauHienTai: string; matKhauMoi: string }) {
    const { data } = await apiClient.post<{ doiMatKhauLanDau: false; maTuongQuan: string }>(
      '/xac-thuc/doi-mat-khau',
      input,
    )
    return data
  },

  async chonPhanCong(maPhanCong: string) {
    const { data } = await apiClient.post<{ maPhanCongVaiTroDangHoatDong: string }>(
      '/xac-thuc/phan-cong-vai-tro-dang-hoat-dong', { maPhanCong },
    )
    return data
  },

  async dangXuat() {
    const { data } = await apiClient.post<{ daDangXuat: true; maTuongQuan: string }>(
      '/xac-thuc/dang-xuat',
    )
    return data
  },
}
