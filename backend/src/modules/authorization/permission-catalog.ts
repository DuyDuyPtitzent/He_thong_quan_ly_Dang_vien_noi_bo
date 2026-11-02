/** System-owned Permission codes from the approved matrix. This catalog never creates Roles or Assignments. */
export const permissionCatalog = [
  'TO_CHUC_XEM', 'TO_CHUC_TAO', 'TO_CHUC_SUA_THONG_TIN', 'TO_CHUC_SUA_LOAI',
  'TO_CHUC_DOI_DON_VI_CHA', 'TO_CHUC_XEM_LICH_SU', 'TO_CHUC_SUA_LICH_SU', 'TO_CHUC_DOI_TRANG_THAI',
  'TO_CHUC_KHOI_PHUC', 'TO_CHUC_XOA',
  'HO_SO_DANG_VIEN_XEM_DANH_SACH', 'HO_SO_DANG_VIEN_XEM_TONG_QUAN', 'HO_SO_DANG_VIEN_TAO',
  'HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', 'HO_SO_DANG_VIEN_XOA', 'HO_SO_CA_NHAN_XEM',
  'HO_SO_CA_NHAN_SUA', 'HO_SO_DIA_CHI_XEM', 'HO_SO_DIA_CHI_SUA', 'HO_SO_SINH_VIEN_XEM',
  'HO_SO_SINH_VIEN_SUA', 'HO_SO_XUAT_DU_LIEU', 'HO_SO_XEM_LICH_SU_THAY_DOI',
  'SINH_HOAT_XEM_HIEN_TAI', 'SINH_HOAT_XEM_LICH_SU', 'SINH_HOAT_CHUYEN_DON_VI',
  'SINH_HOAT_SUA_LICH_SU', 'SINH_HOAT_XOA_LICH_SU', 'QUA_TRINH_DANG_XEM',
  'QUA_TRINH_DANG_TAO', 'QUA_TRINH_DANG_SUA', 'QUA_TRINH_DANG_XOA',
  'CHUC_VU_XEM', 'CHUC_VU_TAO', 'CHUC_VU_SUA', 'CHUC_VU_XOA',
  'NHIEM_KY_XEM', 'NHIEM_KY_TAO', 'NHIEM_KY_SUA', 'NHIEM_KY_XOA',
  'PHAN_CONG_CHUC_VU_XEM', 'PHAN_CONG_CHUC_VU_TAO', 'PHAN_CONG_CHUC_VU_SUA',
  'PHAN_CONG_CHUC_VU_KET_THUC', 'PHAN_CONG_CHUC_VU_XOA',
  'TAI_KHOAN_XEM', 'TAI_KHOAN_TAO', 'TAI_KHOAN_SUA_THONG_TIN', 'TAI_KHOAN_KHOA_MO_KHOA',
  'TAI_KHOAN_THU_HOI_PHIEN', 'TAI_KHOAN_LIEN_KET_HO_SO', 'VAI_TRO_XEM', 'VAI_TRO_TAO',
  'VAI_TRO_SUA', 'VAI_TRO_XOA', 'VAI_TRO_GAN_QUYEN', 'PHAN_CONG_VAI_TRO_XEM',
  'PHAN_CONG_VAI_TRO_TAO', 'PHAN_CONG_VAI_TRO_SUA', 'PHAN_CONG_VAI_TRO_THU_HOI',
  'QUYEN_XEM_DANH_MUC', 'NHAT_KY_KIEM_TOAN_XEM', 'NHAT_KY_BAO_MAT_XEM',
  'NHAT_KY_KIEM_TOAN_XUAT', 'HO_SO_CA_NHAN_TU_CAP_NHAT', 'HO_SO_CA_NHAN_MO_DOT_CAP_NHAT',
  'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT',
  'CAU_HINH_HE_THONG_XEM', 'CAU_HINH_HE_THONG_SUA', 'VAN_HANH_HE_THONG',
] as const

export type MaPermission = (typeof permissionCatalog)[number]

export type PermissionMetadata = {
  ten: string
  moTa: string
  maNhom: string
  tenNhom: string
  tinhTrangApi: 'DA_CO_API' | 'CHUA_CO_API'
}

type PermissionEntry = readonly [MaPermission, string, string]

function nhom(
  maNhom: string,
  tenNhom: string,
  tinhTrangApi: PermissionMetadata['tinhTrangApi'],
  entries: readonly PermissionEntry[],
): Record<string, PermissionMetadata> {
  return Object.fromEntries(entries.map(([code, ten, moTa]) => [code, { ten, moTa, maNhom, tenNhom, tinhTrangApi }]))
}

