# Bàn giao giữa phiên AI

Cập nhật lần cuối: 2026-11-01

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
- Da them adapter frontend `frontend/src/core/auth/auth.api.ts`, context khoi phuc phien, trang thai dang nhap, va Axios `withCredentials`. Phien chi co thong tin tai khoan, khong co Role/Permission. Chi bao ve login state; RBAC/API nghiep vu van chua co.
- Cau hinh auth: `URL_GIAO_DIEN_DUOC_PHEP`, `THOI_HAN_PHIEN_DANG_NHAP_GIO` (mac dinh 8), `SO_LAN_DANG_NHAP_THAT_BAI_TOI_DA` (5), `THOI_GIAN_KHOA_DANG_NHAP_PHUT` (15). Trang thai hoat dong hien doi chieu voi `DANG_HOAT_DONG`; can xac nhan danh muc trang thai tai khoan khi chot quy trinh bootstrap.
- Nguoi dung da bao tao thanh cong tai khoan dau tien qua bootstrap; khong tao lai va khong ghi thong tin dang nhap vao tai lieu. Quy trinh doi mat khau lan dau da duoc yeu cau boi API. API nghiep vu tiep tuc cho den khi Permission va Scope duoc duyet.
- Kiem tra: backend `npm.cmd run typecheck` va `npm.cmd run build` dat; frontend `npm.cmd run typecheck` va `npm.cmd run build` dat. Frontend build van co canh bao bundle 542 kB. `git diff --check` dat (Git chi canh bao chuyen LF/CRLF). Khong chay test suite; chua kiem tra dang nhap end-to-end vi chua co tai khoan duoc bootstrap.

## Bootstrap tai khoan dau tien — 2026-11-01
- Nguoi dung da duyet quy trinh bootstrap thu cong tren moi truong trien khai. Da them `npm run bootstrap:admin` va script `backend/src/scripts/bootstrap-admin.ts`.
- Script chi tao tai khoan neu bang rong, dung PostgreSQL table lock trong transaction de tranh dua tranh, nhap mat khau tren terminal raw mode khong echo, bat buoc mat khau 12-128 ky tu va nhap xac nhan, bam scrypt, dat `doiMatKhauLanDau=true`, ghi audit khong chua mat khau. Khong cap Role/Permission.
- Lan chay dau tien loi Prisma P2010 do query advisory lock tra ve kieu `void`; transaction rollback, da truy van dem tai khoan an toan va xac nhan 0 tai khoan. Da thay bang SQL `LOCK TABLE` va xac minh truy van lock/count thanh cong, khong tao du lieu.

## Theme giao dien tap trung — 2026-11-01
- Nguoi dung yeu cau chuyen palette toan ung dung sang mau nhan dien To chuc Dang, quan ly mau tai mot noi va khong tu tao mau rieng theo module.
- Theme semantic light/dark duoc cap nhat tai `frontend/src/app/styles/globals.css`: do lam primary, vang lam accent tiet che; theo anh tham chieu, background light, header va sidebar dung trang; sidebar dung cung token. `AGENTS.md` va `docs/architecture.md` co quy tac khong hard-code mau rieng trong feature.
- Da xac nhan `frontend/src/index.css` va `frontend/src/App.css` khong duoc import; day la CSS starter khong dung, da xoa de tranh palette cu/tach rieng.
- Kiem tra: frontend `npm.cmd run typecheck` va `npm.cmd run build` dat; build con canh bao chunk JS 542 kB. `git diff --check` dat (Git chi canh bao chuyen LF/CRLF). Chua chay test suite hoac visual browser check.

