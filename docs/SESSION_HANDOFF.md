# Header: phạm vi và danh tính Assignment hiện hành — 2026-11-08

## Tên chương trình đào tạo, bồi dưỡng Đảng — 2026-11-08

- Nguyên nhân: form trước đây không có trường nhập tên chương trình; Frontend luôn gửi `loaiLop: LOP_DANG_VIEN_MOI` và hiển thị nhãn cố định, nên tên trên bảng không đến từ dữ liệu người dùng nhập.
- Thêm `tenChuongTrinh` vào hồ sơ đào tạo, DTO/API và modal thêm/sửa; tên trong bảng, chi tiết và lựa chọn giấy chứng nhận lấy từ giá trị đã lưu. `loaiLop` vẫn giữ mã loại lớp hiện tại để không ảnh hưởng liên kết giấy chứng nhận. Bản ghi cũ được backfill từ giá trị loại lớp hiện có.
- Migration `20261108180000_add_training_program_name` đã áp dụng vào PostgreSQL phát triển `quan_ly_dang_vien_dev` tại `127.0.0.1:55432`; `prisma migrate status` xác nhận 19 migration, database schema up to date.
- Kiểm tra đạt: Backend và Frontend TypeScript, Prisma validate, ESLint các tệp Frontend liên quan, `git diff --check`. Không chạy test suite.
- Files: `backend/prisma/schema.prisma`, migration mới, `backend/src/modules/member-profiles/member-profiles.dto.ts`, `member-profiles.service.ts`, `frontend/src/features/member-profiles/api/member-profiles.api.ts`, `components/MemberProfileSupplementarySections.tsx`.

## Bổ sung thông tin hồ sơ Đảng viên — 2026-11-08

- Bổ sung số điện thoại bố/người nuôi dưỡng và mẹ/người nuôi dưỡng vào hồ sơ cá nhân; bổ sung loại địa chỉ `NOI_O_HIEN_NAY` vào form, danh sách trường mở đợt cập nhật, trang Hồ sơ của tôi và nhập/xuất Excel. Giữ các bảng hồ sơ hiện tại.
- Thêm lịch sử chuyển sinh hoạt ngoài PTIT gắn với mốc lịch sử đơn vị tiếp nhận có sẵn; thêm thông tin đào tạo/bồi dưỡng Đảng; thêm metadata tài liệu, lưu bytes vào `KHO_TEP_RIENG` (PDF/JPG/PNG, tối đa 10 MB). Quyết định/tài liệu bắt buộc liên kết với quá trình phù hợp; nội dung tệp và PII không ghi vào audit.
- API kiểm tra Permission + Scope; bổ sung Permission đào tạo (`DAO_TAO_DANG_*`) và tài liệu (`HO_SO_TAI_LIEU_*`) vào catalog. Đã chạy `npm run sync:permissions`, chỉ đồng bộ metadata danh mục; không cấp Permission cho bất kỳ Role nào. Quản trị viên cần tự gán quyền theo nhu cầu.
- Migration `20261108123435_member_profile_supplementary_records` đã áp dụng vào PostgreSQL phát triển `quan_ly_dang_vien_dev` tại `127.0.0.1:55432`; `prisma migrate status`: 17 migration, “Database schema is up to date!”. Migration chỉ thêm enum value, hai cột điện thoại và ba bảng bổ sung cùng index/FK; không chuyển đổi/xóa dữ liệu cũ.
- Kiểm tra đạt: Prisma validate; Backend và Frontend typecheck; Backend 30/30 test trong `member-profiles.service.spec.ts`, `member-profiles.controller.spec.ts`, `member-profile-updates.service.spec.ts`; Frontend 15/15 trong `my-member-profile.test.tsx`, `member-profile-detail.test.tsx`, `member-profiles.validation.test.ts`. Bỏ Tooltip không cần thiết ở nút tab tràn vì nút đã có nhãn trợ năng; `git diff --check` đạt. Chưa kiểm tra tải tệp qua trình duyệt hoặc kiểm tra thủ công trên môi trường UI.

- Bỏ tiêu đề route khỏi Header; cạnh nút Sidebar hiển thị phạm vi của đúng Assignment đang hoạt động: tên đơn vị gốc cho `CAY_DON_VI`, tên đơn vị đơn lẻ hoặc số lượng đơn vị cho `DON_VI_CHI_DINH`, “Toàn hệ thống” cho `TOAN_HE_THONG`, “Phạm vi cá nhân” cho `CA_NHAN`. Không cộng Scope qua các Assignment; session loading/lỗi/thiếu dữ liệu có trạng thái riêng.
- Bên phải theo thứ tự chuông, theme, avatar và hai dòng tên/ngạch vai trò của Assignment hiện hành. Chuông mở thông báo “Chức năng thông báo đang được phát triển.” Theme đổi dựa trên `resolvedTheme`, giữ lưu theme của `next-themes`. Avatar dùng shadcn Avatar, tải ảnh qua API hiện có chỉ khi Permission xem hồ sơ trong Assignment hiện hành cho phép; nếu ảnh lỗi/không có thì hiện chữ cái đầu.
- `GET /xac-thuc/phien-hien-tai` nay kèm `hoVaTen` lấy từ hồ sơ liên kết với chính tài khoản đăng nhập; không thêm schema/API phân quyền. Tên Role và nhãn đơn vị lấy từ Assignment đã có trong session. Chuyển Assignment làm session và Header cập nhật theo cơ chế hiện hành.
- Kiểm tra: Backend và Frontend typecheck đạt; `frontend/tests/admin-layout-header.test.tsx` đạt 5/5; `git diff --check` đạt. Không đổi schema/migration hoặc Permission/Role/Assignment. Ảnh chỉ tải khi có Permission `HO_SO_DANG_VIEN_XEM_TONG_QUAN`; nếu thiếu, Header giữ avatar chữ cái và không vượt qua kiểm soát ảnh hiện tại.

# Chính sách Permission cho danh mục năm học dùng chung — 2026-11-08

- Nguyên nhân hạn chế trước đây: `NamHocService.check` tự truy vấn Assignment đang hoạt động nhưng bắt buộc `TOAN_HE_THONG` khi tạo/sửa/xóa; Frontend `SchoolYearsPage` cũng chỉ hiện thao tác khi Assignment có Scope đó. Vì vậy Permission `NAM_HOC_*` trong Role không đủ với Assignment Scope tổ chức/đơn vị chỉ định.
- Chính sách riêng hiện gọi `PhanQuyenService.kiemTraQuyenDanhMucNamHoc` cho các API danh sách, chi tiết, tạo, sửa, xóa. Yêu cầu đúng Permission trên Assignment được phiên chọn, đã qua lọc hết hạn/thu hồi/tài khoản hoặc Role không hoạt động; chấp nhận `CAY_DON_VI`, `DON_VI_CHI_DINH`, `TOAN_HE_THONG`; từ chối `CA_NHAN`. Không đổi `kiemTra()` chung, Scope lưu, Role/Permission/Assignment hay chính sách module khác.
- Frontend hiện từng thao tác theo Permission phiên và ba Scope được chấp nhận. Mô tả trang là “Danh mục năm học dùng chung, được quản lý theo quyền hạn đã cấp.” `AuthProvider` làm mới session mỗi 60 giây khi trang hoạt động và khi focus; đổi Assignment vẫn tải phiên mới, xóa cache. Backend luôn xác minh quyền trực tiếp.
- Kiểm tra đạt: Backend typecheck; `authorization.service.spec.ts` + `school-years.service.spec.ts` 22/22; Frontend typecheck và `school-years.test.tsx` 9/9; HTTP tích hợp PostgreSQL phát triển 1/1, chọn Assignment hiện hành có Scope không phải `TOAN_HE_THONG` và gọi trực tiếp `GET /api/v1/nam-hoc` thành công. Lượt đầu bị `EACCES` trong sandbox; cùng kiểm tra chỉ đọc được chạy thành công sau khi được duyệt truy cập DB cục bộ. `git diff --check` đạt.
- Schema/migration và dữ liệu phân quyền không thay đổi; không ghi dữ liệu thử. Bảng `NamHoc` hiện không có quan hệ nghiệp vụ tham chiếu trong Prisma/schema migration; unique mã, CHECK ngày và exclusion khoảng thời gian được giữ. Do hiện chưa có bảng nghiệp vụ tham chiếu, chưa thể tạo trường hợp xóa năm học đang được dữ liệu nghiệp vụ sử dụng; nếu quan hệ được bổ sung, cần FK/kiểm tra nghiệp vụ trước khi bật xóa bản ghi đang được tham chiếu.

## Tích hợp bộ chọn ngày và thời gian dùng chung — 2026-11-08

- Kiểm kê trước thay đổi trong Frontend: hồ sơ Đảng viên (ngày nhập hồ sơ và ngày sinh hoạt bị khóa khi sửa); hồ sơ của tôi (ngày sinh và ngày cấp CCCD được chọn động theo kiểu `date`); nhập Excel (ngày áp dụng hàng loạt và ngày từng dòng); cập nhật hồ sơ (mốc bắt đầu/kết thúc đợt, bộ lọc yêu cầu và bộ lọc danh sách đợt); tổ chức (thời điểm hiệu lực khi tạo/sửa); năm học (bộ lọc và ngày bắt đầu/kết thúc); phân quyền tài khoản (thời hạn phân công); nhật ký (lọc và xem trước xóa theo ngày); thư viện component (ví dụ Input và Sheet). Không thấy bộ chọn native cho tháng/năm riêng.
- Chuyển mọi trường tương tác ở trên sang `DatePicker`, `DateTimePicker`, `DateRangePicker` hoặc `DateTimeRangePicker` theo kiểu dữ liệu. Đợt cập nhật dùng `DateTimeRangePicker`; bộ lọc nhật ký, năm học, đợt và yêu cầu dùng `DateRangePicker`. Hồ sơ tài khoản và các màn hình xem lịch sử/ngày tạo chỉ hiển thị ngày giờ, không có trường nhập ngày độc lập để thay. Ngày trong bảng/chi tiết và thời điểm trong nhật ký vẫn là giá trị hiển thị.
- Năm học giữ nguyên giá trị ngày thuần `yyyy-MM-dd`, payload API và điều kiện ngày bắt đầu nhỏ hơn ngày kết thúc; sửa bản ghi tiếp tục lấy phần ngày từ giá trị Backend mà không quy đổi UTC. Ngày giờ giữ giá trị giờ địa phương hiện hành trước khi đổi sang ISO theo API. Trường ngày sinh hoạt bị khóa khi sửa vẫn chỉ đọc và không thể xóa.
- `DateRangePicker` và `DateTimeRangePicker` giữ lịch hai tháng; vùng lịch/cuộn ngang giới hạn chiều rộng trong viewport. `DateTimePicker` đồng bộ lại giờ/phút khi nhận giá trị bản ghi đã tải/thay đổi. Trường ngày hồ sơ giữ `aria-invalid` và mô tả lỗi trên nút picker.
- Rà soát sau thay đổi: không còn `input type="date"`, `datetime-local`, `month` hoặc `time` trong `frontend/src`; không có Calendar/DatePicker cũ được dùng làm trường nhập trong feature.
- Kiểm thử 6 bộ liên quan đạt 41/41. Toàn bộ Frontend đạt 84/85 ở 20 tệp; lỗi duy nhất ngoài phạm vi thay đổi tại `tests/rich-text-editor.test.tsx`, kỳ vọng `readonly` trên mock TinyMCE. Tệp test và component RichTextEditor không được chỉnh sửa ở tác vụ này.
- `npm run build` đạt (TypeScript + Vite); lint các tệp liên quan không có lỗi, có 3 cảnh báo hook tại trang cập nhật hồ sơ; `git diff --check` đạt. Rà `frontend/src` không còn `input type="date"`, `datetime-local`, `month` hoặc `time`. Build hiện cảnh báo một chunk lớn hơn 500 kB.

## Nhập tài khoản hàng loạt bằng Excel — 2026-11-07

## Tách cột trạng thái và lỗi trong preview nhập tài khoản — 2026-11-08

- Tách bảng dùng chung `AccountImportRowsTable` với đúng thứ tự 8 cột: Dòng Excel, Tên đăng nhập, Email, Trạng thái ban đầu, Loại tài khoản, Kết quả, Trạng thái tồn tại, Lỗi chi tiết. Kết quả chỉ hiện Badge Hợp lệ/Có lỗi; trạng thái tồn tại lấy từ API; lỗi từng trường nằm riêng, mỗi mục trên dòng riêng.
- Cột lỗi giới hạn ban đầu hai lỗi, có Xem thêm/Thu gọn khi một dòng có nhiều hơn hai lỗi, giữ chiều rộng tối đa và tự xuống dòng. Tái sử dụng bảng tại xem trước, xác nhận và kết quả thực nhập; kết quả nhập API nay kèm các dòng tài khoản đã tạo. Không hiển thị mã hồ sơ như cột phụ để giữ đúng thứ tự cột đã yêu cầu.
- Backend trả `DA_TON_TAI` khi username/email khớp PostgreSQL hoặc hồ sơ đích đã liên kết tài khoản; `CHUA_TON_TAI` khi các kiểm tra tồn tại hoàn tất và không có va chạm; hợp lệ và lỗi vẫn phân loại độc lập theo dòng. Trùng trong workbook vẫn nằm ở Lỗi chi tiết, không bị đánh dấu tồn tại trong hệ thống. Kiểm tra hệ thống không hoàn tất thì yêu cầu kiểm tra thất bại thay vì khẳng định chưa tồn tại; kiểu dữ liệu vẫn hỗ trợ trạng thái `CHUA_KIEM_TRA` cho dòng Backend đánh dấu chưa xác minh.
- Kiểm tra đạt: Frontend/Backend typecheck; Frontend `accounts-import.test.tsx` 3/3; Backend `accounts-import.service.spec.ts` 15/15. Không thay đổi schema/migration, Permission + Scope hay chính sách xác nhận nhập.

## Chuẩn hóa StarCard và nhận diện dữ liệu đã tồn tại khi nhập Excel — 2026-11-07

- Card dùng chung trong bản xem trước nhập không còn dòng hướng dẫn phụ; selected state chỉ đổi màu chữ/nền/viền, không có class scale hoặc thay đổi bố cục. Chọn thẻ áp dụng bộ lọc, bấm lại giữ nguyên; thẻ Tổng số đưa bộ lọc thẻ về toàn bộ. Tìm kiếm và bộ lọc trạng thái vẫn được kết hợp như trước.
- Bổ sung tone semantic màu vàng cam `exists` dùng token sáng/tối trong `globals.css`, và StarCard “Hồ sơ đã tồn tại” / “Tài khoản đã tồn tại”. Preview mỗi dòng có `daTonTai`; mỗi tổng có `soDaTonTai`. Thẻ tồn tại chỉ đếm dòng khớp dữ liệu PostgreSQL, không tính trùng bên trong workbook; một dòng có thể đồng thời nằm trong Có lỗi và Đã tồn tại.
- Hồ sơ: nhận diện xung đột mã hồ sơ, CCCD, số phiếu lý lịch, số thẻ Đảng viên, tên đăng nhập/email đã nhập cùng tài khoản tạo mới, và mã sinh viên. Không dùng họ tên. Tài khoản: nhận diện username/email trùng dữ liệu đã lưu và mã hồ sơ đã có liên kết tài khoản; trùng trong workbook vẫn có lỗi riêng, không đánh dấu Đã tồn tại. Thông báo chỉ nêu trường định danh đầu vào, không lộ thông tin bản ghi khớp.
- Sửa thống kê hồ sơ để `hopLe`/`coLoi` tính theo số dòng hồ sơ, không theo số thông báo lỗi hoặc va chạm số dòng giữa các sheet. Các dòng lỗi và dòng đã tồn tại không được xác nhận; xác nhận hồ sơ kiểm tra lại unique identifiers trước giao dịch, unique constraints tiếp tục làm chốt chống race condition. Luồng tài khoản giữ kiểm tra lại username/email và trạng thái liên kết trước khi ghi.
- Kiểm tra đạt: Frontend typecheck; Backend typecheck; hai test giao diện nhập đạt 5/5; hai test Backend nhập đạt 33/33; `git diff --check`. Không thay đổi schema/migration hoặc Permission + Scope.

- Trang Quản lý tài khoản có nút “Nhập Excel” với Dialog 4 bước và hai mẫu: tài khoản độc lập; tài khoản liên kết với hồ sơ hiện có. Dùng API `/tai-khoan/nhap-xuat/{mau,kiem-tra,xac-nhan,bao-cao-loi}`; giới hạn .xlsx 5 MB/200 dòng; preview hiển thị login/email/mã hồ sơ và không có mật khẩu. Thêm `ImportStepProgress` và `ImportSummaryCard` dùng chung trong `shared/components/data-transfer/`, đồng thời chuyển Dialog hồ sơ Đảng viên sang tái sử dụng hai component này. Thẻ kết quả bấm để lọc danh sách; các StatisticCard trên trang cũng lọc theo tổng/đang hoạt động/bị khóa-ngừng/chưa liên kết.
- Backend tái sử dụng `DataTransferService.readCell` để đọc scalar/cached formula và từ chối cache thiếu/lỗi, hyperlink, external/unsafe formula. Kiểm tra theo DTO tạo tài khoản hiện có, duplicate trong file/CSDL, trạng thái, hồ sơ tồn tại/chưa liên kết và Permission + Scope từng hồ sơ. Password được băm trước khi cất trong phiên xem trước, phiên gắn actor và TTL 10 phút; xác nhận kiểm tra lại quyền/trùng/link, tạo toàn bộ tài khoản và audit trong transaction; không cấp Role/Permission/Assignment. Không đổi schema/migration. Catalog hiện có `TAI_KHOAN_TAO` và `TAI_KHOAN_LIEN_KET_HO_SO` ở `DA_CO_API`, các luồng nhập dùng lại các quyền này.
- Cập nhật `docs/architecture.md` mô tả vị trí và hợp đồng để module khác dùng lại kỹ thuật đọc workbook chung.
- Kiểm tra: Backend `accounts-import.service.spec.ts` + `data-transfer.service.spec.ts` đạt 9/9; bài `accounts-import.postgres.integration.spec.ts` đạt 1/1 trên CSDL phát triển sau khi xác nhận đúng database, tạo tài khoản và audit bên trong transaction rồi rollback, sau đó xác minh cả hai không tồn tại; Frontend `accounts-import.test.tsx`, `accounts-stat-filters.test.tsx` và hồi quy `member-profiles-import-export.test.tsx` đạt 5/5; cả hai typecheck đạt; `git diff --check` đạt. Không để lại dữ liệu thử trong PostgreSQL. Cần đăng nhập bằng role có `TAI_KHOAN_TAO`; chế độ liên kết yêu cầu thêm `TAI_KHOAN_LIEN_KET_HO_SO` và Scope phù hợp. Preview sessions hiện lưu trong memory một process, giống luồng nhập hồ sơ; nhiều Backend instances cần kho phiên dùng chung.
- Sửa thống kê và kiểm tra theo từng dòng: mỗi dòng xem trước có `trangThaiKiemTra` và danh sách lỗi riêng; lỗi dòng không làm các dòng hợp lệ bị đánh dấu lỗi. `hopLe`/`coLoi` đếm số dòng, còn tài khoản độc lập/liên kết đếm mọi dòng theo loại kể cả dòng lỗi. Lỗi tệp rỗng trả riêng, không bịa ra lỗi dòng. Thẻ StarCard lọc đúng tổng/hợp lệ/có lỗi/loại tài khoản và thể hiện lựa chọn. Báo cáo lỗi lấy danh sách lỗi dòng thực tế; lỗi hệ thống làm hỏng toàn bộ lượt kiểm tra thì không trả preview dở dang. Kiểm tra sau sửa: Backend `accounts-import.service.spec.ts` 13/13, Frontend `accounts-import.test.tsx` 2/2 và hồi quy `member-profiles-import-export.test.tsx` 2/2; backend/frontend typecheck đạt, `git diff --check` đạt.
- Chuẩn hóa StarCard trong xem trước nhập hồ sơ và nhập tài khoản: card dùng chung có tone semantic (tổng xanh dương, hợp lệ xanh lá, lỗi đỏ, tài khoản độc lập tím, liên kết xanh ngọc, không tạo tài khoản cam), trạng thái chọn/nhấn lại để bỏ lọc, `aria-pressed`, hỗ trợ focus/disabled/loading. Bộ lọc thẻ ghép với tìm kiếm và trạng thái hiện hữu; số liệu giữ nguyên theo toàn bộ preview. Kết quả nhập dùng màu theo nhóm, còn lựa chọn Xuất dữ liệu không có StarCard và vẫn chỉ do cấu hình phạm vi xuất điều khiển. Bổ sung token stat light/dark trong globals.css. Kiểm tra: Frontend `accounts-import.test.tsx` 2/2, `member-profiles-import-export.test.tsx` 3/3 (bao gồm hồi quy phạm vi xuất), frontend typecheck đạt.

