import { apiClient } from '@/core/api/client'

export type LoaiDonVi = 'DANG_UY' | 'CHI_BO' | 'TO'
export type TrangThaiDonVi = 'DANG_HOAT_DONG' | 'TAM_NGUNG' | 'NGUNG_HOAT_DONG'

export type DonViTrongCay = {
  maDonVi: string
  maDinhDanh: string | null
  loaiDonVi: LoaiDonVi
  trangThai: TrangThaiDonVi
  tenDonVi: string | null
  donViCon: DonViTrongCay[]
}

export type DonViChiTiet = {
  maDonVi: string
  maDinhDanh: string | null
  loaiDonVi: LoaiDonVi
  trangThai: TrangThaiDonVi
  tenDonVi: string | null
  maDonViCha: string | null
  maDonViCon: string[]
}

export type DonViTrongDanhSach = {
  ma: string
  maDinhDanh: string | null
  loaiDonVi: LoaiDonVi
  trangThai: TrangThaiDonVi
  tenDonVi: string | null
  ngayTao: string
  ngayCapNhat: string
}

export type KetQuaDanhSachDonVi = {
  duLieu: DonViTrongDanhSach[]
  phanTrang: { trang: number; gioiHan: number; tongSo: number }
}

export type LichSuQuanHeDonVi = {
  ma: string
  maDonViCha: string
  maDonViCon: string
  ngayHieuLucTu: string
  ngayHieuLucDen: string | null
  maNguoiGhiNhan: string | null
  ngayTao: string
}

export type TaoDonViInput = {
  loaiDonVi: LoaiDonVi
  maDinhDanh?: string
  tenDonVi: string
  trangThai?: TrangThaiDonVi
  maDonViCha?: string
  ngayHieuLucTu: string
}

export type SuaDonViInput = { maDinhDanh?: string | null; loaiDonVi?: LoaiDonVi }

export const organizationsApi = {
  async cay() {
    const { data } = await apiClient.get<DonViTrongCay[]>('/to-chuc/cay')
    return data
  },
  async danhSach(input: { trang: number; gioiHan: number; loaiDonVi?: LoaiDonVi; trangThai?: TrangThaiDonVi; tuKhoa?: string }) {
    const { data } = await apiClient.get<KetQuaDanhSachDonVi>('/to-chuc', { params: input })
    return data
  },
  async chiTiet(maDonVi: string) {
    const { data } = await apiClient.get<DonViChiTiet>(`/to-chuc/${maDonVi}`)
    return data
  },
  async lichSuQuanHe(maDonVi: string) {
    const { data } = await apiClient.get<LichSuQuanHeDonVi[]>(`/to-chuc/${maDonVi}/lich-su-quan-he`)
    return data
  },
  async tao(input: TaoDonViInput) {
    const { data } = await apiClient.post<{ maDonVi: string; tenDonVi: string; loaiDonVi: LoaiDonVi; trangThai: TrangThaiDonVi }>('/to-chuc', input)
    return data
  },
  async sua(maDonVi: string, input: SuaDonViInput) {
    const { data } = await apiClient.patch<DonViChiTiet>(`/to-chuc/${maDonVi}`, input)
    return data
  },
  async doiTen(maDonVi: string, input: { tenDonVi: string; ngayHieuLucTu: string }) {
    const { data } = await apiClient.post<{ maDonVi: string; tenDonVi: string; ngayHieuLucTu: string }>(`/to-chuc/${maDonVi}/doi-ten`, input)
    return data
  },
  async doiQuanHeCha(maDonVi: string, input: { maDonViCha: string; ngayHieuLucTu: string }) {
    const { data } = await apiClient.post<{ maDonVi: string; maDonViCha: string; ngayHieuLucTu: string }>(`/to-chuc/${maDonVi}/cap-nhat-quan-he-cha`, input)
    return data
  },
  async doiTrangThai(maDonVi: string, trangThai: TrangThaiDonVi) {
    const { data } = await apiClient.patch<DonViChiTiet>(`/to-chuc/${maDonVi}/trang-thai`, { trangThai })
    return data
  },
  async xoa(maDonVi: string) {
    const { data } = await apiClient.delete<{ daXoa: true; maDonVi: string }>(`/to-chuc/${maDonVi}`)
    return data
  },
}

export function lamPhangCayDonVi(nodes: DonViTrongCay[], level = 0): Array<DonViTrongCay & { level: number }> {
  return nodes.flatMap((node) => [
    { ...node, level },
    ...lamPhangCayDonVi(node.donViCon ?? [], level + 1),
  ])
}
