# Quy hoạch Sidebar và quy ước module

Tài liệu này là quy hoạch chính thức để sắp xếp điều hướng và định vị module nghiệp vụ. Trước khi tạo module hoặc chức năng mới, phải đọc tài liệu này, xác định nhóm nghiệp vụ phù hợp và cập nhật điều hướng chỉ khi mục đó đã được duyệt và có trang thực tế.

## Cấu trúc Sidebar chính thức

| Nhóm | Mục menu | Tình trạng |
|---|---|---|
| Tổng quan | Tổng quan | Hiện có |
| Quản lý Đảng viên | Hồ sơ Đảng viên | Hiện có |
| Quản lý Đảng viên | Hồ sơ của tôi | Hiện có |
| Quản lý Đảng viên | Cập nhật hồ sơ | Hiện có; giữ là mục độc lập |
| Quản lý Đảng viên | Học tập nghị quyết (Đang phát triển) | Dự kiến; hiển thị theo yêu cầu, chưa có route/chức năng |
| Tổ chức và danh mục | Cơ cấu tổ chức | Hiện có |
| Tổ chức và danh mục | Quản lý năm học | Hiện có |
| Quản trị hệ thống | Quản lý tài khoản | Hiện có |
| Quản trị hệ thống | Phân quyền tài khoản | Hiện có |
| Quản trị hệ thống | Ma trận phân quyền | Hiện có |
| Quản trị hệ thống | Cài đặt hệ thống → Hồ sơ, Giao diện | Hiện có; hai mục con |
| Quản trị hệ thống | Nhật ký hệ thống (Đang phát triển) | Dự kiến; hiển thị theo yêu cầu, chưa có trang nhật ký |
| Thống kê và báo cáo | Báo cáo, thống kê (Đang phát triển) | Đang phát triển; chưa có route/chức năng |

Các mục chưa triển khai ở trên chỉ là nhãn trạng thái điều hướng, không được tạo liên kết hoặc chức năng giả. Không tự thêm những module tương lai khác vào Sidebar. Không có nhóm hoặc mục Sidebar riêng cho “Nhập / xuất dữ liệu”.

## Mục đích các nhóm

- **Tổng quan:** điểm vào và thông tin tổng hợp chung của hệ thống.
- **Quản lý Đảng viên:** tra cứu hồ sơ, xem hồ sơ cá nhân và vận hành quy trình cập nhật hồ sơ; các chức năng theo dõi học tập nghị quyết thuộc nhóm này khi được phát triển.
- **Tổ chức và danh mục:** quản lý cây tổ chức Đảng và các danh mục nền dùng chung như năm học.
- **Quản trị hệ thống:** quản lý tài khoản, phân công quyền, ma trận quyền và cài đặt người dùng/hệ thống; nhật ký hệ thống thuộc nhóm này khi triển khai.
- **Thống kê và báo cáo:** tổng hợp, tra cứu và xuất báo cáo nghiệp vụ khi chức năng được phát triển.

## Quy tắc bổ sung module

1. Xác định nghiệp vụ chính và đặt module trong nhóm hiện có phù hợp nhất; không tạo nhóm mới theo tiện ích kỹ thuật hoặc theo từng vai trò.
2. Chỉ thêm mục có trang/route thật và Permission tương ứng. Ngoại lệ là các mục tương lai được liệt kê rõ trong cấu trúc chính thức; chúng phải hiển thị trạng thái đang phát triển và không điều hướng.
3. Không nhân bản trang để phục vụ Đảng ủy, Chi bộ, Tổ hoặc từng vai trò. Một trang dùng Permission để quyết định được hiển thị và Scope để giới hạn dữ liệu.
4. Nếu module không phù hợp nhóm hiện hữu, đề xuất vị trí và chờ phê duyệt trước khi sửa cấu trúc Sidebar.
5. Giữ ID ổn định khi đổi nhãn/thứ tự để không làm hỏng trạng thái menu đang mở, chọn hoặc các liên kết route hiện hành.

## Nhập và xuất dữ liệu

