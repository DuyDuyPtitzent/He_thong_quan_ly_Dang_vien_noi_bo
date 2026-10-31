# ADR 0001: Kiến trúc nền tảng Hệ thống Quản lý Đảng viên nội bộ PTIT

- **Trạng thái:** Các quyết định kiến trúc đã duyệt; nền kỹ thuật và Prisma schema 20 bảng đã triển khai ở database phát triển. API nghiệp vụ chưa triển khai.
- **Phạm vi:** Nền tảng, mô hình tổ chức, phân quyền, hợp đồng API, vận hành và lộ trình MVP.
- **Ngôn ngữ:** Tên thư mục và file mã nguồn dùng tiếng Anh theo quy ước phổ biến TypeScript/NestJS. Tên API, JSON, bảng/cột và mã nghiệp vụ theo quy ước ngôn ngữ được duyệt; nội dung giao diện/tài liệu dùng tiếng Việt có dấu.

## Bối cảnh

Repository có giao diện React/TypeScript/Vite trong `frontend/` và Backend NestJS/Prisma/PostgreSQL trong `backend/`. Database phát triển đã áp dụng schema nền 20 bảng; API nghiệp vụ, xác thực thật, RBAC thực thi và dữ liệu PTIT chưa có.

## Quyết định

### 1. Kiến trúc ứng dụng

- Backend dùng NestJS, Prisma và PostgreSQL theo ứng dụng nguyên khối chia mô-đun; nền kỹ thuật ban đầu nằm trong `backend/`.
- Giữ giao diện Base hiện tại trong `frontend/`; nghiệp vụ giao diện nằm trong `frontend/src/features/`; tái sử dụng `app`, `core`, `layouts`, `shared` và UI components phù hợp.
- Máy chủ chia mô-đun theo trách nhiệm: tài khoản, tổ chức, phân quyền, nhật ký kiểm toán và hồ sơ Đảng viên. Mô-đun gọi nhau qua hợp đồng/dịch vụ nội bộ, không truy cập thẳng bảng nội bộ mô-đun khác.
- Các mô-đun nghiệp vụ là kiến trúc mục tiêu; chỉ ghi nhận phần nền đã có khi mã nguồn và kiểm thử chứng minh.

### 2. Phạm vi và cây tổ chức

- Chỉ quản lý nội bộ PTIT miền Bắc.
- Mô hình tổ chức thống nhất, tối đa ba tầng: Đảng ủy → Chi bộ → Tổ tùy chọn.
- Không phát triển bảng/mô-đun cấp ủy, chi ủy hoặc cơ cấu cấp ủy riêng trong giai đoạn này.
- Một Đảng ủy gốc; Chi bộ trực thuộc Đảng ủy; Tổ trực thuộc Chi bộ; Chi bộ có thể không có Tổ hoặc có nhiều Tổ.
- Không hard-code tên đơn vị hoặc số lượng; không tự sinh Tổ theo số Đảng viên.
- Lưu lịch sử tên đơn vị và quan hệ cha–con. Đơn vị tạo nhầm được sửa loại nếu mọi quan hệ/lịch sử vẫn hợp lệ. Cho phép xóa hẳn sau khi xử lý tham chiếu; FK dùng RESTRICT, không cascade xóa lịch sử.
- Mốc hiệu lực quan hệ tổ chức và sinh hoạt hỗ trợ ngày hoặc ngày giờ, lưu `timestamptz` theo giờ Việt Nam. Khoảng dùng `[bắt đầu, kết thúc)`; ngày kết thúc nhập theo lịch bao gồm hết ngày đó.

### 3. Tài khoản, hồ sơ, chức vụ và nhiệm kỳ