## Giao dien dang nhap va xu ly phien — 2026-11-01
- Da tham khao `C:\Users\ADMIN\Downloads\stitch_party_member_portal_login\{DESIGN.md,code.html,screen.png}`. Theo yeu cau moi, giu nguyen noi dung va mau chu hien trong screenshot, gom thong bao, link, checkbox, footer va thong tin lien he do nguoi dung cung cap. Input duoc gui len API auth duoi truong `tenDangNhap`; backend chua co alias lookup cho email/MSV/ma can bo. Checkbox va link reset mat khau hien la UI; backend chua nhan chinh sach ghi nho thiet bi va chua co endpoint reset mat khau.
- Da tao `frontend/src/features/auth/{LoginPage,ChangePasswordPage}.tsx`, `frontend/src/core/auth/{auth-context.ts,AuthProvider.tsx,RequireAuth.tsx}`; route `/dang-nhap`, `/doi-mat-khau`, bao ve route noi bo, khoi phuc cookie session, dang xuat tu UserDropdown, va bat buoc doi mat khau lan dau.
- Tai su dung Button/Card/Input/Label va semantic color tokens; khong tao palette rieng. Vite dev host co dinh `127.0.0.1` de Origin khop backend dev.
- Trang dang nhap tai su dung `Badge`, `Button`, `Card`, `Checkbox`, `Input`, `Label`, `Separator`; mau chu/nut/link/placeholder/alert dung semantic tokens trong global stylesheet theo palette `DESIGN.md`.
- Theo yeu cau tiep theo, da giam co chu tieu de/nhan badge, icon thong bao, khoang cach va padding hai Card noi dung ben trai; Card dat `gap-0 py-0`, noi dung dung padding nho de khung om sat text. Khong doi noi dung hay token mau.
- Theo screenshot trang dang nhap o browser zoom 100%, tiep tuc thu gon khung layout con 1440px, card dang nhap con 500px, hai card noi dung ben trai max 3xl, tieu de con 3xl tren desktop; chi dung 2 cot tu breakpoint `xl`. Khong doi noi dung hay mau.
- Kiem tra: frontend `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run lint` va `git diff --check` dat. Lint con 4 warning Fast Refresh co san trong `badge.tsx`, `button.tsx`, `sidebar.tsx`, `tabs.tsx`; build canh bao chunk chinh 615 kB. Khong chay test suite hay login E2E.
- Theo yeu cau tiep theo tu screenshot 100% zoom, thu gon khung trang dang nhap toi 1200px, chia hai cot can bang 6/6, gioi han hai khung noi dung ben trai 640px va khung dang nhap 440px. Giu nguyen noi dung, semantic mau va cac shadcn UI components.
- Nguoi dung bao API dang nhap tra 500 TypeError (correlation ID da cung cap). Luong dang nhap va DTO khop hop dong, nhung bo loc loi truoc chi ghi loai ngoai le nen chua du stack de tim dong loi. Bo sung `viTriLoi` chi cho TypeError, gioi han 3 frame stack, khong ghi request body/mat khau; can khoi dong lai backend va lap lai dang nhap de lay vi tri loi.
- Stack moi xac dinh loi o `XacThucService.kiemTraNguonYeuCau`: goi `ConfigService.getOrThrow`. Da thay bang `get` cung URL fallback da khai bao trong Joi (`http://127.0.0.1:5173`), giu kiem tra Origin; Origin sai se tra 403. Backend typecheck/build va `git diff --check` dat. Chua kiem tra login E2E; can restart backend va thu lai de xac nhan, neu 403 thi doi `URL_GIAO_DIEN_DUOC_PHEP` khop origin trinh duyet.
- Nguoi dung bao loi lap lai tai cung frame `kiemTraNguonYeuCau` sau thay doi tren; kha nang ConfigService chua duoc inject do service/guard auth dua vao reflect metadata. Da them `@Inject(...)` tuong minh cho Prisma, BamMatKhauService, ConfigService va XacThucService trong guard. Backend typecheck/build va diff-check dat; can restart backend, thu lai de xac nhan runtime.
- Theo yeu cau moi, doi mat khau lan dau khong con la trang rieng: sau login di den route noi bo/duong dan goc, `RequireAuth` hien `ChangePasswordDialog` bat buoc tren giao dien; Escape/nhan ra ngoai khong dong. Khi API cap nhat co hieu luc thi AuthProvider cap nhat co doi mat khau va dialog tu dong an. `/doi-mat-khau` cu redirect ve `/`. Da them shared shadcn Dialog primitive tai `frontend/src/shared/components/ui/dialog.tsx`; xoa `ChangePasswordPage.tsx`, tao `ChangePasswordDialog.tsx`. Frontend typecheck/build/lint va diff-check dat; lint con 4 canh bao Fast Refresh cu, build canh bao bundle 624 kB. Chua chay test suite hay visual E2E.
- Theo screenshot tiep theo, da bo nhan dien ten he thong va o icon khien trong dau modal doi mat khau; can giua phan tieu de. Frontend typecheck/build va diff-check dat; build con canh bao bundle 623 kB.
- Theo screenshot login, da bo mau vien hong do quanh Card dang nhap bang `border-transparent`; vien cac input, noi dung, mau chu va shadow giu nguyen.
- Nguoi dung bao vien van con; da thay `border-transparent` bang `border-0` tren Card ngoai dang nhap de bo han border-width mac dinh cua shadcn Card. Giu nguyen bo goc va shadow.
- Da them quy tac vao `AGENTS.md`: khi tao/chinh sua giao dien, dung UI UX Pro Max va tuan thu design system hien co. Da cai `ui-ux-pro-max-cli` toan may va chay `uipro.cmd init --ai codex` thanh cong; CLI bao da tao skill trong `.agents/skills/`. Lan sau can doc skill duoc tao truoc khi sua giao dien.
- Nguoi dung da duyet co so ma tran Permission/Scope va quyet dinh dieu chinh: SELF duoc de nghi sua dien thoai/email qua cua so mo tam thoi va Chi bo duyet; tiep nhan chuyen sinh hoat Chi bo B chuyen scope/quyen sinh hoat ca nhan tu A sang B; CCCD xem binh thuong theo quyen ho so (khong permission/audit rieng); quan tri phan quyen khong duoc cap vuot tham quyen/TOAN_HE_THONG; tai khoan bootstrap chi co quyen khoi tao qua quy trinh an toan, khong tu cap moi lan chay, phai thu hoi/thu hep sau khi xac minh admin chinh thuc. Cac muc con lai giu dung de xuat da duyet. Chi tiet tai `docs/THIET_KE_MA_TRAN_QUYEN.md`; mot so tham so/quy trinh mo cua so, duyet va chuyen van can chot, chua trien khai.
- Nguoi dung duyet phuong an quyen cap tren: Chi bo duyet trong Scope duoc cap; Dang uy khong tu ke thua quyen duyet, chi xem neu duoc cap Permission xem va Scope; neu can duyet thi phai duoc cap rieng Permission duyet + Scope; khong co phe duyet lan hai mac dinh. Da ghi bo sung muc 10 trong tai lieu ma tran; mot dong chu the duyet truoc day duoc ghi ro la da giai quyet/thay the.
## RBAC Permission + Assignment + Scope — 2026-11-01
- RBAC nền đã triển khai tại `backend/src/modules/authorization/`: `PhanQuyenService`, `PhanQuyenGuard` và decorator `@RequirePermission(maQuyen)`. Decorator tự gắn cả xác thực phiên và kiểm tra RBAC; module feature dùng decorator cần import `PhanQuyenModule`.
- Mỗi quyết định kiểm tra một Assignment còn thời hạn, chưa thu hồi, Role đang hoạt động; Permission phải thuộc Role của chính Assignment đó. Thiếu Permission/phạm vi/định danh đích đều từ chối mặc định.
- Scope hỗ trợ `TOAN_HE_THONG`, `CA_NHAN` đối chiếu liên kết hồ sơ với tài khoản hiện tại, `DON_VI_CHI_DINH` khớp đơn vị được chọn chính xác, và `CAY_DON_VI` theo quan hệ tổ chức đang hiệu lực. Với hồ sơ, đơn vị đích lấy từ sinh hoạt hiện hành (Chi bộ và Tổ); với API đơn vị lấy mã từ route params, không lấy từ body/query.
- Dùng cấu trúc schema hiện có, không migration, không seed Permission/Role/Assignment, không gán quyền bootstrap, không tạo dữ liệu PTIT. Chưa gắn guard vào API nghiệp vụ vì các API đó chưa mở.
- Kiểm tra đã chạy: backend `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate`; cả ba đạt. Chưa chạy test suite hoặc kiểm tra tích hợp trên dữ liệu quyền thật.
- Việc tiếp theo: khi mở từng module API, dùng `@RequirePermission` với mã Permission đã đăng ký và bảo đảm tham số route mang đúng `maDonVi`/`maHoSo`; triển khai riêng quy trình quản trị/cấp quyền an toàn trước khi có thao tác cấp Assignment. Cơ chế bootstrap cấp quyền khởi tạo vẫn chưa thiết kế/triển khai.