## Chọn số dòng mỗi trang hồ sơ Đảng viên — 2026-11-07

- Bổ sung Select “Số dòng mỗi trang” (10/20/50/100, mặc định 10) tại chân bảng hiện hữu. Kích thước trang nằm trong React Query key và request API; thay đổi kích thước đặt lại trang 1, các bộ lọc/từ khóa giữ nguyên. Tổng trang tính theo tổng kết quả sau lọc; nút trước/sau đồng bộ theo trang và tổng trang, kể cả không có kết quả.
- Backend giữ nguyên API và thực hiện phân trang trong Prisma. DTO hiện có `@Min(10) @Max(100)` cho `gioiHan`; service kiểm tra Permission xem danh sách và lọc Scope trước truy vấn, không cần thay đổi backend.
- Kiểm tra: Frontend `tests/member-profiles-pagination.test.tsx` đạt 4/4 (10/20/50/100, chuyển trang/reset khi đổi tại trang cuối, giữ từ khóa, 0 và dưới 10 kết quả); Frontend typecheck đạt; Backend `member-profiles.service.spec.ts` đạt 22/22, gồm truy vấn Scope; `git diff --check` đạt.

## Hỗ trợ công thức cache trong bộ đọc Excel dùng chung — 2026-11-07

- `DataTransferService.readCell` đọc giá trị công thức cache theo kiểu scalar gốc, không tính công thức; trả metadata nguồn và lỗi cho cache thiếu/lỗi, hyperlink, tham chiếu workbook ngoài, hàm truy cập/liên kết dữ liệu ngoài, và công thức dùng named range trỏ ngoài. Cơ chế dùng chung, không gắn với tên cột/feature.
- Luồng Đảng viên dùng bộ đọc cho sheet hồ sơ và Địa chỉ; cache hợp lệ đi qua chuẩn hóa/validation/trùng/Permission + Scope như giá trị thường. CCCD nhận dạng chuỗi để giữ số 0; số cache không được tự thêm số 0 đã mất.
- XML workbook được đọc bằng JSZip trong bộ đọc chung để phân biệt ô formula có `<v></v>` kiểu chuỗi rỗng với ô formula hoàn toàn thiếu cache; giá trị rỗng có cache được đưa qua validation như chuỗi rỗng. JSZip đã được khai báo trực tiếp vì đây là chi tiết cần để bảo toàn thông tin cache mà ExcelJS bỏ qua.
- Bổ sung test nhiều kiểu, cùng sheet/khác sheet, thiếu/lỗi cache, external reference/hyperlink, trường cohort và 100 dòng công thức. Cập nhật `docs/architecture.md` để quy định mọi cột nhập dùng khả năng đọc cache chung.
- Kiểm tra cuối sau phần đọc XML: `npm.cmd run test -- test/data-transfer.service.spec.ts test/member-profile-import-template.service.spec.ts` đạt 20/20; `npm.cmd run typecheck` và `git diff --check` đạt. Không đổi schema/migration.

## Khắc phục HTTP 500 hàng đợi cập nhật — 2026-11-05

- Đọc PostgreSQL phát triển `quan_ly_dang_vien_dev`: hiện có 1 đợt cập nhật và 2 yêu cầu (1 `CHO_DUYET`, 1 `DA_DUYET`). Màn hình hiện trả lỗi khi tải API hàng đợi; các thẻ thống kê trước đây lấy mặc định 0 khi `query.data` chưa có, nên con số 0 trên ảnh không phản ánh dữ liệu thật.
- Trang hàng đợi nay hiện nội dung lỗi API đã chuẩn hóa, mã HTTP/mã lỗi/mã tra cứu nếu Backend trả về, gợi ý quyền/phạm vi khi là 403, và nút thử tải lại. Thẻ thống kê hiển thị dấu gạch khi API lỗi hoặc đang tải, không đánh lừa bằng số 0.
- Đã tái hiện qua phiên Edge đang đăng nhập vai trò Chánh văn phòng Đảng ủy và bắt được ngoại lệ bằng mã tra cứu mới `5ebfba6f-0ea6-41bd-99e8-f9beebcef00d`: `PrismaClientValidationError` tại `findMany`, do `take` nhận chuỗi `"25"` thay vì số nguyên. Không liên quan tới Permission, Scope, dữ liệu hay migration.
- Sửa dịch vụ hàng đợi để chuyển `trang`/`gioiHan` sang số nguyên, kiểm tra hợp lệ và giới hạn `gioiHan` 1–100 trước khi gọi Prisma. Giữ nguyên quyền/phạm vi. Thêm hồi quy cho query string và kiểm tra tài khoản thiếu cả hai quyền vẫn bị từ chối trước truy vấn.
- Sau khi Backend nạp lại, endpoint `GET /api/v1/ho-so-dang-vien/yeu-cau-cap-nhat` trả HTTP 200 cho truy vấn có bộ lọc tìm kiếm (mã tra cứu `80497ec5-0e8b-4505-ad4c-cdb8a22a2217`). Tab hàng đợi hiển thị dữ liệu PostgreSQL: tổng 2 yêu cầu (1 chờ xử lý, 1 đã duyệt), bảng có đúng dòng chờ duyệt; tìm kiếm tên trả 1 dòng, bỏ lọc khôi phục thống kê/danh sách. Kiểm tra bằng phiên UI hợp lệ, không tạo/sửa dữ liệu.
- Kiểm tra đã chạy: `backend npm.cmd run test -- test/member-profile-updates.service.spec.ts test/member-profiles.controller.spec.ts` đạt 8/8; `backend npm.cmd run typecheck` đạt; `git diff --check` đạt. Không đổi schema/migration. Chưa kiểm tra bằng tài khoản ngoài phạm vi trực tiếp qua HTTP; bài test dịch vụ xác nhận tài khoản thiếu quyền không thể truy vấn hàng đợi.
## Rà soát khoảng trắng, cột CCCD và Khóa Đảng viên — 2026-11-05

- Nguyên nhân các thẻ bị cao/giãn không đều: primitive `Card` mặc định có `gap-6 py-6`; một số thẻ chỉ chứa `CardContent` nhưng `CardContent` lại tự có padding, làm padding dọc bị cộng hai lần. Giữ nguyên mặc định của primitive để không ảnh hưởng các thẻ có `CardHeader`/`CardFooter`; thêm `gap-0 py-0` tại các wrapper chỉ dùng `CardContent` bị lặp đệm. Áp dụng trên trang danh sách/chi tiết hồ sơ, Hồ sơ của tôi, cập nhật hồ sơ, hàng đợi, biểu mẫu tài khoản, thông báo cây tổ chức và `StatisticCard` (vốn đã có cách sửa đúng). Không sửa padding bảng rỗng/tải có chủ đích.
- Danh sách hồ sơ trả CCCD kiểu chuỗi và hỗ trợ tìm kiếm theo CCCD khi có quyền xem thông tin cá nhân. Nếu không có quyền, truy vấn không chọn CCCD; kết quả trả `null` cùng cờ quyền để giao diện hiển thị “Không có quyền xem”. Bộ lọc CCCD cũng giao với phạm vi đơn vị được phép.
- Thêm `HoSoDangVien.khoaDangVien` kiểu chuỗi nullable (tối đa 50 ký tự) và migration mới `20261105010000_member_profile_party_cohort`; không sửa/xóa dữ liệu cũ và không suy ra từ khóa sinh viên. Đồng bộ nhập/sửa hồ sơ thủ công, trang chi tiết, Hồ sơ của tôi, danh sách trường mở đợt cập nhật và bước Chi bộ phê duyệt; audit ghi lại thay đổi. Trường sẵn sàng để ánh xạ khi triển khai nhập Excel, chưa xây tính năng Excel trong phạm vi này.
- Kiểm tra: `backend npm.cmd run typecheck`, `backend npm.cmd run prisma:validate`, Backend tests hồ sơ và quy trình cập nhật (23/23), Frontend typecheck, Frontend tests validation/hồ sơ của tôi/chi tiết/đợt cập nhật (26/26), `git diff --check` đạt. `docker compose up` không thể mở thêm PostgreSQL vì container phát triển hiện hữu đã chiếm cổng 55432. Sau đó xác nhận CSDL `quan_ly_dang_vien_dev` đang hoạt động, áp dụng `npm.cmd run prisma:migrate:deploy` thành công và `npm.cmd run prisma:migrate:status` xác nhận schema cập nhật, đủ 14 migration. Đã bổ sung quy định vào `AGENTS.md`: migration mới phải được áp dụng vào PostgreSQL phát triển và xác minh trạng thái; không tự áp dụng vào production. Chưa kiểm tra ghi/duyệt trên PostgreSQL thật hoặc kiểm tra trực quan trình duyệt ở sáng/tối và màn hình nhỏ.
# Bàn giao giữa phiên AI

## Giới hạn truy cập Nhật ký hệ thống — 2026-11-07

- Nhật ký hệ thống và các API lịch sử audit tài khoản/phân công nay yêu cầu Assignment đang được chọn trong phiên có Role code `QUAN_TRI_VIEN_TOAN_HE_THONG`, Role hệ thống/tài khoản hoạt động, thời hạn còn hiệu lực, chưa thu hồi và Scope `TOAN_HE_THONG`. Backend tiếp tục kiểm tra Permission xem/xóa tương ứng và Scope hiện hành; không tin Scope/Role do request hoặc frontend gửi.
- Sidebar chỉ hiện mục nhật ký khi Assignment phiên thỏa mãn điều kiện và có Permission xem nhật ký. Trang chặn URL trực tiếp cho vai trò không hợp lệ, xóa query cache và trạng thái lựa chọn; AuthProvider vốn xóa các query phi xác thực khi đổi Assignment. Các nút xem lịch sử tài khoản/phân công cũng ẩn với người không phải quản trị viên toàn hệ thống.
- Kiểm kê chỉ đọc PostgreSQL phát triển: Role `QUAN_TRI_KHOI_TAO_24H` đang có hai Permission xem nhật ký và 1 Assignment cũ nhưng không còn hiệu lực; Role `QUAN_TRI_VIEN_TOAN_HE_THONG` có hai Permission này và 1 Assignment hiện còn hiệu lực. Không tìm thấy Role thông thường nào đang được gán hai Permission xem; không thay đổi Permission/Role/Assignment hoặc lịch sử.
- Kiểm tra Backend `npm.cmd run typecheck`; tests `authorization.service.spec.ts` + `system-logs.service.spec.ts` đạt 32/32. Frontend `npm.cmd run typecheck`; `tests/system-logs.test.tsx` + `tests/system-log-access.test.ts` đạt 13/13, gồm URL trực tiếp, vai trò/Scope sai và xóa cache khi đổi Role. `git diff --check` đạt. Không đổi schema/migration. Chưa thử HTTP trực tiếp qua phiên đăng nhập thật; API denial được xác minh ở service/policy test.
- Sau phản hồi giao diện ngày 2026-11-07: bảng nhật ký hiển thị khu vực chọn bản ghi và nút `Xóa nhật ký` ở ngay phía trên bảng cho Quản trị viên toàn hệ thống. Nếu thiếu `NHAT_KY_XOA`, nút và checkbox hiển thị nhưng bị khóa kèm lý do; không tự cấp quyền và không kích hoạt xóa vật lý. Frontend typecheck, tests 13/13 và `git diff --check` chạy lại đạt.
- Quyết định tiếp theo ngày 2026-11-07: cho phép phiên Quản trị viên toàn hệ thống có Assignment `TOAN_HE_THONG` hợp lệ và `VAI_TRO_GAN_QUYEN` sửa ma trận Permission của Role hệ thống. Backend kiểm tra Assignment phiên và tiếp tục kiểm tra Permission + Scope trên toàn bộ Assignment liên quan. Chỉ mở sửa ma trận; sửa tên/trạng thái, xóa Role và Assignment Role hệ thống vẫn khóa. Không cho gỡ `QUYEN_XEM_DANH_MUC`, `VAI_TRO_XEM`, `VAI_TRO_GAN_QUYEN` khỏi Role quản trị viên để tránh mất đường quản trị. `NHAT_KY_XOA` được thêm vào danh sách Permission quản trị thủ công, không tự cấp trong bootstrap/sync. Backend và Frontend typecheck đạt; không chạy tests, không đổi schema/migration.

## Điều tra lỗi không tải được Nhật ký hệ thống — 2026-11-07

 - Lỗi ban đầu là dependency `PhanQuyenService` chưa được inject tường minh trong `NhatKyHeThongService.context`; đã thêm token inject tường minh cho Prisma và Permission. Lỗi kế tiếp được tái hiện chính xác: query string `kichThuoc=20` đi vào `findMany.take` dưới dạng chuỗi. Vì `count()` và `findMany()` nằm trong `$transaction`, Prisma gắn lỗi vào lời gọi `count()` dù đối số không hợp lệ là `take` của thao tác tiếp theo. Thử `take: "20"` cho đúng `Expected Int, provided String`; cùng truy vấn với `take: 20` chạy được trên PostgreSQL phát triển.
 - Service nay tự chuyển và kiểm tra `trang`, `kichThuoc` trước khi gọi Prisma (số nguyên dương, kích thước tối đa 100), không phụ thuộc riêng vào ValidationPipe. Bộ lọc lỗi ghi tên đối số và kiểu mong đợi/nhận được, không ghi giá trị truy vấn.
 - Thống kê nay dùng một `groupBy(ketQua)` để tổng, thành công, thất bại và kết quả khác cùng được tính trên một tập dữ liệu. UI đổi thẻ “Sự kiện bảo mật” thành “Kết quả khác” và mô tả các nhóm; dữ liệu PostgreSQL dev hiện có 283 thao tác: 273 `THANH_CONG`, 0 `THAT_BAI`, 10 `TU_CHOI`. Nhật ký bảo mật được thống kê ở tab riêng.
 - Xác nhận API thật trong Edge đang đăng nhập sau khi Backend khởi động lại: `GET /api/v1/nhat-ky-he-thong/thao-tac?trang=1&kichThuoc=20` trả HTTP 200, tổng 283, trang đầu 20 dòng. Permission/Scope giữ nguyên.
 - Kiểm tra: Backend và Frontend typecheck đạt; Backend system-logs + HTTP exception filter 21/21; Frontend system-logs 5/5. Không đổi schema/migration.

## Đề xuất kiểm soát xóa Nhật ký hệ thống — 2026-11-07

- Rà soát quy định và hiện trạng: chưa tìm thấy chính sách lưu trữ nhật ký PTIT được phê duyệt trong repo; bảng `nhat_ky_kiem_toan` đang được bảo vệ bởi trigger append-only chặn UPDATE/DELETE. Vì vậy không xác định thời hạn tùy ý, không bỏ trigger, không tạo API xóa vật lý và không thay đổi schema/migration.
- Thêm Permission `NHAT_KY_XOA` độc lập, trạng thái catalog `DA_CO_API` cho API xem trước; API xóa vật lý chưa có. Không tự gán cho Role nào. Endpoint `POST /api/v1/nhat-ky-he-thong/{thao-tac|bao-mat}/xoa/xem-truoc` kiểm tra quyền xóa, quyền xem loại nhật ký và Scope; chỉ trả số ID/khoảng ngày khớp, điều kiện xóa là chưa xác định, `coTheXoa=false`.
- UI bổ sung checkbox chọn dòng, lựa chọn xem trước theo ID/khoảng ngày, lý do, AlertDialog có cảnh báo không thể khôi phục và nút xóa bị vô hiệu hóa. Không ghi audit xóa vì chưa có thao tác xóa; khi thiết kế xóa thực tế cần cơ chế audit tách khỏi dữ liệu bị dọn.
- Kiểm tra: Backend typecheck đạt; Backend system-logs 12/12; Frontend typecheck đạt; Frontend system-logs 5/5. Đồng bộ metadata 77 Permission vào đúng PostgreSQL phát triển `quan_ly_dang_vien_dev`; script chỉ upsert `quyen`, không sửa Role/Assignment. Chưa kiểm thử SQL/HTTP preview qua DB hoặc xóa thật; chưa có dữ liệu audit được phép xóa. Không có migration.
- Bước cần phê duyệt nghiệp vụ trước khi bật xóa: ban hành chính sách phân loại và thời hạn theo loại log, xác định legal hold/điều tra và ngoại lệ bảo toàn, cách audit/đối soát độc lập, quy trình chống lặp và khôi phục. Cập nhật đồng bộ permission chỉ ghi danh mục Permission, tuyệt đối không thêm Role/Assignment.

## Sửa HTTP 500 khi kiểm tra Excel thiếu mã hồ sơ — 2026-11-06

- Nguyên nhân: khi dòng Excel thiếu Mã hồ sơ nội bộ, DTO lỗi vẫn được giữ để trả lỗi theo dòng; bước dò trùng sau đó gọi `hoSoDangVien.findUnique` với selector `maHoSoNoiBo: undefined`, khiến Prisma Client 7 ném `PrismaClientValidationError` và endpoint kiểm tra trả HTTP 500.
- Chỉ chạy truy vấn dò trùng mã hồ sơ khi giá trị đã có; dòng thiếu mã nay tiếp tục trả lỗi nghiệp vụ “Mã hồ sơ nội bộ là trường bắt buộc.”, không tạo phiên nhập và không gọi Prisma bằng selector thiếu.
- Thêm hồi quy vào `backend/test/member-profile-import-template.service.spec.ts`.
- Kiểm tra: `npm.cmd run test -- test/member-profile-import-template.service.spec.ts` đạt 15/15; `npm.cmd run typecheck` và `git diff --check` đạt. Không đổi schema/migration. Backend đang chạy cần nạp lại mã mới trước khi người dùng thử lại.

## Hoàn thiện xuất dữ liệu Đảng viên — 2026-11-06

- Dialog xuất dữ liệu có bốn cách chọn danh sách: hồ sơ đã chọn, toàn bộ kết quả lọc (không giới hạn trang), theo đơn vị tổ chức và toàn bộ phạm vi được giao. Bổ sung chọn Đảng ủy/Chi bộ/Tổ, tìm theo tên hoặc mã, nhóm trường có thể mở rộng, chọn/bỏ chọn toàn bộ và bộ đếm trường. Dialog giữ tiêu đề/chân cố định, cuộn nội dung và chặn đóng khi đang tạo tệp.
- Tạo danh mục xuất từ các trường hiện có trong Prisma; cấu hình chỉ trả các trường được phân công quyền tương ứng và đơn vị nằm trong phạm vi quyền xuất. Backend không dùng quyền xem danh sách để truy vấn export; tự giao phạm vi hồ sơ hiện hành, lọc hồ sơ theo đơn vị, tái kiểm tra Permission + Scope xuất và quyền của từng nhóm trường trên từng hồ sơ. Trường bị hạn chế trên một số hồ sơ được để trống ở những dòng đó. Các trường lựa chọn quyết định chính xác cột/thứ tự cột. Địa chỉ được trải thành ba cột, tránh nhân bản dòng; mã/CCCD dạng văn bản, ngày `dd/mm/yyyy`, nhãn enum tiếng Việt, trung hòa chuỗi có thể thành công thức; ghi audit có số dòng, chế độ và trường đã xuất.
- Thêm bộ chọn nhóm trường dùng chung tại `frontend/src/shared/components/data-transfer/ExportFieldSelector.tsx`; mapping và nghiệp vụ vẫn thuộc feature Hồ sơ Đảng viên. Không đổi Prisma schema/API nền, không đổi luồng nhập.
- Kiểm tra trong lượt này: Backend typecheck đạt; Backend `member-profiles.service.spec.ts` đạt 22/22, gồm cột và thứ tự đã chọn, một hồ sơ duy nhất với địa chỉ trải cột, giữ số 0 CCCD, chống công thức Excel, trường không hợp lệ và đơn vị ngoài phạm vi; Frontend typecheck đạt; `member-profiles-import-export.test.tsx` đạt 2/2; `git diff --check` đạt. Chưa có kiểm thử tích hợp cho toàn bộ bốn chế độ, nhiều phạm vi phân quyền/tài khoản và phân trang dữ liệu thật; chưa kiểm tra HTTP/PostgreSQL/trình duyệt. Không chạy migration.

