# API quản trị Permission, Role và Assignment

**Trạng thái:** Backend đã triển khai API quản trị Role/Assignment nền, endpoint tự quản lý email/Assignment, cùng CLI vận hành cấp/thu hồi/khôi phục quản trị viên cao nhất. Cập nhật 2026-11-03: hoàn thiện trang Phân quyền tài khoản dùng dữ liệu PostgreSQL, lọc/phân trang/KPI trong Scope, chi tiết và lịch sử Assignment, cấp/sửa/thu hồi Assignment. Không thay đổi schema hoặc migration cho phần này.

## Endpoint

Tài khoản đã xác thực có thể xem/sửa email của chính mình tại `GET`/`PATCH /api/v1/xac-thuc/tai-khoan-cua-toi`; mật khẩu đổi qua `POST /api/v1/xac-thuc/doi-mat-khau`. Assignment, Role và danh sách Permission của Role được xem qua các endpoint quản trị đã giới hạn Scope; thêm `GET /api/v1/phan-cong-vai-tro/cua-toi` để xem quyền được gán cho chính mình. ID tài khoản luôn lấy từ phiên, không nhận từ body.

| Phương thức | Endpoint | Permission |
|---|---|---|
| GET | `/api/v1/quyen` | `QUYEN_XEM_DANH_MUC` |
| GET | `/api/v1/tai-khoan?tuKhoa={keyword}&gioiHan={10..50}` | `TAI_KHOAN_XEM` và Scope của Assignment nguồn |
| GET | `/api/v1/tai-khoan?tuKhoa={keyword}&maChiBo={uuid}&maVaiTro={uuid}&coPhanCong={CO\|KHONG}&trang={n}&gioiHan={10..100}` | `TAI_KHOAN_XEM` và Scope của Assignment nguồn |
| POST | `/api/v1/tai-khoan` | `TAI_KHOAN_TAO` |
| GET | `/api/v1/tai-khoan/{maTaiKhoan}` | `TAI_KHOAN_XEM` |
| PATCH | `/api/v1/tai-khoan/{maTaiKhoan}` | `TAI_KHOAN_SUA_THONG_TIN` |
| PATCH | `/api/v1/tai-khoan/{maTaiKhoan}/trang-thai` | `TAI_KHOAN_KHOA_MO_KHOA` |
| PATCH | `/api/v1/tai-khoan/{maTaiKhoan}/lien-ket-ho-so` | `TAI_KHOAN_LIEN_KET_HO_SO` |
| GET | `/api/v1/tai-khoan/{maTaiKhoan}/lich-su` | `NHAT_KY_KIEM_TOAN_XEM` |
| DELETE | `/api/v1/tai-khoan/{maTaiKhoan}` | `TAI_KHOAN_XOA` |
| GET | `/api/v1/vai-tro` | `VAI_TRO_XEM` |
| POST | `/api/v1/vai-tro` | `VAI_TRO_TAO` |
| PATCH | `/api/v1/vai-tro/{maVaiTro}` | `VAI_TRO_SUA` |
| DELETE | `/api/v1/vai-tro/{maVaiTro}` | `VAI_TRO_XOA` |
| PATCH | `/api/v1/vai-tro/{maVaiTro}/quyen` | `VAI_TRO_GAN_QUYEN` |
| GET | `/api/v1/phan-cong-vai-tro?maTaiKhoan={uuid}` | `PHAN_CONG_VAI_TRO_XEM` |
| GET | `/api/v1/phan-cong-vai-tro/lich-su?maTaiKhoan={uuid}` | `NHAT_KY_KIEM_TOAN_XEM` và `PHAN_CONG_VAI_TRO_XEM`, trong Scope |
| GET | `/api/v1/phan-cong-vai-tro/cua-toi` | `PHAN_CONG_VAI_TRO_XEM` |
| POST | `/api/v1/phan-cong-vai-tro` | `PHAN_CONG_VAI_TRO_TAO` |
| PATCH | `/api/v1/phan-cong-vai-tro/{maPhanCong}` | `PHAN_CONG_VAI_TRO_SUA` |
| POST | `/api/v1/phan-cong-vai-tro/{maPhanCong}/thu-hoi` | `PHAN_CONG_VAI_TRO_THU_HOI` |

`GET /api/v1/quyen` trả thêm metadata trình bày gồm tên/mô tả, nhóm Permission và trạng thái API (`DA_CO_API` hoặc `CHUA_CO_API`). Metadata được đồng bộ từ catalog nguồn; giao diện không thể tạo hoặc sửa Permission. `GET /api/v1/tai-khoan` lọc từ khóa, trạng thái, liên kết hồ sơ, Chi bộ, Role và tình trạng Assignment, trả phân trang, danh mục Chi bộ và thống kê trong Scope (tổng tài khoản, đã/chưa có Assignment hiệu lực, Assignment sắp hết hạn trong 30 ngày). Scope và Permission lấy từ một Assignment đang dùng trong phiên. `GET /api/v1/phan-cong-vai-tro/lich-su` chỉ trả audit cho Assignment nhìn thấy được và kiểm tra Permission xem nhật ký. `POST /api/v1/xac-thuc/phan-cong-vai-tro-dang-hoat-dong` xác minh Assignment còn hiệu lực và đổi ngữ cảnh ngay trong session; không ghép quyền giữa Assignment.

