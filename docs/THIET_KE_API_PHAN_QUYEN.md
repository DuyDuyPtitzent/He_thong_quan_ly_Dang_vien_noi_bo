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
| GET | `/api/v1/tai-khoan/{maTaiKhoan}/lich-su` | Quản trị viên toàn hệ thống có Assignment `TOAN_HE_THONG` hợp lệ và `NHAT_KY_KIEM_TOAN_XEM` |
| DELETE | `/api/v1/tai-khoan/{maTaiKhoan}` | `TAI_KHOAN_XOA` |
| GET | `/api/v1/nhat-ky-he-thong/thao-tac?trang={n}&kichThuoc={1..100}` | Quản trị viên toàn hệ thống có Assignment `TOAN_HE_THONG` hợp lệ và `NHAT_KY_KIEM_TOAN_XEM` |
| GET | `/api/v1/nhat-ky-he-thong/bao-mat?trang={n}&kichThuoc={1..100}` | Quản trị viên toàn hệ thống có Assignment `TOAN_HE_THONG` hợp lệ và `NHAT_KY_BAO_MAT_XEM` |
| GET | `/api/v1/nhat-ky-he-thong/{thao-tac\|bao-mat}/thong-ke` | Permission xem nhật ký tương ứng và Scope |
| GET | `/api/v1/nhat-ky-he-thong/{thao-tac\|bao-mat}/hanh-dong` | Permission xem nhật ký tương ứng và Scope |
| GET | `/api/v1/nhat-ky-he-thong/{thao-tac\|bao-mat}/don-vi` | Permission xem nhật ký tương ứng; chỉ trả đơn vị trong Scope hiện hành |
| GET | `/api/v1/nhat-ky-he-thong/{thao-tac\|bao-mat}/ban-ghi/{maNhatKy}` | Permission xem nhật ký tương ứng và Scope |
| POST | `/api/v1/nhat-ky-he-thong/{thao-tac\|bao-mat}/xoa/xem-truoc` | `NHAT_KY_XOA`, Permission xem nhật ký tương ứng và Scope; chỉ đếm, không xóa |
| GET | `/api/v1/vai-tro` | `VAI_TRO_XEM` |
| POST | `/api/v1/vai-tro` | `VAI_TRO_TAO` |
| PATCH | `/api/v1/vai-tro/{maVaiTro}` | `VAI_TRO_SUA` |
| DELETE | `/api/v1/vai-tro/{maVaiTro}` | `VAI_TRO_XOA` |
| PATCH | `/api/v1/vai-tro/{maVaiTro}/quyen` | `VAI_TRO_GAN_QUYEN` |
| GET | `/api/v1/phan-cong-vai-tro?maTaiKhoan={uuid}` | `PHAN_CONG_VAI_TRO_XEM` |
| GET | `/api/v1/phan-cong-vai-tro/lich-su?maTaiKhoan={uuid}` | Quản trị viên toàn hệ thống có Assignment `TOAN_HE_THONG` hợp lệ, `NHAT_KY_KIEM_TOAN_XEM` và `PHAN_CONG_VAI_TRO_XEM` |
| GET | `/api/v1/phan-cong-vai-tro/cua-toi` | `PHAN_CONG_VAI_TRO_XEM` |
| POST | `/api/v1/phan-cong-vai-tro` | `PHAN_CONG_VAI_TRO_TAO` |
| PATCH | `/api/v1/phan-cong-vai-tro/{maPhanCong}` | `PHAN_CONG_VAI_TRO_SUA` |
| POST | `/api/v1/phan-cong-vai-tro/{maPhanCong}/thu-hoi` | `PHAN_CONG_VAI_TRO_THU_HOI` |

`GET /api/v1/quyen` trả thêm metadata trình bày gồm tên/mô tả, nhóm Permission và trạng thái API (`DA_CO_API` hoặc `CHUA_CO_API`). Metadata được đồng bộ từ catalog nguồn; giao diện không thể tạo hoặc sửa Permission. `GET /api/v1/tai-khoan` lọc từ khóa, trạng thái, liên kết hồ sơ, Chi bộ, Role và tình trạng Assignment, trả phân trang, danh mục Chi bộ và thống kê trong Scope (tổng tài khoản, đã/chưa có Assignment hiệu lực, Assignment sắp hết hạn trong 30 ngày). Scope và Permission lấy từ một Assignment đang dùng trong phiên. `GET /api/v1/phan-cong-vai-tro/lich-su` chỉ trả audit cho Assignment nhìn thấy được và kiểm tra Permission xem nhật ký. `POST /api/v1/xac-thuc/phan-cong-vai-tro-dang-hoat-dong` xác minh Assignment còn hiệu lực và đổi ngữ cảnh ngay trong session; không ghép quyền giữa Assignment.

