# Kiến trúc hệ thống

Quy hoạch nhóm Sidebar, vị trí module và quy tắc bổ sung chức năng được duy trì tại [`sidebar-module-conventions.md`](sidebar-module-conventions.md). Trước khi tạo module hoặc chức năng mới, cần đọc tài liệu này và xác định nhóm nghiệp vụ phù hợp.

## Trạng thái và mục tiêu

### Hiện có

Frontend React/TypeScript/Vite nằm trong `frontend/src/`, gồm `app`, `core`, `layouts`, `shared`, `features`; có router tập trung, Axios client, TanStack Query và UI shadcn-style. Có feature đăng nhập/đổi mật khẩu, quản trị phân quyền, hồ sơ/tài khoản, tổ chức, nhập/xuất và nhật ký hệ thống. Backend nằm trong `backend/`, dùng NestJS + Prisma 7 + PostgreSQL; có xác thực, Permission/Assignment/Scope, API nghiệp vụ và truy vấn nhật ký. Nhật ký hệ thống đọc bảng append-only `nhat_ky_kiem_toan` với quyền và Scope ở Backend; không tạo bảng log mới. Role/Assignment nghiệp vụ không được seed và chưa có dữ liệu PTIT. Giao diện phân quyền không thay thế kiểm tra Permission + Scope tại Backend.

### Mục tiêu đã duyệt

Tiếp tục mở rộng Backend NestJS + Prisma + PostgreSQL hiện có theo Modular Monolith. Giữ Frontend Base hiện tại trong `frontend/` và phát triển feature theo module. Không chuyển nguyên xi mô hình Tenant hoặc nghiệp vụ từ hệ thống khác.

## Ngôn ngữ định danh

- Tên dự án định nghĩa cho bảng/cột, thực thể/lớp, đường dẫn API, trường JSON, quyền, phạm vi và mã trạng thái dùng tiếng Việt không dấu.
- Quy ước: bảng/cột `snake_case`; trường JSON `camelCase`; lớp `PascalCase`; endpoint chữ thường, từ nối bằng dấu gạch ngang; mã enum viết hoa và phân tách bằng `_`.
- Ví dụ: bảng `don_vi_to_chuc`, JSON `maDonVi`, endpoint `/api/v1/to-chuc`, mã phạm vi `CAY_DON_VI`.
- Giao diện và tài liệu nghiệp vụ viết tiếng Việt có dấu. Tên chuẩn NestJS, Prisma, PostgreSQL, React, HTTP, UUID và tên giao thức không dịch.
- Tên thư mục và file mã nguồn dùng tiếng Anh theo quy ước TypeScript/NestJS; thư mục dùng `kebab-case`, file NestJS dùng hậu tố quen thuộc như `.module.ts`, `.controller.ts`, `.service.ts`. Tên API, JSON và database theo quy ước đã được duyệt riêng.
- Prisma Client cũng dùng định danh tiếng Việt không dấu đồng bộ với CSDL: model/enum PascalCase, trường/quan hệ camelCase; @map/@@map giữ tên bảng/cột vật lý snake_case. Đổi tên định danh Prisma không đổi bảng/cột khi các map được giữ nguyên.

## Phân tầng và ranh giới module

### Giao diện

Giữ các tầng hiện có:

- `frontend/src/app/`: router, providers và lắp ghép ứng dụng.
- `frontend/src/core/`: API client, auth/session integration, cấu hình chung.
- `frontend/src/layouts/`: khung ứng dụng và điều hướng.
- `frontend/src/shared/`: UI và tiện ích dùng chung, không chứa nghiệp vụ riêng.
- `frontend/src/features/`: giao diện và logic tích hợp của từng module.

Mỗi feature được tổ chức theo nghiệp vụ trong `frontend/src/features/<feature>/`. Dùng `pages/` cho trang được router lắp ghép; `components/` cho thành phần nghiệp vụ; `api/` cho adapter HTTP; `types/`, `validation/`, `constants/`, `services/` và `hooks/` khi có nhu cầu thực tế. Không tạo đủ mọi thư mục theo khuôn nếu feature không cần chúng. Logic biến đổi dữ liệu thuần và định dạng có thể kiểm thử độc lập nên đặt trong `services/`; component lớn, có trách nhiệm riêng như biểu mẫu/hộp thoại nên tách vào `components/` mà vẫn giữ nguyên giao diện và luồng nghiệp vụ.

