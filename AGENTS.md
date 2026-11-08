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
- Tác vụ Backend: đọc `backend/package.json`, `backend/prisma/schema.prisma` và module liên quan. Backend có cấu hình/sức khỏe, schema 20 bảng, API xác thực, nền kiểm tra RBAC Permission + Assignment + Scope, API quản trị phân quyền và API tổ chức; API hồ sơ nghiệp vụ và quản lý tài khoản đầy đủ chưa có. Không có dữ liệu tổ chức/PTIT được tạo theo đặc tả.

- Repository hiện có React admin frontend và Backend NestJS/Prisma/PostgreSQL; database phát triển đã có schema nhưng chưa có dữ liệu PTIT theo đặc tả. Không tự giả định auth hiện tại đã sẵn sàng production.
- Giữ nghiệp vụ giao diện trong `frontend/src/features/<feature>/`; `app` lắp ghép route/provider, `core` giữ hạ tầng ứng dụng, `layouts` giữ khung, `shared` chỉ chứa thứ thật sự dùng chung.
- Quy tắc áp dụng toàn repository: tuyệt đối không hardcode giá trị nghiệp vụ hoặc cấu hình cần thay đổi theo dữ liệu, môi trường, đơn vị, vai trò, quyền, trạng thái, danh mục hay chính sách. Trước khi triển khai, phải lần theo và tái sử dụng nguồn cấu hình động hiện có (API, CSDL, cấu hình ứng dụng hoặc metadata dùng chung); không tạo giá trị riêng trong màn hình/feature nếu dữ liệu phải được quản lý tập trung. Nếu chưa có nguồn cấu hình động phù hợp, nêu rõ khoảng trống và đề xuất thay đổi nền tảng trước khi triển khai; không âm thầm thay bằng hằng số. Chỉ dùng hằng số cho nội dung tĩnh hoặc giá trị kỹ thuật thực sự bất biến. Quy tắc này áp dụng cho mọi module, không chỉ feature đang được yêu cầu.
- Không để `shared`, `core` hoặc `layouts` phụ thuộc vào `features`; tránh gọi API trong component trình bày. Dùng Axios client và TanStack Query hiện có khi tích hợp API.
- Ưu tiên UI primitives và shared components đã có trước khi tạo mới. UI permission chỉ phục vụ trải nghiệm; quyền dữ liệu phải được kiểm tra phía server. Backend có guard Permission + Scope cho API tổ chức và quản trị quyền; không suy ra các API hồ sơ/tài khoản đã sẵn sàng.
- Khi triển khai hoặc sửa một API/chức năng gắn với Permission, phải đối chiếu `backend/src/modules/authorization/permission-catalog.ts` trong cùng thay đổi: đặt trạng thái `DA_CO_API` khi endpoint Backend thực sự đã có kiểm tra xác thực, Permission và Scope cần thiết; giữ `CHUA_CO_API` khi mới là quyền quy hoạch hoặc endpoint chưa tồn tại. Không suy trạng thái từ tên quyền, UI, tài liệu kế hoạch hoặc việc quyền đã được cấp cho Role. Khi rà soát, lần từ Permission qua route/controller tới service và kiểm tra hành vi phía máy chủ.
- Quy tắc chung cho mọi module dùng ma trận Permission theo Role: với từng API/hành động và Permission, phải rà soát, triển khai và kiểm thử Assignment có Scope `CAY_DON_VI`, `DON_VI_CHI_DINH` và `TOAN_HE_THONG`; không chỉ hỗ trợ một Scope. Khi được cấp Permission phù hợp, `CAY_DON_VI` phải áp dụng trên cây con theo quy tắc tổ chức, `DON_VI_CHI_DINH` chỉ trên đúng các đơn vị được chỉ định, còn `TOAN_HE_THONG` theo phạm vi toàn hệ thống. Xét thêm `CA_NHAN` nếu nghiệp vụ hỗ trợ thao tác cá nhân. Không từ chối Scope chỉ vì không phải `TOAN_HE_THONG`; không mở rộng một Scope thành Scope khác.
- Ma trận chỉ gán Permission cho Role; Scope được lưu độc lập trên Assignment. Thay đổi Permission hoặc ma trận phải hoạt động đúng với các loại Assignment có liên quan và không tự đổi Scope hay tự cấp Permission. Chỉ được giới hạn/loại một Scope theo policy nghiệp vụ đã được duyệt rõ, phải ghi căn cứ trong tài liệu và có kiểm thử chứng minh cả trường hợp được phép lẫn bị từ chối. Ngoại lệ danh mục năm học hiện chấp nhận `CAY_DON_VI`, `DON_VI_CHI_DINH`, `TOAN_HE_THONG`, từ chối `CA_NHAN`; đây là một ví dụ áp dụng quy tắc chung, không phải phạm vi duy nhất của quy tắc.
- Mọi trang con trong `AdminLayout` đã được bọc bởi `PageContainer`; không bọc `PageContainer` thêm lần nữa trong feature. Dùng `PageHeader`, `StatisticCard`, primitives bảng/lọc, `StandardSheet` và Dialog dùng chung. Giữ nhất quán chiều rộng, padding và nhịp khu vực theo trang quản trị tham chiếu; không tự đặt `max-width`, chiều cao, lề hoặc khoảng cách riêng theo cảm tính. Nếu nghiệp vụ cần ngoại lệ, giới hạn thay đổi tại trang đó và nêu lý do.
- Khuôn trang quản trị chuẩn: `PageHeader`, các khối nội dung theo `space-y-5`, lưới thống kê `gap-3 sm:grid-cols-2 xl:grid-cols-4`, bộ lọc và bảng trong các Card riêng; bảng rộng dùng vùng cuộn ngang trong Card, không làm rộng/vỡ khung trang. Giữ kích thước input, hàng bảng và phân trang theo shared primitives.
- Khi tạo hoặc chỉnh sửa giao diện, sử dụng skill UI UX Pro Max và tuân thủ design system hiện có.
- Mọi màu giao diện phải dùng token tập trung tại `frontend/src/app/styles/globals.css` (các biến semantic như `background`, `foreground`, `primary`, `accent`, `sidebar`). Không đặt mã màu trực tiếp hoặc tự tạo bảng màu trong module/feature; chỉ thay đổi theme tập trung hoặc thêm token dùng chung khi được yêu cầu.
- Trước khi tạo module hoặc chức năng mới, đọc `docs/sidebar-module-conventions.md`, xác định nhóm nghiệp vụ hiện có và tuân thủ quy hoạch Sidebar; nếu chưa phù hợp nhóm nào, đề xuất phương án và chờ phê duyệt trước khi đổi cấu trúc điều hướng.
- Tổ chức frontend theo feature nghiệp vụ: `pages/`, `components/`, `api/`, `types/`, `validation/`, `constants/`, `services/`, `hooks/` chỉ tạo khi có nội dung phù hợp. Trang chỉ điều phối; chuyển adapter HTTP vào `api/`, kiểu miền vào `types/`, validation vào `validation/`, và logic biến đổi/định dạng thuần cần kiểm thử vào `services/`. Tách biểu mẫu/hộp thoại hoặc thành phần lớn có trách nhiệm riêng vào `components/` khi phù hợp.
- Không để `shared`, `core`, `layouts` phụ thuộc vào `features`; tránh chu trình phụ thuộc giữa các feature. Phụ thuộc một chiều giữa feature chỉ được dùng có chủ đích cho luồng tổng hợp dữ liệu và phải giữ API/Permission/Scope hiện có. Thành phần dùng chung không chứa nghiệp vụ đặt trong `shared`.
- Tái cấu trúc phải giữ nguyên URL, giao diện, luồng dữ liệu, hợp đồng API, quyền và hành vi hiện hành; không đổi backend/schema nếu yêu cầu chỉ thuộc frontend. Không tạo thư mục rỗng hoặc lớp trừu tượng nếu chưa có nhu cầu thực tế.
- Định hướng Đảng viên trong kế hoạch nguồn là yêu cầu sản phẩm cần xác nhận và chia giai đoạn, không phải bằng chứng tính năng đã được triển khai. Không mang nguyên xi Tenant, RBAC, Workflow, nghiệp vụ Đoàn hoặc cấu trúc backend từ dự án nguồn.
- Thay đổi schema, backend, hệ thống quyền, thư viện hoặc cấu trúc nền tảng cần được nêu thành kế hoạch rõ trước khi triển khai. Không thêm dependency nếu chưa thật cần.
- Khi tạo migration Prisma mới, sau khi kiểm tra schema và migration phải tự áp dụng migration vào PostgreSQL phát triển đang cấu hình bằng lệnh `npm run prisma:migrate:deploy`; không được dừng ở việc chỉ tạo file migration. Xác nhận đúng cơ sở dữ liệu phát triển trước khi ghi, sau đó chạy `npm run prisma:migrate:status` và ghi kết quả vào `docs/SESSION_HANDOFF.md`. Không tự áp dụng vào production. Nếu PostgreSQL phát triển chưa chạy hoặc không kết nối được, thử khởi động dịch vụ CSDL cục bộ theo cấu hình/tài liệu dự án; nếu vẫn không khả dụng thì báo rõ migration còn chờ áp dụng và nguyên nhân, không tuyên bố hoàn tất.

