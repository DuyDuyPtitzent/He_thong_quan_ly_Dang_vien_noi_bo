# Hướng dẫn làm việc với AI

## Khởi động phiên

1. Đọc file này và `docs/SESSION_HANDOFF.md` để lấy trạng thái gần nhất.
2. Mở `docs/AI_CONTEXT.md` khi cần hiểu kiến trúc hoặc định hướng sản phẩm.
3. Chạy `git status --short` trước khi sửa. Không đọc toàn bộ repository để khởi động.
4. Chỉ đọc file liên quan trực tiếp tới yêu cầu; tra `BASE_SOURCE_GUIDE.md` hoặc `docs/architecture.md` theo mục cần thiết.

## Định tuyến tài liệu

| Nhiệm vụ | Tài liệu nên đọc |
|---|---|
| Sửa/tạo giao diện hoặc feature | `README.md`, `docs/architecture.md`, các file trong feature liên quan |
| Route, menu, layout, provider | `src/app/`, `src/layouts/`, `src/core/config/` liên quan |
| API, auth, cấu hình | `src/core/` liên quan và `.env.example`; không giả định auth hiện tại đã sẵn sàng production |
| Định hướng nghiệp vụ Đảng viên | `docs/AI_CONTEXT.md` và phần tương ứng trong `U:\Dang_Uy_PTIT\Quan_ly_Dang_vien\KE_HOACH_QUY_HOACH_DANG_VIEN.md` nếu còn truy cập được |
| Cấu trúc/tài sản source nền | Mục tương ứng trong `BASE_SOURCE_GUIDE.md`; xác nhận lại bằng code hiện tại |

## Nguyên tắc dự án

- Đây là nền React admin frontend; không tự giả định đã có backend, database, nghiệp vụ thật, auth production hoặc RBAC hoàn chỉnh.
- Giữ nghiệp vụ trong `src/features/<feature>/`; `app` lắp ghép route/provider, `core` giữ hạ tầng ứng dụng, `layouts` giữ khung, `shared` chỉ chứa thứ thật sự dùng chung.
- Không để `shared`, `core` hoặc `layouts` phụ thuộc vào `features`; tránh gọi API trong component trình bày. Dùng Axios client và TanStack Query hiện có khi tích hợp API.
- Ưu tiên UI primitives và shared components đã có trước khi tạo mới. UI permission chỉ phục vụ trải nghiệm; quyền dữ liệu phải được kiểm tra phía server khi backend được xây dựng.
- Định hướng Đảng viên trong kế hoạch nguồn là yêu cầu sản phẩm cần xác nhận và chia giai đoạn, không phải bằng chứng tính năng đã được triển khai. Không mang nguyên xi Tenant, RBAC, Workflow, nghiệp vụ Đoàn hoặc cấu trúc backend từ dự án nguồn.
- Thay đổi schema, backend, hệ thống quyền, thư viện hoặc cấu trúc nền tảng cần được nêu thành kế hoạch rõ trước khi triển khai. Không thêm dependency nếu chưa thật cần.
- Không tuyên bố đã chạy kiểm tra nếu chưa chạy. Khi hoàn thành, cập nhật `docs/SESSION_HANDOFF.md` bằng trạng thái ngắn, file chính, việc dở và lệnh kiểm tra đã chạy.

## Tiết kiệm ngữ cảnh

- Không quét toàn bộ `src/`, `node_modules/` hay lịch sử git nếu yêu cầu không cần.
- Tìm symbol/route cụ thể bằng `rg`, lần theo import và chỉ mở các file cần thiết.
- Chỉ đọc sâu `BASE_SOURCE_GUIDE.md` khi tác vụ cần chi tiết nền; tài liệu đó mô tả snapshot của source, nên code hiện tại là căn cứ cuối cùng.
