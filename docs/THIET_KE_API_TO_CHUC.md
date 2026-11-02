# Hợp đồng API quản lý tổ chức

**Trạng thái:** Hợp đồng API đã được duyệt ngày 2026-11-01; Backend đã triển khai endpoint tổ chức đọc/ghi theo các Permission bên dưới. Chưa chạy kiểm thử tích hợp HTTP với quyền được gán; hiện không có Role/Assignment nào được tạo tự động.

## Quy ước

- REST JSON dưới prefix `/api/v1`.
- URL và trường JSON do dự án định nghĩa dùng tiếng Việt không dấu.
- UUID truyền ở vị trí `{maDonVi}`; thời gian truyền theo ISO 8601 có múi giờ.
- Khoảng hiệu lực theo quy ước `[bắt đầu, kết thúc)`. Ngày kết thúc nhập theo lịch được tính hết ngày đó theo giờ `Asia/Ho_Chi_Minh`; ngày giờ kết thúc áp dụng đúng thời điểm.
- DTO không phụ thuộc Prisma; lỗi theo dạng chung `{ maLoi, thongBao, maTuongQuan }`.

## Endpoint

| Phương thức | Endpoint | Permission dự kiến | Mô tả |
|---|---|---|---|
| GET | `/api/v1/to-chuc` | `TO_CHUC_XEM` | Danh sách có phân trang; lọc theo `loaiDonVi`, `trangThai`, `tuKhoa`; kết quả bị giới hạn theo Scope |
| GET | `/api/v1/to-chuc/cay` | `TO_CHUC_XEM` | Cây tại thời điểm hiện tại hoặc `thoiDiem`; chỉ trả đơn vị trong Scope |
| GET | `/api/v1/to-chuc/{maDonVi}` | `TO_CHUC_XEM` | Chi tiết đơn vị, tên và quan hệ hiện hành |
| POST | `/api/v1/to-chuc` | `TO_CHUC_TAO` | Tạo đơn vị, tên ban đầu và quan hệ cha tùy loại trong một transaction; tạo Đảng ủy gốc cần Scope `TOAN_HE_THONG` |
| PATCH | `/api/v1/to-chuc/{maDonVi}` | `TO_CHUC_SUA_THONG_TIN`; thêm `TO_CHUC_SUA_LOAI` khi đổi loại | Sửa thông tin; kiểm tra cấu trúc loại ở CSDL |
| PATCH | `/api/v1/to-chuc/{maDonVi}/trang-thai` | `TO_CHUC_DOI_TRANG_THAI`; `TO_CHUC_KHOI_PHUC` khi khôi phục | Đổi trạng thái trong Scope; khôi phục đơn vị đã ngừng dùng Permission riêng |
| POST | `/api/v1/to-chuc/{maDonVi}/doi-ten` | `TO_CHUC_SUA_THONG_TIN` | Kết thúc tên cũ và ghi dòng lịch sử tên mới trong một transaction |
| POST | `/api/v1/to-chuc/{maDonVi}/cap-nhat-quan-he-cha` | `TO_CHUC_DOI_DON_VI_CHA` trên đơn vị và cha mới | Kết thúc quan hệ cha cũ và tạo quan hệ mới theo thời điểm hiệu lực trong một transaction |
| GET | `/api/v1/to-chuc/{maDonVi}/lich-su-quan-he` | `TO_CHUC_XEM_LICH_SU` | Tra lịch sử quan hệ cha-con |
| DELETE | `/api/v1/to-chuc/{maDonVi}` | `TO_CHUC_XOA` | Xóa hẳn sau khi các bản ghi tham chiếu được xử lý; không cascade xóa lịch sử |

Permission đã được chốt theo `docs/THIET_KE_MA_TRAN_QUYEN.md` và có script đồng bộ danh mục hệ thống. `trangThai` nhận một trong `DANG_HOAT_DONG`, `TAM_NGUNG`, `NGUNG_HOAT_DONG`; đơn vị mới mặc định `DANG_HOAT_DONG`. Phân trang giới hạn tối đa 100 dòng.