## Danh mục Permission và API tổ chức — 2026-11-01
- Hoàn tất Task 1: `permission-catalog.ts` chứa 66 mã trong ma trận; `npm run sync:permissions` upsert danh mục hệ thống trong transaction. Đã chạy trên PostgreSQL phát triển và đồng bộ 66 Permission. Script không tạo Role hoặc Assignment.
- Hoàn tất Task 2: thêm `backend/test/authorization.service.spec.ts`, bao phủ Scope gán chính xác, cây tổ chức, liên kết SELF, không ghép Permission/Scope khác Assignment và lọc Assignment hết hạn/thu hồi. Toàn bộ backend test suite đạt: 10 tests/3 files. Lần đầu chạy trong sandbox bị chặn bind loopback; sau đó đã chạy thành công ngoài sandbox.
- Hoàn tất Tasks 3–5: triển khai API tổ chức tại `backend/src/modules/organizations/` theo hợp đồng `docs/THIET_KE_API_TO_CHUC.md`: danh sách/cây/chi tiết/lịch sử, tạo/sửa/đổi tên/đổi cha/xóa. Các thao tác kiểm tra Permission + Scope; thao tác ghi dùng transaction và audit; FK/xung đột không cascade. Không có Role/Assignment nên chưa tài khoản nào tự động truy cập được API.
- Danh mục `trangThai` đơn vị đã được người dùng chốt: `DANG_HOAT_DONG`, `TAM_NGUNG`, `NGUNG_HOAT_DONG`; DTO tổ chức giới hạn đúng ba mã này, không seed dữ liệu trạng thái riêng. Không tạo dữ liệu tổ chức PTIT.
- Người dùng đã chọn quy trình khởi tạo: tài khoản cụ thể, xác minh mật khẩu trên terminal không echo, Assignment `TOAN_HE_THONG` trong 24 giờ, xác nhận tiếp quản rồi thu hồi sớm/để hết hạn. Đã kiểm tra bằng truy vấn chỉ đọc rằng tài khoản được chỉ định tồn tại, đang hoạt động và không còn buộc đổi mật khẩu đầu tiên; mật khẩu không được ghi vào tài liệu.
- Đã có `npm run bootstrap:authorization` và `npm run revoke:bootstrap-authorization`: Role hệ thống một lần, chứa Permission danh mục, cấp Scope `TOAN_HE_THONG` đúng 24 giờ cho tài khoản được nhập/xác minh trong terminal không echo; transaction/khóa bảng, audit cấp/thu hồi, không tự chạy cùng bootstrap tài khoản và cấm phát hành lại.
- Theo output do người dùng cung cấp, Assignment khởi tạo đã được cấp cho `Quantrivien`, mã `c486ddd2-cbe4-4922-be73-4d9c2d7e5e59`, hết hạn `2026-11-02T08:03:40.235Z` (15:03:40.235 giờ Việt Nam ngày 2026-11-02). Chưa tạo đơn vị PTIT hoặc Assignment quản trị chính thức; cần thu hồi sớm sau khi có tài khoản quản trị tiếp quản.
- Đã xác minh read-only sau khi người dùng chạy lệnh: Assignment trên đang hiệu lực, Scope `TOAN_HE_THONG`, chưa thu hồi; database hiện có 1 tài khoản hoạt động và không có tài khoản hoạt động thứ hai. Đã thêm `npm run handover:authorization` để thu hẹp cùng tài khoản sang Assignment Role thường có Scope `CAY_DON_VI` tại Đảng ủy gốc và thu hồi quyền tạm atomically; lệnh yêu cầu đơn vị gốc/Role đã cấu hình và xác minh mật khẩu ẩn. Chưa chạy lệnh bàn giao.
- Đã triển khai API quản trị danh mục Permission, Role và Assignment tại `backend/src/modules/authorization/authorization-admin.*`; xem `docs/THIET_KE_API_PHAN_QUYEN.md`. API thường không thể tự cấp cho mình, cấp `TOAN_HE_THONG`/`CA_NHAN`, chỉnh Role hệ thống hoặc cấp Permission/Scope vượt Assignment nguồn. Tài khoản được chỉ định `Quantrivien` đã được kiểm tra tồn tại/đang hoạt động/đã đổi mật khẩu đầu tiên; mật khẩu được cung cấp trong hội thoại không được ghi hay dùng trong tool.
- Tài khoản/Assignment đang không được tự động cấp; sau khi chạy CLI, cần tạo/kiểm tra đơn vị cần thiết, thiết lập quản trị chính thức, xác nhận tiếp quản rồi chạy lệnh thu hồi. Không tạo dữ liệu PTIT thật.
- Task hồ sơ vẫn chưa triển khai: thiết kế `docs/THIET_KE_HO_SO_DANG_VIEN.md` còn các trường bắt buộc và danh mục trạng thái hồ sơ/sinh viên chờ xác nhận; CCCD cũng cần cấu hình khóa mã hóa/HMAC trước khi mở API.
- Kiểm tra sau thay đổi: `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd run prisma:validate`, toàn bộ `npm.cmd run test -- --reporter=dot` (14 đạt/4 files), và `git diff --check` đạt. Git chỉ cảnh báo chuyển LF/CRLF.

## Đổi mật khẩu sau lần đầu — 2026-11-01
- Người dùng cần đổi mật khẩu tài khoản đã qua bước đổi lần đầu; frontend trước đây chỉ có dialog bắt buộc cho lần đầu, trong khi API `POST /api/v1/xac-thuc/doi-mat-khau` đã dùng được.
- Đã thêm `frontend/src/features/auth/ChangePasswordPage.tsx`, route `/settings/security/change-password` và mục “Đổi mật khẩu” trong menu tài khoản. Trang cho phép dán mật khẩu, hiện/ẩn các ký tự, kiểm tra xác nhận và giới hạn 12–128 ký tự; gọi API auth hiện có và giữ phiên hiện hành.
- Kiểm tra frontend `npm.cmd run typecheck` và `npm.cmd run build` đạt. Build còn cảnh báo bundle chính 624 kB như trước. Chưa chạy test suite hoặc browser E2E.

## Quyết định quản trị cao nhất và đơn vị gốc — 2026-11-01

**Đây là quyết định hiện hành, thay thế toàn bộ phương án Assignment khởi tạo `TOAN_HE_THONG` 24 giờ, Role `QUAN_TRI_KHOI_TAO_24H` và CLI bàn giao/thu hồi tương ứng được ghi ở các mục lịch sử phía trên.**