Nhập/xuất là thao tác trong trang nghiệp vụ sở hữu dữ liệu, không phải module Sidebar. Ví dụ: Nhập Excel/Xuất Excel ở trang Hồ sơ Đảng viên; thao tác danh sách tài khoản ở trang Quản lý tài khoản; thao tác dữ liệu tổ chức ở trang Cơ cấu tổ chức khi nghiệp vụ được duyệt và hỗ trợ.

Chỉ thêm nút khi có yêu cầu triển khai cụ thể. Nút phải gọi API thực tế, chỉ hiển thị theo Permission của Assignment đang hoạt động và API phải tự kiểm tra Permission cùng Scope. Không tạo nút minh họa hoặc nút chưa có API.

## Cập nhật hồ sơ

“Cập nhật hồ sơ” luôn là một mục Sidebar độc lập trong nhóm Quản lý Đảng viên. Không tách các đợt cập nhật, yêu cầu cập nhật hoặc yêu cầu của cá nhân thành mục con. Các luồng này tiếp tục nằm trong trang Cập nhật hồ sơ theo thiết kế nghiệp vụ hiện có; không thay đổi chức năng hoặc bố cục trang khi chỉ quy hoạch Sidebar.

## Phân quyền và Scope

- Sidebar xác định quyền từ Permission của Assignment đang hoạt động trong phiên; khi chuyển Assignment, các mục phải cập nhật theo Permission của Assignment mới.
- Một mục có nhiều Permission được cấu hình theo quan hệ “có ít nhất một quyền” nếu luồng nghiệp vụ hiện hành cho phép; dùng đúng mã Permission của API/trang tương ứng.
- Scope chỉ quyết định bản ghi/đơn vị mà người dùng được phép thao tác. Không dùng Scope để dựng Sidebar riêng cho từng cấp tổ chức hoặc tạo trang trùng lặp.
- Việc ẩn mục ở giao diện chỉ hỗ trợ trải nghiệm. Backend phải kiểm tra độc lập Permission, Assignment còn hiệu lực và Scope trên từng yêu cầu/dữ liệu.
- Các trang cá nhân/cài đặt phục vụ chính người dùng có thể hiển thị cho phiên đã đăng nhập; quyền dữ liệu nhạy cảm vẫn phải được kiểm tra tại API.

## Bảo toàn giao diện

Khi chỉ thay quy hoạch menu, giữ nguyên Sidebar, Header, layout nền, kích thước, khoảng cách, padding, margin, chiều rộng, chiều cao, màu sắc và cách trình bày hiện hành. Tái sử dụng Sidebar và shadcn/ui primitives hiện có. Chỉ thay thứ tự, tên và phân nhóm; giữ cơ chế menu mở/đóng, mục đang chọn và route. Nội dung giao diện dùng nhất quán tiếng Việt.

### Mở và đóng menu con

- Với mục cha có menu con, toàn bộ hàng (biểu tượng, tên và vùng trống) là một nút mở/đóng; nút cha không điều hướng. Mục không có menu con vẫn điều hướng như thường.
- Hiển thị mũi tên trong hàng cha và xoay theo trạng thái mở. Mũi tên là phần trang trí bên trong cùng nút kích hoạt, tránh lồng nút hoặc xử lý sự kiện hai lần.
- Dùng Collapsible và Sidebar primitives dùng chung để hỗ trợ bàn phím, focus, `aria-expanded`/`aria-controls` và trạng thái đang mở. Không viết logic riêng cho từng nhóm.
- Mục con đang chọn vẫn được đánh dấu; truy cập trực tiếp hoặc tải lại ở route con phải mở menu cha tương ứng. Chọn mục con không đóng menu cha.
- Không đổi kích thước, chiều cao, padding, margin, khoảng cách, màu sắc hoặc bố cục để bổ sung thao tác này.

## Liên kết triển khai

- Cấu hình điều hướng: `frontend/src/core/config/navigation.config.ts`.
- Hiển thị Sidebar và lọc Permission: `frontend/src/layouts/admin-layout/AppSidebar.tsx`.
- Route/trang vẫn được lắp ghép tập trung tại `frontend/src/app/router/router.tsx`.
- Quyết định kiến trúc và phân tầng: [`architecture.md`](architecture.md).