- Tài khoản người dùng và hồ sơ Đảng viên là hai thực thể riêng.
- Liên kết tùy chọn một-một: một tài khoản liên kết tối đa một hồ sơ; một hồ sơ liên kết tối đa một tài khoản. Có thể tồn tại tài khoản chưa có hồ sơ hoặc hồ sơ chưa có tài khoản.
- Mô hình chức vụ, nhiệm kỳ, phân công và lịch sử tách biệt; không tạo trước danh mục chức vụ thực tế.
- Hồ sơ ban đầu giới hạn ở họ tên và trạng thái; mã hồ sơ nội bộ có thể do hệ thống tạo. Không tự thêm trường nhạy cảm.
- Thay đổi đơn vị/chức vụ trong giai đoạn đầu có hiệu lực khi ghi nhận; không nhập lùi ngày hoặc lên lịch trước. Sửa sai phải là thao tác có quyền và được kiểm toán.

### 4. Phân quyền

- Dùng phân quyền theo vai trò kết hợp quyền, phân công và phạm vi tổ chức.
- Một vai trò có nhiều quyền theo ma trận; một quyền có thể được gán cho nhiều vai trò.
- Một tài khoản có thể có nhiều phân công vai trò đồng thời. Mỗi phân công gắn vai trò, phạm vi tổ chức và thời hạn hiệu lực.
- Mã phạm vi: `CA_NHAN`, `CAY_DON_VI`, `DON_VI_CHI_DINH`, `TOAN_HE_THONG`.
- `CAY_DON_VI` gồm đơn vị gốc được gán và hậu duệ hiện hành. `DON_VI_CHI_DINH` chỉ gồm các đơn vị liệt kê, không tự bao gồm hậu duệ. Không mặc định mọi quyền được kế thừa.
- Máy chủ cho phép khi tài khoản hợp lệ, phân công còn hiệu lực, vai trò chứa quyền yêu cầu, phạm vi bao phủ đối tượng và chính sách dữ liệu cho phép. Không ghép quyền của phân công này với phạm vi của phân công khác. Thiếu thông tin thì từ chối mặc định.
- Giao diện có thể ẩn menu/nút để hỗ trợ người dùng; máy chủ là nơi quyết định truy cập dữ liệu.
- Mã quyền dùng tiếng Việt không dấu, ví dụ `TO_CHUC.XEM`. Danh mục mã sẽ được chốt theo chức năng thực tế; không tạo vai trò theo chức danh cá nhân.
- Vai trò chứa nhiều quyền theo ma trận, không phải một quyền duy nhất. Ma trận là quan hệ nhiều-nhiều giữa `vai_tro` và `quyen`.

### 5. Ngôn ngữ định danh và API

- Tên bảng/cột, lớp, đường dẫn API, trường JSON, mã quyền/phạm vi/trạng thái do dự án định nghĩa đều dùng tiếng Việt không dấu.
- Quy ước: bảng/cột `snake_case`, JSON `camelCase`, lớp `PascalCase`, URL chữ thường nối bằng dấu gạch ngang, mã enum viết hoa nối bằng `_`.
- Ví dụ: `don_vi_to_chuc`, `maDonVi`, `/api/v1/to-chuc`, `DANG_HOAT_DONG`.
- REST JSON dùng tiền tố `/api/v1`; lỗi chuẩn hóa có `maLoi`, `thongBao`, `maTuongQuan`. Tên chuẩn của framework, cơ sở dữ liệu và giao thức không dịch.
- Giai đoạn đầu dùng tài khoản nội bộ do quản trị viên tạo/quản lý, không tự đăng ký. SSO nhà trường để mở rộng sau khi PTIT cấp phương thức và quyền tích hợp.
- Phiên trình duyệt đề xuất dùng cookie `HttpOnly`, `Secure`, `SameSite` kèm bảo vệ CSRF; chi tiết xác thực và khởi tạo quản trị đầu tiên cần được thiết kế trước khi triển khai.

### 6. Kiểm toán, dữ liệu cá nhân, migration và sao lưu

