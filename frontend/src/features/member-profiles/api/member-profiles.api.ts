import { apiClient } from '@/core/api/client'

import type { DanhSachHoSo, DonViSinhHoat, HoSoInput, LichSuSinhHoat, LichSuThayDoi, PhanCongChucVu, QuaTrinhDang } from '../types/member-profiles.types'

export const memberProfilesApi = {
  template: async () => (await apiClient.get<Blob>('/ho-so-dang-vien/nhap-xuat/mau', { responseType: 'blob' })).data,
  validateImport: async (file: File) => { const form = new FormData(); form.append('tep', file); return (await apiClient.post<ImportPreview>('/ho-so-dang-vien/nhap-xuat/kiem-tra', form, { headers: { 'Content-Type': undefined } })).data },
  confirmImport: async (maPhienNhap: string) => (await apiClient.post<ImportResult>('/ho-so-dang-vien/nhap-xuat/xac-nhan', { maPhienNhap })).data,
  configureImportDates: async (maPhienNhap: string, ngaySinhHoat: { dong: number; ngaySinhHoatTu: string }[]) => (await apiClient.post<{ ngaySinhHoat: { dong: number; ngaySinhHoatTu: string | null }[]; chuaCoNgay: number; canXacNhan: boolean }>('/ho-so-dang-vien/nhap-xuat/cap-nhat-ngay-sinh-hoat', { maPhienNhap, ngaySinhHoat })).data,
  importErrorReport: async (loi: ImportPreview['loi']) => (await apiClient.post<Blob>('/ho-so-dang-vien/nhap-xuat/bao-cao-loi', { loi }, { responseType: 'blob' })).data,
  exportConfiguration: async () => (await apiClient.get<ExportConfiguration>('/ho-so-dang-vien/nhap-xuat/xuat/cau-hinh')).data,
  exportExcel: async (request: { cheDo: 'selected' | 'filtered' | 'organization' | 'all'; maHoSo?: string[]; maDonVi?: string; tuKhoa?: string; maChiBo?: string; maTo?: string; trangThaiDangVien?: string; truong: string[] }) => (await apiClient.post<Blob>('/ho-so-dang-vien/nhap-xuat/xuat', request, { responseType: 'blob' })).data,
  deleteProfile: async (id: string) => (await apiClient.delete<{ daXoa: true; maHoSo: string; taiKhoanLienKetDaKhoa: boolean }>(`/ho-so-dang-vien/${id}`)).data,
  memberAvatar: async (id: string) => (await apiClient.get<Blob>(`/ho-so-dang-vien/${id}/anh-dai-dien`, { responseType: 'blob' })).data,
  list: async (params: Record<string, string | number>) =>
    (await apiClient.get<DanhSachHoSo>('/ho-so-dang-vien', { params })).data,
  units: async () => (await apiClient.get<DonViSinhHoat[]>('/ho-so-dang-vien/don-vi')).data,
  membershipHistory: async (id: string) => (await apiClient.get<LichSuSinhHoat>(`/ho-so-dang-vien/${id}/lich-su-sinh-hoat`)).data,
  partyProcess: async (id: string) => (await apiClient.get<QuaTrinhDang[]>(`/ho-so-dang-vien/${id}/qua-trinh`)).data,
  partyTraining: async (id: string) => (await apiClient.get<DaoTaoDang[]>(`/ho-so-dang-vien/${id}/dao-tao-dang`)).data,
  createPartyTraining: async (id: string, body: { loaiLop: 'LOP_DANG_VIEN_MOI'; tenChuongTrinh: string; trangThai: 'CHUA_HOC' | 'DANG_HOC' | 'DA_HOAN_THANH'; ngayHoanThanh?: string; donViToChuc?: string; ghiChu?: string }) => (await apiClient.post<DaoTaoDang>(`/ho-so-dang-vien/${id}/dao-tao-dang`, body)).data,
  updatePartyTraining: async (id: string, ma: string, body: { loaiLop: 'LOP_DANG_VIEN_MOI'; tenChuongTrinh: string; trangThai: 'CHUA_HOC' | 'DANG_HOC' | 'DA_HOAN_THANH'; ngayHoanThanh?: string; donViToChuc?: string; ghiChu?: string }) => (await apiClient.patch<DaoTaoDang>(`/ho-so-dang-vien/${id}/dao-tao-dang/${ma}`, body)).data,
  outsideMembership: async (id: string) => (await apiClient.get<ChuyenSinhHoatNgoai[]>(`/ho-so-dang-vien/${id}/chuyen-sinh-hoat-ngoai`)).data,
  addOutsideMembership: async (id: string, body: { maLichSuDonViTiepNhan: string; tenChiBoChuyenDi: string; tenDangUyQuanLy?: string; tinhThanhPho?: string; noiDung?: string; thangChuyenDi: number; namChuyenDi: number; ngayChuyenDi?: string }) => (await apiClient.post(`/ho-so-dang-vien/${id}/chuyen-sinh-hoat-ngoai`, body)).data,
  profileDocuments: async (id: string) => (await apiClient.get<TaiLieuHoSo[]>(`/ho-so-dang-vien/${id}/tai-lieu`)).data,
  uploadProfileDocument: async (id: string, body: { loaiTaiLieu: string; maQuaTrinhDangVien?: string; maDaoTaoDang?: string; tep: File }) => { const form = new FormData(); form.append('loaiTaiLieu', body.loaiTaiLieu); if (body.maQuaTrinhDangVien) form.append('maQuaTrinhDangVien', body.maQuaTrinhDangVien); if (body.maDaoTaoDang) form.append('maDaoTaoDang', body.maDaoTaoDang); form.append('tep', body.tep); return (await apiClient.post<TaiLieuHoSo>(`/ho-so-dang-vien/${id}/tai-lieu`, form, { headers: { 'Content-Type': undefined } })).data },
  downloadProfileDocument: async (id: string, maTaiLieu: string) => (await apiClient.get<Blob>(`/ho-so-dang-vien/${id}/tai-lieu/${maTaiLieu}/tai-xuong`, { responseType: 'blob' })).data,
  positionAssignments: async (id: string) => (await apiClient.get<PhanCongChucVu[]>(`/ho-so-dang-vien/${id}/phan-cong-chuc-vu`)).data,
  changeHistory: async (id: string) => (await apiClient.get<LichSuThayDoi[]>(`/ho-so-dang-vien/${id}/lich-su-thay-doi`)).data,
  detail: async (id: string) =>
    (
      await apiClient.get<HoSoInput & {
        ma: string
        thongTinCaNhan?: { ngaySinh?: string | null; gioiTinh?: string | null; soCccd?: string | null; ngayCapCccd?: string | null; noiCapCccd?: string | null; quocTich?: string | null; danToc?: string | null; tonGiao?: string | null; soDienThoai?: string | null; soDienThoaiBoNguoiNuoiDuong?: string | null; soDienThoaiMeNguoiNuoiDuong?: string | null; emailLienHe?: string | null }
        thongTinSinhVien?: { maSinhVien: string; khoaHoc?: string | null; donViPhuTrach?: string | null; chuongTrinhDaoTao?: string | null; nganh?: string | null; chuyenNganh?: string | null; lopHanhChinh?: string | null; trangThaiHocTap?: string | null }
        quaTrinh?: { soQuyetDinh?: string | null; ngayQuyetDinh?: string | null; donViBanHanhQuyetDinh?: string | null; nguoiGioiThieuThuNhat?: string | null; nguoiGioiThieuThuHai?: string | null }[]
        lichSuDonVi?: { ma: string; maChiBo: string; maTo: string | null; ngayHieuLucTu: string; tenDangUy?: string | null; chiBo?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] }; to?: { maDinhDanh: string | null; tenDonVi: { ten: string }[] } | null }[]
      }>(
        `/ho-so-dang-vien/${id}`,
      )
    ).data,
  create: async (body: HoSoInput) => (await apiClient.post('/ho-so-dang-vien', body)).data,
  update: async (id: string, body: Partial<HoSoInput>) =>
    (await apiClient.patch(`/ho-so-dang-vien/${id}`, body)).data,
}

