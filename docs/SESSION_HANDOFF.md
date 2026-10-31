# Bàn giao giữa phiên AI

Cập nhật lần cuối: 2026-10-30

## Trạng thái

- Repository đã tách ứng dụng thành hai thư mục độc lập: `frontend/` (React/Vite) và `backend/` (NestJS/Prisma/PostgreSQL). Tài liệu và `AGENTS.md` giữ ở root.
- Giai đoạn 0 (tài liệu/ADR) hoàn tất và được duyệt.
- Giai đoạn 1 nền Backend đã triển khai. Ngày 2026-10-31 đã tạo Prisma schema 20 bảng; áp dụng migrations `20261031000000_create_core_data_model` và `20261031010000_protect_audit_log` vào database phát triển.
- Database phát triển đang chạy trong Docker, bind `127.0.0.1:55432`, container `may-chu-co-so-du-lieu-1`, volume lưu migration. Không chạy `docker compose down -v` nếu không muốn xóa volume.
- Endpoint đã kiểm chứng: `GET http://127.0.0.1:3001/api/v1/suc-khoe` trả `SAN_SANG` cho máy chủ và cơ sở dữ liệu.
- Database phát triển có 20 bảng nghiệp vụ + `_prisma_migrations`, ràng buộc/index; trigger audit chặn UPDATE/DELETE. Chưa có dữ liệu PTIT, API nghiệp vụ, xác thực hoặc RBAC thực thi.

## Quyết định đã duyệt

- Phạm vi nội bộ; cây Đảng ủy → Chi bộ → Tổ tùy chọn; không có mô-đun cấp ủy/chi ủy.
- NestJS + Prisma + PostgreSQL theo kiến trúc nguyên khối chia mô-đun.
- Tài khoản và hồ sơ tách biệt, liên kết tùy chọn một-một.
- Vai trò có nhiều quyền theo ma trận; một tài khoản có thể có nhiều phân công đồng thời và phạm vi tổ chức.
- Tên thư mục/file mã nguồn dùng tiếng Anh theo TypeScript/NestJS; API, JSON và database giữ theo quy ước đã duyệt. Giao diện/tài liệu dùng tiếng Việt có dấu.
- Ưu tiên quản lý tổ chức và phân quyền trước, hồ sơ Đảng viên cơ bản sau.
- Xem `docs/adr/0001-kien-truc-nen-tang.md` để biết quyết định và roadmap.

## Cấu trúc chính

- `frontend/`: mã nguồn, cấu hình, package và kiểm thử giao diện.
- `backend/src/`: mã máy chủ; `common/`, `infrastructure/database/`, `modules/health/`.
- `backend/prisma/schema.prisma`: 20 Prisma models, physical tables/columns mapped theo tiếng Việt không dấu.
- `backend/prisma/migrations/20261031000000_create_core_data_model/`: tạo 20 bảng, FK, unique/index, exclusion constraints không chồng lấn và trigger kiểm tra tầng cây/Chi bộ-Tổ/nhiệm kỳ.
- `backend/prisma/migrations/20261031010000_protect_audit_log/`: chặn sửa/xóa nhật ký kiểm toán ở PostgreSQL.
- `backend/compose.yaml`, `backend/.env.example`: PostgreSQL phát triển chỉ bind localhost.

## Kiểm tra đã chạy

- Backend sau khi tạo CSDL: `prisma:validate`, `prisma:migrate:deploy`, `prisma:migrate:status`, `prisma:generate`, `build`, `typecheck` đều đạt. Database trả 21 bảng public gồm 20 bảng nghiệp vụ + `_prisma_migrations`; đã xác nhận có trigger audit.
- Endpoint HTTP sức khỏe đạt.
- Frontend trước khi di chuyển: lint và test đạt; lint có 4 cảnh báo Fast Refresh sẵn có tại `frontend/src/shared/components/ui/{badge,button,sidebar,tabs}.tsx`.
- Frontend sau khi chuyển thư mục: build và test đạt; lint có 4 cảnh báo Fast Refresh sẵn có. Build còn cảnh báo một bundle chunk trên 500 kB.

## Việc tiếp theo