/** Human-readable matrix metadata returned by the catalog API and persisted by sync:permissions. */
export const permissionMetadata = ({
  ...nhom('TO_CHUC', 'Tổ chức Đảng', 'DA_CO_API', [
    ['TO_CHUC_XEM', 'Xem đơn vị', 'Xem danh sách, cây và thông tin đơn vị trong phạm vi được cấp.'],
    ['TO_CHUC_TAO', 'Tạo đơn vị', 'Tạo đơn vị theo đúng tầng Đảng ủy, Chi bộ hoặc Tổ.'],
    ['TO_CHUC_SUA_THONG_TIN', 'Sửa thông tin đơn vị', 'Sửa mã định danh và thông tin được phép của đơn vị.'],
    ['TO_CHUC_SUA_LOAI', 'Sửa loại đơn vị', 'Thay đổi loại đơn vị khi quan hệ tổ chức cho phép.'],
    ['TO_CHUC_DOI_DON_VI_CHA', 'Đổi đơn vị cha', 'Thay đổi quan hệ cha-con trong cây tổ chức.'],
    ['TO_CHUC_XEM_LICH_SU', 'Xem lịch sử tổ chức', 'Xem lịch sử tên và quan hệ đơn vị.'],
    ['TO_CHUC_SUA_LICH_SU', 'Sửa lịch sử tổ chức', 'Chỉnh sửa lịch sử tổ chức trong phạm vi được cấp.'],
    ['TO_CHUC_DOI_TRANG_THAI', 'Đổi trạng thái đơn vị', 'Chuyển đơn vị giữa các trạng thái được duyệt.'],
    ['TO_CHUC_KHOI_PHUC', 'Khôi phục đơn vị', 'Khôi phục đơn vị đã ngừng hoạt động theo thẩm quyền.'],
    ['TO_CHUC_XOA', 'Xóa đơn vị', 'Xóa đơn vị khi không còn quan hệ hoặc dữ liệu tham chiếu.'],
  ]),
  ...nhom('HO_SO', 'Hồ sơ đảng viên', 'CHUA_CO_API', [
    ['HO_SO_DANG_VIEN_XEM_DANH_SACH', 'Xem danh sách hồ sơ', 'Xem danh sách hồ sơ trong Scope được cấp.'],
    ['HO_SO_DANG_VIEN_XEM_TONG_QUAN', 'Xem tổng quan hồ sơ', 'Xem thông tin tổng quan của hồ sơ.'],
    ['HO_SO_DANG_VIEN_TAO', 'Tạo hồ sơ đảng viên', 'Tạo hồ sơ theo quy trình nghiệp vụ được duyệt.'],
    ['HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', 'Sửa thông tin cơ bản', 'Sửa thông tin cơ bản theo quy trình nghiệp vụ.'],
    ['HO_SO_DANG_VIEN_XOA', 'Xóa hồ sơ đảng viên', 'Xóa hồ sơ khi không còn dữ liệu hoặc lịch sử tham chiếu.'],
    ['HO_SO_CA_NHAN_XEM', 'Xem hồ sơ cá nhân', 'Xem hồ sơ được liên kết với tài khoản theo Scope cá nhân.'],
    ['HO_SO_CA_NHAN_SUA', 'Sửa hồ sơ cá nhân', 'Đề nghị cập nhật hồ sơ cá nhân theo luồng phê duyệt.'],
    ['HO_SO_DIA_CHI_XEM', 'Xem địa chỉ', 'Xem địa chỉ trong hồ sơ theo quyền và phạm vi.'],
    ['HO_SO_DIA_CHI_SUA', 'Sửa địa chỉ', 'Cập nhật địa chỉ theo quy trình nghiệp vụ.'],
    ['HO_SO_SINH_VIEN_XEM', 'Xem thông tin sinh viên', 'Xem phần thông tin sinh viên trong hồ sơ.'],
    ['HO_SO_SINH_VIEN_SUA', 'Sửa thông tin sinh viên', 'Cập nhật phần thông tin sinh viên trong hồ sơ.'],
    ['HO_SO_XUAT_DU_LIEU', 'Xuất dữ liệu hồ sơ', 'Xuất dữ liệu hồ sơ theo quyền và phạm vi được cấp.'],
    ['HO_SO_XEM_LICH_SU_THAY_DOI', 'Xem lịch sử hồ sơ', 'Xem lịch sử thay đổi hồ sơ trong phạm vi.'],
  ]),
  ...nhom('SINH_HOAT', 'Sinh hoạt Đảng', 'CHUA_CO_API', [
    ['SINH_HOAT_XEM_HIEN_TAI', 'Xem sinh hoạt hiện tại', 'Xem đơn vị sinh hoạt hiện hành của hồ sơ.'],
    ['SINH_HOAT_XEM_LICH_SU', 'Xem lịch sử sinh hoạt', 'Xem lịch sử chuyển và sinh hoạt tại các đơn vị.'],
    ['SINH_HOAT_CHUYEN_DON_VI', 'Chuyển sinh hoạt', 'Thực hiện chuyển sinh hoạt theo workflow và thẩm quyền.'],
    ['SINH_HOAT_SUA_LICH_SU', 'Sửa lịch sử sinh hoạt', 'Điều chỉnh lịch sử sinh hoạt theo quy trình được duyệt.'],
    ['SINH_HOAT_XOA_LICH_SU', 'Xóa lịch sử sinh hoạt', 'Xóa lịch sử sinh hoạt khi được workflow cho phép.'],
  ]),
  ...nhom('QUA_TRINH_DANG', 'Quá trình Đảng', 'CHUA_CO_API', [
    ['QUA_TRINH_DANG_XEM', 'Xem quá trình Đảng', 'Xem các mốc quá trình Đảng trong hồ sơ.'],
    ['QUA_TRINH_DANG_TAO', 'Tạo quá trình Đảng', 'Ghi nhận mốc quá trình Đảng theo thẩm quyền.'],
    ['QUA_TRINH_DANG_SUA', 'Sửa quá trình Đảng', 'Chỉnh sửa mốc quá trình Đảng theo quy trình.'],
    ['QUA_TRINH_DANG_XOA', 'Xóa quá trình Đảng', 'Xóa mốc quá trình Đảng khi không vi phạm lưu trữ.'],
  ]),
  ...nhom('CHUC_VU', 'Chức vụ', 'CHUA_CO_API', [
    ['CHUC_VU_XEM', 'Xem chức vụ', 'Xem danh mục chức vụ.'],
    ['CHUC_VU_TAO', 'Tạo chức vụ', 'Thêm chức vụ vào danh mục.'],
    ['CHUC_VU_SUA', 'Sửa chức vụ', 'Cập nhật chức vụ trong danh mục.'],
    ['CHUC_VU_XOA', 'Xóa chức vụ', 'Xóa chức vụ không còn được sử dụng.'],
  ]),
  ...nhom('NHIEM_KY', 'Nhiệm kỳ và phân công chức vụ', 'CHUA_CO_API', [
    ['NHIEM_KY_XEM', 'Xem nhiệm kỳ', 'Xem danh sách và thông tin nhiệm kỳ.'],
    ['NHIEM_KY_TAO', 'Tạo nhiệm kỳ', 'Tạo nhiệm kỳ theo quy định tổ chức.'],
    ['NHIEM_KY_SUA', 'Sửa nhiệm kỳ', 'Cập nhật thông tin nhiệm kỳ.'],
    ['NHIEM_KY_XOA', 'Xóa nhiệm kỳ', 'Xóa nhiệm kỳ không có dữ liệu phụ thuộc.'],
    ['PHAN_CONG_CHUC_VU_XEM', 'Xem phân công chức vụ', 'Xem các phân công chức vụ trong phạm vi.'],
    ['PHAN_CONG_CHUC_VU_TAO', 'Tạo phân công chức vụ', 'Phân công chức vụ theo thẩm quyền và nhiệm kỳ.'],
    ['PHAN_CONG_CHUC_VU_SUA', 'Sửa phân công chức vụ', 'Cập nhật phân công chức vụ trong phạm vi.'],
    ['PHAN_CONG_CHUC_VU_KET_THUC', 'Kết thúc phân công chức vụ', 'Kết thúc phân công theo thời điểm và thẩm quyền.'],
    ['PHAN_CONG_CHUC_VU_XOA', 'Xóa phân công chức vụ', 'Xóa phân công khi không vi phạm lịch sử lưu trữ.'],
  ]),
  ...nhom('TAI_KHOAN', 'Tài khoản', 'DA_CO_API', [
    ['TAI_KHOAN_XEM', 'Xem tài khoản', 'Tìm tài khoản đủ điều kiện trong Scope để quản trị phân công.'],
  ]),
  ...nhom('TAI_KHOAN', 'Tài khoản', 'CHUA_CO_API', [
    ['TAI_KHOAN_TAO', 'Tạo tài khoản', 'Tạo tài khoản theo quy trình cấp thông tin đăng nhập.'],
    ['TAI_KHOAN_SUA_THONG_TIN', 'Sửa thông tin tài khoản', 'Cập nhật thông tin tài khoản trong phạm vi.'],
    ['TAI_KHOAN_KHOA_MO_KHOA', 'Khóa hoặc mở khóa tài khoản', 'Thay đổi trạng thái đăng nhập theo thẩm quyền.'],
    ['TAI_KHOAN_THU_HOI_PHIEN', 'Thu hồi phiên đăng nhập', 'Kết thúc phiên của tài khoản trong phạm vi.'],
    ['TAI_KHOAN_LIEN_KET_HO_SO', 'Liên kết tài khoản với hồ sơ', 'Liên kết tài khoản và hồ sơ theo quy trình an toàn.'],
  ]),
  ...nhom('VAI_TRO', 'Vai trò', 'DA_CO_API', [
    ['VAI_TRO_XEM', 'Xem vai trò', 'Xem vai trò và Permission được gắn.'],
    ['VAI_TRO_TAO', 'Tạo vai trò', 'Tạo vai trò thường; không tạo Role hệ thống.'],
    ['VAI_TRO_SUA', 'Sửa vai trò', 'Sửa thông tin hoặc trạng thái vai trò thường.'],
    ['VAI_TRO_XOA', 'Xóa vai trò', 'Xóa vai trò thường chưa có Assignment.'],
    ['VAI_TRO_GAN_QUYEN', 'Gán Permission vào vai trò', 'Thêm hoặc gỡ Permission trong giới hạn thẩm quyền.'],
  ]),
  ...nhom('PHAN_CONG_VAI_TRO', 'Phân công vai trò', 'DA_CO_API', [
    ['PHAN_CONG_VAI_TRO_XEM', 'Xem Assignment', 'Xem Assignment trong Scope quản lý.'],
    ['PHAN_CONG_VAI_TRO_TAO', 'Tạo Assignment', 'Cấp vai trò thường với Scope không vượt thẩm quyền.'],
    ['PHAN_CONG_VAI_TRO_SUA', 'Sửa Assignment', 'Sửa phạm vi hoặc hiệu lực Assignment trong thẩm quyền.'],
    ['PHAN_CONG_VAI_TRO_THU_HOI', 'Thu hồi Assignment', 'Thu hồi Assignment thường trong phạm vi.'],
  ]),
  ...nhom('DANH_MUC_QUYEN', 'Danh mục quyền', 'DA_CO_API', [
    ['QUYEN_XEM_DANH_MUC', 'Xem danh mục Permission', 'Xem catalog Permission hệ thống; không tạo Permission mới.'],
  ]),
  ...nhom('NHAT_KY', 'Nhật ký', 'CHUA_CO_API', [
    ['NHAT_KY_KIEM_TOAN_XEM', 'Xem nhật ký kiểm toán', 'Xem Audit theo phạm vi và chính sách lưu trữ.'],
    ['NHAT_KY_BAO_MAT_XEM', 'Xem nhật ký bảo mật', 'Xem sự kiện bảo mật theo phạm vi.'],
    ['NHAT_KY_KIEM_TOAN_XUAT', 'Xuất nhật ký kiểm toán', 'Xuất Audit theo quyền, phạm vi và định dạng được duyệt.'],
  ]),
  ...nhom('CAP_NHAT_CA_NHAN', 'Yêu cầu cập nhật cá nhân', 'CHUA_CO_API', [
    ['HO_SO_CA_NHAN_TU_CAP_NHAT', 'Đề nghị cập nhật hồ sơ cá nhân', 'Gửi yêu cầu sửa thông tin cá nhân trong thời gian cho phép.'],
    ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', 'Mở đợt cập nhật cá nhân', 'Mở thời gian nhận yêu cầu cập nhật theo chính sách.'],
    ['HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'Xem yêu cầu cập nhật cá nhân', 'Xem yêu cầu đang chờ hoặc đã xử lý trong phạm vi.'],
    ['HO_SO_CA_NHAN_DUYET_CAP_NHAT', 'Duyệt yêu cầu cập nhật cá nhân', 'Phê duyệt hoặc từ chối yêu cầu theo workflow đã duyệt.'],
  ]),
  ...nhom('CAU_HINH', 'Cấu hình hệ thống', 'CHUA_CO_API', [
    ['CAU_HINH_HE_THONG_XEM', 'Xem cấu hình hệ thống', 'Xem cấu hình được phép công khai; không đọc bí mật môi trường.'],
    ['CAU_HINH_HE_THONG_SUA', 'Sửa cấu hình hệ thống', 'Sửa cấu hình nằm trong danh sách cho phép và ghi Audit.'],
  ]),
  ...nhom('VAN_HANH', 'Vận hành hệ thống', 'CHUA_CO_API', [
    ['VAN_HANH_HE_THONG', 'Thực hiện thao tác vận hành', 'Chỉ áp dụng cho thao tác kỹ thuật được định nghĩa và kiểm soát riêng.'],
  ]),
} satisfies Record<string, PermissionMetadata>) as Record<MaPermission, PermissionMetadata>

for (const code of permissionCatalog) {
  if (!permissionMetadata[code]) throw new Error(`Thiếu nhãn và mô tả Permission: ${code}`)
}