## Module Nhập/Xuất Excel cho Hồ sơ Đảng viên — 2026-11-06

- Thêm `exceljs` cho Backend; tạo `data-transfer` module dùng chung với đọc/ghi `.xlsx`. API Hồ sơ: `GET /nhap-xuat/mau`, `POST /nhap-xuat/kiem-tra`, `POST /nhap-xuat/xac-nhan`, `POST /nhap-xuat/xuat`.
- Mẫu có sheet danh sách (phiên bản 1.0), Địa chỉ liên kết bằng mã hồ sơ, hướng dẫn và danh mục Chi bộ/Tổ theo phạm vi tạo hồ sơ. Nhập tối đa 5 MB/200 dòng; kiểm tra header, lỗi DTO, trạng thái, mã đơn vị, quyền tạo hồ sơ/tài khoản, trùng mã hồ sơ/CCCD/tên đăng nhập/email đăng nhập/mã sinh viên/số thẻ/số phiếu; từ chối công thức và hyperlink ở sheet danh sách/địa chỉ. CCCD/mã định danh được giữ dạng chuỗi theo định dạng ô mẫu. Phiên preview gắn tài khoản, TTL 10 phút, one-time khi xác nhận; xác nhận dùng transaction duy nhất và tái sử dụng mapping tạo hồ sơ, lịch sử sinh hoạt, quá trình vào Đảng, tài khoản liên kết và audit. Mật khẩu ngẫu nhiên riêng chỉ trả về một lần sau khi tạo.
- Xuất sử dụng `HO_SO_XUAT_DU_LIEU`, bộ lọc trang hồ sơ hiện tại, phân trang toàn bộ, và chỉ ghi CCCD/ngày sinh nếu API danh sách xác nhận quyền trường cá nhân. Ghi audit lượt xuất.
- Frontend thêm nút Nhập/Xuất ở trang hồ sơ, Sheet 4 bước, xem trước/lọc/tìm, chọn nhiều dòng để xuất, tải báo cáo lỗi Excel và màn hình bàn giao mật khẩu một lần. Không thêm Sidebar.
- Preview hiện lưu trong Map bộ nhớ tiến trình, tối đa 100 phiên hoạt động; phù hợp một instance. Cần kho chia sẻ có TTL trước khi triển khai nhiều Backend instance. Giao diện chưa có xem chi tiết mở rộng cho từng dòng. Kiểm tra hyperlink/công thức hiện áp dụng cho sheet danh sách, cần rà soát bổ sung ở sheet địa chỉ. Không có quá trình Đảng ngoài sự kiện vào Đảng dự bị vì service tạo hồ sơ hiện tại chưa có quy tắc/API tạo các sự kiện khác.
- Kiểm tra ở lượt này: Backend và Frontend typecheck đạt; targeted ESLint cho các tệp frontend liên quan đạt; unit test DataTransfer 2/2 và Backend hồ sơ/controller 20/20 đạt (tổng 22/22); `git diff --check` đạt. Full frontend lint không đạt do 5.480 lỗi/190 cảnh báo trên toàn repository, tập trung ở `frontend/public/tinymce` và component/test ngoài phạm vi; lint trực tiếp các tệp thay đổi sạch. Chưa kiểm thử HTTP/PostgreSQL thực hoặc luồng import đầu-cuối. Không thay đổi schema/migration. `npm install exceljs` báo 4 cảnh báo audit phụ thuộc (1 low, 3 moderate); chưa chạy `npm audit fix`.

Cập nhật lần cuối: 2026-11-06

## Chuẩn hóa Scope danh mục năm học và mã đơn vị gốc — 2026-11-06

- Bỏ hàm dùng chung `kiemTraPhamViToanHeThong()` vốn coi `CAY_DON_VI` tại mã `PTIT_DANG_UY` tương đương `TOAN_HE_THONG`. Bộ kiểm tra Scope Permission chung vẫn giữ nguyên.
- Quản lý năm học kiểm tra Permission trên đúng Assignment đang chọn trong phiên, còn hiệu lực/chưa thu hồi, Role hoạt động. Xem danh mục cần `NAM_HOC_XEM` trên Assignment hiện hành; tạo/sửa/xóa cần Permission tương ứng và Scope `TOAN_HE_THONG`. Không dùng năm học để mở rộng quyền truy cập hồ sơ.
- Gỡ phụ thuộc mã gốc cố định trong `ToChucService`, script khởi tạo, UI cây tổ chức và năm học. Đảng ủy gốc được xác định theo loại/cấu trúc; mã nghiệp vụ do người khởi tạo đặt. Assignment/Scope tiếp tục tham chiếu UUID và quan hệ thực tế. Giữ nguyên migration cũ; migration mới `20261106000000_remove_fixed_root_unit_code` chỉ bỏ CHECK mã cố định, không cập nhật dữ liệu hoặc khóa ngoại.
- Assignment detail/editor hiển thị Role, danh sách Permission, Scope và đơn vị áp dụng; trang năm học chỉ hiển thị nút ghi khi Assignment hiện hành có Scope `TOAN_HE_THONG` cùng Permission cần thiết.
- Đã áp dụng migration vào PostgreSQL phát triển `quan_ly_dang_vien_dev` tại `127.0.0.1:55432`; `prisma migrate status` xác nhận 16 migration và schema cập nhật. Không cấp thêm Assignment/Role/Permission, không thay đổi UUID hay dữ liệu tổ chức.
- Kiểm tra đạt: Prisma validate, Backend typecheck, Frontend typecheck; Backend auth/admin/tổ chức/năm học 29/29 (bao gồm chuyển Assignment hiện hành và đổi mã gốc không thay UUID); Frontend năm học 3/3; HTTP integration năm học 1/1 qua Assignment hiện hành thật. `git diff --check` đạt. Không kiểm tra trình duyệt trực quan.

## Sửa nhận diện Scope năm học và đồng bộ khuôn trang — 2026-11-05

- Đối chiếu PostgreSQL phát triển theo phiên hiện hành: tài khoản `NguyenNgocDuy`, Assignment đang kích hoạt `CHANH_VAN_PHONG_DANG_UY`, vai trò đang hoạt động; Permission `NAM_HOC_XEM` nằm trên chính Assignment này; hiệu lực bắt đầu 2026-11-02, không có ngày kết thúc/thu hồi; Scope `CAY_DON_VI` tại `PTIT_DANG_UY`. `GET /phien-hien-tai` chỉ trả quyền từ Assignment đang kích hoạt. Nguyên nhân 403 là logic năm học gọi kiểm tra Scope với đích rỗng, khiến mọi Scope `CAY_DON_VI` đều bị từ chối.
- Sửa `PhanQuyenService.kiemTraPhamViToanHeThong`: chấp nhận `TOAN_HE_THONG` hoặc `CAY_DON_VI` với gốc chính xác `PTIT_DANG_UY`; Permission phải nằm trên cùng Assignment và truy vấn vẫn lọc thời hạn, thu hồi, vai trò hoạt động, Assignment đang kích hoạt trong phiên. Không gộp quyền giữa Assignment và không thay đổi dữ liệu phân quyền.
- Sửa trang năm học bị bọc `PageContainer` lặp trong `AdminLayout`; bỏ bộ max-width/padding lồng, theo `space-y-5`, lưới thống kê, Card lọc và Card bảng riêng như trang đợt cập nhật. Bổ sung nhãn rõ cho bộ lọc, căn pagination theo khuôn tham chiếu. Thêm quy tắc dùng PageContainer/layout chung vào `AGENTS.md`.
- HTTP integration test thực hiện `GET /api/v1/nam-hoc` qua Nest/Supertest, dùng phiên/Assignment thực tế đọc từ PostgreSQL và Permission/Scope service thật; nhận HTTP 200 cùng danh sách, phân trang và thống kê. Test thay thế authentication guard để gắn actor phiên hiện hành vào request; không dùng token trình duyệt và không ghi dữ liệu. Unit test xác nhận Permission phải ở Assignment hiện hành và Scope sai bị từ chối. Frontend typecheck và test trang năm học/validation đạt 9/9; Backend typecheck và service năm học/authorization đạt 9/9.
- Không thể xác minh trực quan qua Microsoft Edge trong lượt này vì công cụ Computer Use báo không được duyệt sử dụng Edge; chưa kết luận kiểm tra trực quan sáng/tối hoặc kích thước nhỏ. Không phát sinh ghi dữ liệu trong CSDL.

## Quản lý năm học và nền chuẩn hóa hồ sơ — 2026-11-05

- Bổ sung `NamHoc` dùng chung toàn hệ thống, không gắn `namHocId` vào hồ sơ. Migration `20261105020000_school_year_management` tạo danh mục với mã duy nhất, ngày hợp lệ, trạng thái quản lý riêng và PostgreSQL exclusion constraint chống mọi khoảng ngày chồng lấn (kể cả ghi đồng thời). CRUD ghi nhật ký kiểm toán trong cùng transaction; API kiểm tra Permission + Scope toàn hệ thống.
- Thêm các API `GET/POST /api/v1/nam-hoc`, `GET/PATCH/DELETE /api/v1/nam-hoc/:id`; `GET` trả danh sách phân trang, lọc, cùng thống kê đang diễn ra/sắp diễn ra/đã kết thúc từ ngày hiện tại. Đã đồng bộ 4 Permission `NAM_HOC_XEM/TAO/SUA/XOA` vào danh mục PostgreSQL phát triển; không tự gán quyền vào vai trò.
- Thêm trang `/nam-hoc` với 4 thẻ lọc, bộ lọc tìm kiếm/trạng thái/khoảng ngày, bảng 7 cột, định dạng ngày Việt Nam, phân trang, hành động Dropdown, Sheet tạo/sửa, Dialog chi tiết, AlertDialog xóa; có loading/error/empty và thao tác được ẩn theo Permission hiện hành.
- Hồ sơ thủ công tiếp tục dùng chung `TaoHoSoDto`/`SuaHoSoDto`, `HoSoDangVienService`, kiểm tra trùng bằng unique constraints, liên kết tổ chức theo ngày hiệu lực và nhật ký trong transaction. Giữ khóa Đảng viên độc lập khóa sinh viên; không thêm bảng biến động/năm học vào hồ sơ. Excel và thống kê báo cáo chưa triển khai. Chưa có mục menu Thống kê và báo cáo trong giao diện hiện tại.
- Đã xác nhận database đích `quan_ly_dang_vien_dev` tại `127.0.0.1:55432`; deploy migration thành công, `prisma migrate status` xác nhận 15 migration đã áp dụng và schema cập nhật. Đồng bộ metadata 76 Permission thành công. Không tạo dữ liệu năm học thử, không thay đổi dữ liệu hồ sơ hiện có.
- Kiểm tra đạt: Prisma validate, Backend typecheck, service năm học 3/3, hồ sơ Backend 18/18, Frontend typecheck, trang năm học 2/2, validation hồ sơ 7/7, `git diff --check`. Chưa kiểm tra trực quan bằng trình duyệt hoặc xác nhận thao tác CRUD với một phiên người dùng đã được cấp Permission/Scope toàn hệ thống.

## Lưu nháp và kích hoạt ngay khi tạo đợt — 2026-11-05

- Biểu mẫu tạo đợt hiện có thêm “Lưu bản nháp” và “Lưu và kích hoạt”, mỗi thao tác có hộp xác nhận riêng; đặt lại biểu mẫu cũng cần xác nhận. Thanh thao tác co thành lưới trên màn hình nhỏ. Lỗi Backend giữ nguyên dữ liệu đã nhập; nút kích hoạt bị khóa nếu thời gian kết thúc đã qua.
- Thêm API `POST /ho-so-dang-vien/dot-cap-nhat/tao-va-kich-hoat`. Backend kiểm tra quyền/phạm vi, thời hạn, trường được mở và đợt chồng lấn; tạo trạng thái đã kích hoạt trong một giao dịch Serializable có khóa chống đua với thao tác gửi yêu cầu. Nếu kiểm tra hoặc ghi thất bại thì không lưu bản nháp dở dang. Lưu nháp vẫn dùng API hiện hữu. Không đổi schema hoặc migration.
- Kiểm tra: Backend và Frontend typecheck đạt; test Backend `member-profile-updates.service.spec.ts` 5/5; test giao diện `member-profile-updates.test.tsx` 11/11; `git diff --check` đạt. Chưa thử API trên PostgreSQL thật hoặc kiểm tra trực quan trên trình duyệt.

## Phân trang hàng đợi yêu cầu cập nhật — 2026-11-05

- API hàng đợi chuyển sang nhận bộ lọc và phân trang Backend (mặc định 25, giới hạn mỗi trang 100), trả danh sách trang hiện tại, tổng số, tổng hợp trạng thái bằng truy vấn PostgreSQL và danh sách Chi bộ/đợt trong phạm vi được cấp. Tìm theo họ tên/mã hồ sơ, lọc trạng thái/Chi bộ/đợt/ngày gửi đều áp dụng trước khi phân trang; không lấy đủ 1.000 yêu cầu về Frontend.
- Giao diện dùng trang 25 dòng mặc định, chọn 10/25/50, tổng số và số trang từ API; tìm kiếm có trễ 300ms; các bộ lọc và thẻ thống kê dùng số liệu Backend. Sửa lỗi trang bị đặt lại trong lúc truy vấn trang mới.
- Không đổi schema hoặc migration. Kiểm tra Backend/Frontend typecheck; test Backend phân trang/thống kê 3/3; test giao diện hàng đợi 9/9, gồm 1.000 yêu cầu, chuyển trang và tìm kiếm phía máy chủ. Chưa chạy tích hợp ghi dữ liệu vào PostgreSQL thật hoặc kiểm tra trực quan trên trình duyệt.

# Tái cấu trúc frontend theo feature — 2026-11-06

- Tách các trang/hợp đồng API trước đây gom trong `features/accounts/` sang `accounts/`, `member-profiles/`, `my-profile/`, `profile-updates/` và `authorization/`; router giữ nguyên URL. Tách kiểu miền khỏi adapter API, đưa mapper/biến đổi biểu mẫu/định dạng phân công sang service và tách biểu mẫu hồ sơ Đảng viên sang component riêng. Avatar presentation dùng chung đặt tại `shared/components/`.
- Cập nhật quy tắc feature-based trong `AGENTS.md`, `docs/architecture.md`, `docs/AI_CONTEXT.md`, `BASE_SOURCE_GUIDE.md`; quy hoạch Sidebar chính thức tại `docs/sidebar-module-conventions.md` tiếp tục là nơi tra cứu nhóm nghiệp vụ và cách hiển thị menu. Backend/schema không đổi.
- Kiểm tra Frontend `npm.cmd run typecheck` và `npm.cmd run build` đạt; lint các thư mục/tệp liên quan đạt 0 lỗi, còn 4 cảnh báo hiện hữu. Lint toàn dự án chưa đạt do các lỗi lint nhiều trong tài sản TinyMCE vendored và tệp khác ngoài phạm vi. 5 test feature liên quan đạt 30/30; toàn bộ test đạt 43/44, test `rich-text-editor.test.tsx` có lỗi readonly trong mock TinyMCE, không liên quan các tệp thay đổi. `git diff --check` đạt. Chưa chạy E2E hoặc kiểm tra trực quan trên trình duyệt.

## Hoàn thiện nghiệp vụ quản lý đợt cập nhật hồ sơ — 2026-11-05

- Bổ sung trạng thái quản lý riêng cho đợt (Bản nháp/Đã kích hoạt/Kết thúc sớm), mô tả, người và thời điểm kích hoạt/kết thúc sớm; migration mới giữ các đợt hiện hữu ở trạng thái đã kích hoạt. Không sửa migration cũ, không chạy migration trên PostgreSQL.
- Backend bổ sung lưu bản nháp, chỉnh sửa theo trạng thái và yêu cầu đã phát sinh, kích hoạt có kiểm tra thời hạn/phạm vi/đợt chồng lấn, kết thúc sớm nhưng giữ nguyên hàng đợi, xóa có điều kiện và ghi nhật ký. Khóa giao dịch dùng chung với gửi yêu cầu để tránh gửi mới sau khi đợt đã kết thúc. Thống kê dùng `groupBy` trên PostgreSQL, chỉ tính yêu cầu đã gửi và loại yêu cầu đã hủy; kiểm tra phạm vi cho cả quyền xem danh sách hoặc quyền phê duyệt, tương thích với trang hàng đợi.
- Giao diện dùng lại biểu mẫu tạo để sửa, phân biệt Bản nháp/Sắp diễn ra/Đang mở/Đã kết thúc, thêm xác nhận trước khi kích hoạt/kết thúc/xóa, chi tiết kèm thống kê theo API và nút chuyển sang hàng đợi đã lọc theo đợt/trạng thái. Bổ sung kiểm thử chuyển trạng thái giao diện, điều hướng từ thống kê và tổng hợp số liệu Backend.
- Kiểm tra: Backend `npm.cmd run typecheck`, `npm.cmd run prisma:validate`, `npm.cmd test -- test/member-profile-updates.service.spec.ts --reporter=dot` (2/2); Frontend `npm.cmd run typecheck`, `npm.cmd test -- tests/member-profile-updates.test.tsx --reporter=dot` (8/8); `git diff --check` trên các tệp của công việc đạt.
- Đã áp dụng migration `20261105000000_profile_update_campaign_management` vào CSDL phát triển `quan_ly_dang_vien_dev`; `prisma migrate status` xác nhận 13 migration đều đã áp dụng. Không sửa migration cũ, không xóa dữ liệu. Chưa chạy kiểm thử nghiệp vụ ghi dữ liệu thật hoặc kiểm tra trực quan trên trình duyệt. Hàng đợi nay phân trang từ Backend; thống kê theo đợt tính trực tiếp từ cơ sở dữ liệu.

## Tối ưu trang Hồ sơ của tôi — 2026-11-04

- Thêm Alert ngay dưới tiêu đề để đọc đợt cập nhật và yêu cầu mới nhất từ API; không dùng dữ liệu mẫu. Đưa chỉnh sửa vào chính hàng thông tin cá nhân/địa chỉ, giữ giá trị chính thức cạnh giá trị đề nghị, có trạng thái “Chưa gửi”/“Chờ phê duyệt”, hộp thoại xác nhận và số trường thay đổi. Yêu cầu chờ được tải lại từ Backend và khóa gửi/chỉnh sửa trùng. Bỏ thẻ cập nhật lặp; đường dẫn cập nhật riêng cũ chuyển về trang hồ sơ.
- Đồng bộ khung trang với `PageContainer` và trang Chi tiết hồ sơ: bỏ padding lặp, giữ nhịp dọc dùng chung, chuyển thẻ nhận diện thành dải ngang, giữ tiến độ và thẻ thông tin trong bố cục hai cột. Tab đổi sang lưới 2/3/5 cột theo kích thước màn hình để không xuất hiện thanh cuộn/tab ẩn.
- Bỏ thẻ tóm tắt số trường ở cuối trang. Nút “Lưu thay đổi” mở hộp thoại cuối liệt kê số lượng/tên trường và nhắc rằng hồ sơ chính thức chỉ đổi sau khi duyệt; chỉ thao tác “Xác nhận gửi” mới gửi yêu cầu.
- Không đổi schema/API. Danh sách Backend hiện chỉ hỗ trợ tên, thông tin cá nhân và ba loại địa chỉ; vì vậy sinh viên, quá trình Đảng, quá trình sinh hoạt, chức vụ và trường nghiệp vụ không nằm trong danh sách đợt vẫn chỉ đọc. Ảnh đại diện chưa được chuyển sang chỉnh tại hàng.
- Kiểm tra Frontend `npm.cmd run typecheck` đạt; `npm.cmd test -- tests/my-member-profile.test.tsx --reporter=dot` đạt 4/4; `git diff --check` đạt cho tệp đã sửa. Chưa kiểm tra trực quan hoặc gửi/duyệt yêu cầu với PostgreSQL thật.