Đơn vị gốc duy nhất đã được xác định: mã `PTIT_DANG_UY`, tên “Đảng ủy Học viện Công nghệ Bưu chính Viễn thông”, loại `DANG_UY`, không có cha và trạng thái ban đầu `DANG_HOAT_DONG`. Khởi tạo phải idempotent theo mã định danh: nếu đã có thì xác minh cấu hình, không tạo bản ghi trùng. CSDL và Backend cần ngăn tạo Đảng ủy gốc thứ hai. Chi bộ chỉ thuộc Đảng ủy; Tổ chỉ thuộc Chi bộ.

## Quy tắc nghiệp vụ và transaction

1. Tạo đơn vị cùng tên ban đầu và quan hệ cha (nếu có) là một transaction; lỗi một phần phải rollback toàn bộ. Tạo đơn vị mới không truyền trạng thái thì dùng `DANG_HOAT_DONG`.
2. Quan hệ chỉ cho phép Đảng ủy → Chi bộ → Tổ. Đổi cha phải kiểm tra chu trình, độ sâu tối đa ba tầng, khoảng hiệu lực, số cha cùng thời điểm và lịch sử sinh hoạt bị ảnh hưởng.
3. Đổi loại đơn vị phải kiểm tra toàn bộ quan hệ lịch sử và lịch sử sinh hoạt tham chiếu. Nếu không còn hợp lệ thì từ chối, không ghi thay đổi.
4. Đổi tên ghi lịch sử, không ghi đè dòng tên cũ.
5. Xóa trả HTTP 409 nếu còn khóa ngoại tham chiếu. Backend không tự xóa dữ liệu dây chuyền; sau khi các tham chiếu được xử lý, cho phép xóa hẳn.
6. Thay đổi trạng thái yêu cầu Permission và Scope trên đơn vị đích, ghi audit trong transaction. Chuyển `NGUNG_HOAT_DONG` về `DANG_HOAT_DONG` chỉ qua quy trình có thẩm quyền; không xóa dữ liệu/lịch sử khi ngừng hoặc khôi phục.
7. Mọi thay đổi ghi audit trong cùng transaction; dữ liệu nhạy cảm không được ghi đầy đủ vào audit/log.
8. Mọi API kiểm tra danh tính, quyền thao tác và Scope ở Backend. Không tin `maDonVi` hoặc phạm vi do client gửi nếu không được kiểm tra.

## Mã lỗi dự kiến

HTTP 400 cho dữ liệu đầu vào không hợp lệ; 401 chưa xác thực; 403 không đủ quyền/phạm vi; 404 không tìm thấy đơn vị; 409 xung đột trạng thái, quan hệ hoặc tham chiếu; 500 lỗi máy chủ đã được che thông tin nội bộ.

Mã lỗi cụ thể dùng tiếng Việt không dấu và sẽ được chốt cùng bộ mã Permission/error của API nền. Không trả SQL, stack trace hoặc dữ liệu cá nhân trong phản hồi.

## Trạng thái triển khai

- Backend đã triển khai các endpoint trong bảng trên, gắn xác thực, kiểm tra Permission + Scope và audit các thao tác ghi theo từng dịch vụ. Danh mục 71 Permission đã được đồng bộ; không tự tạo Role, Assignment, tài khoản hay đơn vị.
- Các migration về Role quản trị, trạng thái đơn vị và đơn vị gốc đã được áp dụng vào database phát triển theo bàn giao. Việc áp dụng schema không tự tạo đơn vị `PTIT_DANG_UY`; Quản trị viên toàn hệ thống có thể tạo đơn vị gốc sau qua API, với thông tin cố định đã duyệt và bảo vệ chống tạo trùng.
- API tổ chức chưa được kiểm thử tích hợp HTTP bằng các Assignment có Scope khác nhau. Giao diện cần xử lý phản hồi 401/403/404/409 từ Backend; giao diện không thay thế kiểm tra quyền phía máy chủ.
- Hợp đồng hiện chưa có API đọc lịch sử đổi tên hoặc nhật ký kiểm toán của một đơn vị. Endpoint lịch sử hiện có chỉ trả lịch sử quan hệ cha-con; không diễn giải nó như nhật ký kiểm toán.