Các feature không được tạo chu trình phụ thuộc. Cho phép phụ thuộc một chiều có chủ đích khi một feature tổng hợp dữ liệu từ API feature khác; ưu tiên chia sẻ presentation component không chứa nghiệp vụ qua `shared/` khi thật sự dùng chung. `shared/`, `core/` và `layouts/` không phụ thuộc vào feature. Route URL và hợp đồng API hiện hữu phải được giữ ổn định khi chỉ tái cấu trúc thư mục.

Feature nghiệp vụ hiện tại gồm `accounts/` (quản lý tài khoản), `member-profiles/` (hồ sơ Đảng viên), `my-profile/` (hồ sơ cá nhân), `profile-updates/` (đợt và yêu cầu cập nhật), `authorization/` (Role, Permission, Assignment), `organizations/` (cơ cấu tổ chức), `school-years/` (năm học), cùng `dashboard/`, `settings/`, `auth/` và `developer/`. Phân nhóm và trạng thái hiển thị Sidebar theo quy hoạch tại [`sidebar-module-conventions.md`](sidebar-module-conventions.md). Trước khi tạo feature/module mới phải đọc quy hoạch Sidebar và xác định nhóm phù hợp; đề xuất và chờ duyệt nếu không phù hợp nhóm hiện có.

Không để `shared`, `core` hoặc `layouts` phụ thuộc feature. Component trình bày không gọi API trực tiếp. Dùng Axios client và TanStack Query hiện có; chỉ mở rộng khi có nhu cầu cụ thể.

`frontend/src/core/auth/auth.api.ts` là adapter gọi API xác thực; dữ liệu phiên không chứa Role/Permission. `AuthProvider` dùng TanStack Query để khôi phục phiên; `RequireAuth` chỉ bảo vệ trạng thái đăng nhập và buộc đổi mật khẩu lần đầu, không kiểm tra quyền nghiệp vụ. Axios gửi cookie phiên bằng `withCredentials`.

Màu giao diện được quản lý tập trung bằng CSS variables semantic tại `frontend/src/app/styles/globals.css`, gồm light/dark theme và token cho sidebar. Feature/layout chỉ dùng token semantic qua UI primitives/Tailwind; không hard-code màu hoặc định nghĩa palette riêng trong module nếu chưa được duyệt.

### Máy chủ mục tiêu

```text
backend/src/
  app.module.ts          # lắp ghép ứng dụng
  common/                # cấu hình dùng chung, lọc lỗi, logging
  infrastructure/        # Prisma và tích hợp hạ tầng
  modules/
    auth/                 # xác thực tài khoản hiện có
    accounts/             # quản trị tài khoản, chưa triển khai
    organizations/       # cây tổ chức và lịch sử (API đã triển khai)
    authorization/       # Permission/Scope và API quản lý Role/Assignment
    audit/                # kiểm toán nghiệp vụ
    party-members/        # triển khai sau MVP tổ chức/phân quyền
```

Các module `auth`, `authorization`, `organizations`, `health` đã được tạo; `accounts`, `audit` và `party-members` trong sơ đồ vẫn là mục tiêu chưa triển khai. Bộ điều khiển xử lý HTTP và dữ liệu vào/ra; dịch vụ điều phối nghiệp vụ và transaction; quy tắc thuần kiểm tra điều kiện; Prisma truy cập cơ sở dữ liệu. Mô-đun không truy cập trực tiếp bảng nội bộ của mô-đun khác; dùng dịch vụ/hợp đồng nội bộ công khai. Chỉ thêm tầng/lớp khi có nhu cầu thực tế.

## Domain và database mục tiêu

Data dictionary tổng hợp gồm trường, kiểu dữ liệu và khóa nằm tại `docs/THIET_KE_CSDL_TONG_THE.md`. Quyết định kiến trúc, phạm vi và nguyên tắc nghiệp vụ nằm tại `docs/adr/0001-kien-truc-nen-tang.md`:

