export type CampaignStatus = 'NHAP' | 'SAP_DIEN_RA' | 'DANG_DIEN_RA' | 'DA_KET_THUC' | 'DA_HUY'
export type Campaign = {
  ma: string; maDot: string; ten: string; moTa: string | null; maNamHoc: string
  maDonViToChuc: string; maNguoiPhuTrach: string | null; ngayBatDau: string; ngayKetThuc: string
  trangThai: CampaignStatus; ngayTao: string; ngayCapNhat: string
  namHoc?: { ma: string; maNamHoc: string; tenNamHoc: string }
  donViToChuc?: { tenDonVi?: Array<{ ten: string }> }
  nguoiPhuTrach?: { ma: string; tenDangNhap: string }
  phamVi: Array<{ maDonVi: string; donVi?: { tenDonVi?: string | null } }>
  tepDinhKem?: Attachment[]
}
export type CampaignInput = {
  ten: string; moTa?: string; maNamHoc: string; maDonViToChuc: string; maNguoiPhuTrach?: string
  phamViDonVi: string[]; ngayBatDau: string; ngayKetThuc: string
}
export type Attachment = { ma: string; tenTepGoc: string; kieuNoiDung: string; kichThuoc: number; ngayTao: string }
export type SessionSummary = { ma: string; maBuoi: string; ten: string; hinhThuc: string; batDauLuc: string; ketThucLuc: string; trangThai: 'NHAP' | 'DA_LEN_LICH' | 'DANG_DIEN_RA' | 'DA_KET_THUC' | 'DA_HUY' | string; diaDiem?: string | null }
export type PageResult<T> = { duLieu: T[]; phanTrang: { trang: number; gioiHan: number; tongSo: number } }
export type UnitNode = { maDonVi: string; loaiDonVi: string; trangThai: string; tenDonVi: string | null; donViCon: UnitNode[] }
export type SchoolYear = { ma: string; maNamHoc: string; tenNamHoc: string; trangThai: string }
