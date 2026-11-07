import { apiClient } from '@/core/api/client'

import type { AccountOption, AssignmentInput, AssignmentItem, AssignmentUpdateInput, OrganizationNode, PermissionItem, RoleItem } from '../types/authorization.types'

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