Thiết kế mở rộng hồ sơ theo tab và phân nhóm dữ liệu nằm tại `docs/THIET_KE_HO_SO_DANG_VIEN.md`; đây là đề xuất chờ duyệt và chưa phải schema đã triển khai.

- `don_vi_to_chuc`, `lich_su_ten_don_vi`, `lich_su_quan_he_don_vi`: Đảng ủy → Chi bộ → Tổ tùy chọn; giữ lịch sử tên và cha–con.
- `tai_khoan_nguoi_dung`: thông tin tài khoản nội bộ do quản trị viên quản lý; SSO nhà trường có thể tích hợp sau nếu được cấp quyền.
- `ho_so_dang_vien`: hồ sơ tách biệt; liên kết tài khoản tùy chọn một-một.
- `lich_su_don_vi_dang_vien`: mỗi thời điểm một Chi bộ chính và tối đa một Tổ thuộc Chi bộ đó.
- `danh_muc_chuc_vu`, `nhiem_ky`, `phan_cong_chuc_vu`: tách chức danh, nhiệm kỳ và lịch sử phân công; không tạo mô hình cấp ủy/chi ủy.
- `vai_tro`, `quyen`, `vai_tro_quyen`, `phan_cong_vai_tro`, `pham_vi_don_vi`: Role có nhiều Permission theo ma trận; Assignment gắn Role/tài khoản/phạm vi/thời hạn.
- `nhat_ky_kiem_toan`: audit nghiệp vụ append-only theo quyền được cấp.

Nhật ký hệ thống là chức năng quản trị đặc biệt, chỉ dành cho Quản trị viên toàn hệ thống có Assignment hợp lệ. Mọi API đọc nhật ký và xem trước dọn dẹp yêu cầu phiên hiện tại đang chọn Role có mã định danh `QUAN_TRI_VIEN_TOAN_HE_THONG`, Role hệ thống đang hoạt động, tài khoản đang hoạt động, Assignment chưa bị thu hồi/còn hạn và Scope `TOAN_HE_THONG`; sau đó Backend vẫn kiểm tra Permission riêng tương ứng. Các Scope cây đơn vị, đơn vị chỉ định hoặc cá nhân không cấp quyền xem nhật ký hệ thống, kể cả khi Role có Permission nhật ký. Điều kiện này cũng áp dụng cho lịch sử audit hiển thị tại tài khoản và lịch sử phân công. Frontend chỉ dùng thông tin phiên máy chủ để ẩn mục điều hướng và chặn URL trực tiếp; Backend là nơi thực thi quyền. Khi chuyển Assignment, cache truy vấn bị xóa. JSON trước/sau chưa trả qua API chung vì quyền xem trường nghiệp vụ bên trong chưa được đánh giá riêng. Nhật ký xác thực hiện có đăng nhập thành công/thất bại, đăng xuất, đổi mật khẩu và khóa tài khoản khi xóa hồ sơ liên kết; chưa ghi nhận lần từ chối API do thiếu Permission/Scope. Các thao tác chưa có lệnh ghi audit tiếp tục không xuất hiện trong danh sách.

Mọi mã định danh dùng UUID. Quan hệ tham chiếu dùng khóa ngoại; khóa duy nhất và chỉ mục đặt theo quy tắc ở ADR. Không tạo trước tên Chi bộ, Tổ, chức vụ hoặc dữ liệu Đảng viên. Đơn vị ngừng hoạt động thay vì xóa vật lý. Các quy tắc qua nhiều bảng phải được kiểm tra trong transaction phía máy chủ; ràng buộc cơ sở dữ liệu bảo vệ khóa ngoại, tính duy nhất và số lượng quan hệ phù hợp.

## Phân quyền

### Xóa hồ sơ Đảng viên

`DELETE /ho-so-dang-vien/:maHoSo` yêu cầu Permission `HO_SO_DANG_VIEN_XOA` và Scope trên hồ sơ ở cả guard và service. Backend khóa hồ sơ rồi kiểm tra trong transaction: chỉ chấp nhận một bản ghi sinh hoạt ban đầu và tối đa một mốc vào Đảng ban đầu nếu chúng được xác minh cùng audit tạo hồ sơ; mọi lịch sử sinh hoạt/quá trình phát sinh sau đó, phân công chức vụ hoặc yêu cầu cập nhật đều chặn xóa. Không thay đổi schema và không cascade.