- Nhật ký vận hành không ghi nội dung request mặc định, thông tin xác thực, token hoặc toàn bộ hồ sơ.
- Nhật ký kiểm toán lưu người thực hiện, hành động, đối tượng, thời điểm, kết quả và trường thay đổi đã lọc. Thao tác tổ chức, vai trò/quyền, phân công và hồ sơ ghi kiểm toán trong cùng transaction.
- Quyền xem nhật ký riêng; hoạt động xem nhật ký cũng được ghi lại. Không tự xóa nhật ký trước khi có chính sách lưu trữ được duyệt.
- Sao lưu đề xuất mã hóa hằng ngày, giữ 30 ngày và thử phục hồi hằng tháng; phải xác nhận khả năng hạ tầng.
- Không dùng dữ liệu PTIT thật trong dữ liệu mẫu, kiểm thử hoặc CI.
- Prisma migration lưu trong repository; không sửa migration đã áp dụng; kiểm thử dựng cơ sở dữ liệu sạch từ đầu.

## Mô hình dữ liệu khái quát

| Bảng đề xuất | Mục đích | Khóa/ràng buộc chính |
|---|---|---|
| `don_vi_to_chuc` | ID ổn định, loại và trạng thái đơn vị | UUID PK; loại thuộc `DANG_UY`, `CHI_BO`, `TO` |
| `lich_su_ten_don_vi` | Tên theo khoảng hiệu lực | FK đơn vị; một tên hiện hành/đơn vị |
| `lich_su_quan_he_don_vi` | Quan hệ cha–con theo thời gian | FK cha/con; một cha hiện hành/đơn vị con; chỉ mục theo đơn vị và thời điểm |
| `tai_khoan_nguoi_dung` | Tài khoản và trạng thái truy cập | UUID PK; định danh đăng nhập duy nhất sau chuẩn hóa |
| `ho_so_dang_vien` | Họ tên, trạng thái và liên kết tùy chọn | UUID PK; `maTaiKhoan` tùy chọn, duy nhất, FK |
| `lich_su_don_vi_dang_vien` | Chi bộ chính và Tổ tùy chọn theo thời gian | FK hồ sơ/Chi bộ/Tổ; một dòng hiện hành/hồ sơ; không chồng khoảng hiệu lực |
| `danh_muc_chuc_vu` | Danh mục chức vụ cấu hình | UUID PK; mã tùy chọn duy nhất nếu sử dụng |
| `nhiem_ky` | Khoảng nhiệm kỳ thuộc đơn vị | UUID PK; FK đơn vị; chỉ mục theo đơn vị/thời gian |
| `phan_cong_chuc_vu` | Chức vụ được giao và lịch sử hiệu lực | FK hồ sơ/đơn vị/chức vụ/nhiệm kỳ |
| `vai_tro` | Vai trò cấu hình được | UUID PK; mã duy nhất |
| `quyen` | Danh mục quyền hệ thống | UUID PK; mã duy nhất |
| `vai_tro_quyen` | Ma trận nhiều-nhiều vai trò/quyền | FK hai phía; duy nhất theo cặp |
| `phan_cong_vai_tro` | Vai trò gán cho tài khoản, phạm vi và hiệu lực | FK tài khoản/vai trò; chỉ mục theo tài khoản, trạng thái, thời gian |
| `pham_vi_don_vi` | Danh sách đơn vị cho phạm vi chỉ định | FK phân công/đơn vị; duy nhất theo cặp |
| `nhat_ky_kiem_toan` | Nhật ký nghiệp vụ chỉ ghi thêm | UUID PK; chỉ mục theo người thực hiện/đối tượng/thời gian/mã tương quan |