## Sửa lỗi gửi đề nghị và vị trí thông báo — 2026-11-04

- Khi không gửi ảnh, chuyển dữ liệu đề nghị từ `FormData` sang JSON để Axios không diễn giải chuỗi `thayDoi` thành các mục có khóa số (`0`, `1`, ...), nguyên nhân Backend báo “Trường 0 không được mở”. Nếu có ảnh thì vẫn dùng `FormData` và để Axios tự đặt kiểu nội dung multipart.
- Đưa cảnh báo lỗi gửi lên ngay dưới thanh tab Hồ sơ của tôi; khi gửi thất bại đóng hộp thoại xác nhận để thông báo không bị che phía sau. Không thay đổi Backend/schema.
- Kiểm tra Frontend typecheck đạt; `tests/my-member-profile.test.tsx` đạt 4/4; Backend typecheck đạt; `git diff --check` đạt. Chưa xác nhận gửi thực tế trên môi trường người dùng.

## Bố trí và màu cảnh báo Hồ sơ của tôi — 2026-11-04

- Giữ thông báo đợt đang mở ở đầu trang; dùng biến thể xanh lá `success` lấy từ token bảng màu. Các lưu ý quyền/thời hạn, lỗi tải/gửi, chờ duyệt, từ chối và đã duyệt nằm ngay dưới thanh tab.
- Mở rộng `alert.tsx` với màu theo ý nghĩa: vàng cho lưu ý/chờ xử lý, đỏ cho lỗi/từ chối, xanh cho hoàn tất; thêm token vàng sáng/tối tập trung trong `globals.css`, không đặt mã màu riêng ở feature.
- Kiểm tra Frontend typecheck và `tests/my-member-profile.test.tsx` đạt 4/4; chưa kiểm tra trực quan trình duyệt.

## Cho phép cán bộ có quyền phê duyệt yêu cầu do mình gửi — 2026-11-05

- Bỏ điều kiện từ chối tự phê duyệt tại Backend. Tài khoản gửi yêu cầu được phép phê duyệt yêu cầu đó nếu vai trò đang hoạt động có `HO_SO_CA_NHAN_DUYET_CAP_NHAT`, có phạm vi trùng đơn vị duyệt, và yêu cầu vẫn ở trạng thái chờ. Không nới quyền hoặc phạm vi.
- Không thay đổi quy tắc từ chối yêu cầu do chính mình gửi; người gửi vẫn không thể tự từ chối yêu cầu của mình.
- Cập nhật mô tả quyền trong danh mục để bỏ nội dung cấm tự duyệt; đã chạy `npm.cmd run sync:permissions`, đồng bộ metadata 72 quyền trong PostgreSQL phát triển (không thay đổi Role/Assignment). Kiểm tra Backend typecheck và bài test mới `member-profile-updates.service.spec.ts` (1/1) đạt. Cần khởi động lại Backend để áp dụng mã mới.

## Hiển thị vai trò Sidebar và sửa chặn Scope xem danh sách hồ sơ — 2026-11-05

- Chân Sidebar hiển thị vai trò/phạm vi đang hoạt động của phiên, để người dùng nhận biết khi đang thao tác dưới vai trò nào. Danh sách chuyển vai trò hiện có vẫn dùng chung ở menu tài khoản.
- Nguyên nhân vai trò có Permission xem hồ sơ nhưng vẫn nhận 403: controller gắn `@RequirePermission` lên API danh sách; guard kiểm tra Scope với đích rỗng nên Scope `CAY_DON_VI` (ví dụ Đảng ủy) bị từ chối trước khi service lọc danh sách. Gỡ guard Permission cấp route ở hai endpoint danh sách/đơn vị; giữ xác thực đăng nhập cấp controller và kiểm tra Permission + Scope tại service, nơi đã giới hạn dữ liệu theo đơn vị được cấp.
- Lỗi 403 ở trang hồ sơ nay nêu rõ nếu vai trò đang hoạt động chưa có `HO_SO_DANG_VIEN_XEM_DANH_SACH`. Mã Role vẫn phải có Permission này; Scope phải phù hợp. Với Chánh Văn phòng Đảng ủy, dùng `CAY_DON_VI` tại Đảng ủy để xem các đơn vị trực thuộc.
- Kiểm tra: Backend typecheck; test hồ sơ controller/service 15/15; Frontend typecheck; `git diff --check` đạt. Chưa chạy yêu cầu HTTP trên phiên tài khoản người dùng.

## Sửa lỗi phạm vi tạo đợt và câu chữ giao diện — 2026-11-04

- API danh sách Chi bộ mở đợt trả thêm cờ cho biết tài khoản có phạm vi toàn hệ thống hay không. Biểu mẫu chỉ hiện lựa chọn toàn hệ thống khi Backend xác nhận; tài khoản có Scope theo đơn vị phải chọn Chi bộ được giao, tránh gửi `maDonVi: null` rồi bị từ chối.
- Thông báo lỗi tạo đợt hiển thị nội dung dễ hiểu theo mã lỗi; đổi các câu trong hộp xác nhận/chi tiết và thông báo phân quyền sang tiếng Việt nghiệp vụ, không dùng từ Backend/Permission/Scope.
- Kiểm tra Frontend và Backend typecheck đạt; test trang cập nhật 4/4, test phân quyền 5/5. Chưa thử tạo trên phiên và dữ liệu tài khoản thật.

## Giao diện quản lý đợt cập nhật hồ sơ — 2026-11-04

- Tách trang thành hai thẻ “Đợt cập nhật” và “Yêu cầu đang chờ xử lý”; phần yêu cầu có thống kê tổng/chờ duyệt/đã duyệt/đã từ chối, mặc định lọc yêu cầu chờ duyệt, tìm tên/mã hồ sơ, lọc Chi bộ/đợt/trạng thái/khoảng ngày, phân trang và bảng 8 cột với thao tác cố định.
- Thêm xem chi tiết yêu cầu bằng hộp thoại rộng, xác nhận trước khi phê duyệt và hộp thoại từ chối dùng `RichTextEditor` hiện có. Danh sách/chi tiết tiếp tục gọi API hiện hành; Backend bổ sung tên đợt/người xử lý và che thông tin cá nhân/địa chỉ khi người xem không có quyền tương ứng. Không tạo API, bảng hay dữ liệu giả.
- Đồng bộ khung trang với `PageContainer` và các trang quản lý khác: bỏ padding lặp ở cả trạng thái có quyền và không có quyền; giữ nhịp dọc chung và phần đệm cuối trang.
- Chỉ dùng API hiện có; không thay đổi Backend/schema/migration. Không thêm sửa, kết thúc, xóa đợt hoặc lưu nháp vì API hiện chưa hỗ trợ. Chi tiết không hiển thị người tạo/thời điểm tạo/thống kê theo đợt do API danh sách chưa trả các dữ liệu này. API hiện trả tối đa 100 đợt; số liệu giao diện tính trên toàn bộ kết quả trả về, nhưng không thể bảo đảm tổng vượt giới hạn đó nếu Backend chưa bổ sung phân trang/thống kê.
- Kiểm tra Frontend và Backend typecheck đạt; `tests/member-profile-updates.test.tsx` đạt 6/6 (bao gồm lọc hàng đợi, xem chi tiết, xác nhận phê duyệt và từ chối có lý do); `git diff --check` đạt. Kiểm thử tích hợp PostgreSQL chưa chạy vì chưa bật biến môi trường opt-in; chưa kiểm tra trực quan trên trình duyệt.

## Rà soát diễn giải ma trận quyền — 2026-11-04

- Rà soát và viết lại tên/mô tả cho toàn bộ 72 quyền trong `backend/src/modules/authorization/permission-catalog.ts`; dùng tiếng Việt rõ thao tác, dữ liệu/phạm vi tác động và điều kiện nghiệp vụ. Loại các từ tiếng Anh hiển thị như Scope, Permission, Assignment, Role, Audit, workflow và catalog; giữ nguyên mã quyền và trạng thái chức năng.
- Đã chạy `npm.cmd run sync:permissions`, PostgreSQL xác nhận đồng bộ 72 quyền; script chỉ cập nhật metadata danh mục, không tạo hoặc thay đổi vai trò/phân công.
- Kiểm tra Backend `npm.cmd run typecheck`, `npm.cmd test -- test/authorization-admin.service.spec.ts` (12/12) và `git diff --check` đạt.

## Trang Cập nhật hồ sơ Đảng viên — 2026-11-04

- Bổ sung trang tự đề nghị tại `/ho-so-cua-toi/cap-nhat`, mở từ nút trên Hồ sơ của tôi; giữ trang `/cap-nhat-ho-so` phục vụ mở đợt và xét duyệt.
- Trang mới dùng hồ sơ, đợt và yêu cầu từ API thật; trường có thể sửa được suy ra từ `cacTruongDuocPhep` do Backend trả về và tiếp tục bị Backend xác thực khi gửi. Có trạng thái đợt, trạng thái yêu cầu, lý do từ chối, bảng đối chiếu giá trị cũ/mới, xem ảnh chính thức và xác nhận trước khi gửi. Không ghi trực tiếp lên hồ sơ chính thức.
- Kiểm tra Frontend `npm.cmd run typecheck` đạt. Chưa chạy test suite, kiểm tra trực quan hoặc thao tác PostgreSQL thật.

## Trang Hồ sơ của tôi — 2026-11-04

- Thêm route `/ho-so-cua-toi` và mục điều hướng; trang chỉ đọc theo bố cục hai cột, thẻ cá nhân, sinh viên, Đảng viên, quá trình Đảng và chức vụ/nhiệm kỳ. Dữ liệu dùng API hồ sơ hiện có; nội dung nhạy cảm và lịch sử chỉ tải/hiển thị theo Permission hiện hành. Không có dữ liệu giả.
- Thêm `GET /api/v1/ho-so-dang-vien/cua-toi`, lấy hồ sơ bằng `maTaiKhoan` từ phiên xác thực và tái dùng `chiTiet()` để áp dụng Permission xem tổng quan/trường. Tài khoản chưa liên kết nhận `{ hoSo: null }`; không nhận mã hồ sơ từ client, không tạo liên kết hoặc hồ sơ. Không thêm schema/migration.
- Thanh tiến độ dùng bộ 5 thông tin tối thiểu đã ghi nhận ở trang chi tiết (mã hồ sơ, họ tên, trạng thái Đảng viên, Chi bộ hiện tại, ngày bắt đầu sinh hoạt); nếu thiếu quyền xem sinh hoạt hiện tại thì không tính tiến độ. Sửa `Progress` truyền `value` vào Radix để cập nhật trạng thái và giá trị truy cập.
- Chưa có ảnh/khả năng lưu ảnh, nguồn liên thông sinh viên ngoài bản ghi schema hiện tại, cơ chế mở quyền tự cập nhật hoặc quy trình yêu cầu/phê duyệt; trang không hiện nút tải ảnh hay sửa/lưu/gửi yêu cầu. Không có tra cứu trực tiếp PostgreSQL từ Frontend.
- Kiểm tra: Frontend `npm.cmd run typecheck` đạt; `npm.cmd test -- tests/my-member-profile.test.tsx` đạt 2/2. Backend `npm.cmd run typecheck` đạt; `npm.cmd test -- test/member-profiles.service.spec.ts` đạt 14/14. Chưa kiểm tra trực quan, màn hình nhỏ trên trình duyệt hoặc PostgreSQL thật.

## Thiết kế lại Quản lý vai trò — 2026-11-04

- `frontend/src/features/authorization/RoleListPage.tsx` thay danh sách thẻ bằng bảng đúng 7 cột; cột Thao tác sticky bên phải, tìm theo tên/mã, lọc trạng thái, phân trang/chọn số dòng và 4 thống kê. Có Làm mới, Tạo vai trò, chỉnh sửa, đổi trạng thái, xóa có điều kiện và bảo vệ vai trò hệ thống.
- Sheet chi tiết hiển thị thông tin, quyền và tài khoản phân công; nút Ma trận điều hướng thẳng tới route vai trò tương ứng. Danh sách tài khoản lấy `/tai-khoan?maVaiTro=...` (tối đa 50 mỗi lượt) nên chỉ gồm tài khoản trong phạm vi mà Backend cho phép xem; Backend hiện không có endpoint trang hóa theo role riêng. Không tạo API/schema mới hoặc dữ liệu mẫu.
- Thao tác giữ nguyên hợp đồng API hiện tại; Backend tiếp tục là nơi kiểm tra Permission + Scope và điều kiện bảo vệ/xóa vai trò.
- Kiểm tra: `frontend npm.cmd run typecheck` đạt. Không chạy test suite hoặc kiểm tra trực quan.

## Thiết kế lại Danh mục quyền — 2026-11-04

- `frontend/src/features/authorization/PermissionCatalogPage.tsx` chuyển từ các tab nhóm trải ngang sang bố cục hai vùng: danh sách nhóm lấy động từ API ở trái, bảng quyền ở phải. Có “Tất cả quyền”, tìm nhóm, tìm tên/mã/mô tả, lọc trạng thái chức năng, phân trang và chọn số dòng.
- Bảng có đúng 5 cột, cột Thao tác sticky; Sheet chỉ đọc hiển thị tên, mã, nhóm, mô tả và trạng thái chức năng từ Backend. Không thêm chức năng sửa, API hay thay đổi Permission.
- Kiểm tra: frontend `npm.cmd run typecheck` đạt. Không chạy test suite hoặc kiểm tra trực quan.
- Cập nhật tiếp: dùng `ResizablePanelGroup` ngang mặc định 25/75, giới hạn trái 18–38% và phải 62–82%; dưới 1024px chuyển sang dọc với tỷ lệ phù hợp. Danh sách nhóm cuộn độc lập, bảng cập nhật cục bộ khi chọn nhóm. Frontend typecheck đạt; không chạy test suite hoặc kiểm tra trực quan.
- Sửa lỗi không kéo: `react-resizable-panels` 4.16.1 diễn giải kích thước dạng số theo pixel. Đổi `defaultSize`/`minSize`/`maxSize` sang chuỗi phần trăm; tăng hit area và đặt cursor phù hợp. Cùng bố cục panel co giãn được áp dụng cho nhóm/quyền trong tab Ma trận, responsive ngang/dọc. Frontend typecheck đạt; chưa kiểm thử trực quan.

## Bố cục co giãn Cơ cấu tổ chức — 2026-11-04

- `frontend/src/features/organizations/OrganizationsPage.tsx` dùng `ResizablePanelGroup` cho cây/danh sách đơn vị bên trái (mặc định 30%) và chi tiết bên phải (70%). Desktop kéo trong giới hạn trái 23–42%, phải 58–77%; dưới 1280px đổi sang bố cục dọc.
- Giữ nguyên state chọn đơn vị và các truy vấn/thao tác; vùng nội dung hai panel cuộn độc lập, tên/mã dài được xuống dòng phù hợp. Không sửa API/backend/schema.
- Kiểm tra: frontend `npm.cmd run typecheck` đạt. Không chạy test suite hoặc kiểm tra trực quan.
- Sửa lỗi kéo: phiên bản thực tế `react-resizable-panels` 4.16.1 hiểu số trong `defaultSize`/`minSize`/`maxSize` theo pixel, nên các số 30/23/42 trước đó tạo panel trái 30px với giới hạn 23–42px. Đổi sang chuỗi phần trăm; đặt vùng tương tác 24px (fine) / 32px (coarse) và cursor theo hướng. Typecheck đạt. Browser Use từ chối truy cập trang local do origin approval bị người dùng từ chối; không kiểm tra kéo chuột/bàn phím hoặc resize cửa sổ trên trình duyệt.
- Bảng “Đơn vị trực thuộc” có đúng 5 cột; bộ tìm kiếm theo tên/mã, phân trang 10/20/50, STT liên tục, dòng đều và chọn dòng để mở chi tiết. Số con là tập ID đơn vị con trực tiếp duy nhất từ cây API trong phạm vi hiện tại. Typecheck đạt; không sửa Backend/API/CSDL.
- Bảng “Lịch sử quan hệ” được thu gọn với tìm kiếm đơn vị cấp trên/thời điểm, phân trang 10/20/50, STT liên tục và chiều cao dòng đều; giữ toàn bộ bản ghi API, không loại hay gộp lịch sử. Frontend typecheck đạt.

## Trang chi tiết hồ sơ Đảng viên — 2026-11-04

- Trang `/ho-so-dang-vien/:profileId` dùng bố cục tham chiếu; có tổng quan, quyền xem dữ liệu, sinh viên có/không liên kết, tiến độ tính từ 5 mục tối thiểu (mã hồ sơ, họ tên, trạng thái Đảng viên, Chi bộ hiện tại, ngày bắt đầu sinh hoạt) và các thẻ lịch sử.
- Bổ sung API đọc `/:maHoSo/lich-su-sinh-hoat`, `/:maHoSo/qua-trinh`, `/:maHoSo/phan-cong-chuc-vu`, `/:maHoSo/lich-su-thay-doi`; mỗi API kiểm tra Permission + Scope ở guard và service. Lịch sử sinh hoạt tra tên đơn vị theo thời điểm hiệu lực; trạng thái phân công xét cả thời hạn phân công và nhiệm kỳ. Audit giới hạn 100 dòng và lọc trường nhạy cảm. Không đổi schema/migration, không tự cấp quyền cho vai trò/tài khoản.
- Bật metadata `DA_CO_API` cho 4 quyền xem tương ứng trong permission catalog. UI chỉ hiện tab khi quyền tương ứng được cấp. Nút sửa mở quy trình cập nhật hiện có.
- Sửa lỗi bố cục thẻ “Sinh hoạt hiện tại”: vùng trái hẹp dùng một cột dữ liệu; vùng nội dung rộng vẫn chia hai cột. Giá trị có `min-w-0` để tránh tràn.
- Rà theo từng nhóm trường trong plan: quyền xem địa chỉ hoạt động độc lập với quyền thông tin cá nhân; thông tin sinh hoạt hiện tại chỉ truy vấn/trả về khi có `SINH_HOAT_XEM_HIEN_TAI`. Bật metadata API cho quyền này; không tự gán quyền. Phân loại nơi sinh trong schema được hiển thị ở mục địa chỉ.
- Kiểm tra lượt rà soát quyền/trường: Frontend typecheck, build, tests 11/11 đều đạt; backend typecheck đạt, `member-profiles.service.spec.ts` 12/12; lint các tệp chi tiết đạt; `git diff --check` đạt. Build còn cảnh báo chunk chính trên 500 kB. Kiểm thử frontend bao gồm quyền địa chỉ độc lập; service test xác nhận sinh hoạt hiện tại bị loại khỏi phản hồi khi thiếu quyền. Chưa kiểm tra trực quan trên trình duyệt hoặc với PostgreSQL thật.
- Theo ảnh yêu cầu tab “Sinh hoạt Đảng”: hiển thị nhãn chỉ xem, thông tin Đảng ủy/Chi bộ/Tổ sinh hoạt/ngày bắt đầu/trạng thái hiện tại và phần lịch sử chuyển sinh hoạt với empty state; lịch sử/đơn vị lấy từ API thực, không mock. Ngày chỉ hiển thị `dd/MM/yyyy` vì schema lưu ngày, không có giờ. Frontend typecheck, build, tests 11/11 đạt; lint toàn frontend còn lỗi có sẵn `children` không dùng ở `shared/components/ui/combobox.tsx` cùng 14 cảnh báo Fast Refresh; `git diff --check` đạt. Chưa kiểm tra trực quan trên trình duyệt hoặc PostgreSQL thật.
- Theo yêu cầu 2026-11-04, thanh tab chi tiết không xuống dòng và không cuộn ngang; tab vừa chỗ giữ nguyên thứ tự, phần còn lại vào menu `⋯` dùng DropdownMenu radio; resize đo lại bằng ResizeObserver/window resize. Tab chọn trong menu được đánh dấu và làm nổi bật nút menu; khi đủ rộng menu tự ẩn. Typecheck/build và lint tệp liên quan đạt; test hẹp/rộng, mở chọn tab ẩn và khôi phục tất cả tab đạt 4/4 trong `member-profile-detail.test.tsx`. Build vẫn có cảnh báo chunk chính trên 500 kB. Chưa kiểm tra trực quan qua trình duyệt.
- Thẻ “Thao tác nhanh” có tối đa 3 nút theo quyền: thông báo Sonner placeholder (chỉ quyền xem tổng quan, không API; catalog chưa có quyền thông báo), chỉnh sửa dùng luồng form hiện có và quyền sửa, xem lịch sử chuyển trực tiếp tới tab audit theo quyền lịch sử. Không thay đổi Backend/CSDL.
- Theo yêu cầu 2026-11-04, bổ sung `so_phieu_ly_lich` (VARCHAR(50), nullable, unique) bằng migration mới; `so_the_dang_vien` đã có trong schema. Chi tiết hồ sơ trả hai trường; thẻ tóm tắt “Sinh hoạt hiện tại” và tab “Thông tin Đảng viên” cùng hiển thị; form tạo/sửa cho phép nhập hai số. Backend ghi audit và báo lỗi trùng theo trường. Migration `20261104000000_member_profile_record_number` đã áp dụng vào database phát triển; `prisma migrate status` xác nhận chỉ migration này chờ trước khi deploy và deploy thành công. Prisma validate/generate và typecheck frontend/backend đạt. Không chạy test suite hay kiểm tra trực quan.

