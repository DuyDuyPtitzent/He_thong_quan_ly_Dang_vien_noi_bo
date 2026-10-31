# Hợp đồng API quản lý tổ chức

**Trạng thái:** Đề xuất API đã được duyệt ngày 2026-11-01. Đây là hợp đồng mục tiêu; endpoint nghiệp vụ chưa được triển khai. Không mở API ghi dữ liệu trước khi có xác thực và kiểm tra Permission + Scope phía Backend.

## Quy ước

- REST JSON dưới prefix `/api/v1`.
- URL và trường JSON do dự án định nghĩa dùng tiếng Việt không dấu.
- UUID truyền ở vị trí `{maDonVi}`; thời gian truyền theo ISO 8601 có múi giờ.
- Khoảng hiệu lực theo quy ước `[bắt đầu, kết thúc)`. Ngày kết thúc nhập theo lịch được tính hết ngày đó theo giờ `Asia/Ho_Chi_Minh`; ngày giờ kết thúc áp dụng đúng thời điểm.
- DTO không phụ thuộc Prisma; lỗi theo dạng chung `{ maLoi, thongBao, maTuongQuan }`.

## Endpoint

| Phương thức | Endpoint | Permission dự kiến | Mô tả |
|---|---|---|---|
| GET | `/api/v1/to-chuc` | Chưa chốt mã | Danh sách có phân trang; lọc theo `loaiDonVi`, `trangThai`, `tuKhoa` |
| GET | `/api/v1/to-chuc/cay` | Chưa chốt mã | Cây tại thời điểm hiện tại hoặc `thoiDiem` được yêu cầu |
| GET | `/api/v1/to-chuc/{maDonVi}` | Chưa chốt mã | Chi tiết đơn vị, tên và quan hệ hiện hành |
| POST | `/api/v1/to-chuc` | Chưa chốt mã | Tạo đơn vị, tên ban đầu và quan hệ cha tùy loại trong một transaction |
| PATCH | `/api/v1/to-chuc/{maDonVi}` | Chưa chốt mã | Sửa thông tin; đổi loại chỉ khi mọi quan hệ/lịch sử còn hợp lệ |
| POST | `/api/v1/to-chuc/{maDonVi}/doi-ten` | Chưa chốt mã | Kết thúc tên cũ và ghi dòng lịch sử tên mới trong một transaction |
| POST | `/api/v1/to-chuc/{maDonVi}/cap-nhat-quan-he-cha` | Chưa chốt mã | Kết thúc quan hệ cha cũ và tạo quan hệ mới theo thời điểm hiệu lực trong một transaction |
| GET | `/api/v1/to-chuc/{maDonVi}/lich-su-quan-he` | Chưa chốt mã | Tra lịch sử quan hệ cha-con |
| DELETE | `/api/v1/to-chuc/{maDonVi}` | Chưa chốt mã | Xóa hẳn sau khi các bản ghi tham chiếu được xử lý; không cascade xóa lịch sử |

Tên Permission, danh sách `trangThai`, chính sách cấp quyền và phân trang tối đa cần được chốt theo các module nền liên quan; tài liệu này không tự tạo danh mục hoặc dữ liệu seed.

## Quy tắc nghiệp vụ và transaction

1. Tạo đơn vị cùng tên ban đầu và quan hệ cha (nếu có) là một transaction; lỗi một phần phải rollback toàn bộ.
2. Quan hệ chỉ cho phép Đảng ủy → Chi bộ → Tổ. Đổi cha phải kiểm tra chu trình, độ sâu tối đa ba tầng, khoảng hiệu lực, số cha cùng thời điểm và lịch sử sinh hoạt bị ảnh hưởng.
3. Đổi loại đơn vị phải kiểm tra toàn bộ quan hệ lịch sử và lịch sử sinh hoạt tham chiếu. Nếu không còn hợp lệ thì từ chối, không ghi thay đổi.
4. Đổi tên ghi lịch sử, không ghi đè dòng tên cũ.
5. Xóa trả HTTP 409 nếu còn khóa ngoại tham chiếu. Backend không tự xóa dữ liệu dây chuyền; sau khi các tham chiếu được xử lý, cho phép xóa hẳn.
6. Mọi thay đổi ghi audit trong cùng transaction; dữ liệu nhạy cảm không được ghi đầy đủ vào audit/log.
7. Mọi API kiểm tra danh tính, quyền thao tác và Scope ở Backend. Không tin `maDonVi` hoặc phạm vi do client gửi nếu không được kiểm tra.

## Mã lỗi dự kiến

HTTP 400 cho dữ liệu đầu vào không hợp lệ; 401 chưa xác thực; 403 không đủ quyền/phạm vi; 404 không tìm thấy đơn vị; 409 xung đột trạng thái, quan hệ hoặc tham chiếu; 500 lỗi máy chủ đã được che thông tin nội bộ.

Mã lỗi cụ thể dùng tiếng Việt không dấu và sẽ được chốt cùng bộ mã Permission/error của API nền. Không trả SQL, stack trace hoặc dữ liệu cá nhân trong phản hồi.

## Dependency trước khi mở API

Backend hiện có module sức khỏe và Prisma service, chưa có xác thực hoặc RBAC thực thi. Vì vậy, triển khai API ghi dữ liệu phụ thuộc vào cơ chế xác thực tài khoản nội bộ, khởi tạo quản trị đầu tiên, guard Permission + Scope, bộ mã Permission và nguồn trạng thái đơn vị. Không tạo tài khoản mặc định, vai trò/quyền seed hoặc danh sách trạng thái PTIT khi chưa có quyết định/nguồn được duyệt.
