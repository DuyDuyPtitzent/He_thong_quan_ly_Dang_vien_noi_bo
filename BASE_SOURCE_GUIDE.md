# Base Source Guide

Repository: https://github.com/DuyDuyPtitzent/He_thong_quan_ly_Dang_vien_noi_bo

> Tài liệu phản ánh mã nguồn tại commit `39676b831c773d46764aea2aa8b52b2af7b26474` (nhánh `main`, kiểm tra 30/10/2026). Khi dự án phát triển, hãy cập nhật tài liệu theo mã nguồn thực tế. Không coi các nguyên tắc hiện tại là danh sách đóng.

## 1. Mục đích

Đây là React Admin Starter dùng để tái sử dụng phần giao diện và hạ tầng frontend cho những dự án quản trị khác nhau. Các module hiện tại là ví dụ, không phải chức năng quản lý đảng viên hoàn chỉnh. Mục tiêu là mở rộng theo module mà không phải viết lại Sidebar, Layout, Router hay các thành phần UI dùng chung.

## 2. Công nghệ đã khai báo

| Nhóm | Công nghệ | Phiên bản khai báo trong `package.json` |
| --- | --- | --- |
| Frontend | React / React DOM | `^19.3.1` |
| Ngôn ngữ | TypeScript | `~5.9.3` |
| Build | Vite | `^7.1.12` |
| CSS | Tailwind CSS | `^4.1.16` |
| UI | shadcn/ui source components | Cấu hình trong `components.json` |
| Icon | Lucide React | `^0.545.0` |
| Router | React Router DOM | `^7.9.4` |
| Server-state | TanStack React Query | `^5.90.5` |
| HTTP | Axios | `^1.12.2` |
| Form / Schema | React Hook Form / Zod | `^7.65.0` / `^4.1.12` |
| Theme | next-themes | `^0.4.6` |
| Notifications | Sonner | `^2.0.7` |
| Test | Vitest / Testing Library / Playwright | `^3.2.4` / `^16.3.0` / `^1.56.1` |
| Quality | ESLint / Prettier | `^9.38.0` / `^3.6.2` |

Các phiên bản trên là **version ranges khai báo**, không khẳng định phiên bản cài thực tế. Kiểm tra `package-lock.json` khi cần bản chính xác. **Chưa thấy Zustand trong dependencies**, do đó không mô tả như thư viện đã dùng.

## 3. Kiến trúc hiện tại

```text
src/
  app/providers/              # Providers dùng chung
  app/router/router.tsx        # Route và title metadata
  app/styles/globals.css      # Theme tokens, CSS
  core/api/client.ts           # Axios và chuẩn hóa lỗi
  core/auth/auth.types.ts      # Hợp đồng auth (chưa có auth production)
  core/config/                 # Cấu hình app và navigation
  layouts/admin-layout/       # AdminLayout, AppSidebar, UserDropdown
  shared/components/ui/       # shadcn/ui source components
  shared/components/          # UI dùng chung ở mức ứng dụng
  shared/hooks/; shared/lib/   # Hook, tiện ích
  features/dashboard/         # Trang Dashboard mẫu
  features/settings/          # Trang Settings mẫu
tests/; e2e/                  # Unit/component và E2E tests
docs/architecture.md          # Ghi chú kiến trúc
```

**Quy tắc phụ thuộc:** `shared`, `core`, `layouts` không import nghiệp vụ từ `features`; nghiệp vụ được đặt trong từng feature. `app` là composition root. Tránh circular imports và gọi API trực tiếp trong UI component.

## 4. Các thành phần đã có

- **`AdminLayout`**: sử dụng shadcn `SidebarProvider`, `SidebarInset`, `SidebarTrigger`, `PageContainer`, React Router `Outlet`, chuyển theme và `UserDropdown`. Header hiện được viết **ngay trong `AdminLayout.tsx`**, chưa có file `AppHeader.tsx` riêng.
- **`AppSidebar`**: dùng shadcn Sidebar + Collapsible; menu nhóm, item con, active state theo URL, thu gọn dạng icon. Logo hiện là ký tự `A` mẫu.
- **`navigation.config.ts`**: menu hiện có `Tổng quan`, `Cài đặt`, `Hồ sơ`, `Giao diện`; type có trường `permission` và `hidden`, nhưng không suy ra đã có hệ thống phân quyền hoàn chỉnh.
- **Router**: `createBrowserRouter`, các route `/`, `/settings`, `/settings/profile`, `/settings/appearance`, fallback 404, error element, lazy loading.
- **Shared components**: `ConfirmDialog`, `DataTable`, `EmptyState`, `LoadingState`, `NotFoundPage`, `PageContainer`, `PageHeader`, `RouteErrorPage`, `theme-provider`.
- **shadcn UI đã đưa vào source**: AlertDialog, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Collapsible, DropdownMenu, Input, Label, Select, Separator, Sheet, Sidebar, Skeleton, Sonner, Switch, Table, Tabs, Tooltip.

Đây là danh sách có mặt trong mã nguồn, **không đồng nghĩa mọi tính năng đều đã được kiểm thử đầy đủ**. Chưa thấy một `AppBreadcrumb` hoặc `AuthLayout` độc lập trong cây file hiện tại.

## 5. Chạy và kiểm tra

Yêu cầu theo README: Node.js `20.19+` hoặc `22.12+` và npm.

