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


## Cap nhat dong bo ngon ngu CSDL — 2026-10-31
- Prisma models, enums, fields va quan he da chuyen sang tieng Viet khong dau; ten bang/cot PostgreSQL va tat ca @map/@@map duoc giu nguyen, khong tao migration doi schema vat ly.
- Kiem tra: ackend chay prisma:validate, prisma:generate, 	ypecheck, uild; khong chay test.
- Quy uoc: ten thu muc/file nguon van tieng Anh; dinh danh Prisma/CSDL/API/JSON do du an dinh nghia dung tieng Viet khong dau.
