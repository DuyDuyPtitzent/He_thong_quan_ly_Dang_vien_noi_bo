/** Mã quyền do hệ thống quản lý theo ma trận đã duyệt. Danh mục này không tự tạo vai trò hay phân công vai trò. */
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
  'TAI_KHOAN_XEM', 'TAI_KHOAN_TAO', 'TAI_KHOAN_SUA_THONG_TIN', 'TAI_KHOAN_KHOA_MO_KHOA', 'TAI_KHOAN_XOA',
  'TAI_KHOAN_THU_HOI_PHIEN', 'TAI_KHOAN_LIEN_KET_HO_SO', 'VAI_TRO_XEM', 'VAI_TRO_TAO',
  'VAI_TRO_SUA', 'VAI_TRO_XOA', 'VAI_TRO_GAN_QUYEN', 'PHAN_CONG_VAI_TRO_XEM',
  'PHAN_CONG_VAI_TRO_TAO', 'PHAN_CONG_VAI_TRO_SUA', 'PHAN_CONG_VAI_TRO_THU_HOI',
  'QUYEN_XEM_DANH_MUC', 'NHAT_KY_KIEM_TOAN_XEM', 'NHAT_KY_BAO_MAT_XEM',
  'NHAT_KY_KIEM_TOAN_XUAT', 'NHAT_KY_XOA', 'HO_SO_CA_NHAN_TU_CAP_NHAT', 'HO_SO_CA_NHAN_MO_DOT_CAP_NHAT',
  'HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'HO_SO_CA_NHAN_DUYET_CAP_NHAT',
  'CAU_HINH_HE_THONG_XEM', 'CAU_HINH_HE_THONG_SUA', 'VAN_HANH_HE_THONG',
  'NAM_HOC_XEM', 'NAM_HOC_TAO', 'NAM_HOC_SUA', 'NAM_HOC_XOA',
] as const

export type MaPermission = (typeof permissionCatalog)[number]

export type PermissionMetadata = {
  ten: string
  moTa: string
  maNhom: string
  tenNhom: string
  tinhTrangApi: 'DA_CO_API' | 'CHUA_CO_API'
}

type PermissionEntry = readonly [MaPermission, string, string, PermissionMetadata['tinhTrangApi']?]

function nhom(
  maNhom: string,
  tenNhom: string,
  tinhTrangApi: PermissionMetadata['tinhTrangApi'],
  entries: readonly PermissionEntry[],
): Record<string, PermissionMetadata> {
  return Object.fromEntries(entries.map(([code, ten, moTa, trangThai]) => [code, { ten, moTa, maNhom, tenNhom, tinhTrangApi: trangThai ?? tinhTrangApi }]))
}

