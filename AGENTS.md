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
| Route, menu, layout, provider | `frontend/src/app/`, `frontend/src/layouts/`, `frontend/src/core/config/` liên quan |
| API giao diện | `frontend/src/core/` liên quan và `frontend/.env.example` |
| API, auth máy chủ, cấu hình | `backend/src/` liên quan và `backend/.env.example`; không giả định auth hiện tại đã sẵn sàng production |
| Định hướng nghiệp vụ Đảng viên | `docs/AI_CONTEXT.md` và phần tương ứng trong `U:\Dang_Uy_PTIT\Quan_ly_Dang_vien\KE_HOACH_QUY_HOACH_DANG_VIEN.md` nếu còn truy cập được |
| Cấu trúc/tài sản source nền | Mục tương ứng trong `BASE_SOURCE_GUIDE.md`; xác nhận lại bằng code hiện tại |

## Nguyên tắc dự án

- Frontend đặt trong `frontend/`, Backend đặt trong `backend/`; tài liệu kiến trúc và hướng dẫn phát triển đặt tại repository root.
- Tên thư mục và file mã nguồn dùng tiếng Anh theo quy ước phổ biến của TypeScript/NestJS (thư mục `kebab-case`, file NestJS như `*.module.ts`, `*.controller.ts`, `*.service.ts`). Nội dung giao diện, API và tài liệu vẫn theo quyết định ngôn ngữ nghiệp vụ đã duyệt.
- Đồng bộ định danh dữ liệu: tên model, enum, trường và quan hệ trong `backend/prisma/schema.prisma`, cùng tên bảng/cột/giá trị PostgreSQL, dùng tiếng Việt không dấu. Prisma dùng `PascalCase` cho model/enum và `camelCase` cho trường/quan hệ; tên thư mục/file mã nguồn vẫn tiếng Anh theo quy ước TypeScript/NestJS. Giữ `@map`/`@@map` đúng với tên vật lý hiện hữu.
- Tác vụ Backend: đọc `backend/package.json`, `backend/prisma/schema.prisma` và module liên quan. Backend có nền cấu hình/sức khỏe và migration schema 20 bảng; API nghiệp vụ, auth, RBAC thực thi và dữ liệu PTIT chưa có.

- Repository hiện có React admin frontend và Backend NestJS/Prisma/PostgreSQL; database phát triển đã có schema nhưng chưa có dữ liệu thật. Không tự giả định đã có auth production hoặc RBAC thực thi.
- Giữ nghiệp vụ giao diện trong `frontend/src/features/<feature>/`; `app` lắp ghép route/provider, `core` giữ hạ tầng ứng dụng, `layouts` giữ khung, `shared` chỉ chứa thứ thật sự dùng chung.
- Không để `shared`, `core` hoặc `layouts` phụ thuộc vào `features`; tránh gọi API trong component trình bày. Dùng Axios client và TanStack Query hiện có khi tích hợp API.
- Ưu tiên UI primitives và shared components đã có trước khi tạo mới. UI permission chỉ phục vụ trải nghiệm; quyền dữ liệu phải được kiểm tra phía server. Backend chưa có xác thực hay phân quyền nghiệp vụ.
- Định hướng Đảng viên trong kế hoạch nguồn là yêu cầu sản phẩm cần xác nhận và chia giai đoạn, không phải bằng chứng tính năng đã được triển khai. Không mang nguyên xi Tenant, RBAC, Workflow, nghiệp vụ Đoàn hoặc cấu trúc backend từ dự án nguồn.
- Thay đổi schema, backend, hệ thống quyền, thư viện hoặc cấu trúc nền tảng cần được nêu thành kế hoạch rõ trước khi triển khai. Không thêm dependency nếu chưa thật cần.
- Không tuyên bố đã chạy kiểm tra nếu chưa chạy. Khi hoàn thành, cập nhật `docs/SESSION_HANDOFF.md` bằng trạng thái ngắn, file chính, việc dở và lệnh kiểm tra đã chạy.

## Tiết kiệm ngữ cảnh

- Không quét toàn bộ `frontend/src/`, `node_modules/` hay lịch sử git nếu yêu cầu không cần.
- Tìm symbol/route cụ thể bằng `rg`, lần theo import và chỉ mở các file cần thiết.
- Chỉ đọc sâu `BASE_SOURCE_GUIDE.md` khi tác vụ cần chi tiết nền; tài liệu đó mô tả snapshot của source, nên code hiện tại là căn cứ cuối cùng.