## Tiết kiệm ngữ cảnh

- Không quét toàn bộ `frontend/src/`, `node_modules/` hay lịch sử git nếu yêu cầu không cần.
- Tìm symbol/route cụ thể bằng `rg`, lần theo import và chỉ mở các file cần thiết.
- Chỉ đọc sâu `BASE_SOURCE_GUIDE.md` khi tác vụ cần chi tiết nền; tài liệu đó mô tả snapshot của source, nên code hiện tại là căn cứ cuối cùng.

## Module Nhập/Xuất dữ liệu dùng chung

- Nghiệp vụ cần nhập/xuất Excel ưu tiên dùng `backend/src/modules/data-transfer/` và `frontend/src/shared/components/data-transfer/`; mỗi feature sở hữu mapping, validation nghiệp vụ và quyền dữ liệu của mình.
- Module dùng chung chỉ xử lý kỹ thuật workbook; không ghi trực tiếp vào bảng nghiệp vụ. Backend kiểm tra Permission + Scope, kiểm tra dữ liệu trước xác nhận và ghi audit.
- Nhập dữ liệu cần preview có thời hạn gắn với người thao tác, giới hạn dung lượng/số dòng, kiểm tra lại trước khi ghi, xử lý lỗi nguyên tử và chống xác nhận lặp. Không lưu mật khẩu/secret trong workbook hoặc nhật ký.
- Mẫu Excel có phiên bản và hướng dẫn tiếng Việt; không mặc định mọi trang đều cần nút Nhập/Xuất. Đặt thao tác trong trang nghiệp vụ, không thêm mục Sidebar riêng.
- Cấu hình trường xuất rõ ràng và chỉ trả dữ liệu trong Permission + Scope hiện hành; không xuất toàn bộ cột CSDL theo mặc định.

## Component ngày và thời gian dùng chung

- Mọi chức năng chọn ngày, tháng, năm hoặc khoảng thời gian phải ưu tiên dùng bộ component tại `frontend/src/shared/components/date-time/`; không tự tạo lịch riêng khi component hiện có đáp ứng yêu cầu.
- Dùng kiểu date-only `yyyy-MM-dd` cho ngày và `yyyy-MM` cho tháng; không chuyển qua UTC để tránh lệch ngày. Ngày giờ cục bộ dùng `yyyy-MM-dd'T'HH:mm`.
- Các component chỉ quản lý lựa chọn và giới hạn chung; validation nghiệp vụ vẫn thuộc feature. Không thay thế hàng loạt trường hiện có nếu yêu cầu không bao gồm.
