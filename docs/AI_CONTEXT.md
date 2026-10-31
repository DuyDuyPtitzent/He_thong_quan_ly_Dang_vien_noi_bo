# Bối cảnh nhanh cho AI

## Trạng thái thực tế

Repository tách riêng `frontend/` (React/Vite) và `backend/` (NestJS/Prisma/PostgreSQL). Database phát triển đã áp dụng Prisma migration tạo 20 bảng theo `docs/THIET_KE_CSDL_TONG_THE.md`; có cấu hình, logging request, exception filter, endpoint sức khỏe và API xác thực tài khoản nội bộ (đăng nhập, xem phiên, đổi mật khẩu, đăng xuất). Chưa có quy trình khởi tạo tài khoản đầu tiên, dữ liệu PTIT, API nghiệp vụ hoặc RBAC thực thi. Không mô tả mục tiêu chưa triển khai là đã hoàn thành.

## Quyết định đã duyệt

- Sản phẩm quản lý nội bộ PTIT miền Bắc.
- Máy chủ mục tiêu: NestJS + Prisma + PostgreSQL, ứng dụng nguyên khối chia mô-đun.
- Cây tổ chức thống nhất, tối đa ba tầng: Đảng ủy → Chi bộ → Tổ tùy chọn. Không có mô-đun cấp ủy/chi ủy.
- Quản lý chức vụ, nhiệm kỳ, phân công và lịch sử; không hard-code tên đơn vị/chức vụ thực tế.
- Phân quyền theo vai trò: mỗi vai trò có nhiều quyền trong ma trận; phân công gắn vai trò với tài khoản, phạm vi tổ chức và thời hạn. Một tài khoản có thể có nhiều phân công đồng thời. Máy chủ kiểm tra quyền + phạm vi; giao diện chỉ hỗ trợ trải nghiệm.
- Phạm vi: `CA_NHAN`, `CAY_DON_VI`, `DON_VI_CHI_DINH`, `TOAN_HE_THONG`. Không mặc định mọi quyền đều được kế thừa.
- Tài khoản người dùng và hồ sơ Đảng viên là hai thực thể; liên kết tùy chọn một-một.
- Giai đoạn đầu dùng tài khoản nội bộ do quản trị viên quản lý; không tự đăng ký. SSO nhà trường là khả năng tích hợp bổ sung sau nếu PTIT cấp quyền/điều kiện.
- Quy trình bootstrap tài khoản đầu tiên đã duyệt và triển khai: chạy thủ công `npm run bootstrap:admin` trong backend, chỉ khi bảng tài khoản rỗng; mật khẩu nhập kín, không ghi log, tài khoản buộc đổi mật khẩu lần đầu. Bootstrap không tự gán Role/Permission.
- Ưu tiên phiên bản tối thiểu: quản lý tổ chức và phân quyền, sau đó hồ sơ Đảng viên cơ bản.
- Đường dẫn giao diện lập trình, tên trường dữ liệu JSON, tên bảng/cột và mã nghiệp vụ do dự án định nghĩa dùng tiếng Việt không dấu. Giao diện và tài liệu dùng tiếng Việt có dấu. Tên chuẩn thư viện/giao thức giữ nguyên.
- Tên thư mục và file mã nguồn dùng tiếng Anh theo quy ước phổ biến của TypeScript/NestJS; xem `AGENTS.md` và `docs/architecture.md`.
- Tên model, enum, trường và quan hệ Prisma phải là tiếng Việt không dấu (model/enum PascalCase, trường/quan hệ camelCase) để đồng bộ với tên CSDL; giữ tên file/thư mục mã nguồn bằng tiếng Anh.
- Giai đoạn thiết kế A–F và roadmap đã được duyệt. Các mặc định về đăng nhập, khởi tạo quản trị, hiệu lực thay đổi, backup và audit được ghi trong ADR.

## Hướng dẫn khôi phục ngữ cảnh

1. Đọc `AGENTS.md` và `docs/SESSION_HANDOFF.md`.
2. Đọc ADR `docs/adr/0001-kien-truc-nen-tang.md` khi thay đổi kiến trúc, mô hình dữ liệu, auth hoặc phân quyền.
3. Đọc `docs/THIET_KE_CSDL_TONG_THE.md` để tra bảng/trường/khóa tổng thể và `docs/THIET_KE_HO_SO_DANG_VIEN.md` cho chi tiết tab hồ sơ; mục chờ duyệt không được tự triển khai.
4. Hợp đồng API quản lý tổ chức đã duyệt, chưa triển khai, nằm tại `docs/THIET_KE_API_TO_CHUC.md`. API nghiệp vụ phải chờ người dùng duyệt Permission và Scope cụ thể.
5. Chỉ đọc code liên quan yêu cầu; xác nhận trạng thái bằng repository, không suy từ roadmap.
6. Khi xây frontend, ưu tiên `frontend/src/` và component hiện có. Dữ liệu server qua Axios client và TanStack Query; nghiệp vụ UI nằm trong feature.
7. Không đưa dữ liệu PTIT thật vào seed/test. Không coi menu guard là kiểm soát bảo mật.
8. Xác thực tài khoản được triển khai độc lập với ma trận quyền; guard chỉ xác nhận phiên hợp lệ, không cấp quyền nghiệp vụ.

## Việc cần chốt trước khi triển khai nghiệp vụ

- Xác nhận danh mục trạng thái tài khoản hoạt động (hiện mã triển khai dùng `DANG_HOAT_DONG`) và phân công Role/Permission ban đầu sau khi ma trận quyền được duyệt.
- Rà soát/duyệt ma trận Permission và Scope trước khi triển khai API nghiệp vụ hoặc guard quyền.
- SSO được hoãn tới khi nhà trường cung cấp phương thức và quyền tích hợp; không chặn thiết kế tài khoản nội bộ.
- Danh mục quyền ban đầu cần được rà soát theo chức năng; vai trò chứa nhiều quyền theo ma trận, không mặc định theo chức danh.
- Rà soát trường hồ sơ cơ bản với đơn vị nghiệp vụ trước giai đoạn hồ sơ; không tự thêm trường nhạy cảm.
- Xác nhận người được cấp phạm vi `TOAN_HE_THONG`, chính sách sao lưu với hạ tầng và thời hạn lưu nhật ký kiểm toán.