- Theo yêu cầu mới nhất 2026-11-03, nền trang `--background` tại `frontend/src/app/styles/globals.css` là `#f8f9ff`; Sidebar, card, popover, muted và accent giữ trắng tinh `#ffffff`. Nền tối, màu chữ và viền giữ nguyên.

## Hoàn thiện module Phân quyền tài khoản — 2026-11-03

- Hoàn thiện `frontend/src/features/accounts/AccountAssignmentsPage.tsx`: KPI trong phạm vi, lọc từ khóa/Chi bộ/Role/trạng thái phân quyền, phân trang; bảng 7 cột; Sheet chi tiết hiển thị từng Assignment riêng, thông tin cấp và trạng thái; lịch sử audit; Sheet gán/sửa và xác nhận thu hồi.
- Nối giao diện vào API thật `/tai-khoan`, `/vai-tro`, `/to-chuc/cay`, `/phan-cong-vai-tro` và API lịch sử mới. Thời điểm hiệu lực nhập/hiển thị múi giờ Việt Nam. Không có mock hoặc seed dữ liệu.
- Backend danh sách tài khoản bổ sung lọc Role, danh mục Chi bộ và thống kê tổng/đã-chưa phân quyền/sắp hết hạn trong Scope hiện dùng; tổ hợp lọc hồ sơ với từ khóa qua `AND`, tránh ghi đè điều kiện Chi bộ.
- Backend Assignment trả người cấp/thời gian cấp và lịch sử audit theo tài khoản. Endpoint lịch sử yêu cầu `NHAT_KY_KIEM_TOAN_XEM` cùng quyền xem Assignment trong Scope. Kiểm tra thời hạn bảo đảm ngày kết thúc sau thời điểm bắt đầu; cấp mới hỗ trợ thời điểm bắt đầu.
- Cập nhật `docs/THIET_KE_API_PHAN_QUYEN.md`; không thay đổi schema hoặc tạo migration trong phần module này. Migration hiện diện trong working tree thuộc thay đổi phiên trước và chưa được áp dụng qua công việc này.
- Kiểm tra: frontend `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test` đạt; Backend `npm.cmd run typecheck`, `npm.cmd run build` đạt, test toàn bộ đạt 28/28 sau khi chạy ngoài sandbox do e2e bind localhost; test Assignment đạt 11/11; `git diff --check` đạt.
- Chưa kết nối database để xác minh dữ liệu thật, chưa cấp Permission cho role/tài khoản nào, chưa chạy browser E2E/visual QA; build frontend có cảnh báo chunk chính 634 kB.
- Cập nhật theo ảnh 2026-11-03: Badge trạng thái tài khoản và Assignment nằm cùng hàng với tiêu đề tương ứng. Chi bộ của tài khoản chưa liên kết hồ sơ được suy ra chỉ khi Scope Assignment chỉ rõ đơn vị loại `CHI_BO`; Backend trả tên và loại đơn vị gắn với Assignment để không phụ thuộc quyền tải cây tổ chức riêng. Typecheck và build Frontend/Backend đạt; 11 test Assignment đạt.
- Gỡ trang cũ `/quan-tri-phan-quyen/phan-cong` vốn có form gán và chỉnh sửa trùng lặp; route cũ chuyển sang `/phan-quyen-tai-khoan`, giữ query `maTaiKhoan`. Các liên kết từ Quản lý tài khoản/hồ sơ dùng trang mới, Backend lọc theo ID trong Scope và trang tự mở Sheet chi tiết. Xóa `frontend/src/features/authorization/AssignmentsPage.tsx`. Typecheck Frontend/Backend đạt sau chỉnh sửa.
- Theo ảnh tiếp theo, làm phẳng phần nội dung Assignment trong Sheet (bỏ Card viền riêng từng Assignment, giữ đường phân cách). Ban đầu icon được gắn riêng tại hai Sheet phân quyền.
- Theo yêu cầu 2026-11-03, các thao tác Gán/Chỉnh sửa/Thu hồi trong Sheet chi tiết đặt ở footer; chọn Assignment trước và footer hiển thị Role + Scope đích. Thu hồi được ghi rõ là “Thu hồi phân quyền”, xác nhận mô tả quyền nào mất hiệu lực và Assignment/audit nào được giữ. Đây là quy ước bố trí thao tác cho các Sheet tương tự về sau. Frontend typecheck đạt.
- Theo yêu cầu tiếp theo, icon Sheet được đưa vào `SheetTitle` dùng chung tại `frontend/src/shared/components/ui/sheet.tsx`; mọi Sheet có tiêu đề tự hiển thị icon mặc định. Gỡ icon đặt riêng trong trang phân quyền để tránh trùng và áp dụng thống nhất cho các Sheet hiện tại/tương lai. Frontend typecheck/build đạt.
- Theo ảnh 2026-11-03, hộp xác nhận thu hồi vai trò dùng tiêu đề có icon cảnh báo, nêu tài khoản/Role/Scope, audit và lưu lịch sử; lý do nhập nhiều dòng, nút xác nhận nằm cùng hàng footer. Frontend typecheck đạt.
- Theo ảnh 2026-11-03, bỏ vạch dọc xám ở Assignment đang chọn; sau thu hồi thành công chuyển tab sang Lịch sử phân quyền nếu có Permission xem audit; nhãn trạng thái tài khoản hiển thị tiếng Việt thay enum. Frontend typecheck/build đạt.
- Assignment đã thu hồi được ẩn khỏi danh sách Vai trò được phân công để tránh danh sách dài; dữ liệu cũ và audit tiếp tục hiển thị trong tab Lịch sử phân quyền.
- Theo ảnh 2026-11-03, lịch sử phân quyền được định dạng lại: tên hành động và kết quả dịch sang tiếng Việt, Scope và mốc hiệu lực hiển thị dễ đọc, snapshot chỉ trình bày các trường nghiệp vụ đã chọn; không còn hiển thị JSON thô hoặc UUID kỹ thuật. Kiểm tra Frontend typecheck/build và `git diff --check` đạt; build còn cảnh báo chunk chính 634 kB.
- Theo yêu cầu 2026-11-03, mục Sidebar đang chọn có nền đỏ và chữ trắng; trạng thái áp dụng cho cả mục cấp một và mục con, với màu đỏ tương phản trong giao diện sáng/tối qua token Sidebar. Kiểm tra typecheck/build và `git diff --check` đạt.

## Quản trị tài khoản, Assignment và xác nhận giao diện — 2026-11-02

- Đã cập nhật quy tắc phiên: Assignment hiện dùng được lưu trong session; 0 Assignment thì không có quyền quản trị, 1 tự chọn, từ 2 yêu cầu chọn. Chuyển ngay trong Header cập nhật phiên rồi xóa cache dữ liệu để tải lại quyền/phạm vi. Backend kiểm tra Assignment còn hiệu lực. Migration thêm FK Restrict cho Assignment đang dùng; chưa áp dụng migration.
- Backend mới `backend/src/modules/accounts/` cung cấp danh sách phân trang/thống kê, tạo/sửa tài khoản, trạng thái, liên kết hồ sơ, audit history và xóa có kiểm tra dữ liệu tham chiếu/Quản trị viên cuối cùng. Xóa vật lý không cascade và giữ audit; FK/Assignment/lịch sử còn tham chiếu thì từ chối. Quyền `TAI_KHOAN_XOA` đã vào catalog, nhưng role Permission trong DB cần được đồng bộ/cấp có kiểm soát riêng.
- Xóa đơn vị chỉ cho bản ghi tên/quan hệ được phân loại `KHOI_TAO`; lịch sử cũ được gán `CAN_XAC_MINH` nên vẫn chặn xóa cho tới khi kiểm tra bằng chứng. Không phân loại hồi tố hoặc xóa dữ liệu thật. Giữ FK Restrict và audit. Migration đổi lịch sử tên DATE sang TIMESTAMPTZ theo 00:00 Asia/Ho_Chi_Minh; chưa triển khai lên database.
- UI cơ cấu tổ chức gộp sửa thông tin, đổi tên và đổi cha vào Sheet; trường hiệu lực ngày/giờ/phút nhập theo Việt Nam. Danh sách và thẻ chi tiết có menu ba chấm “Hành động” với đúng Sửa thông tin, Đổi trạng thái, Xóa đơn vị; xóa có AlertDialog.
- Thêm `/tai-khoan` và `/phan-quyen-tai-khoan`; danh sách tài khoản/phân quyền hiển thị menu ba chấm, liên kết tới trình sửa và màn hình quản Assignment. Trang tài khoản có tạo/sửa, trạng thái và xóa; trang Assignment hiển thị role/scope hiệu lực.
- Bootstrap tài khoản đầu tiên không còn ép đổi mật khẩu ngay lần đăng nhập đầu; cơ chế đổi mật khẩu bắt buộc do reset vẫn giữ.
- Tài liệu hợp đồng tổ chức/phân quyền đã được cập nhật. Chưa apply migration, chưa chạy trên dữ liệu production, không tạo dữ liệu/tài khoản/Assignment.
- Kiểm tra: frontend typecheck/build/test đạt; backend prisma:validate/typecheck/build đạt; full backend suite đạt 26/26 (6 files), health e2e included; `git diff --check` đạt. Build cảnh báo bundle frontend chính >500 kB.
- Menu tài khoản đã nối tới xem chi tiết, xem lịch sử, liên kết hồ sơ, sửa, phân công, đổi trạng thái và xóa. Các mục nhạy cảm được ẩn theo Permission; Backend vẫn là nơi kiểm tra cuối.
- Hạn chế: migration chưa triển khai lên database; chưa chạy trên production hoặc dữ liệu PTIT; chưa kiểm thử trực quan trên trình duyệt. `npm.cmd run lint` toàn frontend còn báo lỗi lint có sẵn ở shared `combobox.tsx` (file chưa thuộc phần sửa lần này); cảnh báo Fast Refresh ở shared components.

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
- Tại thời điểm ghi mục handoff này, API hồ sơ chưa triển khai và CCCD còn yêu cầu khóa mã hóa/HMAC; trạng thái đó đã được cập nhật ở các mục triển khai hồ sơ và quyết định CCCD phía dưới.
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

## Khắc phục lỗi kiểm tra phiên đăng nhập — 2026-11-02

- Database phát triển `quan_ly_dang_vien_dev` tại `127.0.0.1:55432` thiếu migration `20261102000000_admin_context_history_and_account_state`; Backend dùng cột Assignment hoạt động trong phiên đăng nhập nên lỗi schema khiến luồng kiểm tra phiên thất bại.
- Lần deploy đầu gặp lỗi do constraint loại trừ lịch sử tên đơn vị dùng `daterange`, không hỗ trợ khi hai cột đổi sang `TIMESTAMPTZ`. Đã sửa migration để thay constraint bằng `tstzrange(..., '[)')`, giữ lịch sử ngày cũ ở 00:00 giờ Việt Nam và cho phép đổi tên tại đúng mốc chuyển tiếp.
- Người dùng đã xác nhận áp dụng migration lên database phát triển. Lần thất bại được đánh dấu rolled back; SQL đã chạy thử trong transaction có `ROLLBACK` thành công trước khi deploy lại. Migration sau đó áp dụng thành công, không xóa bản ghi.
- Xác minh: `npm.cmd run prisma:migrate:status` báo schema up to date; `npm.cmd run prisma:validate` đạt; `GET /api/v1/suc-khoe` trả `SAN_SANG` cho máy chủ và cơ sở dữ liệu. Chưa kiểm tra đăng nhập qua trình duyệt trong lượt này.
- Khắc phục sidebar không hiện mục quản trị: Backend trả `quyenDangHoatDong`, `phanCongHopLe` và Assignment hiện hành ở cấp đối tượng phiên; frontend trước đó đọc các trường này bên trong `taiKhoan`, khiến danh sách Permission rỗng. Đã sửa type và chuẩn hóa ngữ cảnh phiên tại `AuthProvider` để sidebar/header nhận đúng dữ liệu. Frontend `npm.cmd run typecheck` và `git diff --check` đạt; chưa chạy test suite.
- Khắc phục 500 của `GET /api/v1/tai-khoan`: bộ lọc khoảng hiệu lực dùng chung gắn nhầm `thuHoiLuc` lên `LichSuDonViDangVien`, model không có trường này. Tách `activeAssignmentFilter` để chỉ áp dụng điều kiện thu hồi cho Assignment. Đã tái hiện qua `TaiKhoanService.danhSach` trên database phát triển trước sửa (Prisma báo `Unknown argument thuHoiLuc`) và gọi lại thành công sau sửa (trả 1 dòng); backend `npm.cmd run typecheck` và `git diff --check` đạt.
- Người dùng báo 500 tiếp tục ở HTTP endpoint; ảnh xác nhận trang tài khoản nhận 500. Các query biến thể mặc định/tìm kiếm/Assignment/tình trạng liên kết/chi bộ qua service hiện tại đều thành công. Log mới xác nhận lỗi tại `taiKhoanNguoiDung.findMany` nhưng không có field issue. Filter hiện ghi tên thao tác, unknown/invalid argument và chỉ tên/kiểu query params (không giá trị) để đối chiếu request. Backend `typecheck` đạt; chờ log HTTP tiếp theo để xác định sự khác biệt runtime.
- Log Vite cho thấy tại một số thời điểm Backend chưa lắng nghe `127.0.0.1:3001` (`ECONNREFUSED`). Log Nest đính kèm xác nhận Backend sau đó khởi động thành công; lỗi Prisma HTTP còn lại được tái hiện chính xác khi truyền query string phân trang (`trang: '1'`, `gioiHan: '20'`): `Argument take: Invalid value provided. Expected Int, provided String.` Đã chuẩn hóa `trang`/`gioiHan` sang number trong `TaiKhoanService.danhSach`; query mặc định và `coPhanCong=CO` chạy thành công sau sửa. `npm.cmd run typecheck`, `git diff --check` đạt; health endpoint hiện `SAN_SANG` cho máy chủ và database.

## Giao diện quản lý tài khoản — 2026-11-02

- Hoàn thiện trang tài khoản theo tài liệu thiết kế với dữ liệu mẫu trong frontend: bộ lọc, thống kê, bảng/phân trang, menu thao tác, tạo/sửa, chi tiết, khóa/mở khóa, đặt lại mật khẩu, liên kết hồ sơ, lịch sử và xác nhận xóa. Các thay đổi dữ liệu chỉ nằm trong state trình duyệt và mất khi tải lại; không nối hoặc sửa API Backend trong phần module này.
- Thêm trang hồ sơ Đảng viên mẫu để xem hồ sơ được liên kết; thêm mục hồ sơ cùng cấp với các mục không gian làm việc và route chi tiết.
- Các thao tác hiển thị theo Permission của ngữ cảnh đăng nhập; thao tác xóa mẫu bị chặn khi tài khoản có dữ liệu phụ thuộc cần giữ. Không lưu mật khẩu mẫu hoặc ghi bí mật vào lịch sử.
- Kiểm tra: frontend `npm.cmd run typecheck`, `npm.cmd run build` và `git diff --check` đạt. Build hiện cảnh báo chunk chính khoảng 634 kB vượt ngưỡng 500 kB. Không chạy test suite.

## Bỏ dữ liệu tài khoản/hồ sơ minh họa — 2026-11-02

- Theo yêu cầu người dùng, đã bỏ toàn bộ tài khoản và hồ sơ hư cấu khỏi `accounts.mock.ts`; danh sách, thống kê và lựa chọn hồ sơ bắt đầu rỗng. Các thao tác CRUD hiện tại vẫn dùng state cục bộ của giao diện và chưa lưu database.
- Kiểm tra `npm.cmd run typecheck` đạt; tìm kiếm xác nhận không còn fixture mẫu trong module.

## Nối quản lý tài khoản với PostgreSQL — 2026-11-02

- Gỡ fixture tài khoản/hồ sơ và đổi mô hình TypeScript từ `accounts.mock.ts` sang `accounts.models.ts`. Trang tài khoản tải danh sách, thống kê, bộ lọc, phân trang và hồ sơ chưa liên kết qua API thật; tìm/lọc hồ sơ liên kết truy vấn database.
- Nối tạo/sửa tài khoản, cập nhật trạng thái, đặt lại mật khẩu (Backend băm mật khẩu), liên kết/hủy liên kết hồ sơ, xem chi tiết, nhật ký audit và xóa vào các endpoint NestJS/Prisma hiện có. Các thông báo chỉ báo thành công sau khi request Backend hoàn tất; lỗi Backend hiển thị cho người dùng. Kiểm tra quyền/phạm vi và ràng buộc xóa vẫn do Backend quyết định.
- Bổ sung dữ liệu status khởi tạo cho DTO tạo tài khoản, status tùy chọn khi sửa (Backend yêu cầu Permission đổi trạng thái riêng), lưu lý do đổi trạng thái trong audit, và trả các trường cần cho danh sách/chi tiết từ schema hiện có. Không thay schema/migration.
- Chi tiết phiên đăng nhập chỉ truy vấn phiên còn hiệu lực khi tài khoản hiện hành có `NHAT_KY_BAO_MAT_XEM`; dữ liệu hồ sơ/tài khoản đến từ database. Mục danh sách/chi tiết hồ sơ Đảng viên vẫn thông báo API nghiệp vụ này chưa có, không tạo dữ liệu giả.
- Xác minh: frontend và backend `npm.cmd run typecheck` đạt; frontend `npm.cmd run build` đạt; `git diff --check` đạt (chỉ cảnh báo Git chuẩn hóa CRLF/LF ở các file đã chỉnh). Build còn cảnh báo chunk chính khoảng 634 kB vượt ngưỡng 500 kB. Không chạy test suite, không áp dụng migration.

## Triển khai Quản lý hồ sơ Đảng viên — 2026-11-03