```bash
npm install
# Tạo .env.local dựa trên .env.example, điều chỉnh giá trị phù hợp
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Các script khác: `npm run test:watch`, `npm run format`, `npm run preview`. Chưa xác minh kết quả chạy lệnh trong môi trường này.

## 6. Sử dụng làm nền tảng dự án mới

1. Tạo repo mới từ template hoặc copy source, giữ nguyên license/attribution nếu có.
2. Thay `VITE_APP_NAME` và `VITE_API_BASE_URL` trong cấu hình môi trường; không commit secret.
3. Thay dấu hiệu logo mẫu trong `AppSidebar`, theme token trong `src/app/styles/globals.css`.
4. Tạo `src/features/<ten-module>/` chứa page, components, hooks, schema, service, tests khi cần.
5. Đăng ký route + `handle.title` trong `src/app/router/router.tsx`.
6. Thêm menu trong `src/core/config/navigation.config.ts`; không hardcode menu trong Sidebar.
7. Dùng shared components hoặc shadcn/ui trước khi tạo component mới; giữ business logic bên trong feature.
8. Kết nối HTTP qua `src/core/api/client.ts`, quản lý dữ liệu server với TanStack Query.
9. Chạy lint, typecheck, tests và build trước khi bàn giao.

## 7. Trạng thái và giới hạn cần nhớ

- Base này chủ yếu là **frontend**; không có backend/database cho nghiệp vụ quản lý đảng viên trong cây file được kiểm tra.
- `auth.types.ts` mới mô tả hợp đồng; không coi mock auth hoặc UI permission là bảo mật thật. Backend tương lai phải kiểm tra quyền.
- Không mặc định thêm Zustand: chỉ cân nhắc khi có client-state chung thật sự cần thiết.
- Các tính năng thông báo, tìm kiếm, đăng xuất chỉ được xem là hoàn thiện nếu được kiểm tra mã và hành vi tương ứng.
- Các `components/ui` là mã shadcn sở hữu trong dự án; khi nâng cấp nên kiểm tra thay đổi API và tương thích trước.

## 8. Nguyên tắc phát triển có thể mở rộng

### Nguyên tắc nền tảng (mặc định bắt buộc)

1. **UI:** ưu tiên 100% UI primitives từ shadcn/ui; tự xây component tổng hợp bằng shadcn/ui, Tailwind và HTML semantic. Không thêm bộ UI cạnh tranh khi chưa được duyệt.
2. **Phân tầng:** `shared/core/layouts` không phụ thuộc feature; không trộn domain logic vào Layout.
3. **Type safety:** TypeScript strict; không dùng `any` hay tắt lint để che lỗi.
4. **Cấu hình:** route, menu, branding, theme và API base URL quản lý tại chỗ rõ ràng; tránh hardcode lặp lại.
5. **State:** server state qua TanStack Query; UI state cục bộ giữ ở component; thêm global state chỉ khi cần.
6. **Bảo mật:** không chứa secret trong source; mọi quyền truy cập dữ liệu phải được backend thực thi.
7. **Kiểm thử:** sửa lỗi phải có bước tái hiện và kiểm thử hồi quy phù hợp; không tuyên bố test đã qua khi chưa chạy.
8. **Tính tương thích:** không tùy ý phá public interface của shared components khi feature khác đang sử dụng.

### Quy trình bổ sung hoặc sửa nguyên tắc

Quy tắc **được phép tiến hóa khi dự án lớn hơn**. Khi cần thay đổi:

1. Mô tả vấn đề thực tế và lý do nguyên tắc cũ chưa phù hợp.
2. Đề xuất quy tắc mới, phạm vi áp dụng, tác động lên code và test.
3. Phân loại: `MUST` (bắt buộc), `SHOULD` (khuyến nghị), `OPTIONAL` (tùy tình huống).
4. Nếu xung đột quy tắc hiện tại, sửa/thay thế minh bạch; không để hai quy tắc mâu thuẫn cùng tồn tại.
5. Ghi một mục vào nhật ký bên dưới và cập nhật hướng dẫn trong repo, kể cả `AGENTS.md` nếu có.

| Ngày | Thay đổi nguyên tắc | Lý do | Phạm vi/ảnh hưởng | Trạng thái |
| --- | --- | --- | --- | --- |
| 2026-10-30 | Khởi tạo nhóm nguyên tắc nền tảng có thể mở rộng | Dự án được dùng làm base cho nhiều hệ thống | Toàn frontend | Đề xuất |

## 9. Hướng dẫn cho Codex / AI coding agent

Khi nhận nhiệm vụ mới:

1. Đọc tài liệu này, `README.md`, `docs/architecture.md`, `package.json` và các file liên quan **trước khi chỉnh sửa**.
2. Phân biệt tính năng đã tồn tại và kế hoạch; không tự giả định component hay API đã được triển khai.
3. Giữ thay đổi trong feature liên quan nếu có thể; chỉ sửa core/shared/layout khi thật cần thiết.
4. Ưu tiên tái sử dụng shadcn/ui và các shared components; hỏi trước khi thêm UI library khác.
5. Nếu một nguyên tắc hiện tại cản trở giải pháp tốt hơn, giải thích trade-off và đề xuất cập nhật nguyên tắc; **không tự ý phá quy tắc bắt buộc**.
6. Báo cáo các file đã sửa, tác động tới kiến trúc, kết quả test và các giới hạn còn tồn tại.

> **Nguyên tắc quan trọng:** Đây là tài liệu sống (*living document*). Sau mỗi thay đổi kiến trúc, dependency hoặc public component, cập nhật lại để phản ánh mã nguồn thật.