- Người dùng chốt giai đoạn đầu dùng tài khoản nội bộ do quản trị viên quản lý; SSO hoãn tới khi PTIT cấp điều kiện tích hợp. Không tự đăng ký.
- Người dùng đồng ý các mặc định thiết kế CSDL được đề xuất: tên đăng nhập nội bộ, không nhập hồi tố/ngày tương lai mặc định, cho phép nhiệm kỳ tùy chọn và nhiều phân công chức vụ, giữ liên kết tài khoản–hồ sơ một-một tùy chọn.
- Đã lập/cập nhật đề xuất thiết kế hồ sơ theo nhóm tab tại `docs/THIET_KE_HO_SO_DANG_VIEN.md`: có CCCD (số/ngày/nơi cấp); bỏ hộ chiếu và mã bưu chính; thêm tab/thông tin sinh viên theo ảnh gồm mã sinh viên, trạng thái, khóa (mã dạng `D23CQ`), Chi bộ khóa (hiển thị từ Chi bộ sinh hoạt hiện hành, ví dụ `D25`), đơn vị phụ trách, chương trình, ngành, chuyên ngành và lớp hành chính. Ảnh chỉ dùng làm nhãn trường, không chép dữ liệu cá nhân thực tế.
- Data dictionary 20 bảng, trường và khóa tại `docs/THIET_KE_CSDL_TONG_THE.md` hiện là căn cứ schema/migration đã áp dụng. Dùng tài liệu này khi sửa CSDL; không cần đọc toàn bộ ADR để tra từng trường.
- Đã bổ sung ma trận 7 điều chỉnh theo mức Bắt buộc/Nên làm/Cần chốt: không chồng lấn lịch sử; kiểm tra cây; kiểm soát cấp quyền theo thẩm quyền; dò/xác minh hồ sơ trùng; kiểm tra chức vụ/nhiệm kỳ; chưa tạo bảng cán bộ; quy tắc bảo vệ/audit nhật ký.
- Thông tin sinh viên là phần mở rộng tùy chọn một-một của hồ sơ Đảng viên; quy hoạch liên thông sau với nguồn/phòng ban do PTIT cho phép. Thiết kế chi tiết trường, danh mục học vụ, chuẩn địa chỉ và kiểm soát đồng bộ còn chờ duyệt.
- Người dùng đã duyệt trường `khoa_hoc` (mã khóa dạng chuỗi, ví dụ `D23CQ`); không tự suy ra mã từ năm tuyển sinh.
- Schema CSDL đã triển khai theo `docs/THIET_KE_CSDL_TONG_THE.md`; các danh mục trạng thái/giới tính/sự kiện chưa được seed vì chờ nguồn được xác nhận.
- API và service nghiệp vụ chưa tạo: kiểm tra quyền cấp vượt thẩm quyền, quy trình xác minh hồ sơ trùng, danh mục tổ chức, tài khoản quản trị và dữ liệu sinh viên chưa vận hành.
- Trước khi tiếp tục module, xác nhận các trường enum bắt buộc/cách tạo admin; không seed dữ liệu PTIT hoặc tạo tài khoản mặc định.
- Không suy đoán cá nhân quản trị đầu tiên, cơ chế bootstrap, người được cấp `TOAN_HE_THONG` hoặc dữ liệu tổ chức thực tế.
- Backend code layout hiện dùng `src/common/`, `src/infrastructure/database/`, `src/modules/health/`, `test/`; file theo convention NestJS/TypeScript bằng tiếng Anh. Migration đã áp dụng giữ nguyên tên lịch sử `nen_tang`; không đổi migration đã áp dụng.
- Khi bắt đầu phiên sau: đọc file này, `AGENTS.md`, sau đó chỉ đọc file liên quan trong `frontend/` hoặc `backend/`.

## Cap nhat CSDL ngay-gio va quy tac sua/xoa don vi — 2026-11-01
- Da ap dung migration `20261101000000_hieu_luc_ngay_gio_va_sua_loai_don_vi` vao database phat trien. Moc hieu luc quan he don vi va sinh hoat dung `timestamptz(6)`; khoang `[bat dau, ket thuc)`. Ngay ket thuc theo lich bao gom het ngay theo gio Viet Nam; moc ngay-gio dung thoi diem nhap.
- Don vi tao nham duoc sua loai neu quan he va lich su van hop le. Co the xoa han sau khi xu ly tham chieu; FK RESTRICT, khong cascade xoa lich su.
- Kiem tra: `prisma:validate`, `prisma:generate`, `typecheck`, `build`, `prisma:migrate:status`; schema bao up to date. SQL migration duoc chay trong transaction rollback truoc khi deploy. Khong chay test suite.
- Hop dong API to chuc da duoc duyet, chua trien khai; xem `docs/THIET_KE_API_TO_CHUC.md`. Module to chuc chi duoc mo sau khi co xac thuc va RBAC Permission + Scope phia Backend.
- Buoc tiep: trinh thu tu dependency xac thuc/RBAC truoc API ghi du lieu; chua co co che bootstrap quan tri dau tien, danh sach Permission va danh muc trang thai don vi duoc chot.