- Bổ sung API NestJS `/api/v1/ho-so-dang-vien` (danh sách, danh mục Chi bộ/Tổ, đọc hồ sơ cho form chỉnh sửa, tạo, cập nhật); Permission + Scope kiểm tra ở backend. Danh sách phân trang, tìm theo mã/họ tên, lọc Chi bộ/Tổ/trạng thái; thống kê theo scope. Ngày sinh/thông tin cá nhân/địa chỉ/sinh viên chỉ trả về khi có quyền tương ứng.
- Thêm trạng thái Đảng viên nullable và ngày vào Đảng bằng migration `20261103000000_member_profile_party_status`; hồ sơ cũ giữ NULL để không gán nhầm trạng thái. Migration đã triển khai vào PostgreSQL phát triển. Dùng bảng hồ sơ, cá nhân, địa chỉ, sinh viên, quá trình Đảng, sinh hoạt, tài khoản và audit có sẵn; không tạo bảng mới.
- Tạo hồ sơ + tài khoản là một Prisma transaction, mật khẩu được băm scrypt, không gán vai trò; kiểm tra tên tài khoản, quyền tạo/liên kết, trạng thái Chi bộ/Tổ và quan hệ cha-con. Tạo/cập nhật ghi audit. Chuyển sinh hoạt không được mở từ thao tác sửa hồ sơ.
- Trạng thái ban đầu lúc triển khai: CCCD được mã hóa AES-256-GCM và đối chiếu HMAC. Cơ chế này đã được thay thế theo mục “Bỏ mã hóa CCCD, chặn trùng bằng unique constraint” bên dưới.
- Frontend thay trang placeholder danh sách bằng trang thật, lọc, thống kê, bảng, Sheet tạo/sửa, thông tin sinh viên/tài khoản tùy chọn; trang chi tiết vẫn là Empty State và không gọi API. Menu Sidebar/route có sẵn từ thay đổi trước.
- Kiểm tra: Prisma validate, Backend typecheck/build, Frontend typecheck/build/test đạt; Backend tests đạt 28/28 khi chạy ngoài sandbox; migrate status báo up to date; `git diff --check` đạt. Build Frontend có cảnh báo chunk 634 kB.
- Việc còn lại: chưa có test riêng cho module hồ sơ hoặc E2E UI/kiểm thử phân quyền trên DB; Sheet chia nhóm dữ liệu và có màn tóm tắt xác nhận, chưa có điều hướng theo bước riêng; giao diện hiện cố định 10 dòng/trang. Danh mục trạng thái hồ sơ cần chủ sản phẩm xác nhận. CCCD chỉ dùng được sau khi cấu hình hai khóa bí mật. Chưa nhập dữ liệu PTIT.

## Cập nhật quyền Quản trị viên toàn hệ thống — 2026-11-03

- Theo xác nhận mới của người dùng, Role `QUAN_TRI_VIEN_TOAN_HE_THONG` được cấp tất cả Permission đang có trong catalog, thay cho 32 quyền kỹ thuật đã duyệt trước đó. `systemAdministratorPermissionCodes` nay dùng trực tiếp catalog; mô tả Role và ma trận tài liệu đã cập nhật.
- Thêm thao tác vận hành `npm.cmd run manage:system-administrator -- sync-permissions`: yêu cầu OS operator allowlist, mã quyết định, tài khoản/mật khẩu Quản trị viên phê duyệt; đồng bộ Permission thiếu và ghi audit trong transaction. Giữ bảo vệ Role hệ thống, Assignment cao nhất, kiểm tra Scope, audit và các invariant an toàn.
- Chưa chạy đồng bộ trên PostgreSQL: thao tác cần terminal tương tác và thông tin xác thực của Quản trị viên được phê duyệt. Vì vậy ma trận có thể tiếp tục hiện 32/72 cho đến khi operator chạy lệnh đồng bộ.
- Sau khi người dùng báo lệnh sync thất bại, cập nhật `manage-system-administrator sync-permissions` để trả thông báo an toàn theo từng bước tiền kiểm (không tìm thấy login, chưa hoạt động, chưa đổi mật khẩu lần đầu, chưa có Assignment toàn hệ thống, mật khẩu xác minh sai, hoặc Permission catalog chưa đồng bộ). Không in bí mật hoặc lỗi truy vấn; typecheck/build và 12 test phân quyền đạt.
- Xử lý lỗi đồng bộ catalog: chạy `npm.cmd run sync:permissions` trên PostgreSQL phát triển; upsert metadata đủ 72 Permission (không đổi Role/Assignment). Tiếp tục cần operator chạy lại `npm.cmd run manage:system-administrator -- sync-permissions` để gắn các quyền vào Role; tài khoản và mật khẩu không được chia sẻ qua chat.

## Sửa lỗi phân trang API hồ sơ — 2026-11-03

- `/api/v1/ho-so-dang-vien` nhận `trang` và `gioiHan` dưới dạng chuỗi query; service đổi sang số trước khi truyền `skip/take` cho Prisma.
- Thêm test hồi quy kiểm tra query string tạo `skip/take` kiểu số. Backend typecheck/build đạt; test module đạt 1/1.

## Cập nhật tình trạng API trong ma trận Permission — 2026-11-03

- Chuyển metadata từ trạng thái chung theo nhóm sang cho phép trạng thái theo từng Permission để ma trận phản ánh endpoint thực tế.
- Đánh dấu đã có API cho danh sách/chi tiết/tạo/sửa hồ sơ, xem/sửa các trường cá nhân/địa chỉ/sinh viên, CRUD tài khoản đã có, tra nhật ký kiểm toán/bảo mật, và các quyền tổ chức/vai trò/phân công/danh mục quyền đã triển khai.
- Giữ chưa có API cho quyền chưa có luồng tương ứng như xóa hồ sơ, xuất dữ liệu, xem lịch sử hồ sơ, lịch sử sinh hoạt/quá trình Đảng, chức vụ/nhiệm kỳ, thu hồi phiên, xuất nhật ký, cập nhật cá nhân có phê duyệt, cấu hình/vận hành; quyền sửa lịch sử tổ chức cũng chưa có endpoint.
- Kiểm tra sau thay đổi: Backend `npm.cmd run typecheck` đạt; `git diff --check` đạt (Git có cảnh báo chuẩn hóa CRLF/LF trên file đang sửa). Không chạy test suite.

## Sửa luồng thêm hồ sơ Đảng viên — 2026-11-03

- Nguyên nhân Backend/CSDL: migration tạo `lich_su_don_vi_dang_vien.ngay_hieu_luc_tu` và `ngay_hieu_luc_den` kiểu PostgreSQL `DATE`, nhưng Prisma model khai báo `TIMESTAMPTZ`; lúc ghi lịch sử sinh hoạt trong transaction có kiểu dữ liệu không khớp và có thể rollback toàn bộ tạo hồ sơ. Căn chỉnh hai trường Prisma về `@db.Date`, biểu mẫu gửi ngày lịch và service chuyển sang ngày UTC. Không sửa migration đã áp dụng, không thêm migration.
- Trường bắt buộc khi tạo: mã hồ sơ nội bộ, họ và tên, trạng thái Đảng viên, Chi bộ, ngày bắt đầu sinh hoạt. Trạng thái hồ sơ tự đặt `DANG_HOAT_DONG`, UUID và ngày tạo do hệ thống sinh. Thông tin cá nhân/địa chỉ/email liên hệ là tùy chọn. Nếu bật thông tin sinh viên thì mã sinh viên bắt buộc; nếu bật tạo tài khoản thì tên đăng nhập (3–100 ký tự) và mật khẩu khởi tạo (12–128 ký tự) bắt buộc, email tài khoản tùy chọn. Tài khoản không buộc đổi mật khẩu lần đầu.
- Biểu mẫu giữ cấu trúc hiện tại, thêm dấu sao đỏ đúng theo điều kiện, kiểm tra trước khi xác nhận, lỗi tiếng Việt theo từng trường, cuộn tới trường lỗi, trạng thái đang lưu và giữ dữ liệu khi API lỗi. Backend chuẩn hóa chuỗi tùy chọn rỗng thành không nhập; lỗi validation lồng nhau trả đủ tên trường. Lỗi trùng mã hồ sơ/mã sinh viên/tên đăng nhập được xác định bằng truy vấn sau rollback để gắn đúng trường (Prisma adapter không gửi tên constraint trong metadata).
- API `POST /api/v1/ho-so-dang-vien` tạo hồ sơ, thông tin cá nhân, sinh viên/địa chỉ nếu có, lịch sử sinh hoạt, tài khoản tùy chọn và audit trong một Prisma transaction. Đã xác nhận trường hợp không tài khoản, có tài khoản/liên kết, lỗi tài khoản trùng rollback, trùng mã hồ sơ/sinh viên, Tổ sai và đọc danh sách sau ghi trên PostgreSQL phát triển.
- Kiểm tra: Prisma validate, Backend/Frontend typecheck, Frontend build, Backend service tests 4/4, Frontend validation tests 4/4, PostgreSQL integration tests 5/5; migration status up to date. Build còn cảnh báo chunk 634 kB. Không có máy chủ HTTP đang chạy để kiểm thử qua trình duyệt.
- Dọn hồ sơ, đơn vị và tài khoản liên kết tạm sau tích hợp. Do nhật ký kiểm toán có trigger chỉ ghi thêm và FK giữ người thực hiện, còn 5 tài khoản tác nhân kiểm thử không thể xóa theo quy tắc hiện tại; cả 5 đã đặt `NGUNG_HOAT_DONG`, mật khẩu kiểm thử không phải hash hợp lệ, không còn hồ sơ/đơn vị kiểm thử. Các nhật ký kiểm thử được giữ nguyên.

## Sửa chọn Tổ và cập nhật hồ sơ — 2026-11-03

- Đối chiếu database phát triển xác nhận Chi bộ Phòng Chính Trị và Công Tác Sinh Viên có hai Tổ hoạt động. Backend đọc quan hệ `quanHeCha` thay vì `quanHeCon` khi lấy Chi bộ cha của Tổ, khiến danh sách frontend không khớp; kiểm tra lúc lưu cũng từ chối cùng quan hệ hợp lệ. Sửa cả hai chỗ và cho Scope được cấp Chi bộ nhìn thấy các Tổ con đang hoạt động.
- Giới hạn dữ liệu chi tiết trả về cho địa chỉ/sinh viên còn các trường được phép sửa. Frontend cập nhật hồ sơ gửi payload lồng nhau theo DTO, bỏ metadata nội bộ Prisma; DTO sửa cũng chuẩn hóa chuỗi tùy chọn rỗng trước validate.
- Căn chỉnh chiều rộng hai select Chi bộ/Tổ để tên Chi bộ dài không làm chồng lấn điều khiển trong form.
- Bổ sung test hồi quy cho danh mục Tổ trong Scope, quan hệ cha-con khi tạo và cập nhật hồ sơ có địa chỉ/sinh viên trên PostgreSQL. Kiểm tra lượt này: Backend và Frontend typecheck đạt; Backend member-profile tests 6/6; Frontend validation tests 4/4; `git diff --check` đạt (có cảnh báo Git chuẩn hóa CRLF/LF trên các file đang sửa).
- Chưa kiểm thử HTTP qua trình duyệt vì API không chạy tại thời điểm kiểm tra. Payload chi tiết cũ có metadata lạ so với whitelist DTO sửa, là lỗi hợp đồng API đã xử lý; chưa có log tương quan mới để khẳng định đây là nguyên nhân duy nhất của HTTP 500 đã báo.

## Bỏ mã hóa CCCD, chặn trùng bằng unique constraint — 2026-11-03

- Theo yêu cầu sản phẩm, bỏ yêu cầu khóa mã hóa/HMAC và thông báo cấu hình khóa. Schema mới lưu CCCD dạng chuỗi 12 chữ số ở `thong_tin_ca_nhan_dang_vien.so_cccd`, có unique index toàn hệ thống; một hồ sơ chỉ có một CCCD và tài khoản đăng nhập gắn một hồ sơ duy nhất.
- Khi bật “Đồng thời tạo tài khoản đăng nhập”, CCCD bắt buộc ở frontend và DTO Backend; trường CCCD được kiểm tra trùng ở database, trả lỗi đúng trường `soCccd`. CCCD tùy chọn nếu không tạo tài khoản, nhưng nếu nhập vẫn phải đúng 12 chữ số và duy nhất. Cơ chế unique hoạt động với mọi hồ sơ, không phụ thuộc trạng thái Đảng viên.
- Migration `20261103000000_cccd_unique_plaintext` đã áp dụng vào database phát triển; truy vấn đếm trước migration xác nhận 0 bản ghi CCCD mã hóa cũ, migration status sau đó báo schema up to date. Cột mã hóa và digest cũ đã được gỡ.
- Kiểm tra: Prisma validate, Backend/Frontend typecheck, Backend service tests 6/6, Frontend validation tests 5/5, PostgreSQL integration tests 7/7; `git diff --check` đạt (cảnh báo Git chuẩn hóa CRLF/LF trên file đang sửa). Tích hợp xác nhận CCCD trùng chặn lần tạo thứ hai và transaction rollback hồ sơ thứ hai.
- Lưu ý vận hành: CCCD hiện lưu trực tiếp trong database theo yêu cầu bỏ cơ chế bảo vệ; API chi tiết hiện không trả trường CCCD. Giữ quyền truy cập DB/backup phù hợp vì dữ liệu không còn mã hóa ở tầng ứng dụng.

## Rà soát luồng chỉnh sửa hồ sơ Đảng viên — 2026-11-03

- Không có tiến trình API tại `127.0.0.1:3001` và không có log/correlation ID của lần 500 người dùng gặp, nên không thể xác định hồi tố nguyên nhân chính xác của lần đó. Dựng kiểm thử HTTP qua controller, ValidationPipe, exception filter và PostgreSQL với hồ sơ tạm; không dùng dữ liệu Đảng viên thật.
- Phát hiện filter HTTP làm rơi `chiTietLoi` của 400 validation, khiến giao diện chỉ thấy thông báo chung. Filter nay chỉ trả tên trường và mã kiểm tra an toàn (không trả giá trị nhập); giao diện hiển thị lỗi đúng trường và phân biệt 400/403/404/409/5xx/mất kết nối.
- Form sửa trước đây nhận `ngayVaoDang` dạng ISO timestamp nhưng không cắt về `YYYY-MM-DD` cho input ngày; Backend so sánh với DATE và có thể ghi lặp sự kiện kết nạp khi chỉ sửa trường khác. Chuẩn hóa ngày khi điền form. Ẩn Chi bộ/Tổ/ngày bắt đầu sinh hoạt ở chế độ sửa (không thuộc PATCH để chuyển sinh hoạt), bỏ dấu bắt buộc khỏi trường nullable khi sửa; dữ liệu sinh viên hiện có được bật sẵn khi mở sửa. Bổ sung kiểm tra trường lõi/ngày/email/CCCD/sinh viên trước PATCH.
- Kiểm thử HTTP/PostgreSQL 8/8 đạt: cập nhật tên, trạng thái, ngày, thông tin cá nhân, ba địa chỉ và sinh viên trả 200; GET tải lại đọc đúng dữ liệu; audit được ghi một lần; ngày vào Đảng không tạo sự kiện lặp; dữ liệu sai trả 400 kèm lỗi đúng trường và không sửa bản ghi; quyền bị từ chối trả 403, không thay dữ liệu. Kiểm tra các Permission sửa hồ sơ/cá nhân/địa chỉ/sinh viên đều được gọi.
- Backend và Frontend typecheck đạt; Backend service tests 6/6; Frontend validation tests 7/7; HTTP/PostgreSQL integration 8/8; `git diff --check` đạt. Suite dùng guard thay thế và Permission mock để cô lập luồng HTTP/service; chưa kiểm thử tài khoản thật, Assignment/Scope thật hoặc giao diện trình duyệt. Nguyên nhân 500 lịch sử còn chưa kết luận nếu không có log tương quan từ lần xảy ra.

## Chuẩn hóa khung Sheet tái sử dụng — 2026-11-03

- Tạo `frontend/src/shared/components/StandardSheet.tsx`, giữ nguyên cấu trúc/kích thước Sheet “Thêm Đảng viên”: chiều rộng `sm:max-w-2xl`, header, body cuộn độc lập với `space-y-6`, footer cố định theo flex layout. Tiêu đề/mô tả/nội dung/nút chân trang là props để feature thay nội dung mà không thay bố cục chuẩn.
- Chuyển phần khung Sheet Thêm/Sửa hồ sơ trong `frontend/src/features/accounts/MemberProfilesPage.tsx` sang component chung; giữ nguyên các trường, payload, API, quyền, validation, xác nhận, nút và hành vi lưu.
- Thay hai checkbox HTML trong form bằng shadcn `Checkbox`; tiếng Việt và điều kiện bật thông tin sinh viên/tạo tài khoản giữ nguyên.
- Đối chiếu `TaoHoSoDto`, `SuaHoSoDto` và `member-profiles.api.ts`: các trường hiện có tương thích hợp đồng Backend, chưa phát hiện thiếu endpoint hoặc trường bắt buộc cần bổ sung cho phạm vi này; không sửa Backend/schema.
- Kiểm tra: Frontend `npm.cmd run typecheck` đạt; `git diff --check` không báo lỗi. Không chạy test suite.
- Các Sheet khác chưa được chuyển sang khung chuẩn trong lượt này; `StandardSheet` sẵn sàng để feature tiếp theo dùng lại mà giữ nguyên quy tắc bố cục.

## Căn chỉnh Sheet hồ sơ theo Google Stitch — 2026-11-03

- Căn chỉnh `StandardSheet` và form Thêm/Sửa hồ sơ theo màn hình `Thêm mới Hồ sơ Đảng viên (Sheet)` của dự án Stitch `PTIT Party Member Portal`: chiều rộng tối đa 1.340px, header 74px, nền nội dung xanh nhạt, nhóm form dạng thẻ trắng, body cuộn độc lập và footer ghim dưới. Form dùng các primitive shadcn hiện có; token màu semantic và Be Vietnam Pro được đồng bộ tập trung.
- Giữ các trường/luồng hiện hữu: tổ chức, trạng thái, thời điểm sinh hoạt, thông tin cá nhân, ba địa chỉ, thông tin sinh viên, tạo tài khoản, quyền, kiểm tra, xác nhận và API.
- Thêm dữ liệu Stitch chưa có trong schema ở lượt trước: số thẻ Đảng viên, ngày chính thức, đơn vị ban hành quyết định và hai người giới thiệu; mapping create/detail/update cùng trả lỗi trùng số thẻ. Đã xác nhận chỉ migration `20261103010000_member_profile_stitch_fields` còn chờ và áp dụng thành công vào PostgreSQL phát triển; không có migration nào khác được chạy trong thao tác này.
- Hai tương tác trong HTML Stitch “Lưu bản nháp” và đồng bộ SIS là mô phỏng, không có hợp đồng API hiện tại. Không gắn nút giả. Hồ sơ cán bộ/PTIT cũng chưa có mô hình dữ liệu/phân quyền riêng; giao diện hiện giữ luồng sinh viên đang được Backend hỗ trợ.
- Kiểm tra lượt này: Frontend `npm.cmd run typecheck`, `npm.cmd run build`; Backend `npm.cmd run prisma:validate`, `npm.cmd run typecheck`; migration deploy thành công; `git diff --check` đạt. Không chạy test suite.

## Trung hòa viền đỏ trên giao diện — 2026-11-03

- Theo ảnh phản hồi, thay token viền ấm hồng/đỏ bằng viền xám trung tính cho toàn giao diện: `--outline`, `--outline-variant`, `--input` ở light/dark theme. Sheet, thẻ, đường phân cách, trường nhập và điều hướng dùng token này; giữ màu nhấn đỏ cho nút/nhận diện thương hiệu.
- Theo ảnh tiếp theo, bỏ khung viền/nền riêng quanh từng nhóm Quê quán, Địa chỉ thường trú và Nơi sinh trong form; giữ tiêu đề nhóm, nhãn và trường dữ liệu, bố trí phẳng trong Sheet.

## Áp dụng mẫu Sheet cho tài khoản và phân quyền — 2026-11-03

- Dùng `StandardSheet` cho form thêm/chỉnh sửa tài khoản, form gán/chỉnh sửa phân quyền, Sheet chi tiết tài khoản và Sheet chi tiết phân quyền. Các Sheet theo cùng kích thước/nhịp header, nền nội dung, vùng cuộn độc lập và footer ghim; detail giữ nguyên tabs và cụm thao tác.
- Giữ nguyên API, payload, validation, tìm hồ sơ chưa liên kết, phân quyền theo quyền hiện có, thao tác Role/Scope, lịch sử và chức năng hiện hữu. Nút footer ngoài form liên kết đúng form HTML qua `form` ID để giữ submit/validation.
- Trung hòa viền thẻ chọn ở form thêm tài khoản theo yêu cầu trước; không đổi nghiệp vụ hoặc Backend.
- Chiều rộng `StandardSheet` có ba mức responsive: form gọn 680px, chi tiết 780px và hồ sơ rộng theo 72vw tối đa 1.340px; từng luồng chọn kích thước phù hợp thay vì dùng một độ rộng chung.
- Kiểm tra: Frontend `npm.cmd run typecheck` đạt. Chưa chạy test suite.

## Thư viện thành phần giao diện — 2026-11-03

