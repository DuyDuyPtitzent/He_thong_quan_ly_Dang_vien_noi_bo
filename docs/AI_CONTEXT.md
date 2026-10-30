# Bối cảnh nhanh cho AI

## Sản phẩm và trạng thái

Repository hiện tại là React Admin Starter dùng làm nền frontend cho hệ thống quản lý Đảng viên. Đây chưa phải ứng dụng nghiệp vụ hoàn chỉnh: chưa thấy backend/database nghiệp vụ; `AuthProvider` là hợp đồng tích hợp, không phải xác thực production. Các trang Dashboard/Settings hiện là nền mẫu. Kiểm tra code trước khi khẳng định trạng thái có thay đổi.

## Kiến trúc hiện có

- React 19, TypeScript strict, Vite, Tailwind 4, shadcn-style components, React Router, TanStack Query, Axios, React Hook Form và Zod.
- `src/app/`: providers, router, styles; `src/core/`: API client, auth contract, app/navigation config; `src/layouts/`: khung quản trị; `src/shared/`: UI và tiện ích; `src/features/`: nghiệp vụ theo feature.
- Thêm trang: feature riêng → đăng ký route/title tại router → đăng ký menu tại navigation config. Dữ liệu server dùng service của feature + shared Axios client + query hook.
- Nguồn tham khảo chi tiết: `docs/architecture.md`, `README.md`, `BASE_SOURCE_GUIDE.md`.

## Định hướng sản phẩm đã có trong kế hoạch nguồn

Kế hoạch tại `U:\Dang_Uy_PTIT\Quan_ly_Dang_vien\KE_HOACH_QUY_HOACH_DANG_VIEN.md` đề xuất sản phẩm độc lập, dữ liệu/database riêng, phục vụ một Học viện. Định hướng tổ chức: Đảng ủy Học viện → cấp ủy → chi bộ → tổ Đảng → Đảng viên. Tách đơn vị tổ chức, phân công vai trò và quyền nghiệp vụ; scope dữ liệu đi theo đơn vị được giao. Trợ lý/chức trách nên là phân công cấu hình được, không mặc định hard-code theo chức danh.

Lộ trình đề xuất trong tài liệu nguồn:

1. Chốt repo/sản phẩm độc lập và cấu hình môi trường.
2. Lập bản đồ source, phụ thuộc và phần nào giữ/bỏ/thay trước khi sửa lớn.
3. Chốt mô hình tổ chức, ma trận quyền/scope, hồ sơ và MVP.
4. Xây nền xác thực, tổ chức, tài khoản và kiểm tra scope phía server.
5. MVP: hồ sơ Đảng viên, sinh hoạt chi bộ, audit, tệp có phân quyền và báo cáo cơ bản.
6. Thí điểm, xác nhận nghiệp vụ rồi mới mở rộng kết nạp/chuyển sinh hoạt/đánh giá và workflow.

Đây là đề xuất nghiệp vụ, chưa phải quyết định đã duyệt hay chức năng đã xây. Nền hiện tại chỉ frontend; backend, mô hình dữ liệu và bảo mật cần thiết kế riêng. Không bê nguyên mô hình multi-tenant, vai trò/quyền, workflow hay dữ liệu Đoàn viên từ repository nguồn.

## Cách mở rộng tài liệu

Khi một feature được triển khai, ghi trạng thái và điểm tiếp tục trong `docs/SESSION_HANDOFF.md`. Nếu có quyết định kiến trúc dài hạn, ghi vào `docs/architecture.md` hoặc ADR riêng theo phạm vi; không chép toàn bộ kế hoạch vào `AGENTS.md`.