## Ket noi ky thuat Frontend-Backend — 2026-11-01
- Axios base URL va frontend env mau dung `/api/v1`; Vite dev proxy prefix nay toi `BACKEND_PROXY_TARGET`, mac dinh `http://127.0.0.1:3001`.
- Axios normalize loi NestJS `maLoi`/`thongBao`/`maTuongQuan`; README va architecture ghi cach chay/kiem tra endpoint suc khoe qua `http://127.0.0.1:5173/api/v1/suc-khoe`.
- Da chay `npm.cmd --prefix frontend run typecheck` va `build`; deu dat. Build con canh bao chunk JS lon hon 500 kB. Chua chay test suite; chua them auth, RBAC hoac API nghiep vu. Trien khai production can reverse proxy `/api/v1` toi Backend.

## Xac thuc tai khoan tach khoi Permission/Scope — 2026-11-01
- Da them module NestJS `backend/src/modules/auth/` voi dang nhap, xem phien hien tai, doi mat khau va dang xuat. Session token ngau nhien luu dang SHA-256; mat khau bam scrypt; cookie HttpOnly/SameSite Strict, Secure ngoai moi truong PHAT_TRIEN; thao tac thay doi kiem tra Origin.
- Da them adapter frontend `frontend/src/core/auth/auth.api.ts`, kieu du lieu phien tai `auth.types.ts`, va Axios `withCredentials`. Phien chi co thong tin tai khoan, khong co Role/Permission. Chua co man hinh/login provider/route guard UI, bootstrap tai khoan dau tien, RBAC hoac API nghiep vu.
- Cau hinh auth: `URL_GIAO_DIEN_DUOC_PHEP`, `THOI_HAN_PHIEN_DANG_NHAP_GIO` (mac dinh 8), `SO_LAN_DANG_NHAP_THAT_BAI_TOI_DA` (5), `THOI_GIAN_KHOA_DANG_NHAP_PHUT` (15). Trang thai hoat dong hien doi chieu voi `DANG_HOAT_DONG`; can xac nhan danh muc trang thai tai khoan khi chot quy trinh bootstrap.
- Chua co tai khoan/mac dinh admin. De co the dang nhap can phe duyet va trien khai bootstrap quan tri vien an toan. API nghiep vu tiep tuc cho den khi Permission va Scope duoc duyet.
- Kiem tra: backend `npm.cmd run typecheck` va `npm.cmd run build` dat; frontend `npm.cmd run typecheck` va `npm.cmd run build` dat. Frontend build van co canh bao bundle 542 kB. `git diff --check` dat (Git chi canh bao chuyen LF/CRLF). Khong chay test suite; chua kiem tra dang nhap end-to-end vi chua co tai khoan duoc bootstrap.

## Bootstrap tai khoan dau tien — 2026-11-01
- Nguoi dung da duyet quy trinh bootstrap thu cong tren moi truong trien khai. Da them `npm run bootstrap:admin` va script `backend/src/scripts/bootstrap-admin.ts`.
- Script chi tao tai khoan neu bang rong, dung PostgreSQL table lock trong transaction de tranh dua tranh, nhap mat khau tren terminal raw mode khong echo, bat buoc mat khau 12-128 ky tu va nhap xac nhan, bam scrypt, dat `doiMatKhauLanDau=true`, ghi audit khong chua mat khau. Khong cap Role/Permission.
- Lan chay dau tien loi Prisma P2010 do query advisory lock tra ve kieu `void`; transaction rollback, da truy van dem tai khoan an toan va xac nhan 0 tai khoan. Da thay bang SQL `LOCK TABLE` va xac minh truy van lock/count thanh cong, khong tao du lieu.