export type ExportConfiguration = { truong: { key: string; label: string; group: string }[]; donVi: { ma: string; maDinhDanh: string | null; loaiDonVi: string; ten: string | null; maChiBo: string | null }[] }
export type DaoTaoDang = { ma: string; loaiLop: string; tenChuongTrinh: string | null; trangThai: string; ngayHoanThanh: string | null; donViToChuc: string | null; ghiChu: string | null; ngayTao: string; ngayCapNhat: string; taiLieu?: { ma: string; loaiTaiLieu: string; tenTepGoc: string; kichThuoc: number; ngayTao: string }[] }
export type ChuyenSinhHoatNgoai = { ma: string; maLichSuDonViTiepNhan?: string; tenChiBoChuyenDi: string; tenDangUyQuanLy: string | null; tinhThanhPho: string | null; noiDung: string | null; thangChuyenDi: number; namChuyenDi: number; ngayChuyenDi: string | null; lichSuDonViTiepNhan?: { ma: string; maChiBo: string; maTo: string | null; ngayHieuLucTu: string } }
export type TaiLieuHoSo = { ma: string; loaiTaiLieu: string; tenTepGoc: string; kieuNoiDung: string; kichThuoc: number; ngayTao: string; maQuaTrinhDangVien?: string | null; maDaoTaoDang?: string | null }

export type ImportPreview = { maPhienNhap: string | null; hetHanSauGiay: number; tongSo: number; hopLe: number; coLoi: number; soDaTonTai?: number; chuaCoNgay: number; canXacNhan: boolean; taoTaiKhoan: number; loi: { row: number; field: string; message: string }[]; duLieu: { dong: number; maHoSoNoiBo: string; hoVaTen: string; ngaySinh: string | null; soCccd: string | null; gioiTinh: string | null; ngayVaoDang: string | null; khoaDangVien: string | null; ngaySinhHoatTu: string | null; maChiBo: string | null; maTo: string | null; trangThaiDangVien: string; taoTaiKhoan: boolean; hopLe: boolean; daTonTai?: boolean }[] }
export type ImportResult = { tongSo: number; duLieu: unknown[]; matKhauBanDau: { tenDangNhap: string; matKhau: string }[] }