- Thêm trang phát triển `/dev/component-library`, route chỉ tồn tại khi chạy Vite development và yêu cầu đăng nhập; không thêm Sidebar nghiệp vụ.
- Danh mục tự thu thập file `.tsx` dưới `frontend/src`, loại chính trang thư viện, `main.tsx` và router; hiện 91 mục. Ghi đúng tên file và đường dẫn tương đối, hỗ trợ tìm kiếm tên/đường dẫn và lọc nhóm.
- Các thẻ minh họa tái sử dụng component nguồn trực tiếp. Bổ sung tương tác cục bộ cho các component như DataTable, StandardSheet, dialog, lựa chọn, tab, menu, phân trang, thông báo, v.v.; dữ liệu chỉ là mẫu, không gọi API nghiệp vụ. Những file phụ thuộc phiên, API, Router boundary hoặc không tự vẽ giao diện được giải thích ngay tại thẻ.
- File mới `frontend/src/features/developer/ComponentLibraryPage.tsx`; chỉnh `frontend/src/app/router/router.tsx`.
- Kiểm tra `npm.cmd run typecheck`, `npm.cmd run build`, `git diff --check` đạt. Build có cảnh báo chunk chính lớn hơn 500 kB; route thư viện chỉ được thêm trong development và không tạo chunk trang này trong production. Không sửa backend hoặc CSDL.

## Hiện lại thông tin tổ chức trong form sửa hồ sơ — 2026-11-03

- Theo phản hồi người dùng, form sửa lại hiển thị Chi bộ, Tổ và ngày bắt đầu sinh hoạt hiện tại; các điều khiển bị vô hiệu hóa để xem, không cho đổi đơn vị bằng thao tác sửa hồ sơ. Giá trị lấy từ lịch sử sinh hoạt hiện hành API chi tiết trả về. Form tạo mới vẫn giữ bộ chọn Chi bộ/Tổ và ngày bắt đầu sinh hoạt.
- Frontend `npm.cmd run typecheck` đạt. Chưa chạy test suite; chưa kiểm tra hiển thị qua trình duyệt.

## Làm mới cache chi tiết sau khi sửa hồ sơ — 2026-11-03

- Nguyên nhân dữ liệu cũ khi mở sửa lại: React Query có `staleTime: 60_000`, nhưng `onSuccess` chỉ invalidation danh sách `member-profiles`, không invalidation cache `member-profile-detail` theo ID. Sau PATCH thành công, vô hiệu hóa cache chi tiết đúng hồ sơ trước khi đóng form để lần mở tiếp theo fetch lại dữ liệu Backend.
- Frontend `npm.cmd run typecheck` đạt. Chưa chạy test suite.

## Hiện CCCD đã lưu khi mở lại form sửa — 2026-11-03

- Nguyên nhân form trống: Frontend gán `soCccd: ''` khi tải hồ sơ và API chi tiết không chọn trường CCCD, dù PATCH đã lưu vào PostgreSQL. API nay trả CCCD cùng thông tin cá nhân chỉ khi người gọi có Permission xem hoặc sửa thông tin cá nhân; form điền lại giá trị đó. Không thêm CCCD vào danh sách hoặc nhật ký.
- Kiểm tra: Backend/Frontend typecheck đạt; PostgreSQL HTTP integration 8/8 đạt, bao gồm PATCH CCCD → GET chi tiết trả đúng CCCD đã lưu và tự động dọn hồ sơ tạm.

## Cập nhật trang Quản lý tài khoản — 2026-11-03

- Bảng tài khoản có đúng 7 cột riêng: STT, Họ và tên, CCCD, Tên đăng nhập, Chi bộ, Trạng thái tài khoản, Thao tác. CCCD được Backend lấy từ bảng thông tin cá nhân và chỉ truy vấn/trả về theo Permission `HO_SO_CA_NHAN_XEM` trong Scope của từng hồ sơ; không thêm dữ liệu lặp vào tài khoản hoặc thay đổi schema.
- Chi tiết tài khoản hiển thị mã hồ sơ, họ tên, CCCD, ngày sinh, Chi bộ/Tổ hiện tại, trạng thái liên kết và trạng thái hồ sơ. Backend kiểm tra `TAI_KHOAN_XEM` theo phạm vi tài khoản, `HO_SO_DANG_VIEN_XEM_TONG_QUAN` theo phạm vi hồ sơ, và quyền thông tin cá nhân riêng cho CCCD/ngày sinh. Nút xem hồ sơ điều hướng tới route hiện có.
- Kiểm tra: Frontend và Backend `npm.cmd run typecheck`, `git diff --check` đạt. Không chạy test suite; không sửa CSDL.

## Chuẩn hóa cột thao tác và bộ chọn tổ chức — 2026-11-03

- Thêm `TableActionHead`/`TableActionCell` dùng chung: sticky `right: 0`, nền theo trạng thái bảng, đường phân cách và z-index cho header/body. Chỉ thay thế các cột hành động của bảng hồ sơ, tài khoản, phân quyền tài khoản và danh sách tổ chức; bảng không có cột hành động giữ nguyên.
- Thêm `OrganizationUnitPicker` và `OrganizationUnitMultiPicker` dùng shadcn Command + Popover: lọc chữ hoa/thường, không dấu, đánh dấu lựa chọn, bàn phím, danh sách cuộn có giới hạn, tự tránh tràn màn hình, xóa lựa chọn và tùy chọn “Tất cả Chi bộ/Tổ”.
- Thay trường tổ chức ở bộ lọc danh sách hồ sơ/tài khoản/phân quyền, form sinh hoạt Chi bộ/Tổ, chọn đơn vị cấp trên khi tạo/sửa đơn vị và chọn Scope gán phân quyền. Tổ vẫn lọc theo Chi bộ đã chọn; options lấy từ API hiện tại, giữ nguyên kiểm tra phạm vi Backend.
- Kiểm tra: Frontend `npm.cmd run typecheck` và `npm.cmd run build` đạt; build báo cảnh báo chunk chính hiện hữu 634,82 kB. Chưa kiểm tra trực tiếp bằng trình duyệt vì quyền quan sát trang local bị từ chối ở cửa sổ phê duyệt; không tìm cách vượt qua. Chưa chạy test suite; không sửa Backend/CSDL.
- Theo ảnh người dùng, tên đơn vị dài trong lựa chọn nay xuống dòng đầy đủ; Popover rộng tối thiểu 24rem nhưng không vượt khung viewport. Badge trạng thái Đảng viên có màu riêng theo token: dự bị (secondary), chính thức (success), đã ra khỏi Đảng (destructive), từ trần (muted). Kiểm tra Frontend typecheck/build và `git diff --check` đạt; còn cảnh báo chunk chính 634,82 kB.
## Sửa lỗi tạo đợt cập nhật hồ sơ — 2026-11-04

- Ảnh người dùng cho thấy đã chọn Chi bộ và biểu mẫu hợp lệ nhưng API trả lỗi máy chủ khi tạo đợt. Truy vấn khóa giao dịch PostgreSQL dùng `pg_advisory_xact_lock`, vốn trả kiểu `void`; đổi kết quả truy vấn sang `text` để Prisma xử lý được, vẫn giữ khóa trong phạm vi giao dịch và chống tạo đợt chồng lấn đồng thời.
- Kiểm tra Backend `npm.cmd run typecheck` đạt. Chưa xác nhận thao tác tạo đợt thực tế trên phiên máy chủ người dùng; cần khởi động lại Backend nếu tiến trình hiện tại không tự nạp mã mới, sau đó thử lại. Nếu lỗi còn, cần đối chiếu `maTuongQuan` trong log Backend.

## Trình soạn thảo văn bản TinyMCE dùng chung — 2026-11-04

- Thêm `RichTextEditor` dùng chung trong `frontend/src/shared/components/`, có chế độ `simple`/`full`, read-only/disabled, required, maxlength, lỗi, placeholder và chiều cao. Bản đầu được dùng cho lý do từ chối yêu cầu cập nhật hồ sơ; vẫn gọi API từ feature hiện có, không đổi luồng phê duyệt hoặc schema PostgreSQL (nội dung nằm trong `lyDoXuLy` VARCHAR(1000)). `RichTextContent` hiển thị lịch sử HTML đã lọc.
- TinyMCE 8.10.1 tự host từ `frontend/public/tinymce/`; script postinstall sao chép assets và locale tiếng Việt cộng đồng. Chỉ dùng gói miễn phí `advlist`, `lists`, `link`, `table`; không bật upload/ảnh hay plugin trả phí. TinyMCE core dùng GPL-2.0-or-later với license key `gpl`; wrapper React dùng MIT. Khi phân phối ứng dụng cần tuân thủ điều khoản GPL của core. Không có thay đổi schema.
- HTML được lọc ở client bằng DOMPurify khi gửi/hiển thị và ở Backend bằng `sanitize-html` trước lưu/đọc; allowlist định dạng/bảng/liên kết, loại script, ảnh, event handler và URL không an toàn. Giới hạn hiện hữu 1000 ký tự tính trên HTML lưu trữ được giữ nguyên; định dạng HTML làm payload dài hơn chữ thuần nên form/API báo lỗi nếu vượt giới hạn này.
- Kiểm tra đạt: Frontend/Backend typecheck, build; frontend 5 unit tests, Backend sanitizer 7 tests, PostgreSQL integration 9 tests (ghi/đọc lại HTML đã làm sạch), Chromium E2E 1 test (locale, nhập/định dạng, toolbar bảng/liên kết, chuyển mode, lọc script/ảnh, theme, read-only); `git diff --check` chạy khi bàn giao. Build Frontend còn cảnh báo chunk chính lớn hơn 500 kB.

## Chuẩn hóa Tab dùng chung — 2026-11-05

- Thêm gạch chân trượt trong `frontend/src/shared/components/ui/tabs.tsx` cho `TabsList variant="line"` nằm ngang. Vị trí và độ rộng lấy từ Tab đang chọn; cập nhật khi đổi Tab, resize và thay đổi thuộc tính DOM. Dùng token `primary`, chuyển động 250 ms và tắt chuyển động theo `prefers-reduced-motion`.
- Giữ nguyên biến thể `default`; danh sách `line` dọc không hiện gạch chân. Không thêm thư viện, không đổi trang/backend/CSDL. Rà soát các trang Hồ sơ của tôi, chi tiết hồ sơ Đảng viên, Cơ cấu tổ chức, Cấu hình phân quyền, Quản lý đợt cập nhật và tab dọc trong chi tiết vai trò.
- Thêm `frontend/tests/tabs.test.tsx` cho thao tác chuột/phím, kích thước khác nhau, resize, biến thể mặc định và dọc.
- Kiểm tra: Frontend `npm.cmd run typecheck` đạt; test Tab đạt (2/2). Toàn bộ frontend tests: 28/29 đạt; test `RichTextEditor > shows required validation and passes read-only state to TinyMCE` thất bại do thiếu thuộc tính `readonly`, ngoài phạm vi thay đổi Tab. `git diff --check` đạt. Chưa chạy kiểm tra giao diện thực tế trên trình duyệt.

## Chuẩn hóa nền trắng cho modal dùng chung — 2026-11-05

- Thêm các token `modal`, `modal-foreground` và `modal-muted-foreground` trong `frontend/src/app/styles/globals.css`; nền trắng tinh và chữ tối được giữ đồng nhất ở cả giao diện sáng/tối.
- Áp dụng token cho Dialog, AlertDialog, Sheet và StandardSheet (gồm đầu trang, nội dung, chân trang). Không chỉnh từng trang, không thêm thư viện hay thay đổi Backend/CSDL.
- Kiểm tra: Frontend `npm.cmd run typecheck` đạt; chưa chạy test suite hoặc kiểm tra trực tiếp trên trình duyệt.

## Chuẩn hóa Tooltip dùng chung — 2026-11-05

- Thêm token `tooltip` xanh lá đậm và `tooltip-foreground` trắng trong bảng màu trung tâm; áp dụng cho nền, chữ và mũi tên của `TooltipContent` dùng chung, nên cả Tooltip Sidebar và thư viện thành phần sử dụng đồng bộ.
- Giới hạn chiều rộng theo khung nhìn, cho phép xuống dòng cả chuỗi dài; tăng khoảng đệm va chạm viewport và mặc định đặt Tooltip cách điều khiển 6px để giảm che/khuất nội dung.
- Kiểm tra: Frontend `npm.cmd run typecheck`; chưa chạy test suite hoặc kiểm tra trực tiếp trên trình duyệt.

## Hoàn thiện xem chi tiết đợt cập nhật — 2026-11-05

- Cột Thao tác tiếp tục dùng menu ba chấm với hành động thực đang có là Xem chi tiết. Chi tiết chuyển sang Dialog cuộn được, hiển thị thông tin đợt, trạng thái, phạm vi, thời gian theo múi giờ Việt Nam, mã tài khoản/ngày tạo từ dữ liệu API và các trường thật sự được mở theo nhóm hồ sơ.
- Không thêm nút chỉnh sửa/kích hoạt/kết thúc/xóa giả. API hiện chỉ có GET danh sách và POST tạo đợt; không có API chi tiết thống kê theo đợt, cập nhật, kích hoạt, kết thúc sớm hoặc xóa. Danh sách yêu cầu bị giới hạn 100 bản ghi nên không thể dùng để tính thống kê chính xác. Schema không có trạng thái Bản nháp/đóng sớm; trạng thái hiện suy ra từ thời hạn. Không sửa Backend/CSDL theo ràng buộc của yêu cầu.
- Phương án cần thống nhất trước giai đoạn Backend: bổ sung API thống kê có lọc phạm vi/đợt; API sửa an toàn; thiết kế trạng thái đợt lưu trữ (cần schema/migration) cho bản nháp/kích hoạt/kết thúc sớm; API xóa chỉ khi chưa có yêu cầu và lịch sử cần bảo toàn; tất cả thao tác phải ghi audit và kiểm quyền/phạm vi phía máy chủ. Sau đó nối chuyển tab và bộ lọc yêu cầu bằng mã đợt/trạng thái.
- Kiểm tra: Frontend `npm.cmd run typecheck` đạt; `npm.cmd test -- tests/member-profile-updates.test.tsx` đạt (6/6); `git diff --check` đạt. Không thay đổi Backend/CSDL.

## Sửa quyền tải trang Hồ sơ của tôi — 2026-11-06

- Nguyên nhân 403: endpoint `GET /ho-so-dang-vien/cua-toi` lấy đúng hồ sơ được liên kết với tài khoản, nhưng chuyển sang `chiTiet()` vốn luôn yêu cầu `HO_SO_DANG_VIEN_XEM_TONG_QUAN`. Menu Hồ sơ của tôi và mô tả quyền trong ma trận lại dùng `HO_SO_CA_NHAN_XEM`, vì vậy tài khoản có quyền xem hồ sơ cá nhân vẫn bị từ chối.
- Endpoint hồ sơ của tôi nay kiểm tra `HO_SO_CA_NHAN_XEM` đối với hồ sơ máy chủ vừa tra theo tài khoản đăng nhập. Permission + Scope vẫn được đánh giá cùng Assignment hiện hành; Scope `CA_NHAN` chỉ khớp hồ sơ liên kết với chính tài khoản. API chi tiết hồ sơ thông thường vẫn yêu cầu `HO_SO_DANG_VIEN_XEM_TONG_QUAN` và phạm vi quản lý.
- Kiểm tra đạt: Backend service tests hồ sơ 19/19; Backend typecheck; `git diff --check`. Không đổi schema, migration, dữ liệu hoặc quyền trong PostgreSQL. Chưa kiểm tra trực tiếp bằng phiên tài khoản trên giao diện người dùng.

## Bổ sung quy tắc nhập Excel Đảng viên — 2026-11-06

- Excel bắt buộc mã hồ sơ, họ tên, ngày sinh, CCCD 12 chữ số, giới tính `NAM`/`NU`, trạng thái Đảng viên, ngày vào Đảng, Chi bộ tồn tại trong phạm vi Permission + Scope, và Khóa Đảng viên do người nhập cung cấp dạng `Dxx`. Không suy luận giới tính/khóa; không tự tạo Chi bộ; CCCD được giữ dưới dạng văn bản để bảo toàn số 0 đầu. Hướng dẫn trong workbook và Dialog đã nêu rõ các trường này.
- Ngày bắt đầu sinh hoạt không bắt buộc trong Excel. Với hồ sơ trống ngày, người quản trị bổ sung ngày thực tế từng dòng ở bản xem trước hoặc áp dụng cùng một ngày cho các dòng đang thiếu. Backend kiểm tra ngày lịch hợp lệ và Permission + Scope; API xác nhận từ chối nếu còn thiếu ngày. `TaoHoSoDto` dùng cho nhập Excel vẫn được kiểm tra các quy tắc còn lại; DTO và biểu mẫu tạo thủ công không đổi.
- Theo lựa chọn người dùng, giữ `lich_su_don_vi_dang_vien.ngay_hieu_luc_tu` NOT NULL, không sửa schema/migration, không gán ngày hiện tại/ngày vào Đảng, và giữ nguyên truy vấn lịch sử/Scope.
- Nhập và xuất chuyển sang shadcn `Dialog`; nhập có thanh tiêu đề/chân cố định, cuộn nội dung, cuộn ngang xem trước, xác nhận khi đóng bản nháp và chặn đóng trong lúc đang xử lý. Sheet của biểu mẫu tạo thủ công không bị đổi.
- Kiểm tra đạt: Frontend và Backend typecheck; ESLint các tệp Frontend liên quan; Frontend test import-preview 1/1; Backend member-profile service tests 19/19; `git diff --check`. Không áp dụng migration hoặc sửa dữ liệu CSDL.

## Hoàn thiện Wizard giao diện Nhập/Xuất — 2026-11-06

- Tách giao diện thành `ImportDataDialog`, `ExportDataDialog`, `useMemberImport` và `useMemberExport`. Modal nhập có bốn bước, tiến trình, tải mẫu/tệp, kiểm tra API, bộ lọc tên/mã/CCCD và trạng thái, báo cáo lỗi, mở chi tiết dòng, bổ sung ngày sinh hoạt, tổng hợp và xác nhận, kết quả. Mật khẩu khởi tạo được che mặc định, người dùng chủ động bật xem; không sinh tệp mật khẩu. Thành công mới làm mới query danh sách/thống kê hiện có.
- Dialog xuất dùng RadioGroup cho hồ sơ đã chọn, theo bộ lọc hoặc toàn bộ phạm vi. Backend hiện chỉ cung cấp bộ cột cố định; không có API chọn nhóm cột, đếm trước bản ghi hoặc trả metadata số lượng. Import preview chưa trả thông tin sinh viên hay username/email từng tài khoản; API chưa hỗ trợ đặt mật khẩu riêng. Không thêm nghiệp vụ giả; mô tả các giới hạn tại `docs/architecture.md`.
- Kiểm tra: Frontend typecheck; ESLint các component/hook/test liên quan; test wizard nhập 1/1. Chưa chạy trực tiếp kiểm tra giao diện trên trình duyệt.

## Hoàn thiện định dạng và hướng dẫn mẫu Excel Đảng viên — 2026-11-06

- Định nghĩa một cấu hình metadata duy nhất cho 38 cột dùng để sinh tiêu đề, dấu `(*)`, màu phân loại, format, dropdown, bảng hướng dẫn và danh sách required dùng trong backend preview. Phiên bản mẫu nâng lên 1.1; tiêu đề nằm ở dòng 3, chú thích bắt buộc nằm ngay trên bảng ở dòng 2.
- Cột bắt buộc có tiêu đề đậm/nền đỏ nhạt; cột bắt buộc có điều kiện nền vàng nhạt; cột tùy chọn nền trung tính. Sheet `Hướng dẫn nhập` liệt kê trường, mức bắt buộc, định dạng, giá trị hợp lệ và ví dụ. Dropdown Excel có cho trạng thái hồ sơ/Đảng viên, giới tính, lựa chọn tạo tài khoản, loại địa chỉ và phân loại nơi sinh. CCCD cùng mã định danh lưu dạng Text; ngày hiển thị `dd/mm/yyyy`.
- Parser kiểm tra header theo cùng metadata và báo thiếu trường với số dòng, khóa trường cùng thông báo tiếng Việt. Dòng kiểm tra chỉ đếm dòng có dữ liệu, không tính vùng trống đã gắn validation cho 200 hồ sơ. Ngày bắt đầu sinh hoạt vẫn có thể trống khi kiểm tra tệp, nhưng hướng dẫn nêu rõ phải bổ sung trước khi xác nhận nhập.
- Kiểm tra: Backend typecheck; test tạo/đọc workbook và validation thiếu dữ liệu 2/2; `git diff --check`. Không đổi schema/migration hay cơ chế nghiệp vụ/phân quyền.