- Role cao nhất: `QUAN_TRI_VIEN_TOAN_HE_THONG`, Scope `TOAN_HE_THONG`, Assignment không mặc định hết hạn. Nhiều tài khoản được phép giữ Role này khi từng tài khoản được chỉ định và cấp rõ ràng; không tự tạo/cấp thêm và không cấp lại khi bootstrap chạy.
- Cấp, thay đổi, thu hồi và khôi phục quyền cao nhất phải qua quy trình vận hành ngoài API do người vận hành được ủy quyền thực hiện sau khi xác minh thẩm quyền; ghi audit đầy đủ. Không có API công khai khôi phục quyền cao nhất.
- Backend phải bảo vệ Quản trị viên toàn hệ thống hợp lệ cuối cùng: từ chối khóa/xóa tài khoản hoặc thu hồi quyền cao nhất nếu thao tác làm số quản trị viên hợp lệ bằng 0. Chủ thể không thể tự khóa/xóa hoặc tự thu hồi Assignment cao nhất. Quản trị kỹ thuật không bỏ qua workflow/Permission nghiệp vụ.
- Quản trị viên được xem/sửa thông tin cá nhân, thay đổi mật khẩu/thông tin xác thực và xem Role/Permission/Assignment của mình. Không được tự nâng quyền hay sửa Assignment trái quy định.
- Đơn vị gốc duy nhất: mã `PTIT_DANG_UY`, tên “Đảng ủy Học viện Công nghệ Bưu chính Viễn thông”, loại `DANG_UY`, cha `NULL`, trạng thái ban đầu `DANG_HOAT_DONG`. Khởi tạo idempotent; không tạo trùng. Chi bộ thuộc Đảng ủy, Tổ thuộc Chi bộ. Trạng thái hợp lệ gồm `DANG_HOAT_DONG`, `TAM_NGUNG`, `NGUNG_HOAT_DONG`; khôi phục cần thẩm quyền, Permission + Scope và audit.
- Thiết kế được cập nhật tại `docs/THIET_KE_MA_TRAN_QUYEN.md`, `docs/THIET_KE_API_PHAN_QUYEN.md`, `docs/THIET_KE_API_TO_CHUC.md`, `docs/AI_CONTEXT.md` và `docs/architecture.md`. Chỉ tài liệu được cập nhật; chưa sửa code, migration, seed hoặc database.
- Hiện trạng cũ được ghi nhận trước quyết định này: người dùng đã cung cấp kết quả cấp Assignment `c486ddd2-cbe4-4922-be73-4d9c2d7e5e59` cho `Quantrivien`, Scope `TOAN_HE_THONG`, hết hạn `2026-11-02T08:03:40.235Z`. Chưa thu hồi/chuyển đổi trong lượt cập nhật thiết kế; cần kế hoạch chuyển đổi có kiểm soát trước khi chạy các CLI cũ.
- Còn cần quyết định trước các phần nghiệp vụ tương ứng: thời lượng/cách mở cửa sổ tự cập nhật và một số bước chuyển sinh hoạt. Module cấu hình/ops và quản lý tài khoản đầy đủ chưa triển khai dù Permission nền đã có.
- Kiểm tra lượt cập nhật này: rà soát tài liệu và `git status --short`; chưa chạy test vì chỉ thay đổi đặc tả.

## Triển khai Quản trị viên toàn hệ thống và đơn vị gốc — 2026-11-01

- Theo yêu cầu “TIẾP TỤC THỰC HIỆN”, đã thay phương án 24 giờ bằng Role hệ thống `QUAN_TRI_VIEN_TOAN_HE_THONG`; Scope `TOAN_HE_THONG` vẫn nằm ở Assignment, có thể nhiều tài khoản, không đặt hạn mặc định. Permission Role được giới hạn vào 32 quyền quản trị kỹ thuật/tài khoản/tổ chức/nhật ký/cấu hình; không gắn Permission phê duyệt hồ sơ hoặc chuyển sinh hoạt. Super Admin có thể ủy quyền các Permission nghiệp vụ cho Role/tài khoản khác nhưng không tự có các quyền nghiệp vụ đó.
- Danh mục Permission mở rộng từ 66 lên 71 mã, gồm `TO_CHUC_DOI_TRANG_THAI`, `TO_CHUC_KHOI_PHUC`, `CAU_HINH_HE_THONG_XEM`, `CAU_HINH_HE_THONG_SUA`, `VAN_HANH_HE_THONG`. Cấu hình/vận hành là catalog cho module tương lai; hiện chưa có API cấu hình/ops.
- Database phát triển trước đó đã đồng bộ 66 Permission; 5 mã mới chưa được sync. Không chạy `sync:permissions` trong lượt này.
- Đã thêm CLI vận hành `npm run manage:system-administrator -- grant|revoke|recover`. Yêu cầu tài khoản OS trong allowlist `NGUOI_VAN_HANH_DUOC_UY_QUYEN`, mã hồ sơ/quyết định, xác minh tài khoản đích bằng mật khẩu kín; cấp đầu tiên đối chiếu `TAI_KHOAN_QUAN_TRI_VIEN_DAU_TIEN`; cấp thêm/thu hồi cần Quản trị viên hiện hữu phê duyệt. Recovery chỉ cho phép khi không có quản trị viên hợp lệ. Các thao tác tạo Role/gắn Permission/cấp Assignment/thu hồi Assignment đều ghi audit; không chạy CLI trong phiên này.
- Các script cấp/bàn giao/thu hồi Assignment bootstrap 24 giờ đã bị gỡ khỏi source và package scripts. CLI quản trị mới khi cấp cho tài khoản có Assignment cũ `QUAN_TRI_KHOI_TAO_24H` sẽ thu hồi Assignment cũ trong cùng transaction; không tự chạy.
- Đã thêm policy/backend helper đếm Quản trị viên toàn hệ thống hợp lệ và khóa transaction tuần tự hóa kiểm tra; API thường chặn thao tác Assignment Role hệ thống. API tạo/quản lý tài khoản khóa/xóa chưa tồn tại; khi bổ sung phải dùng helper invariant trước thao tác khóa/xóa.
- Tài khoản tự xem/sửa email qua `GET/PATCH /api/v1/xac-thuc/tai-khoan-cua-toi`; mật khẩu dùng luồng đổi mật khẩu hiện có. `GET /api/v1/phan-cong-vai-tro/cua-toi` trả Assignment cùng Role/Permission, ID lấy từ phiên. Email audit chỉ ghi trạng thái đã thiết lập, không ghi giá trị.
- Tổ chức: đơn vị mới mặc định `DANG_HOAT_DONG`; API giới hạn đúng ba trạng thái và tách endpoint đổi trạng thái/khôi phục với Permission khác nhau. Đảng ủy chỉ được tạo theo mã `PTIT_DANG_UY`, tên đã duyệt, tạo lặp trả đơn vị hiện hữu nếu cấu hình phù hợp. Migration thêm default/check ba trạng thái, mã gốc cố định, unique Đảng ủy và cho phép attribution ngoài hệ thống (`nguoi_cap`, `nguoi_ghi_nhan` nullable).
- Migration mới `20261101010000_quan_tri_toan_he_thong_va_don_vi_goc` đã được tạo nhưng **chưa áp dụng**. Không seed Permission, Role, Assignment; không tạo tài khoản/đơn vị; không thay đổi database.
- Assignment cũ đã được người dùng cấp cho `Quantrivien` vẫn chưa bị thay đổi. Chưa chạy CLI chuyển tiếp; lệnh `grant` chỉ thu hồi Assignment cũ cùng tài khoản khi bạn chạy rõ lệnh với tài khoản chỉ định và cấu hình vận hành đầy đủ.
- Kiểm tra cuối: `npm.cmd run prisma:validate`, `npm.cmd run typecheck`, `npm.cmd run build`, toàn bộ backend tests ngoài sandbox 23/23 đạt và `git diff --check`; quét trailing whitespace cả file mới cũng đạt. Không chạy migration/seed/CLI.