/** Metadata hiển thị trên ma trận; khi API được triển khai, cập nhật trạng thái quyền tại đây cùng thay đổi endpoint. */
export const permissionMetadata = ({
  ...nhom('TO_CHUC', 'Tổ chức Đảng', 'DA_CO_API', [
    ['TO_CHUC_XEM', 'Xem đơn vị', 'Xem danh sách, sơ đồ cây và thông tin chi tiết của các đơn vị nằm trong phạm vi được giao.'],
    ['TO_CHUC_TAO', 'Tạo đơn vị', 'Thêm đơn vị mới đúng cấp Đảng ủy, Chi bộ hoặc Tổ; đơn vị phải có quan hệ cấp trên hợp lệ.'],
    ['TO_CHUC_SUA_THONG_TIN', 'Sửa thông tin đơn vị', 'Cập nhật tên, mã định danh và các thông tin mô tả của đơn vị trong phạm vi được giao.'],
    ['TO_CHUC_SUA_LOAI', 'Sửa loại đơn vị', 'Thay đổi loại đơn vị khi cấu trúc cấp trên, cấp dưới và dữ liệu liên quan vẫn hợp lệ.'],
    ['TO_CHUC_DOI_DON_VI_CHA', 'Đổi đơn vị cấp trên', 'Chuyển đơn vị sang đơn vị cấp trên khác khi không tạo vòng lặp và đúng cấu trúc tổ chức.'],
    ['TO_CHUC_XEM_LICH_SU', 'Xem lịch sử tổ chức', 'Xem các lần đổi tên, đổi đơn vị cấp trên và thời gian hiệu lực của đơn vị trong phạm vi được giao.'],
    ['TO_CHUC_SUA_LICH_SU', 'Sửa lịch sử tổ chức', 'Điều chỉnh bản ghi lịch sử tổ chức trong phạm vi được giao; thao tác phải giữ đúng thời gian hiệu lực và quan hệ đơn vị.', 'CHUA_CO_API'],
    ['TO_CHUC_DOI_TRANG_THAI', 'Đổi trạng thái đơn vị', 'Chuyển đơn vị giữa các trạng thái hoạt động đã quy định; không làm mất dữ liệu lịch sử.'],
    ['TO_CHUC_KHOI_PHUC', 'Khôi phục đơn vị', 'Đưa đơn vị đã ngừng hoạt động trở lại trạng thái hoạt động khi đáp ứng điều kiện nghiệp vụ.'],
    ['TO_CHUC_XOA', 'Xóa đơn vị', 'Xóa đơn vị chỉ khi đơn vị không còn đơn vị trực thuộc, hồ sơ hoặc dữ liệu nghiệp vụ tham chiếu.'],
  ]),
  ...nhom('HO_SO', 'Hồ sơ đảng viên', 'CHUA_CO_API', [
    ['HO_SO_DANG_VIEN_XEM_DANH_SACH', 'Xem danh sách hồ sơ', 'Xem danh sách Đảng viên thuộc phạm vi được giao; kết quả tìm kiếm và bộ lọc không được vượt phạm vi đó.', 'DA_CO_API'],
    ['HO_SO_DANG_VIEN_XEM_TONG_QUAN', 'Xem tổng quan hồ sơ', 'Xem phần thông tin chung của hồ sơ Đảng viên mà tài khoản được phép truy cập.', 'DA_CO_API'],
    ['HO_SO_DANG_VIEN_TAO', 'Tạo hồ sơ Đảng viên', 'Lập hồ sơ Đảng viên mới theo quy trình tiếp nhận và các trường bắt buộc của hệ thống.', 'DA_CO_API'],
    ['HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN', 'Sửa thông tin cơ bản', 'Cập nhật các thông tin cơ bản được quy trình nghiệp vụ cho phép; quyền này không tự cho phép đổi sinh hoạt, trạng thái hoặc phân quyền.', 'DA_CO_API'],
    ['HO_SO_DANG_VIEN_XOA', 'Xóa hồ sơ Đảng viên', 'Xóa vật lý hồ sơ tạo nhầm cùng các bản ghi ban đầu sau khi kiểm tra Scope và điều kiện bảo toàn lịch sử.', 'DA_CO_API'],
    ['HO_SO_CA_NHAN_XEM', 'Xem hồ sơ cá nhân', 'Xem hồ sơ được liên kết với chính tài khoản đang đăng nhập; không dùng quyền này để tra cứu hồ sơ người khác.', 'DA_CO_API'],
    ['HO_SO_CA_NHAN_SUA', 'Đề nghị sửa thông tin cá nhân', 'Cho phép Đảng viên gửi đề nghị thay đổi thông tin cá nhân trong đợt còn hiệu lực; dữ liệu chính thức chỉ đổi sau khi được duyệt.', 'DA_CO_API'],
    ['HO_SO_DIA_CHI_XEM', 'Xem địa chỉ', 'Xem các địa chỉ có trong hồ sơ của những Đảng viên nằm trong phạm vi được giao.', 'DA_CO_API'],
    ['HO_SO_DIA_CHI_SUA', 'Đề nghị sửa địa chỉ', 'Cho phép gửi đề nghị thay đổi địa chỉ theo đợt cập nhật và quy trình phê duyệt; không sửa trực tiếp dữ liệu chính thức.', 'DA_CO_API'],
    ['HO_SO_SINH_VIEN_XEM', 'Xem thông tin sinh viên', 'Xem thông tin sinh viên đã được lưu và liên kết với hồ sơ Đảng viên trong phạm vi được giao.', 'DA_CO_API'],
    ['HO_SO_SINH_VIEN_SUA', 'Sửa thông tin sinh viên', 'Cập nhật thông tin sinh viên theo quy trình được phê duyệt; không tự kết nối hoặc sửa dữ liệu tại hệ thống đào tạo nguồn.', 'DA_CO_API'],
    ['HO_SO_XUAT_DU_LIEU', 'Xuất dữ liệu hồ sơ', 'Tải dữ liệu hồ sơ trong phạm vi được giao; dữ liệu xuất phải tuân theo quyền xem từng nhóm thông tin.', 'DA_CO_API'],
    ['HO_SO_XEM_LICH_SU_THAY_DOI', 'Xem lịch sử hồ sơ', 'Xem các lần thay đổi hồ sơ, người thực hiện, thời điểm và kết quả trong phạm vi được giao.', 'DA_CO_API'],
  ]),
  ...nhom('SINH_HOAT', 'Sinh hoạt Đảng', 'CHUA_CO_API', [
    ['SINH_HOAT_XEM_HIEN_TAI', 'Xem sinh hoạt hiện tại', 'Xem Đảng ủy, Chi bộ, Tổ và thời điểm bắt đầu sinh hoạt hiện tại của hồ sơ trong phạm vi được giao.', 'DA_CO_API'],
    ['SINH_HOAT_XEM_LICH_SU', 'Xem lịch sử sinh hoạt', 'Xem các lần chuyển Chi bộ, Tổ và thời gian sinh hoạt trước đây của hồ sơ trong phạm vi được giao.', 'DA_CO_API'],
    ['SINH_HOAT_CHUYEN_DON_VI', 'Chuyển sinh hoạt', 'Lập hoặc thực hiện thủ tục chuyển sinh hoạt Đảng giữa các đơn vị theo đúng thẩm quyền và quy trình đã quy định.'],
    ['SINH_HOAT_SUA_LICH_SU', 'Sửa lịch sử sinh hoạt', 'Điều chỉnh bản ghi sinh hoạt đã lập khi có căn cứ nghiệp vụ; phải bảo toàn thông tin trước và sau điều chỉnh.'],
    ['SINH_HOAT_XOA_LICH_SU', 'Xóa lịch sử sinh hoạt', 'Xóa bản ghi lịch sử sinh hoạt chỉ khi quy định lưu trữ và quan hệ nghiệp vụ cho phép.'],
  ]),
  ...nhom('QUA_TRINH_DANG', 'Quá trình Đảng', 'CHUA_CO_API', [
    ['QUA_TRINH_DANG_XEM', 'Xem quá trình Đảng', 'Xem các mốc nghiệp vụ đã ghi nhận trong quá trình vào Đảng và sinh hoạt của hồ sơ trong phạm vi được giao.', 'DA_CO_API'],
    ['QUA_TRINH_DANG_TAO', 'Tạo quá trình Đảng', 'Ghi nhận một mốc quá trình Đảng mới với ngày, loại sự kiện và căn cứ theo hồ sơ nghiệp vụ.'],
    ['QUA_TRINH_DANG_SUA', 'Sửa quá trình Đảng', 'Điều chỉnh nội dung mốc quá trình Đảng trong phạm vi được giao và ghi nhận lịch sử thay đổi.'],
    ['QUA_TRINH_DANG_XOA', 'Xóa quá trình Đảng', 'Xóa mốc quá trình Đảng chỉ khi không trái quy định lưu trữ và không làm sai lệch hồ sơ.'],
  ]),
  ...nhom('CHUC_VU', 'Chức vụ', 'CHUA_CO_API', [
    ['CHUC_VU_XEM', 'Xem chức vụ', 'Xem danh sách chức vụ được khai báo để sử dụng trong công tác tổ chức.'],
    ['CHUC_VU_TAO', 'Tạo chức vụ', 'Thêm chức vụ mới vào danh mục chức vụ sau khi kiểm tra không trùng tên hoặc mã.'],
    ['CHUC_VU_SUA', 'Sửa chức vụ', 'Cập nhật tên, mô tả hoặc trạng thái của chức vụ theo thẩm quyền.'],
    ['CHUC_VU_XOA', 'Xóa chức vụ', 'Xóa chức vụ chỉ khi chức vụ chưa được dùng trong phân công hoặc dữ liệu lịch sử.'],
  ]),
  ...nhom('NHIEM_KY', 'Nhiệm kỳ và phân công chức vụ', 'CHUA_CO_API', [
    ['NHIEM_KY_XEM', 'Xem nhiệm kỳ', 'Xem danh sách nhiệm kỳ, đơn vị áp dụng và thời gian bắt đầu, kết thúc.'],
    ['NHIEM_KY_TAO', 'Tạo nhiệm kỳ', 'Khai báo nhiệm kỳ mới với tên, đơn vị áp dụng và khoảng thời gian hợp lệ.'],
    ['NHIEM_KY_SUA', 'Sửa nhiệm kỳ', 'Cập nhật thông tin nhiệm kỳ khi không làm sai lệch các phân công đã phát sinh.'],
    ['NHIEM_KY_XOA', 'Xóa nhiệm kỳ', 'Xóa nhiệm kỳ chỉ khi chưa có phân công hoặc dữ liệu nghiệp vụ phụ thuộc.'],
    ['PHAN_CONG_CHUC_VU_XEM', 'Xem phân công chức vụ', 'Xem người được giao chức vụ, đơn vị, nhiệm kỳ và thời gian hiệu lực trong phạm vi được giao.', 'DA_CO_API'],
    ['PHAN_CONG_CHUC_VU_TAO', 'Tạo phân công chức vụ', 'Giao chức vụ cho cá nhân tại đơn vị và nhiệm kỳ phù hợp với thẩm quyền.'],
    ['PHAN_CONG_CHUC_VU_SUA', 'Sửa phân công chức vụ', 'Điều chỉnh nội dung phân công trong phạm vi được giao và ghi nhận lịch sử thay đổi.'],
    ['PHAN_CONG_CHUC_VU_KET_THUC', 'Kết thúc phân công chức vụ', 'Ghi nhận ngày kết thúc phân công khi người được giao thôi giữ chức vụ hoặc hết thời hạn.'],
    ['PHAN_CONG_CHUC_VU_XOA', 'Xóa phân công chức vụ', 'Xóa phân công chỉ khi quy định lưu trữ cho phép và không làm mất căn cứ lịch sử.'],
  ]),
  ...nhom('TAI_KHOAN', 'Tài khoản', 'DA_CO_API', [
    ['TAI_KHOAN_XEM', 'Xem tài khoản', 'Tìm và xem thông tin tài khoản thuộc phạm vi được giao để phục vụ quản lý tài khoản và phân công vai trò.'],
  ]),
  ...nhom('TAI_KHOAN', 'Tài khoản', 'CHUA_CO_API', [
    ['TAI_KHOAN_TAO', 'Tạo tài khoản', 'Tạo tài khoản đăng nhập theo quy trình cấp tài khoản; thông tin xác thực phải được xử lý an toàn.', 'DA_CO_API'],
    ['TAI_KHOAN_SUA_THONG_TIN', 'Sửa thông tin tài khoản', 'Cập nhật thông tin được phép của tài khoản trong phạm vi quản lý; không tự thay đổi vai trò được giao.', 'DA_CO_API'],
    ['TAI_KHOAN_KHOA_MO_KHOA', 'Khóa hoặc mở khóa tài khoản', 'Ngăn hoặc cho phép tài khoản đăng nhập bằng cách đổi trạng thái theo thẩm quyền.', 'DA_CO_API'],
    ['TAI_KHOAN_XOA', 'Xóa tài khoản', 'Xóa tài khoản chỉ khi không còn hồ sơ, phân công, nhật ký hoặc dữ liệu cần bảo toàn.', 'DA_CO_API'],
    ['TAI_KHOAN_THU_HOI_PHIEN', 'Thu hồi phiên đăng nhập', 'Buộc tài khoản trong phạm vi đăng xuất khỏi các phiên đang hoạt động.'],
    ['TAI_KHOAN_LIEN_KET_HO_SO', 'Liên kết tài khoản với hồ sơ', 'Gắn một tài khoản với đúng hồ sơ Đảng viên sau khi xác minh và bảo đảm hồ sơ chưa liên kết sai với tài khoản khác.', 'DA_CO_API'],
  ]),
  ...nhom('VAI_TRO', 'Vai trò', 'DA_CO_API', [
    ['VAI_TRO_XEM', 'Xem vai trò', 'Xem danh sách vai trò, trạng thái và các quyền đang được gắn với từng vai trò.'],
    ['VAI_TRO_TAO', 'Tạo vai trò', 'Tạo vai trò quản trị thông thường; không được tạo hoặc thay thế vai trò hệ thống được bảo vệ.'],
    ['VAI_TRO_SUA', 'Sửa vai trò', 'Đổi tên, mô tả hoặc trạng thái của vai trò thông thường; không sửa vai trò hệ thống.'],
    ['VAI_TRO_XOA', 'Xóa vai trò', 'Xóa vai trò thông thường khi chưa được giao cho tài khoản nào; không xóa vai trò hệ thống.'],
    ['VAI_TRO_GAN_QUYEN', 'Gán quyền vào vai trò', 'Thêm hoặc gỡ quyền trong giới hạn quyền và phạm vi mà người thao tác được phép quản lý.'],
  ]),
  ...nhom('PHAN_CONG_VAI_TRO', 'Phân công vai trò', 'DA_CO_API', [
    ['PHAN_CONG_VAI_TRO_XEM', 'Xem phân công vai trò', 'Xem tài khoản nào được giao vai trò, phạm vi áp dụng, thời hạn và trạng thái phân công trong phạm vi quản lý.'],
    ['PHAN_CONG_VAI_TRO_TAO', 'Tạo phân công vai trò', 'Giao vai trò thông thường cho tài khoản khác với phạm vi và thời hạn không vượt quyền của người cấp.'],
    ['PHAN_CONG_VAI_TRO_SUA', 'Sửa phân công vai trò', 'Điều chỉnh phạm vi hoặc thời hạn của phân công khi người thao tác có đủ thẩm quyền đối với cả thông tin mới.'],
    ['PHAN_CONG_VAI_TRO_THU_HOI', 'Thu hồi phân công vai trò', 'Chấm dứt hiệu lực phân công vai trò thông thường trong phạm vi quản lý; lịch sử và nhật ký vẫn được lưu.'],
  ]),
  ...nhom('DANH_MUC_QUYEN', 'Danh mục quyền', 'DA_CO_API', [
    ['QUYEN_XEM_DANH_MUC', 'Xem danh mục quyền', 'Tra cứu mã, tên, ý nghĩa và trạng thái chức năng của các quyền do hệ thống định nghĩa; không tạo quyền mới.'],
  ]),
  ...nhom('NHAT_KY', 'Nhật ký', 'DA_CO_API', [
    ['NHAT_KY_KIEM_TOAN_XEM', 'Xem nhật ký kiểm toán', 'Tra cứu thao tác toàn hệ thống; chỉ Quản trị viên toàn hệ thống có phân công TOAN_HE_THONG hợp lệ được sử dụng quyền này.', 'DA_CO_API'],
    ['NHAT_KY_BAO_MAT_XEM', 'Xem nhật ký bảo mật', 'Tra cứu sự kiện bảo mật toàn hệ thống; chỉ Quản trị viên toàn hệ thống có phân công TOAN_HE_THONG hợp lệ được sử dụng quyền này.', 'DA_CO_API'],
    ['NHAT_KY_KIEM_TOAN_XUAT', 'Xuất nhật ký kiểm toán', 'Tải nhật ký kiểm toán trong phạm vi được phép, theo định dạng và thời hạn lưu trữ đã quy định.'],
    ['NHAT_KY_XOA', 'Quản lý xóa nhật ký', 'Quyền riêng cho bước xem trước xóa nhật ký theo Scope; API xóa thực tế chưa có và chỉ được bổ sung sau khi chính sách lưu trữ được phê duyệt.', 'DA_CO_API'],
  ]),
  ...nhom('CAP_NHAT_CA_NHAN', 'Yêu cầu cập nhật cá nhân', 'CHUA_CO_API', [
    ['HO_SO_CA_NHAN_TU_CAP_NHAT', 'Đề nghị cập nhật hồ sơ cá nhân', 'Gửi thông tin cá nhân và ảnh đại diện cần thay đổi trong thời gian mở đợt; yêu cầu phải được Chi bộ duyệt trước khi áp dụng.', 'DA_CO_API'],
    ['HO_SO_CA_NHAN_MO_DOT_CAP_NHAT', 'Mở đợt cập nhật hồ sơ', 'Tạo đợt nhận yêu cầu, xác định đơn vị áp dụng, thời gian bắt đầu–kết thúc và danh sách trường được đề nghị thay đổi.', 'DA_CO_API'],
    ['HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT', 'Xem yêu cầu cập nhật hồ sơ', 'Xem nội dung, người gửi, trạng thái và kết quả xử lý của các yêu cầu thuộc phạm vi được giao.', 'DA_CO_API'],
    ['HO_SO_CA_NHAN_DUYET_CAP_NHAT', 'Duyệt yêu cầu cập nhật hồ sơ', 'Phê duyệt hoặc từ chối yêu cầu trong phạm vi được giao sau khi kiểm tra quyền, phạm vi và trạng thái yêu cầu.', 'DA_CO_API'],
  ]),
  ...nhom('CAU_HINH', 'Cấu hình hệ thống', 'CHUA_CO_API', [
    ['CAU_HINH_HE_THONG_XEM', 'Xem cấu hình hệ thống', 'Xem các thiết lập hệ thống được công khai cho tài khoản; không xem mật khẩu, khóa bí mật hoặc biến môi trường.'],
    ['CAU_HINH_HE_THONG_SUA', 'Sửa cấu hình hệ thống', 'Thay đổi các thiết lập nằm trong danh sách được phép; mọi thay đổi phải có nhật ký kiểm toán.'],
  ]),
  ...nhom('VAN_HANH', 'Vận hành hệ thống', 'CHUA_CO_API', [
    ['VAN_HANH_HE_THONG', 'Thực hiện thao tác vận hành', 'Thực hiện các thao tác kỹ thuật đã được hệ thống cho phép và kiểm soát riêng; quyền này không mặc nhiên cho phép truy cập dữ liệu nghiệp vụ.'],
  ]),
  ...nhom('NAM_HOC', 'Năm học', 'DA_CO_API', [
    ['NAM_HOC_XEM', 'Xem năm học', 'Xem danh mục và số liệu năm học dùng chung toàn hệ thống.', 'DA_CO_API'],
    ['NAM_HOC_TAO', 'Tạo năm học', 'Tạo năm học với mã duy nhất và khoảng ngày không chồng lấn.', 'DA_CO_API'],
    ['NAM_HOC_SUA', 'Sửa năm học', 'Cập nhật năm học sau khi kiểm tra điều kiện thời gian và dữ liệu liên quan.', 'DA_CO_API'],
    ['NAM_HOC_XOA', 'Xóa năm học', 'Xóa năm học khi chưa có dữ liệu nghiệp vụ tham chiếu cần bảo toàn.', 'DA_CO_API'],
  ]),
} satisfies Record<string, PermissionMetadata>) as Record<MaPermission, PermissionMetadata>

for (const code of permissionCatalog) {
  if (!permissionMetadata[code]) throw new Error(`Thiếu nhãn và mô tả Permission: ${code}`)
}