Khi xóa được duyệt, transaction xóa rõ ràng thông tin cá nhân, địa chỉ, thông tin sinh viên và các bản ghi sinh hoạt/quá trình ban đầu; giữ nguyên audit. Nếu có tài khoản liên kết, giữ tài khoản nhưng đặt `TAM_KHOA`, thu hồi Assignment và phiên đăng nhập; thao tác bị chặn nếu làm mất Quản trị viên toàn hệ thống hợp lệ cuối cùng. Giao diện chỉ hiện hành động theo quyền, xác nhận bằng `AlertDialog` và chỉ đóng/làm mới sau phản hồi thành công. Catalog Permission đánh dấu `HO_SO_DANG_VIEN_XOA` là `DA_CO_API`.

### Nhập/Xuất dữ liệu

`backend/src/modules/data-transfer/` cung cấp thao tác kỹ thuật cho workbook `.xlsx`; mapping và quy tắc nghiệp vụ nằm trong module sở hữu dữ liệu. Module chung không ghi trực tiếp vào bảng nghiệp vụ. Feature Hồ sơ Đảng viên dùng API `/ho-so-dang-vien/nhap-xuat/*`, kiểm tra Permission + Scope, audit và transaction nghiệp vụ hiện có. Preview có thời hạn, giới hạn 5 MB/200 dòng và không lưu tệp lên đĩa. Phiên bản ban đầu lưu preview tạm trong bộ nhớ tiến trình, nên chỉ phù hợp triển khai một instance; triển khai nhiều instance cần kho phiên tạm dùng chung có TTL và ràng buộc người dùng.

Nhập Excel Đảng viên bắt buộc mã hồ sơ nội bộ, họ tên, ngày sinh, CCCD đủ 12 chữ số, trạng thái Đảng viên (hỗ trợ nhãn tiếng Việt và mã enum), ngày vào Đảng, mã Chi bộ tra cứu từ danh mục, và khóa do người dùng khai báo theo dạng `Dxx`. Giới tính là tùy chọn trong luồng Excel; nếu nhập phải thuộc `NAM`/`NU`. Mẫu không hiển thị mã phiên bản; Backend kiểm tra tên/thứ tự header và chấp nhận vị trí header cũ để hỗ trợ tệp đã điền. Dấu `(*)` nhận diện trường bắt buộc; không phân biệt mức bắt buộc bằng màu. Bộ chuẩn hóa chuyển ngày dd/mm/yyyy hoặc ô ngày Excel sang date-only ISO, kiểm tra ngày thực có thật và không phụ thuộc timezone; mã Chi bộ/Tổ được phân giải trước khi Permission + Scope. Cột ghi rõ `Mã Chi bộ sinh hoạt`; cần nhập mã định danh trong sheet tham chiếu, không nhập tên đơn vị. `DataTransferService.readCell` là bộ đọc dùng chung: **mọi cột/field trong mọi tệp Excel nhập đều có thể dùng kết quả công thức đã được lưu trong workbook, không phụ thuộc tên trường hoặc nghiệp vụ**. Bộ đọc chỉ trả scalar cache (chuỗi, số, ngày, boolean hoặc rỗng), không thực thi/tính công thức; cache thiếu/lỗi, công thức tham chiếu workbook ngoài, hàm truy cập/liên kết không an toàn, named range dẫn nguồn ngoài và hyperlink bị từ chối. XML workbook được kiểm tra để giữ khả năng phân biệt cache chuỗi rỗng với cache không có kết quả mà ExcelJS tự chuẩn hóa thành null. Feature sở hữu chuẩn hóa, validation, danh mục, trùng lặp, Permission + Scope và thông báo lỗi theo dòng/cột. Không ép đối tượng Excel thành chuỗi; CCCD và mã định danh qua validation để phát hiện số 0 đầu bị mất. Ngày bắt đầu sinh hoạt được phép trống trong workbook, nhưng người quản trị phải bổ sung ngày hợp lệ ở bước xem trước trước khi xác nhận; không suy ra ngày mặc định. Ràng buộc `ngay_hieu_luc_tu` và các truy vấn lịch sử/Scope được giữ nguyên. Giao diện nhập/xuất dùng Dialog shadcn/ui; thao tác nhập có xác nhận khi đóng bản nháp và chặn đóng trong lúc ghi.