## Cập nhật sau khi hoàn tất migration và catalog Permission — 2026-11-01

- PostgreSQL phát triển `quan_ly_dang_vien_dev` có 5 migration trước đó. Đã kiểm tra trạng thái ngoài sandbox và xác nhận migration `20261101010000_quan_tri_toan_he_thong_va_don_vi_goc` là migration còn chờ.
- Đã chạy `npm.cmd run prisma:migrate:deploy` ngoài sandbox; migration áp dụng thành công. Đã chạy `npm.cmd run sync:permissions`; 71 Permission hệ thống đã được đồng bộ. Sync chỉ upsert catalog Permission, không tạo Role, Assignment, tài khoản hoặc đơn vị.
- Chưa chạy CLI `manage:system-administrator`; chưa chỉ định tài khoản Quản trị viên toàn hệ thống đầu tiên theo quyết định mới. Assignment bootstrap tạm cũ vẫn chưa bị thay đổi; không dùng lựa chọn `Quantrivien` cũ để cấp Role lâu dài nếu chưa được chỉ định lại rõ ràng.
- Chưa tạo đơn vị `PTIT_DANG_UY` trong database; migration chỉ cập nhật schema, không seed dữ liệu.
- API quản trị tài khoản đầy đủ và API cấu hình/vận hành chưa triển khai. Cần chốt cách xác định Scope đối với tài khoản đích chưa có Assignment và danh mục/quy trình cho cấu hình, thao tác vận hành trước khi mở các API này. Không mở API hồ sơ nghiệp vụ.
- Kiểm tra trong lượt này: `npm.cmd run prisma:migrate:status` trong sandbox không kết nối được PostgreSQL; ngoài sandbox, lệnh xác nhận migration pending trước khi áp dụng và sau đó xác nhận `Database schema is up to date!`. `npm.cmd run prisma:migrate:deploy`, `npm.cmd run sync:permissions` (71 Permission), `npm.cmd run prisma:validate`, `npm.cmd run typecheck`, `npm.cmd run build` đều thành công. Backend test suite: lần chạy sandbox bị `EACCES` ở 2 bài health E2E cần loopback; chạy lại ngoài sandbox thành công 23/23 (6 files). Chưa chạy frontend tests.
- Người dùng xác nhận `Quantrivien` là Quản trị viên toàn hệ thống đầu tiên. Đã thêm allowlist vận hành `ADMIN` và `TAI_KHOAN_QUAN_TRI_VIEN_DAU_TIEN=Quantrivien` vào `.env` local (không commit). Lần chạy CLI có xác minh kín kết thúc với P2039; chưa có kết quả thành công, không ghi mật khẩu vào output/chat. Đã sửa thông báo lỗi của `manage-system-administrator.ts` để lần chạy kế tiếp chỉ đưa mã driver/database và định danh constraint/table/column an toàn, không in dữ liệu truy vấn. Typecheck đạt sau sửa.
- Bước tiếp theo: người vận hành chạy lại `npm.cmd run manage:system-administrator -- grant` trong terminal tương tác của họ; nhập mã tham chiếu đã thống nhất, `Quantrivien`, rồi mật khẩu tại prompt ẩn. Nếu còn lỗi, lấy mã DB/constraint đã lọc trong output để sửa đúng nguyên nhân. Chỉ tạo đơn vị gốc sau khi Assignment quản trị thành công.

## Sửa CHECK khi thu hồi Assignment bootstrap — 2026-11-01

- Lần cấp quyền của `Quantrivien` báo Prisma P2039 / PostgreSQL SQLSTATE 23514. Truy vấn chỉ đọc xác nhận không có Role, Assignment hoặc audit khởi tạo dở dang.
- Nguyên nhân: transaction cấp Role/Assignment đồng thời thu hồi Assignment bootstrap cũ; CHECK `ck_phan_cong_vai_tro_thu_hoi_di_cung_nhau` bắt buộc tài khoản nội bộ thu hồi và timestamp cùng có/không. Quy trình vận hành ngoài API có Audit định danh operator nhưng `nguoi_thu_hoi` nội bộ là NULL, nên update thời điểm thu hồi vi phạm CHECK và cả transaction rollback.
- Migration `20261101020000_cho_phep_thu_hoi_ngoai_he_thong` thay CHECK thành điều kiện: nếu có tài khoản thu hồi nội bộ thì phải có thời điểm; trường hợp operator ngoài hệ thống có thể chỉ lưu thời điểm, còn chi tiết operator/reference vẫn ở Audit.
- Migration đã áp dụng; `prisma:migrate:status` báo schema up to date, `prisma:validate` và `typecheck` đạt. Tại thời điểm ghi nhận lỗi, Role/Assignment chưa được cấp và cần chạy lại CLI trong terminal tương tác với mật khẩu ẩn; trạng thái đã được cập nhật sau đó bên dưới.
- Người dùng đã chạy lại CLI thành công với tham chiếu `CHI_DINH_QUAN_TRI_VIEN_TOAN_HE_THONG_2026-11-01`; Assignment mới `6e4fea22-d9a0-44aa-acd1-8e8502989a8a` được cấp cho `Quantrivien`, Role `QUAN_TRI_VIEN_TOAN_HE_THONG`, Scope `TOAN_HE_THONG`, không có hạn. Assignment bootstrap cũ `c486ddd2-cbe4-4922-be73-4d9c2d7e5e59` đã thu hồi trong cùng transaction (CLI báo 1).
- Truy vấn chỉ đọc xác nhận Assignment mới hợp lệ, Assignment cũ có thời điểm thu hồi, Audit có một sự kiện khởi tạo và một sự kiện thu hồi quyền cũ, hệ thống hiện có 1 Quản trị viên toàn hệ thống hợp lệ. Không tạo đơn vị gốc trong bước này.
- Theo thứ tự người dùng yêu cầu, đã thêm lệnh `npm run initialize:root-organization` để khởi tạo đơn vị gốc sau khi tài khoản QTVHT được cấp. Lệnh giới hạn ở operator trong allowlist, xác minh mật khẩu `Quantrivien` nhập ẩn, gọi lại `ToChucService.tao` nên kiểm tra Permission + Scope, dùng mã/tên/trạng thái gốc đã duyệt và ghi reference vào Audit. Tạo là idempotent; không tạo thêm bản ghi nếu root đã tồn tại đúng cấu hình.
- Chưa chạy lệnh tạo root; database vẫn chưa có bản ghi đơn vị PTIT. Cần người vận hành chạy lệnh trong terminal tương tác và nhập mật khẩu ẩn. Kiểm tra sau script: `prisma:validate`, `typecheck`, `build`, `npm.cmd run test -- test/organizations.service.spec.ts --reporter=dot` (4/4), đều đạt.

