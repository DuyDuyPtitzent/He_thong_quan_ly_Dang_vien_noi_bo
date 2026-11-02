# Hệ thống Quản lý Đảng viên nội bộ PTIT

Ứng dụng phục vụ công tác quản lý nội bộ PTIT miền Bắc. Kiến trúc mục tiêu kết hợp giao diện React hiện có với máy chủ NestJS theo mô hình nguyên khối chia mô-đun, Prisma và PostgreSQL.

> **Trạng thái:** Frontend React và Backend NestJS/Prisma đã tách trong `frontend/` và `backend/`. Backend có API xác thực, RBAC Permission + Assignment + Scope, API quản trị phân quyền và API tổ chức. Chưa có API hồ sơ nghiệp vụ; không tự tạo dữ liệu tổ chức PTIT hoặc cấp Role/Assignment.

## Công nghệ

### Đang có ở giao diện

React, TypeScript, Vite, Tailwind CSS, shadcn-style UI, React Router, TanStack Query, Axios, React Hook Form, Zod, Vitest, Testing Library và Playwright. Phiên bản khai báo nằm trong `frontend/package.json`.

### Máy chủ nền đã có

NestJS, Prisma, PostgreSQL theo kiến trúc Modular Monolith.

Thư mục và tên file mã nguồn dùng tiếng Anh theo convention React/TypeScript/NestJS; API, JSON và schema database giữ quy ước nghiệp vụ đã duyệt.

## Chạy máy chủ nền hiện tại

Máy chủ nằm trong `backend/`; các migration nền và migration quản trị/tổ chức đã được áp dụng cho database phát triển theo bàn giao. API xác thực hiện có tại `/api/v1/xac-thuc`; API tổ chức và quản trị phân quyền có tại `/api/v1/to-chuc` và `/api/v1/{quyen,vai-tro,phan-cong-vai-tro}`. Chưa có API hồ sơ nghiệp vụ và đơn vị PTIT gốc không được tạo sẵn. Không có tài khoản mặc định; tài khoản đầu tiên phải được tạo thủ công bằng quy trình bootstrap bên dưới. Khi đăng nhập lần đầu, giao diện yêu cầu đổi mật khẩu trước khi vào khu vực bên trong.

Sau khi cấu hình `.env` và áp dụng migration, tạo tài khoản đầu tiên bằng lệnh tương tác `npm.cmd --prefix backend run bootstrap:admin` từ thư mục gốc (hoặc `npm.cmd run bootstrap:admin` bên trong `backend/`). Lệnh yêu cầu terminal tương tác, không hiển thị mật khẩu khi nhập và từ chối nếu đã có bất kỳ tài khoản nào. Tài khoản phải đổi mật khẩu ở lần đăng nhập đầu tiên. Lệnh chỉ tạo tài khoản; không tự gán Role/Permission.

Yêu cầu Node.js 20.19+ hoặc 22.12+ hoặc 24.0+, npm và Docker Desktop đang chạy.

```powershell
Copy-Item backend/.env.example backend/.env
docker compose --env-file backend/.env -f backend/compose.yaml up -d
npm.cmd --prefix backend install
npm.cmd --prefix backend run prisma:migrate:deploy
npm.cmd --prefix backend run start:dev
```

Kiểm tra máy chủ tại `http://127.0.0.1:3001/api/v1/suc-khoe`. Tài khoản và mật khẩu trong `backend/.env.example` chỉ dành cho cơ sở dữ liệu phát triển bind vào localhost; thay chúng trước khi dùng dữ liệu thật. Lệnh `docker compose down -v` sẽ xóa volume dữ liệu phát triển.

Các lệnh máy chủ khác: `npm.cmd --prefix backend run build`, `test`, `typecheck`, `prisma:validate`, `prisma:migrate:status`.

## Chạy frontend hiện tại

Yêu cầu Node.js 20.19+ hoặc 22.12+ và npm.

```powershell
npm.cmd --prefix frontend install
if (!(Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
npm.cmd --prefix frontend run dev
```

Frontend dùng API prefix `/api/v1`. Trong môi trường phát triển, Vite proxy các request `/api/v1/*` tới Backend tại `http://127.0.0.1:3001`; có thể đổi đích proxy bằng `BACKEND_PROXY_TARGET` trong `frontend/.env.local`. Khi cả hai máy chủ đang chạy, kiểm tra kết nối tại `http://127.0.0.1:5173/api/v1/suc-khoe`. Môi trường triển khai cần cấu hình reverse proxy cùng prefix `/api/v1` tới Backend.

Các lệnh hiện có: `npm.cmd --prefix frontend run build`, `lint`, `typecheck`, `test`, `test:e2e`.

E2E cần browser Playwright được cài trong môi trường chạy. Lệnh khởi động Backend được nêu riêng ở trên.

## Quyết định sản phẩm đã duyệt

- Phạm vi: nội bộ PTIT miền Bắc.
- Cây tổ chức tối đa ba tầng: Đảng ủy → Chi bộ → Tổ tùy chọn. Không triển khai mô-đun cấp ủy/chi ủy.
- Quản lý chức vụ, nhiệm kỳ, phân công và lịch sử; không tạo trước danh sách Chi bộ, Tổ hoặc chức vụ thực tế.
- Phân quyền theo vai trò kết hợp ma trận quyền, phân công và phạm vi đơn vị; một vai trò có nhiều quyền; một tài khoản có thể có nhiều phân công đồng thời.
- Tài khoản và hồ sơ Đảng viên tách biệt, liên kết tùy chọn một-một.
- Phiên bản tối thiểu: quản lý tổ chức và phân quyền trước, hồ sơ Đảng viên cơ bản sau.
- Tên kỹ thuật do dự án định nghĩa dùng tiếng Việt không dấu; nội dung giao diện/tài liệu dùng tiếng Việt có dấu. Tên chuẩn framework/giao thức giữ nguyên.

Chi tiết quyết định và roadmap: `docs/adr/0001-kien-truc-nen-tang.md`.