API Nhật ký hệ thống đọc `nhat_ky_kiem_toan`, phân trang/lọc trong PostgreSQL và chỉ trả các trường đã chọn. Mọi API danh sách, chi tiết, thống kê, bộ lọc, đơn vị và xem trước dọn dẹp kiểm tra Assignment đang chọn trong phiên: mã Role `QUAN_TRI_VIEN_TOAN_HE_THONG`, Role và tài khoản hoạt động, Assignment còn hạn/chưa thu hồi, Scope `TOAN_HE_THONG`; sau đó vẫn yêu cầu Permission tương ứng. Cùng quy tắc áp dụng cho API lịch sử nhật ký tài khoản và lịch sử phân công. Chi tiết nhật ký hệ thống hiện không trả `duLieuTruoc`/`duLieuSau`. Permission xem nhật ký và `NHAT_KY_XOA` có endpoint đã kiểm tra nên catalog đánh dấu `DA_CO_API`; trạng thái `NHAT_KY_XOA` chỉ áp dụng cho API xem trước. Permission xuất vẫn `CHUA_CO_API`. `POST /api/v1/nhat-ky-he-thong/{thao-tac|bao-mat}/xoa/xem-truoc` chỉ đếm ID/khoảng ngày được gửi, trả `coTheXoa=false`, không ghi dữ liệu và không có endpoint xóa vật lý. Permission không được cấp tự động cho Role.

Giao diện React gồm danh mục Permission chỉ đọc, danh sách/tạo vai trò, trang ma trận Permission và trang Phân quyền tài khoản. Role thường được sửa theo thẩm quyền Permission + Scope; ma trận Role hệ thống chỉ được sửa bởi phiên đang dùng Assignment Role `QUAN_TRI_VIEN_TOAN_HE_THONG` còn hiệu lực, chưa thu hồi, tài khoản/Role hoạt động, Scope `TOAN_HE_THONG` và Permission `VAI_TRO_GAN_QUYEN`. Ba quyền `QUYEN_XEM_DANH_MUC`, `VAI_TRO_XEM`, `VAI_TRO_GAN_QUYEN` được giữ để tránh khóa khả năng quản trị ma trận. Tên, trạng thái, xóa Role hệ thống và Assignment Role hệ thống vẫn được quản lý riêng, không mở qua thao tác này. Tạo Assignment thông thường chỉ có Scope `CAY_DON_VI`/`DON_VI_CHI_DINH`, Role thường đang hoạt động và tài khoản được Backend trả về. Ẩn/khóa nút chỉ hỗ trợ trải nghiệm: tất cả API vẫn phải tự kiểm tra Permission, Scope, giới hạn cấp quyền và ghi Audit.

## Ràng buộc

- Mọi route cần phiên đăng nhập. Quyết định cấp Role/Permission/Assignment dùng một Assignment nguồn có đủ Permission và thẩm quyền Scope; không kết hợp quyền từ nhiều Assignment.
- Chỉnh ma trận Role hệ thống yêu cầu Quản trị viên toàn hệ thống đang hoạt động, Assignment `TOAN_HE_THONG` còn hạn/chưa thu hồi và Permission `VAI_TRO_GAN_QUYEN`; Backend kiểm tra lại điều kiện này. Không cho gỡ ba Permission cần thiết để tiếp tục quản trị ma trận khỏi Role `QUAN_TRI_VIEN_TOAN_HE_THONG`.
- Người dùng không thể tự cấp quyền cho mình, cấp `TOAN_HE_THONG`, `CA_NHAN`, Role hệ thống hoặc Permission mà Assignment nguồn không cho phép.
- Assignment thông thường chỉ cho phép `CAY_DON_VI` hoặc `DON_VI_CHI_DINH`. Scope cây mới phải nằm trong cây của Assignment nguồn; đơn vị chỉ định mới phải là tập con được cấp rõ hoặc nằm trong cây nguồn.
- Chỉ Quản trị viên toàn hệ thống có Assignment đang chọn hợp lệ ở Scope `TOAN_HE_THONG` và `VAI_TRO_GAN_QUYEN` được thay Permission trên Role hệ thống; Role đang được sử dụng còn phải nằm trong thẩm quyền Scope của người thao tác. Không xóa Role còn Assignment.
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