Frontend đặt phần điều phối luồng trong `features/member-profiles/hooks/` và các Dialog/step trong `features/member-profiles/components/import-export/`; thanh bước, thẻ tổng hợp và thành phần chọn nhóm trường dùng chung đặt tại `shared/components/data-transfer/`. Hợp đồng preview nhập trả về thông tin hồ sơ cơ bản và cờ tạo tài khoản; mật khẩu ban đầu được tạo ngẫu nhiên và chỉ trả một lần sau khi xác nhận thành công. Xuất dữ liệu hỗ trợ hồ sơ đã chọn, toàn bộ kết quả bộ lọc (không giới hạn trang), một đơn vị tổ chức và toàn bộ phạm vi được cấp. Cấu hình xuất trả về các trường/đơn vị người thao tác được phép lựa chọn; Backend xác minh lại quyền xuất, phạm vi tổ chức, từng trường và phạm vi xem dữ liệu từng hồ sơ, không phụ thuộc quyền xem danh sách. Chỉ các trường được chọn được ghi thành cột, theo thứ tự đã chọn; địa chỉ được trải thành cột cố định theo loại để mỗi hồ sơ chỉ có một dòng. Dữ liệu nhiều quan hệ khác không làm nhân bản hồ sơ. Tệp `.xlsx` dùng nhãn tiếng Việt, ngày `dd/mm/yyyy`, mã định danh dạng văn bản, chuyển các trạng thái hỗ trợ sang nhãn nghiệp vụ và trung hòa chuỗi có thể bị Excel hiểu là công thức. Không có số lượng ước tính trước. Preview nhập hiện lưu tạm trong bộ nhớ một tiến trình; triển khai nhiều instance cần kho phiên dùng chung có TTL.

Nhập tài khoản hàng loạt thuộc `features/accounts/` và tái sử dụng `DataTransferService.readCell` cho mọi cột, bao gồm kết quả công thức cache; module tài khoản sở hữu ánh xạ, kiểm tra DTO, trùng lặp, Permission và Scope hồ sơ. API là `/tai-khoan/nhap-xuat/{mau,kiem-tra,xac-nhan,bao-cao-loi}` và dùng Permission `TAI_KHOAN_TAO`; chế độ liên kết còn yêu cầu `TAI_KHOAN_LIEN_KET_HO_SO`, còn trạng thái không hoạt động yêu cầu `TAI_KHOAN_KHOA_MO_KHOA`. Preview gắn với người thao tác, TTL 10 phút, giới hạn 5 MB/200 dòng, giữ password hash thay vì mật khẩu thuần văn bản, kiểm tra lại quyền/dữ liệu trước xác nhận và tạo tài khoản cùng audit trong một transaction. Chế độ liên kết chỉ tra cứu hồ sơ nội bộ đã có, chưa liên kết, trong Scope; không tạo hồ sơ, Role, Permission hay Assignment. Không đổi schema hoặc migration. UI tài khoản đặt luồng bốn bước trong Dialog, thẻ kết quả có thể lọc lại danh sách; trạng thái “Tạm khóa hoặc ngừng hoạt động” được lọc như một nhóm mà vẫn thực hiện phân trang và Scope phía Backend.

## Bộ chọn ngày và thời gian dùng chung

Các picker dùng chung nằm tại `frontend/src/shared/components/date-time/` và được export từ `index.ts`: `DatePicker`, `MonthPicker`, `YearPicker`, `DateTimePicker`, `DateRangePicker`, `DateTimeRangePicker`. Thành phần dùng `react-day-picker`, `date-fns`, Popover, Button, Input và token semantic sẵn có; không thêm dependency. Giá trị ngày date-only là `yyyy-MM-dd`, tháng là `yyyy-MM`, và ngày giờ cục bộ là `yyyy-MM-dd'T'HH:mm`. Không chuyển giá trị date-only qua UTC. Hai picker khoảng dùng chung `RangeCalendar`; trạng thái rê chuột chỉ tạo preview khi đang chờ đầu cuối, sau khi chọn đầu cuối thì vùng ngày đã chọn đứng yên. Các component là hạ tầng trình bày, không thay thế validation nghiệp vụ. Mọi màn hình mới cần chọn ngày/tháng/năm/khoảng thời gian phải ưu tiên dùng bộ này; chưa chuyển đổi hàng loạt form hiện hữu.