Giao diện React gồm danh mục Permission chỉ đọc, danh sách/tạo vai trò, trang chỉnh ma trận Permission cho Role thường và trang Phân quyền tài khoản. Trang phân quyền có KPI, lọc và phân trang; bảng bảy cột; menu thao tác; Sheet chi tiết với từng Assignment riêng và lịch sử audit; Sheet cấp/sửa Scope và thời gian; AlertDialog thu hồi có lý do. Thời gian nhập/hiển thị theo múi giờ Việt Nam. Vai trò hệ thống chỉ xem; tạo Assignment chỉ có Scope `CAY_DON_VI`/`DON_VI_CHI_DINH`, Role thường đang hoạt động và tài khoản được Backend trả về. Ẩn/khóa nút chỉ hỗ trợ trải nghiệm: tất cả API vẫn phải tự kiểm tra Permission, Scope, giới hạn cấp quyền và ghi Audit.

## Ràng buộc

- Mọi route cần phiên đăng nhập. Quyết định cấp Role/Permission/Assignment dùng một Assignment nguồn có đủ Permission và thẩm quyền Scope; không kết hợp quyền từ nhiều Assignment.
- Người dùng không thể tự cấp quyền cho mình, cấp `TOAN_HE_THONG`, `CA_NHAN`, Role hệ thống hoặc Permission mà Assignment nguồn không cho phép.
- Assignment thông thường chỉ cho phép `CAY_DON_VI` hoặc `DON_VI_CHI_DINH`. Scope cây mới phải nằm trong cây của Assignment nguồn; đơn vị chỉ định mới phải là tập con được cấp rõ hoặc nằm trong cây nguồn.
- Không thể thay Permission trên Role hệ thống hoặc Role đang được sử dụng ngoài thẩm quyền Scope của người thao tác. Không xóa Role còn Assignment.
- `PATCH` Assignment không sửa người nhận/Role, không mở rộng tới `TOAN_HE_THONG`; người thao tác phải có toàn bộ Permission của Role và Scope đích nằm trong một Assignment nguồn phù hợp.
- Ghi Role/Permission/Assignment và audit trong transaction. Không cung cấp API công khai hoặc API thường để cấp/thay đổi/thu hồi Role `QUAN_TRI_VIEN_TOAN_HE_THONG` với Scope `TOAN_HE_THONG` hay để khôi phục quyền cao nhất.
- Cấp, thay đổi, thu hồi hoặc khôi phục quyền Quản trị viên toàn hệ thống phải qua công cụ/quy trình vận hành ngoài API; người vận hành được ủy quyền xác minh chỉ định/thẩm quyền, tài khoản đích và ghi audit đầy đủ. Không tự động phát hành lại quyền khi bootstrap.
- Công cụ vận hành `npm run manage:system-administrator -- grant|revoke|recover` chỉ chạy trong terminal bởi tài khoản hệ điều hành thuộc `NGUOI_VAN_HANH_DUOC_UY_QUYEN`; yêu cầu mã quyết định/hồ sơ. Cấp đầu tiên còn đối chiếu `TAI_KHOAN_QUAN_TRI_VIEN_DAU_TIEN`; cấp thêm/thu hồi cần xác minh mật khẩu của Quản trị viên toàn hệ thống phê duyệt. `recover` chỉ chạy khi không còn quản trị viên hợp lệ và vẫn yêu cầu người vận hành allowlist, tài khoản đích và mã quyết định. Công cụ ghi danh tính người vận hành ngoài hệ thống và mã phê duyệt vào audit.
- Assignment `QUAN_TRI_VIEN_TOAN_HE_THONG` không đặt hạn mặc định. Có thể tồn tại nhiều Assignment hợp lệ cho nhiều tài khoản; cấp từng tài khoản phải được chỉ định rõ. Assignment thường vẫn kiểm tra hiệu lực, hết hạn và thu hồi.
- Backend từ chối tự khóa/xóa tài khoản, tự thu hồi hoặc sửa Assignment cao nhất; đồng thời từ chối khóa/xóa/thu hồi nếu làm số Quản trị viên toàn hệ thống hợp lệ còn lại bằng 0. Định nghĩa hợp lệ và yêu cầu tuần tự hóa các thao tác cạnh tranh được quy định trong ma trận. Phép kiểm tra được thực hiện trong transaction ở Backend, không phụ thuộc frontend.
- Quản trị viên toàn hệ thống được xem/sửa thông tin cá nhân, đổi thông tin xác thực và xem Role/Permission/Assignment của mình; không được tự khóa/xóa mình, tự thu hồi Assignment cao nhất hoặc sửa Assignment để nâng quyền/mở rộng Scope.
- Quản trị viên toàn hệ thống có toàn bộ Permission nghiệp vụ trong catalog và Scope `TOAN_HE_THONG`. API vẫn kiểm tra Permission/Scope; thao tác không bỏ qua workflow, audit, bảo vệ dữ liệu nhạy cảm hoặc các invariant ngăn tự thu hồi quyền cao nhất.
- Tài khoản nội bộ được tạo bởi API quản trị; người nhận Assignment thường phải là tài khoản đang hoạt động. Mật khẩu khởi tạo không buộc đổi ở lần đăng nhập đầu; yêu cầu đổi mật khẩu chủ động vẫn được áp dụng.
- API thường cấm sửa/thu hồi Assignment Role hệ thống. Tự khôi phục ngoài API cần người vận hành được ủy quyền; nếu chưa còn quản trị viên, tài khoản đích khôi phục phải được khai báo chỉ định trong cấu hình vận hành trước khi chạy công cụ.