Mọi bảng có UUID PK. FK bảo vệ tham chiếu; khóa duy nhất có điều kiện bảo vệ một quan hệ hiện hành. Quy tắc nhiều bảng như loại cha–con, cây tối đa ba tầng, Tổ thuộc đúng Chi bộ và khoảng thời gian không chồng lấn được xác nhận trong dịch vụ/quy tắc nghiệp vụ và transaction. Ràng buộc PostgreSQL bổ sung chỉ dùng khi lợi ích bảo toàn dữ liệu rõ ràng và được phản ánh trong migration.

## Lộ trình và nghiệm thu

### Giai đoạn 0 — Tài liệu

Cập nhật README, AI_CONTEXT, architecture và ADR. Nghiệm thu: tài liệu nhất quán, phân biệt hiện trạng với mục tiêu và không ghi tính năng chưa triển khai là đã xong.

### Giai đoạn 1 — Nền máy chủ

Tạo máy chủ NestJS, cấu hình, Prisma/PostgreSQL, migration, kiểm tra trạng thái, ghi log và kiểm thử. Nghiệm thu: dựng môi trường sạch, migration chạy từ đầu, cấu hình thiếu bị phát hiện an toàn, build/kiểm thử đạt.

### Giai đoạn 2 — Tài khoản và khởi tạo quản trị

Hoàn tất và duyệt thiết kế CSDL chi tiết trước; sau đó triển khai xác thực bằng tài khoản nội bộ do quản trị viên quản lý và quy trình khởi tạo quản trị đầu tiên. Chuẩn bị ranh giới để tích hợp SSO sau, khi PTIT cấp điều kiện. Nghiệm thu: migration sạch, phiên an toàn, thu hồi/khóa có hiệu lực, kiểm toán hoạt động quản trị, không có thông tin xác thực mặc định trong mã nguồn.

### Giai đoạn 3 — Tổ chức và phân quyền

Xây cây tổ chức/lịch sử, ma trận vai trò–quyền, phân công–phạm vi, API và kiểm toán. Nghiệm thu: kiểm thử ràng buộc cây, nhiều phân công, bốn phạm vi, hết hạn/thu hồi và truy cập ngoài phạm vi.

### Giai đoạn 4 — Giao diện MVP

Tái sử dụng React Base để quản lý tổ chức và phân quyền qua API. Nghiệm thu: luồng giao diện thành công/lỗi, cập nhật dữ liệu lưu đệm đúng khi đổi phiên/quyền, máy chủ từ chối truy cập trái phép.

### Giai đoạn 5 — Hồ sơ Đảng viên cơ bản

Sau MVP tổ chức/phân quyền và duyệt trường hồ sơ. Nghiệm thu: liên kết tài khoản–hồ sơ tùy chọn một-một; lịch sử đơn vị/chức vụ; quyền đọc/sửa/xuất theo phạm vi; kiểm toán và kiểm thử dữ liệu nhạy cảm.

### Giai đoạn 6 — Sẵn sàng vận hành dữ liệu thật

Kiểm tra sao lưu/phục hồi, cấu hình, quyền, thời hạn lưu và hướng dẫn vận hành. Nghiệm thu: phục hồi bản sao lưu được, không lộ bí mật/dữ liệu cá nhân trong log hoặc CI, chính sách vận hành được phê duyệt.

## Các quyết định phụ thuộc điều kiện thực tế

- Thiết kế quy trình khởi tạo an toàn cho tài khoản quản trị đầu tiên; không hard-code thông tin xác thực hay cá nhân.
- Tích hợp SSO chỉ thực hiện sau khi PTIT cấp phương thức và quyền truy cập cần thiết.
- Người có thẩm quyền cấp `TOAN_HE_THONG` sau khởi tạo.
- Trường hồ sơ bổ sung phải được đơn vị nghiệp vụ phê duyệt trước.
- Mốc sao lưu mã hóa hằng ngày/giữ 30 ngày/thử phục hồi hằng tháng cần xác nhận với hạ tầng.
- Thời hạn lưu nhật ký kiểm toán do đơn vị có thẩm quyền xác nhận; không tự xóa trước quyết định.