## Hoàn thiện API và giao diện phân quyền — 2026-11-01

- Đã hoàn thiện metadata cho toàn bộ 71 Permission: tên, mô tả, nhóm và trạng thái API. Script `sync:permissions` được cập nhật để upsert metadata trên catalog, không tạo Role/Assignment/tài khoản/đơn vị.
- Bổ sung `GET /api/v1/tai-khoan?tuKhoa&gioiHan` làm bộ chọn tài khoản, có kiểm tra `TAI_KHOAN_XEM` và Scope. Quản trị viên toàn hệ thống tra được tài khoản đang hoạt động; quản trị viên phạm vi đơn vị bị giới hạn trong tập tài khoản đang có Assignment phù hợp Scope quản lý. Tài khoản chưa có Assignment không xuất hiện trong tra cứu có Scope đơn vị.
- Đã bổ sung test Service cho lọc tài khoản theo Scope và trường hợp không có Permission. Kiểm tra backend liên quan: `npm.cmd run test -- test/authorization-admin.service.spec.ts --reporter=dot` đạt 9/9; `npm.cmd run typecheck` và `npm.cmd run build` đạt.
- Giao diện React có các route `/quan-tri-phan-quyen/quyen`, `/vai-tro`, `/vai-tro/:maVaiTro`, `/phan-cong`; menu được thêm trong điều hướng. Danh mục chỉ đọc; Role hệ thống chỉ xem; Role thường tạo/sửa trạng thái/xóa khi chưa có Assignment và chỉnh Permission theo nhóm; Assignment tạo/sửa phạm vi, hạn, thu hồi kèm lý do. UI không cung cấp Scope `TOAN_HE_THONG` hoặc `CA_NHAN`, không cho phân công Role hệ thống, và không mở API hồ sơ nghiệp vụ.
- API Backend vẫn là ranh giới bảo mật: UI chỉ điều khiển trải nghiệm; mọi thao tác tiếp tục phụ thuộc kiểm tra Permission + Scope và Audit phía server. Danh mục đánh dấu quyền chưa có API để không tạo kỳ vọng rằng Permission đã có hiệu lực nghiệp vụ.
- Cây tổ chức có thể chưa có đơn vị PTIT nếu lệnh khởi tạo root chưa được vận hành; Assignment yêu cầu đơn vị đang hoạt động. Chưa thay đổi schema/migration hoặc tạo dữ liệu tổ chức/tài khoản/quyền trong lượt giao diện này.
- Đã chạy `npm.cmd run sync:permissions` sau khi hoàn thiện metadata; log xác nhận cập nhật 71 Permission hệ thống. Lệnh chỉ upsert catalog, không cấp Role/Assignment, tài khoản hoặc đơn vị.
- Kiểm tra Frontend: `npm.cmd run typecheck`, `npm.cmd run build` đạt; `npm.cmd run lint` không có lỗi, có 4 cảnh báo Fast Refresh tại `badge.tsx`, `button.tsx`, `sidebar.tsx`, `tabs.tsx`. Build báo chunk chính lớn hơn 500 kB sau minify (các màn hình RBAC được lazy-load riêng).
- `git diff --check` đạt; chỉ có cảnh báo chuẩn hóa LF/CRLF từ Git trên các file hiện hữu. Không áp dụng migration, không khởi tạo đơn vị PTIT, không tạo tài khoản hay gán thêm quyền trong lượt hoàn thiện này.

## Làm rõ ngôn ngữ giao diện phân quyền — 2026-11-01

- Theo phản hồi về ảnh giao diện, đã thay các nhãn tiếng Anh như Permission, Scope, Assignment, API bằng cách gọi tiếng Việt dễ hiểu: quyền, phạm vi áp dụng, giao/thu hồi vai trò, chức năng tương ứng; viết lại hướng dẫn để nêu rõ ai được giao quyền ở đâu và điều gì xảy ra khi tạm ngừng vai trò.
- Mã nội bộ vẫn được hiển thị khi cần tra cứu nhưng có nhãn “Mã kỹ thuật”. Bộ chọn đơn vị được mở rộng toàn hàng và có giải thích về phạm vi đơn vị trực thuộc.
- Kiểm tra sau chỉnh sửa nội dung: frontend `npm.cmd run typecheck` và `npm.cmd run build` đạt; `npm.cmd run lint` không lỗi, còn 4 cảnh báo Fast Refresh có sẵn trong UI primitives; `git diff --check` đạt. Build tiếp tục cảnh báo chunk chính lớn hơn 500 kB sau minify.
- Danh mục quyền được chuyển thành các tab theo nhóm; ô tìm kiếm và bộ lọc trạng thái áp dụng chung, tab hiển thị số lượng kết quả và tự chọn nhóm còn kết quả sau khi lọc.

## Chuẩn hóa UI theo shadcn — 2026-11-01

- Các màn hình phân quyền dùng primitives shadcn đã có trong `frontend/src/shared/components/ui/`: Tabs, Select, Table, Checkbox, Button, Dialog/AlertDialog, Input, Badge và Card. Thay các select/bảng/checkbox/button HTML thuần và hộp `window.prompt`/`window.confirm` bằng component tương ứng.
- Kiểm tra `rg` không còn `<select>`, checkbox HTML, `<table>`, `window.prompt`, `window.confirm` hoặc nút HTML thuần trong feature phân quyền. Frontend typecheck/build đạt; lint 0 lỗi với 4 cảnh báo Fast Refresh sẵn có trong UI primitives; `git diff --check` đạt.

## Bố trí lại khu vực phân quyền — 2026-11-01

