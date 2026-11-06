import { apiClient } from '@/core/api/client'

export type PermissionItem = {
  ma: string
  maDinhDanh: string
  ten: string
  moTa: string
  maNhom: string
  tenNhom: string
  tinhTrangApi: 'DA_CO_API' | 'CHUA_CO_API'
}

export type RolePermission = {
  maQuyen: string
  quyen: { ma: string; maDinhDanh: string; ten: string }
}

export type RoleItem = {
  ma: string
  maDinhDanh: string
  ten: string
  moTa: string | null
  trangThai: string
  laVaiTroHeThong: boolean
  quyen: RolePermission[]
  _count: { phanCong: number }
}

export type AccountOption = {
  maTaiKhoan: string
  tenDangNhap: string
  hoVaTen: string | null
  maHoSoNoiBo: string | null
  chiBoHienTai?: string | null
}

export type OrganizationNode = {
  maDonVi: string
  maDinhDanh: string | null
  loaiDonVi: 'DANG_UY' | 'CHI_BO' | 'TO'
  tenDonVi: string | null
  trangThai: string
  donViCon: OrganizationNode[]
}

export type AssignmentItem = {
  maPhanCong: string
  maVaiTro: string
  tenVaiTro: string
  loaiPhamVi: 'CAY_DON_VI' | 'DON_VI_CHI_DINH' | 'CA_NHAN' | 'TOAN_HE_THONG'
  danhSachMaQuyen: string[]
  maDonViGoc: string | null
  danhSachMaDonVi: string[]
  tenDonViGoc?: string | null
  loaiDonViGoc?: string | null
  donViChiDinh?: { maDonVi: string; tenDonVi: string | null; loaiDonVi: string }[]
  ngayHieuLucTu: string
  ngayHieuLucDen: string | null
  thuHoiLuc: string | null
  lyDo: string | null
  trangThaiVaiTro?: string
  laVaiTroHeThong?: boolean
  ngayTao?: string
  maNguoiCap?: string | null
  tenNguoiCap?: string | null
  maNguoiThuHoi?: string | null
  tenNguoiThuHoi?: string | null
}

export type AssignmentInput = {
  maTaiKhoan: string
  maVaiTro: string
  loaiPhamVi: 'CAY_DON_VI' | 'DON_VI_CHI_DINH'
  maDonViGoc?: string
  danhSachMaDonVi?: string[]
  ngayHieuLucTu?: string
  ngayHieuLucDen?: string
  lyDo: string
}

export type AssignmentUpdateInput = Omit<AssignmentInput, 'maTaiKhoan' | 'maVaiTro' | 'ngayHieuLucTu' | 'ngayHieuLucDen'> & { ngayHieuLucDen?: string | null }

export const authorizationApi = {
  async permissions() {
    const { data } = await apiClient.get<PermissionItem[]>('/quyen')
    return data
  },
  async roles() {
    const { data } = await apiClient.get<RoleItem[]>('/vai-tro')
    return data
  },
  async createRole(input: { maDinhDanh: string; ten: string; moTa?: string }) {
    const { data } = await apiClient.post<RoleItem>('/vai-tro', input)
    return data
  },
  async updateRole(id: string, input: { ten?: string; moTa?: string | null; trangThai?: string }) {
    const { data } = await apiClient.patch<RoleItem>(`/vai-tro/${id}`, input)
    return data
  },
  async deleteRole(id: string) {
    const { data } = await apiClient.delete<{ daXoa: boolean; maVaiTro: string }>(`/vai-tro/${id}`)
    return data
  },
  async updateRolePermissions(id: string, input: { themMaQuyen: string[]; boMaQuyen: string[] }) {
    const { data } = await apiClient.patch<{ maVaiTro: string; soQuyenThem: number; soQuyenGo: number }>(
      `/vai-tro/${id}/quyen`,
      input,
    )
    return data
  },
  async searchAccounts(tuKhoa: string) {
    const { data } = await apiClient.get<{ duLieu: AccountOption[] }>('/tai-khoan', {
      params: { tuKhoa, gioiHan: 30 },
    })
    return data.duLieu
  },
  async organizationTree() {
    const { data } = await apiClient.get<OrganizationNode[]>('/to-chuc/cay')
    return data
  },
  async assignments(maTaiKhoan: string) {
    const { data } = await apiClient.get<AssignmentItem[]>('/phan-cong-vai-tro', { params: { maTaiKhoan } })
    return data
  },
  async assignmentHistory(maTaiKhoan: string) {
    const { data } = await apiClient.get<Array<{ maDoiTuong: string | null; hanhDong: string; ketQua: string; lyDo: string | null; duLieuTruoc: unknown; duLieuSau: unknown; thoiDiem: string; tenNguoiThucHien: string }>>('/phan-cong-vai-tro/lich-su', { params: { maTaiKhoan } })
    return data
  },
  async createAssignment(input: AssignmentInput) {
    const { data } = await apiClient.post<{ maPhanCong: string; ngayHieuLucTu: string; ngayHieuLucDen: string | null }>(
      '/phan-cong-vai-tro',
      input,
    )
    return data
  },
  async updateAssignment(id: string, input: AssignmentUpdateInput) {
    const { data } = await apiClient.patch<{ maPhanCong: string; loaiPhamVi: string; ngayHieuLucDen: string | null }>(
      `/phan-cong-vai-tro/${id}`,
      input,
    )
    return data
  },
  async revokeAssignment(id: string, lyDo: string) {
    const { data } = await apiClient.post<{ daThuHoi: true; maPhanCong: string; thuHoiLuc: string }>(
      `/phan-cong-vai-tro/${id}/thu-hoi`,
      { lyDo },
    )
    return data
  },
}

export function groupPermissions(items: PermissionItem[]) {
  const groups = new Map<string, { maNhom: string; tenNhom: string; permissions: PermissionItem[] }>()
  for (const permission of items) {
    const current = groups.get(permission.maNhom) ?? {
      maNhom: permission.maNhom,
      tenNhom: permission.tenNhom,
      permissions: [],
    }
    current.permissions.push(permission)
    groups.set(permission.maNhom, current)
  }
  return [...groups.values()].sort((a, b) => a.tenNhom.localeCompare(b.tenNhom, 'vi'))
}

export function flattenOrganizationTree(nodes: OrganizationNode[], level = 0): Array<OrganizationNode & { level: number }> {
  return nodes.flatMap((node) => [
    { ...node, level },
    ...flattenOrganizationTree(node.donViCon ?? [], level + 1),
  ])
}