Mô hình gồm `vai_tro`, `quyen`, `vai_tro_quyen` và `phan_cong_vai_tro`. Một vai trò có nhiều quyền; một quyền có thể thuộc nhiều vai trò. Một tài khoản có thể có nhiều phân công đồng thời.

Mã phạm vi đã duyệt:

- `CA_NHAN`: dữ liệu liên hệ xác thực với chính tài khoản.
- `CAY_DON_VI`: đơn vị được gán và các hậu duệ hiện hành.
- `DON_VI_CHI_DINH`: chỉ các đơn vị được liệt kê, không tự mở rộng xuống dưới.
- `TOAN_HE_THONG`: toàn phạm vi PTIT miền Bắc.

Máy chủ cho phép khi tài khoản hợp lệ, phân công còn hiệu lực, vai trò chứa quyền yêu cầu, phạm vi bao phủ đối tượng và chính sách dữ liệu nhạy cảm cho phép. Không ghép quyền của phân công này với phạm vi của phân công khác. Mặc định từ chối khi không xác định được quyền hoặc phạm vi. Giao diện có thể ẩn menu/nút nhưng không thay thế kiểm tra phía máy chủ.

## API và hợp đồng

- REST JSON, prefix `/api/v1`.
- Frontend Axios dùng `VITE_API_BASE_URL=/api/v1`. Vite dev proxy `/api/v1/*` tới `BACKEND_PROXY_TARGET` (mặc định `http://127.0.0.1:3001`); triển khai cần reverse proxy cùng prefix hoặc đặt URL API phù hợp với môi trường.
- Đường dẫn và khóa JSON do dự án định nghĩa dùng tiếng Việt không dấu; ví dụ `/api/v1/to-chuc/{id}/lich-su`, `maDonVi`, `ngayHieuLucTu`.
- Mã nghiệp vụ dùng tiếng Việt không dấu, ví dụ `TO_CHUC.XEM`, `KHONG_DU_QUYEN`.
- Danh sách có phân trang; response/lỗi theo schema thống nhất và có `maTuongQuan`.
- Lỗi Backend `{ maLoi, thongBao, maTuongQuan }` được Axios chuẩn hóa thành thông báo, mã HTTP, mã lỗi và mã tương quan cho giao diện.
- Không trả stack trace, SQL, token, credential hoặc dữ liệu cá nhân ngoài phạm vi.
- Máy chủ kiểm tra quyền + phạm vi cho từng yêu cầu và từng đối tượng; không tin đơn vị hoặc quyền do giao diện gửi.
- Giai đoạn đầu dùng tài khoản nội bộ do quản trị viên quản lý. Phiên trình duyệt đề xuất cookie `HttpOnly`, `Secure`, `SameSite` và CSRF protection; SSO PTIT là tích hợp tương lai.
- Các endpoint xác thực hiện có: `POST /api/v1/xac-thuc/dang-nhap`, `GET /api/v1/xac-thuc/phien-hien-tai`, `GET/PATCH /api/v1/xac-thuc/tai-khoan-cua-toi`, `POST /api/v1/xac-thuc/doi-mat-khau`, `POST /api/v1/xac-thuc/dang-xuat`. Tài khoản chỉ tự sửa email; không tự khóa/xóa. Cookie dùng `HttpOnly`, `SameSite=Strict`, bật `Secure` ngoài `PHAT_TRIEN`; thao tác thay đổi kiểm tra `Origin` theo `URL_GIAO_DIEN_DUOC_PHEP`. Token phiên ngẫu nhiên chỉ lưu dạng SHA-256 trong CSDL; mật khẩu dùng scrypt. Thời hạn phiên, ngưỡng đăng nhập sai và thời gian khóa cấu hình qua môi trường.
- `XacThucGuard` chỉ xác nhận tài khoản/phiên; `@RequirePermission` gắn guard kiểm tra Permission + Assignment + Scope. API tổ chức và API quản trị Role/Assignment áp dụng các Permission trong ma trận; cấp Assignment thường bị giới hạn trong quyền/Scope của người cấp. Role `QUAN_TRI_VIEN_TOAN_HE_THONG` dùng Scope `TOAN_HE_THONG`, Assignment không mặc định hết hạn; cấp/thu hồi qua CLI vận hành allowlist có mã phê duyệt, audit và bảo vệ quản trị viên hợp lệ cuối cùng. API thường không cấp/thu hồi Role cao nhất. Chi tiết ở `docs/THIET_KE_MA_TRAN_QUYEN.md` và `docs/THIET_KE_API_PHAN_QUYEN.md`. Không có đăng ký công khai, endpoint HTTP tạo tài khoản hay tài khoản mặc định.
- Tài khoản đầu tiên được tạo thủ công bằng `npm run bootstrap:admin` trong thư mục `backend/`. Lệnh yêu cầu terminal tương tác để nhập mật khẩu kín, kiểm tra bảng tài khoản còn rỗng trong transaction có khóa bảng để ngăn hai lần khởi tạo đồng thời, ghi audit sự kiện bootstrap và đặt `doiMatKhauLanDau=true`. Lệnh chỉ tạo account; không gán Role/Permission. Không chạy lệnh này sau khi đã có tài khoản.