## Xóa vật lý hồ sơ Đảng viên tạo nhầm — 2026-11-06

- Theo quyết định người dùng: cho phép xóa vật lý hồ sơ tạo nhầm cùng dữ liệu ban đầu về sinh hoạt/quá trình; nếu có tài khoản liên kết thì giữ tài khoản, khóa đăng nhập, thu hồi Assignment và phiên. Không sửa schema/migration.
- Thêm `DELETE /ho-so-dang-vien/:maHoSo` có kiểm tra `HO_SO_DANG_VIEN_XOA` + Scope ở guard/service, khóa bản ghi trong transaction, kiểm tra audit và dữ liệu lịch sử. Chỉ xóa bản ghi ban đầu có thể xác minh; từ chối nếu có lịch sử phát sinh, chức vụ hoặc yêu cầu cập nhật cần bảo toàn. Audit không bị xóa; thao tác cũng bảo vệ Quản trị viên toàn hệ thống hợp lệ cuối cùng.
- Bổ sung hành động xóa có xác nhận trong danh sách hồ sơ và đồng bộ mô tả/trạng thái `DA_CO_API` trên Permission catalog cùng tài liệu quy hoạch.
- Kiểm tra đạt: Backend delete service tests 12/12; Frontend delete tests 2/2; Backend và Frontend typecheck. Không đổi schema/migration. Các test này là phạm vi tập trung; chưa chạy toàn bộ test suite.

## Chuẩn hóa ánh xạ và validation nhập Excel Đảng viên — 2026-11-06

- Phiên bản mẫu tăng lên 1.2; dropdown trạng thái dùng nhãn tiếng Việt, sheet Hướng dẫn ghi rõ nhãn và mã enum được chấp nhận.
- Thêm bộ chuẩn hóa trạng thái Đảng viên và ngày dd/mm/yyyy, ISO date-only, Excel serial/Date. Ngày được kiểm tra thực tế (ví dụ loại 31/02) và không đổi ngày theo timezone.
- Backend phân giải mã định danh Chi bộ/Tổ trước DTO, chuyển thành UUID nội bộ, không tạo đơn vị. Với mã hợp lệ, kiểm Permission + Scope sau validation; mã rỗng/không tồn tại nhận lỗi dữ liệu cụ thể và không gọi kiểm quyền theo Chi bộ chưa xác định.
- Thông báo `class-validator` được ánh xạ sang câu tiếng Việt theo dòng/trường; lỗi gốc và lỗi phụ cùng trường được gộp, tránh lộ thông báo ISO/UUID/enum.
- Kiểm tra đạt: test nhập Excel 6/6, Backend typecheck. Không đổi Prisma schema/migration hoặc luồng xác nhận/tạo tài khoản/giao dịch.

## Bổ sung chẩn đoán Prisma khi xác nhận nhập — 2026-11-06

- Bộ lọc lỗi ghi `prismaCode` và metadata giới hạn ở tên model/trường/constraint/target; không ghi query values hoặc SQL tùy ý. Metadata mới xác định `P2007` ở `NhatKyKiemToan`.
- Nguyên nhân: audit tổng kết nhập truyền nhãn `NHAP_HANG_LOAT` vào `maDoiTuong`, nhưng cột là UUID. Audit xuất cũng truyền `DANH_SACH` vào cột này. Cả hai luồng nay ghi `maDoiTuong: null` cho sự kiện tổng hợp; audit từng hồ sơ vẫn lưu UUID tương ứng. Transaction nhập tiếp tục nguyên tử.
- Kiểm tra đạt: Backend typecheck; test import/xác nhận 8/8, test chẩn đoán log 1/1. Không đổi schema/migration.

## Sửa phiên nhập bị báo hết hạn sau lỗi ghi — 2026-11-06

- Ảnh mới cho thấy thông báo “Phiên kiểm tra đã hết hạn” ngay sau lỗi ghi trước đó. Nguyên nhân: `xacNhanNhap` xóa session preview trước khi mở transaction, nên lần ghi lỗi làm lần thử tiếp theo mất session dù chưa hết TTL.
- Chỉ xóa session sau khi transaction thành công; giữ session còn hạn khi ghi thất bại và thêm khóa theo session để từ chối xác nhận đồng thời. Giao dịch vẫn nguyên tử; không đổi schema.
- Kiểm tra đạt: Backend typecheck; test import 7/7, gồm ghi lỗi lặp lại không bị đổi nhầm thành lỗi session hết hạn.
- Lỗi Prisma ban đầu vẫn cần mã `prismaCode`/`meta` từ log sau khi Backend nạp bộ lọc đã cập nhật để xác định ràng buộc gây 500.

## Tinh gọn mẫu Excel theo yêu cầu — 2026-11-06

- Bỏ toàn bộ màu phân loại nền trong workbook; tiêu đề trường bắt buộc tiếp tục có dấu `(*)` và in đậm. Sheet Hướng dẫn giải thích trường bắt buộc có điều kiện bằng chữ, không tham chiếu màu.
- Bỏ nhãn phiên bản hiển thị. Chú thích bắt buộc đặt ở dòng 1, header ở dòng 2, dữ liệu từ dòng 3. Parser vẫn kiểm tra đúng tên/thứ tự header và nhận cả bố cục cũ header dòng 3 để không buộc người dùng mất tệp đã điền.
- Kiểm tra đạt: Backend typecheck; test mẫu/nhập Excel 8/8. Không đổi schema/migration.

## Tinh chỉnh trường Giới tính và nhãn mã Chi bộ nhập Excel — 2026-11-06

- Giới tính đổi thành không bắt buộc trong cấu hình nhập Excel; danh mục `NAM`/`NU` và Data Validation vẫn áp dụng khi nhập giá trị. DTO hiện đã optional và cột CSDL là nullable; không cần schema/migration. Không thay đổi yêu cầu của biểu mẫu tạo thủ công.
- Đổi tiêu đề/hướng dẫn thành `Mã Chi bộ sinh hoạt`, nêu rõ nhập mã như `CB-01` từ sheet tham chiếu, không nhập tên Chi bộ; hướng dẫn trong Modal nhập cũng đã đồng bộ.
- Kiểm tra đạt: Backend typecheck, Frontend typecheck, Backend tests liên quan 9/9. Test xác nhận hồ sơ hợp lệ khi bỏ trống giới tính.

## Chặn ô công thức và hyperlink gây lỗi nhập Excel — 2026-11-06

- ExcelJS trả ô công thức dưới dạng object `{ formula, result }`; trước đây bộ đọc ép object thành chuỗi `[object Object]` rồi vẫn trả thêm lỗi công thức chung. Nay cell text extractor chỉ đọc primitive/rich text an toàn; formula/hyperlink không bị stringify và mỗi lỗi được gắn dòng/trường.
- Tiếp tục từ chối mọi ô công thức, kể cả có `result` cache: Backend không thực thi/tính công thức và không thể chứng minh cached result còn đồng bộ với ô nguồn hay không có liên kết ngoài. Trả hướng dẫn Paste Special → Values. Hyperlink và công thức trong sheet Địa chỉ cũng bị chặn; không đưa công thức vào validation/DTO.
- Kiểm tra đạt: test Excel 14/14 (cache có/không, formula error, external formula, hyperlink, mã hồ sơ và khóa Dxx); không đổi Prisma/schema hoặc nghiệp vụ nhập.
## Trang Nhật ký hệ thống — 2026-11-06

- Triển khai feature `frontend/src/features/system-logs/` và API `backend/src/modules/system-logs/`, tái sử dụng bảng append-only `nhat_ky_kiem_toan`; không đổi schema/migration, không ghi/xóa dữ liệu lịch sử.
- Backend có danh sách phân trang, lọc theo từ khóa/người thực hiện/tài khoản/hành động/kết quả/khoảng ngày/đơn vị, danh mục hành động thực có, danh mục đơn vị trong Scope, thống kê và chi tiết. Từng API yêu cầu Permission riêng `NHAT_KY_KIEM_TOAN_XEM` hoặc `NHAT_KY_BAO_MAT_XEM` trên Assignment hiện hành. Scope đơn vị lọc theo hồ sơ/tài khoản/đơn vị thuộc scope; Scope cá nhân chỉ xem hoạt động tài khoản hiện tại; chỉ Assignment `TOAN_HE_THONG` mới xem toàn hệ thống. Không cấp Permission cho Role.
- Auth thực tế ghi đăng nhập thành công/thất bại, đăng xuất, đổi mật khẩu, đổi trạng thái tài khoản và khóa tài khoản do xóa hồ sơ. Audit thao tác hiện có từ hồ sơ (tạo/sửa/xóa/nhập/xuất), tài khoản, tổ chức, Role/Assignment, năm học và yêu cầu cập nhật hồ sơ. Chưa có nhật ký cho từ chối API do thiếu Permission/Scope; các module khác chưa có cơ chế audit không được giả định có log.
- API chi tiết không trả `duLieuTruoc`/`duLieuSau`; cần quyền dữ liệu nghiệp vụ riêng trước khi mở snapshot. Không cấp Permission mới. Xuất nhật ký chưa triển khai.
- Cập nhật trạng thái catalog hai Permission xem nhật ký sang `DA_CO_API`; quyền xuất nhật ký giữ `CHUA_CO_API`. Sidebar đổi thành “Nhật ký hệ thống” và route `/nhat-ky-he-thong`; frontend ẩn tab/phần không được cấp quyền.
- Kiểm tra đạt: Backend typecheck; 8 test service nhật ký; Frontend typecheck; 3 test permission UI. `npm run prisma:migrate:status` kết nối được PostgreSQL phát triển `quan_ly_dang_vien_dev` tại `127.0.0.1:55432`, 16 migration và schema hiện tại up to date. Chưa chạy E2E/API nhật ký qua server với dữ liệu thật. Không migration.

## Bộ component chọn ngày và thời gian dùng chung — 2026-11-08

- Tạo `frontend/src/shared/components/date-time/` gồm DatePicker, MonthPicker, YearPicker, DateTimePicker, DateRangePicker, DateTimeRangePicker; dùng `react-day-picker`, `date-fns` và shared UI primitives hiện hữu, không thêm dependency.
- Giá trị ngày `yyyy-MM-dd`, tháng `yyyy-MM`, năm number và ngày giờ địa phương `yyyy-MM-dd'T'HH:mm`; không convert date-only qua UTC. Các picker khoảng dùng chung RangeCalendar với preview hover trong lúc chọn đầu cuối và giữ cố định dải màu sau khi chọn ngày kết thúc.
- Trang thư viện thành phần có sáu demo tương tác với mô tả, đường dẫn, trạng thái, ví dụ dùng và thuộc tính chính. Chưa thay thế các form hiện tại.
- Bổ sung kiểm thử date-only, nhập trực tiếp, ngày nhuận/ngày sai, chọn ngày/tháng/năm và preview/freeze khoảng ngày.
- Không thay đổi Backend, CSDL, Sidebar hoặc dependency.
- Kiểm tra cuối: Frontend typecheck đạt; ESLint các file picker, thư viện component và test đạt; `date-time-components.test.tsx` đạt 7/7 (ngày nhuận/không hợp lệ, nhập trực tiếp, chọn ngày/tháng/năm, keyboard giờ, khoảng hover/freeze và xác nhận khoảng ngày giờ); `git diff --check` đạt. Đã xem thư viện component trong Edge và xác nhận sáu demo tương tác được hiển thị; chưa chạy kiểm tra thủ công mọi kích thước viewport hoặc toàn bộ bộ test frontend.

## Rà soát giao diện và quyền trang chi tiết hồ sơ Đảng viên — 2026-11-08

- Đối chiếu chỉ đọc Assignment đang hoạt động của tài khoản: Role `CHANH_VAN_PHONG_DANG_UY` (Chánh văn phòng Đảng ủy), Scope `CAY_DON_VI` tại Đảng ủy Học viện Công nghệ Bưu chính Viễn thông. Assignment có quyền tổng quan hồ sơ, xem lịch sử thay đổi và xem quá trình Đảng; thiếu `SINH_HOAT_XEM_HIEN_TAI`, `SINH_HOAT_XEM_LICH_SU`, `DAO_TAO_DANG_XEM`. Không cấp thêm quyền và không đổi Scope/Role/Assignment. Catalog/controller/service hiện có endpoint tương ứng với Permission + Scope.
- Trang chi tiết: quá trình Đảng nay mặc định chọn sự kiện mới nhất, hiển thị đủ 7 trường và có bảng chọn sự kiện; lịch sử thay đổi dùng bảng sắp xếp mới nhất, phân trang 10 dòng và Dialog chỉ hiển thị giá trị thay đổi, bỏ trường CCCD/định danh nhạy cảm. Đào tạo Đảng dùng bảng và Dialog xem; trạng thái thiếu quyền, không có dữ liệu và lỗi API có nội dung riêng, lỗi có nút thử lại.
- Thay đổi trong `frontend/src/features/member-profiles/pages/MemberProfileDetailPage.tsx` và `frontend/src/features/member-profiles/components/MemberProfileSupplementarySections.tsx`. Không thay Backend, CSDL hoặc dữ liệu hồ sơ.
- Kiểm tra: Frontend typecheck đạt; ESLint riêng hai file thay đổi đạt; build production đạt. Lệnh ESLint toàn dự án không đạt do lỗi hiện có trong tài sản TinyMCE và các file ngoài phạm vi (5.480 lỗi/190 cảnh báo). Build có cảnh báo chunk chính lớn hơn 500 kB. Không chạy test suite và chưa thực hiện kiểm tra trực quan trên trình duyệt.

## Tinh chỉnh giao diện chi tiết hồ sơ Đảng viên — 2026-11-08 (bổ sung)

- Đối chiếu read-only PostgreSQL dev với hồ sơ mã `002`: hồ sơ tồn tại, không có bản ghi `PhanCongChucVu`; trạng thái Empty State chức vụ/nhiệm kỳ là đúng dữ liệu, không tạo dữ liệu mẫu. Tab chức vụ hiện phân biệt thiếu Permission, lỗi API/403 phạm vi, đang tải và dữ liệu trống; chỉ gọi API khi có `PHAN_CONG_CHUC_VU_XEM`.
- Assignment `CHANH_VAN_PHONG_DANG_UY` hiện tại tiếp tục thiếu `SINH_HOAT_XEM_HIEN_TAI` và `DAO_TAO_DANG_XEM` (ngoài quyền lịch sử sinh hoạt); không cấp quyền, không bỏ RBAC. Card sinh hoạt giữ thông báo thiếu quyền; nếu có quyền nhưng không có đơn vị hiện hành thì dùng Empty State “Chưa có thông tin sinh hoạt hiện tại”.
- Tab Quá trình Đảng nay chỉ có bảng sự kiện 6 cột, sắp mới nhất trước với ngày thiếu/không hợp lệ cuối danh sách và mã sự kiện làm khóa ổn định. Nút Xem chi tiết mở Dialog responsive hai cột có đủ 7 trường và nút Đóng. Cột thao tác sticky bên phải; Tooltip dùng token màu xanh đã chuẩn hóa. Bỏ hoàn toàn Alert phụ phía dưới.
- Kiểm tra: Frontend typecheck, ESLint hai file liên quan, production build và `git diff --check` đạt. Build vẫn có cảnh báo hiện hữu về chunk lớn hơn 500 kB. Không chạy tests và chưa thực hiện visual QA trên trình duyệt.

## Đồng bộ tab Hồ sơ của tôi với trang chi tiết — 2026-11-08

- Tái sử dụng `PartyProcessRecordsSection`, `PositionAssignmentsSection`, `PartyTrainingSection`, `EmptyState`, shadcn Table/Dialog/Tooltip/Badge giữa trang cá nhân và trang quản lý. Quá trình Đảng cùng có 6 cột, sắp xếp có tính ổn định, Dialog đầy đủ 7 trường; đào tạo dùng cùng bảng/Dialog; phân công hiển thị cùng cấu trúc dữ liệu. Tab chức vụ của Hồ sơ của tôi có Empty State “Chưa có thông tin chức vụ và nhiệm kỳ.”
- Chuẩn hóa định dạng ngày và nhãn Enum chung qua `member-profile-display.service.ts`. Giữ nguyên thông tin/các quy trình hiện có; xóa Alert cuối trang mà không đổi logic cập nhật. Hồ sơ cá nhân tiếp tục lấy qua `/ho-so-dang-vien/cua-toi` và không nhận ID hồ sơ từ URL/người dùng.
- Rà quyền: lần kiểm kê Assignment hiện hành gần nhất cho Role `CHANH_VAN_PHONG_DANG_UY` ghi nhận có `QUA_TRINH_DANG_XEM`; API quá trình dùng guard và kiểm tra lại Permission + Scope trên Assignment phiên. `PhanQuyenService` hỗ trợ `CA_NHAN` bằng cách xác nhận `maHoSo` có liên kết với đúng `maTaiKhoan`; Assignment theo cây/đơn vị chỉ được truy cập khi hồ sơ nằm trong Scope đó. API `/cua-toi` luôn truy hồ sơ theo `maTaiKhoan` ở máy chủ trước khi giao diện gọi các API đọc theo ID nội bộ. Không thấy logic Backend bỏ nhầm Assignment hoặc cho phép vượt Scope; không sửa API/RBAC. Phân biệt thiếu Permission ở giao diện với lỗi API/phạm vi, có nút thử lại.
- Files thay đổi: `frontend/src/features/my-profile/pages/MyMemberProfilePage.tsx`, `frontend/src/features/member-profiles/pages/MemberProfileDetailPage.tsx`, `frontend/src/features/member-profiles/components/MemberProfileDetailSections.tsx`, `frontend/src/features/member-profiles/services/member-profile-display.service.ts`.
- Kiểm tra: Frontend typecheck, ESLint bốn file liên quan, production build và `git diff --check` đạt. Build còn cảnh báo chunk chính lớn hơn 500 kB. Không chạy test suite; chưa kiểm tra trực quan trình duyệt.

## Chuyển khai báo sinh hoạt ngoài PTIT sang Hồ sơ của tôi — 2026-11-08

- Chuyển biểu mẫu “Thông tin chuyển sinh hoạt từ ngoài PTIT” sang tab Thông tin Đảng viên của Hồ sơ của tôi. Chi tiết hồ sơ Đảng viên chỉ đọc danh sách và nội dung đã lưu; không hiển thị biểu mẫu thêm.
- Giữ `SINH_HOAT_XEM_LICH_SU` và `SINH_HOAT_SUA_LICH_SU` cùng kiểm tra Assignment + Scope hiện có. Service từ chối POST nếu tài khoản hiện tại không liên kết chính xác với hồ sơ được gửi; không cấp hoặc đổi Permission. Giao diện chỉ hiện biểu mẫu khi có quyền sửa.
- Bổ sung trường `noi_dung` tùy chọn (tối đa 2.000 ký tự) vào bản ghi chuyển sinh hoạt ngoài; API đọc/trả trường này, giao diện hiển thị sau khi lưu và trên trang chi tiết. Audit chỉ ghi cờ có nội dung, không ghi phần tự khai.
- Migration `20261108160000_add_outside_membership_content` đã áp dụng vào PostgreSQL phát triển `quan_ly_dang_vien_dev` tại `127.0.0.1:55432`; `prisma migrate status` xác nhận schema up to date.
- Files: `backend/prisma/schema.prisma`, migration mới, DTO/service Backend, `frontend/src/features/member-profiles/api/member-profiles.api.ts`, `MemberProfileSupplementarySections.tsx`, `MemberProfileDetailPage.tsx`, `frontend/src/features/my-profile/pages/MyMemberProfilePage.tsx`, `docs/architecture.md`.
- Kiểm tra: Backend/Frontend TypeScript, Backend build, Frontend build, Prisma validate, ESLint bốn file Frontend và `git diff --check` đạt. Frontend build còn cảnh báo chunk chính vượt 500 kB. Không chạy test suite.