- Tạo phần đầu trang chung với breadcrumb, tiêu đề và các tab: Quản lý vai trò, Chọn vai trò xem ma trận, Danh mục quyền, Giao vai trò. Ma trận chi tiết giữ tên vai trò đang chọn ở tab.
- Danh sách vai trò chuyển từ thẻ rời sang bảng shadcn có mã, mô tả, trạng thái, số quyền, số tài khoản được giao và thao tác. Ma trận của từng vai trò chuyển thành bảng theo nhóm quyền, mỗi nhóm có tab riêng.
- Không thêm tab nhật ký thay đổi vì hiện chưa có API truy vấn audit phù hợp. Không đưa cột phạm vi vào Role: phạm vi được quyết định ở từng lần giao vai trò cho tài khoản.
- Kiểm tra: frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` đều đạt; lint vẫn có 4 cảnh báo Fast Refresh có sẵn, build có cảnh báo chunk chính vượt 500 kB.
- Theo yêu cầu thống nhất kiểu tab, tất cả `TabsList` trong frontend hiện dùng `variant="line"`, gồm thanh điều hướng phân quyền, nhóm danh mục quyền và nhóm trong ma trận.
- Theo ảnh người dùng phản hồi vẫn còn khung quanh từng tab, đã sửa primitive shadcn `tabs.tsx`: với `variant="line"` bỏ bo góc, viền và nền trên từng tab, giữ dấu gạch dưới trạng thái đang chọn. Thanh tab ở điều hướng phân quyền, danh mục và ma trận được cho phép xuống dòng để tránh thanh cuộn ngang.
- Kiểm tra sau sửa: frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` đều đạt; lint có 4 cảnh báo Fast Refresh đã có ở primitives, build có cảnh báo chunk chính lớn hơn 500 kB.
- Theo phản hồi ảnh, dấu chọn tab được đổi từ màu chữ tối sang đỏ thương hiệu và chữ tab đang chọn dùng token `primary`. Chuẩn hóa bảng màu semantic tập trung: đỏ tổ chức đậm hơn, màu vàng đồng tiết chế, viền trung tính dễ đọc; không đặt màu trực tiếp trong feature. Frontend typecheck/lint/build đạt; lint còn 4 cảnh báo Fast Refresh, build còn cảnh báo chunk chính >500 kB.

## Tái bố trí giao diện quản trị phân quyền — 2026-11-01

- Đã triển khai giao diện ma trận theo bố cục desktop hai vùng: danh sách/tìm vai trò ở cột trái; thông tin vai trò, thống kê và ma trận quyền ở cột phải. Nhóm quyền chuyển thành danh sách dọc để không dàn trải/đè lên nội dung; bảng dùng chiều rộng cố định theo cột và cho phép xuống dòng.
- Ma trận có tìm theo mã/tên/ý nghĩa, lọc quyền theo trạng thái chức năng, chọn/bỏ toàn bộ quyền đang lọc, bộ đếm quyền đã cấp và số thay đổi chưa lưu. Lưu ma trận có hộp xác nhận nêu rõ số quyền thêm/bỏ; vai trò hệ thống vẫn chỉ xem.
- Tách sửa thông tin vai trò thành hộp thoại; tạm ngừng, khôi phục và xóa thành vùng thao tác nhạy cảm với xác nhận. Danh sách vai trò và trang chọn vai trò dùng thẻ co giãn theo màn hình thay bảng rộng. Giao diện giao vai trò có thông báo thành công cho giao/sửa/thu hồi; lỗi hiện trong trang và nút phản ánh trạng thái đang xử lý.
- Không đổi API, schema, logic phân quyền hoặc quyền gán cho vai trò. Tái sử dụng primitives shadcn hiện có và token màu tập trung.
- Kiểm tra: frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test -- --reporter=dot` (1 test/1 file), `git diff --check` đạt. Lint có 4 cảnh báo Fast Refresh tại primitives; build cảnh báo chunk chính trên 500 kB.
- Chưa kiểm tra ảnh runtime: trình duyệt từ chối quyền quan sát `http://127.0.0.1:5173`; không thử cách khác để vượt quyền từ chối. Cần kiểm tra trực tiếp trên trình duyệt người dùng.

## Tinh gọn tab Ma trận quyền — 2026-11-01

- Bỏ màn hình/tab “Chọn vai trò xem ma trận”. Tab cấp trang chỉ còn “Ma trận”; tab bị khóa nếu chưa ở màn hình một vai trò cụ thể. Nút “Mở vai trò” từ trang quản lý đưa tới trang chi tiết với tab “Ma trận: {tên vai trò}” được chọn. Đường dẫn `/quan-tri-phan-quyen/ma-tran` cũ chuyển về trang quản lý vai trò.
- Bỏ cột/danh sách vai trò khỏi màn hình ma trận vì mỗi lần chỉ cấu hình một vai trò; chọn vai trò từ tab Quản lý vai trò. Thu gọn thẻ thông tin vai trò và ba thẻ thống kê; bỏ viền riêng ở các thẻ thống kê.
- Kiểm tra: frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test -- --reporter=dot`, `git diff --check`. Lint có 4 cảnh báo Fast Refresh đã có; build có cảnh báo chunk chính >500 kB.
- Theo ảnh phản hồi, ba thẻ thống kê được chuyển sang nền trắng dùng token `bg-card`, bóng nhẹ `shadow-sm`, vẫn không có viền và giữ chiều cao gọn. Frontend typecheck và `git diff --check` đạt.
- Theo yêu cầu mới, token viền chung được đổi sang xám trung tính toàn ứng dụng; token `input` giữ màu hồng đỏ nhạt để trường nhập/chọn tiếp tục nhận diện. Đã bỏ “Danh mục quyền” khỏi mục con sidebar, vẫn giữ route và tab bên trong trang phân quyền. Frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` đạt; lint còn 4 cảnh báo Fast Refresh, build có cảnh báo chunk chính >500 kB.

## Tích hợp giao diện module Tổ chức — 2026-11-01

