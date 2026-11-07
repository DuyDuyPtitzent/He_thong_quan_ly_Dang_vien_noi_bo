import { apiClient } from '@/core/api/client'
import type { DanhSachTaiKhoan, HoSoChuaLienKet, NhatKyTaiKhoan, TaiKhoan } from '../types/accounts.models'
export type { DanhSachTaiKhoan, HoSoChuaLienKet, NhatKyTaiKhoan, TaiKhoan } from '../types/accounts.models'
export type AccountImportMode = 'LIEN_KET_HO_SO' | 'DOC_LAP'
export type AccountImportError = { row: number; field: string; message: string }
export type AccountImportRow = { dong: number; tenDangNhap: string; email: string | null; trangThai: string; lienKetHoSo: boolean; hopLe: boolean; daTonTai: boolean; trangThaiTonTai: 'DA_TON_TAI' | 'CHUA_TON_TAI' | 'CHUA_KIEM_TRA'; trangThaiKiemTra: 'HOP_LE' | 'CO_LOI' | 'CHUA_KIEM_TRA_DUOC'; loi: AccountImportError[] }
export type AccountImportPreview = { maPhienNhap: string | null; hetHanSauGiay: number; tongSo: number; hopLe: number; coLoi: number; soDaTonTai: number; soDongChuaKiemTra?: number; soTaiKhoanLienKet: number; soTaiKhoanDocLap: number; loi: AccountImportError[]; loiTep?: { field: string; message: string }[]; duLieu: AccountImportRow[] }
export type AccountImportResult = { tongSo: number; soTaiKhoanLienKet: number; soTaiKhoanDocLap: number; duLieu: AccountImportRow[] }

export const accountsApi = {
  async list(params: Record<string, string | number>) { const { data } = await apiClient.get<DanhSachTaiKhoan>('/tai-khoan', { params }); return data },
  async create(input: { tenDangNhap: string; email?: string; matKhauBanDau: string; maHoSo?: string; trangThai?: string }) { const { data } = await apiClient.post('/tai-khoan', input); return data },
  async update(id: string, input: { tenDangNhap?: string; email?: string | null; trangThai?: string; matKhauMoi?: string; yeuCauDoiMatKhau?: boolean }) { const { data } = await apiClient.patch(`/tai-khoan/${id}`, input); return data },
  async status(id: string, trangThai: string, lyDo?: string) { const { data } = await apiClient.patch(`/tai-khoan/${id}/trang-thai`, { trangThai, lyDo }); return data },
  async remove(id: string) { const { data } = await apiClient.delete(`/tai-khoan/${id}`); return data },
  async detail(id: string) { const { data } = await apiClient.get<{ maTaiKhoan: string; tenDangNhap: string; email: string | null; trangThai: string; dangNhapCuoiLuc: string | null; doiMatKhauLanDau: boolean; ngayTao: string; ngayCapNhat: string; khoaDen: string | null; daLienKetHoSo: boolean; hoSoDangVien: TaiKhoan['hoSoDangVien']; phienDangNhap: { ngayTao: string; hetHanLuc: string; diaChiIp: string | null }[] }>(`/tai-khoan/${id}`); return data },
  async history(id: string) { const { data } = await apiClient.get<NhatKyTaiKhoan[]>(`/tai-khoan/${id}/lich-su`); return data },
  async searchProfiles(keyword: string) { const { data } = await apiClient.get<HoSoChuaLienKet[]>('/tai-khoan/ho-so-chua-lien-ket', { params: { tuKhoa: keyword } }); return data },
  async linkProfile(id: string, maHoSo: string | null) { const { data } = await apiClient.patch(`/tai-khoan/${id}/lien-ket-ho-so`, { maHoSo }); return data },
  async importTemplate(mode: AccountImportMode) { return (await apiClient.get<Blob>('/tai-khoan/nhap-xuat/mau', { params: { loaiNhap: mode }, responseType: 'blob' })).data },
  async validateImport(file: File, mode: AccountImportMode) { const form = new FormData(); form.append('tep', file); form.append('loaiNhap', mode); return (await apiClient.post<AccountImportPreview>('/tai-khoan/nhap-xuat/kiem-tra', form, { headers: { 'Content-Type': undefined } })).data },
  async confirmImport(maPhienNhap: string) { return (await apiClient.post<AccountImportResult>('/tai-khoan/nhap-xuat/xac-nhan', { maPhienNhap })).data },
  async importErrorReport(loi: AccountImportError[]) { return (await apiClient.post<Blob>('/tai-khoan/nhap-xuat/bao-cao-loi', { loi }, { responseType: 'blob' })).data },
}