## Nhật ký và dữ liệu cá nhân

- Log vận hành có cấu trúc, gồm thời gian, mức độ, route, mã HTTP, thời gian xử lý và `maTuongQuan`; không log request body mặc định.
- Nhật ký kiểm toán ghi người thực hiện, hành động, đối tượng, thời điểm, kết quả và dữ liệu trước/sau đã lọc; không ghi thông tin xác thực/token hoặc toàn bộ hồ sơ nhạy cảm.
- Ghi nhật ký kiểm toán cùng transaction cho thay đổi tổ chức, vai trò/quyền, phân công và hồ sơ.
- Quyền xem audit riêng; hoạt động xem audit cũng được ghi lại. Không tự xóa audit cho đến khi có chính sách retention được phê duyệt.
- `NHAT_KY_XOA` là Permission riêng, không gán cho Role mặc định. Giao diện/API hiện chỉ hỗ trợ xem trước số bản ghi khớp; xóa vật lý vẫn tắt vì chưa có chính sách retention PTIT được phê duyệt và bảng audit được bảo vệ append-only. Không được bỏ qua trigger hay dùng cascade để xóa.
- Backup đề xuất mã hóa hằng ngày, giữ 30 ngày và thử phục hồi hằng tháng; xác nhận khả năng hạ tầng trước khi cam kết vận hành.
- Không dùng dữ liệu PTIT thật trong seed, test hoặc artifact CI.

## Validation, lỗi và kiểm thử

- Máy chủ kiểm tra mọi yêu cầu; DTO tách khỏi mô hình Prisma. Quy tắc nghiệp vụ liên bảng được kiểm tra trong dịch vụ/quy tắc nghiệp vụ và transaction.
- Lỗi có `maLoi`, thông báo tiếng Việt an toàn, `maTuongQuan`; validation bổ sung mã trường. Không trả stack/SQL.
- Unit test cho policy; integration test với PostgreSQL cho FK/unique/transaction/migration; E2E API cho auth, Permission, Scope và audit; frontend test cho query/cache/luồng UI.
- Kiểm tra cả truy cập được phép và bị từ chối, bao gồm ID ngoài phạm vi, assignment hết hạn/thu hồi và nhiều assignment đồng thời.
- Migration Prisma được lưu trong repo; không sửa migration đã áp dụng; dựng database sạch và chạy toàn bộ migration trong CI/thử nghiệm.

## Cấu hình và roadmap

- Tách môi trường phát triển, thử nghiệm, vận hành; validate cấu hình lúc khởi động; không commit secret.
- Không đưa secret vào biến `VITE_*` vì chúng được đóng gói phía trình duyệt.
- Chi tiết roadmap và tiêu chí nghiệm thu nằm trong `docs/adr/0001-kien-truc-nen-tang.md`.

> Tài liệu này mô tả hiện trạng cùng kiến trúc mục tiêu đã duyệt. Mục tiêu không được coi là đã triển khai cho đến khi code và kiểm thử chứng minh điều đó.