- Thêm feature `frontend/src/features/organizations/`, route `/to-chuc` và mục điều hướng “Cơ cấu tổ chức”. Bố cục theo ảnh tham chiếu: breadcrumb/tiêu đề và bộ lọc phía trên, thẻ tổng quan, vùng cây/danh sách bên trái, chi tiết và các tab bên phải.
- Dữ liệu cây lấy từ `GET /api/v1/to-chuc/cay`: mã đơn vị, mã định danh, loại, trạng thái, tên hiện hành và đơn vị con. Cây chỉ hiển thị payload được Backend lọc Scope. Tìm kiếm/lọc cây thao tác trên payload này; danh sách phân trang lấy `GET /api/v1/to-chuc` với `loaiDonVi`, `trangThai`, `tuKhoa`, `trang`, `gioiHan`.
- Thẻ tổng quan đếm Đảng ủy/Chi bộ/Tổ/đơn vị đang hoạt động từ cây đã tải trong phạm vi. Không đếm đảng viên hoặc hiện email/số điện thoại vì API/schema tổ chức không có các dữ liệu đó.
- Chọn đơn vị gọi `GET /api/v1/to-chuc/{maDonVi}`; thông tin hiển thị gồm mã, tên hiện hành, loại, trạng thái, đơn vị cha và các đơn vị con trong phạm vi lấy từ cây. Tab lịch sử gọi `GET /api/v1/to-chuc/{maDonVi}/lich-su-quan-he`, chỉ hiển thị quan hệ cha-con cùng mốc hiệu lực; không gọi đây là audit. API hiện chưa đọc lịch sử tên/audit; giao diện ghi rõ giới hạn.
- Biểu mẫu dùng các API hiện hữu: tạo `POST /to-chuc` (ngày hiệu lực bắt buộc; gốc gửi đúng `PTIT_DANG_UY`, tên đã duyệt, `DANG_HOAT_DONG`, không cha), sửa mã/loại `PATCH /to-chuc/{maDonVi}`, đổi tên `POST /doi-ten`, đổi cha `POST /cap-nhat-quan-he-cha`, trạng thái `PATCH /trang-thai`, xóa `DELETE /to-chuc/{maDonVi}`. Thao tác trạng thái và xóa có bước xác nhận; 403/409 được chuẩn hóa và thông báo.
- Khi chưa có đơn vị, trang hiển thị trạng thái rỗng và cho phép gửi yêu cầu tạo Đảng ủy gốc; không seed/khởi tạo đơn vị tự động. Trạng thái tạo mới hiển thị mặc định “Đang hoạt động”. Thay đổi dữ liệu thật chỉ xảy ra khi người dùng chủ động thao tác và Backend xác nhận Permission + Scope.
- Chỉ dùng component shadcn có sẵn (Card, Tabs line, Table, Input, Select, Badge, Button, Dialog, AlertDialog, Skeleton, Collapsible, Breadcrumb, Separator); không sửa shared primitives, không thêm dependency, không thêm màu/token riêng hoặc CSS module. Sidebar ứng dụng không bị thay đổi ngoài mục điều hướng mới.
- Cập nhật `README.md` và `docs/THIET_KE_API_TO_CHUC.md` để không còn mô tả API tổ chức là chưa triển khai. Hạn chế còn lại: chưa có endpoint xem lịch sử đổi tên/audit; chưa kiểm thử tích hợp HTTP với Assignment/Scope thực tế; chưa kiểm tra trực quan trên trình duyệt.
- Kiểm tra đã chạy: frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` đều đạt. Lint còn 4 cảnh báo Fast Refresh sẵn có trong shared UI primitives; build có cảnh báo bundle chính 628 kB lớn hơn 500 kB. Không chạy test suite, không tạo đơn vị, tài khoản hay Assignment.
## Chuẩn hóa thẻ thống kê và huy hiệu trạng thái — 2026-11-01

- Tạo `frontend/src/shared/components/StatisticCard.tsx` làm component dùng chung cho thẻ số liệu. Thẻ đặt `h-fit self-start`, bỏ khoảng đệm mặc định kép của Card, giữ nội dung gọn với `p-4`; các grid không còn kéo thẻ thống kê cao theo hàng.
- Huy hiệu trạng thái dùng chung đổi bo góc từ viên thuốc sang góc nhẹ (`rounded-md`). Thêm biến thể `success` dùng token `--success`/`--success-foreground` trong `globals.css`: nền xanh lá và chữ trắng, có giá trị sáng/tối.
- Đã áp dụng trạng thái xanh cho đơn vị/vai trò đang hoạt động, Assignment đang có hiệu lực và quan hệ đang áp dụng. Trạng thái tạm ngừng tiếp tục dùng viền trung tính; trạng thái ngừng hoạt động tiếp tục dùng biến thể cảnh báo.
- Không sửa logic nghiệp vụ hay component Card chung; không thay đổi API/dữ liệu. Kiểm tra sau cập nhật: frontend `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` đều đạt; lint còn 4 cảnh báo Fast Refresh ở primitives, build cảnh báo bundle chính 628 kB vượt 500 kB. Không chạy test.
- Thẻ thống kê ở chi tiết vai trò được chuyển sang dùng cùng `StatisticCard` như module Tổ chức; thống nhất kích thước, khoảng đệm, nền và bóng, giữ số liệu/biểu tượng và chấm báo thay đổi chưa lưu.
- Tab “Đơn vị trực thuộc” chuyển danh sách thẻ thành bảng bốn cột STT, mã đơn vị, tên đơn vị, đơn vị con. Tên đơn vị vẫn mở chi tiết khi nhấn; danh sách đơn vị con chỉ lấy từ nhánh cây Backend đã trả theo Scope. Kiểm tra: typecheck/lint/build và `git diff --check`.

## Bổ sung shadcn/ui components — 2026-11-02
- Dùng `shadcn@latest` bổ sung 37 file component từ registry New York v4 tương thích với cấu hình hiện tại: Accordion, Alert, Aspect Ratio, Attachment, Bubble, Button Group, Calendar, Carousel, Chart, Combobox, Command, Context Menu, Direction, Drawer, Empty, Field, Hover Card, Input Group, Input OTP, Item, Kbd, Marker, Menubar, Message, Message Scroller, Native Select, Navigation Menu, Pagination, Popover, Progress, Radio Group, Resizable, Scroll Area, Slider, Spinner, Textarea, Toggle.
- Giữ nguyên toàn bộ primitives đã có; tại các prompt CLI, từ chối ghi đè `button.tsx`, `card.tsx`, `input.tsx`, `dialog.tsx`, `label.tsx`, `separator.tsx`, `textarea.tsx`. Cấu hình màu và components.json không đổi. `Tooltip` đã tồn tại từ trước.
- CLI cập nhật `frontend/package.json` và lockfile với dependency cần thiết. Tương thích `Command` với `DialogContent` sẵn có bằng cách bỏ prop `showCloseButton` không được primitive hiện tại hỗ trợ; `DialogContent` hiện không có nút đóng riêng.
- Các mục chưa cài: `toast` (CLI chỉ hỗ trợ nhánh Base UI; dự án đã có Sonner), `date-picker` là composition Calendar + Popover theo tài liệu, `data-table` là composition; registry New York v4 không có item `code-block`, `questionnaire`, `trace`, `typography` tại thời điểm cài. Không đổi sang Base UI vì sẽ thay nền tảng component hiện hữu.
- Kiểm tra: frontend `npm.cmd run typecheck` đạt; `git diff --check` đạt. Không chạy test suite hoặc build.
