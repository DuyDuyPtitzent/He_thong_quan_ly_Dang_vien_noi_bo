# Đề xuất thiết kế hồ sơ đảng viên theo nhóm tab

**Trạng thái:** Prisma model và migration dữ liệu hồ sơ đã tạo; chưa có API hoặc giao diện hồ sơ. Yêu cầu CCCD, nhóm thông tin sinh viên theo ảnh (bỏ hộ chiếu/mã bưu chính), lớp hành chính, Khóa dạng mã như `D23CQ` và Chi bộ khóa đã được ghi nhận. Cách chia tab và các trường chưa có biểu mẫu vẫn chờ duyệt.

## 1. Nguyên tắc

- Hồ sơ đảng viên là thực thể riêng với tài khoản đăng nhập. Liên kết tài khoản là tùy chọn một-một.
- Tab là cách trình bày giao diện, không phải lý do để gom mọi trường vào một bảng lớn hoặc tạo một bảng cho từng tab.
- Dữ liệu lịch sử như chuyển đơn vị, chức vụ và quá trình công tác được lưu thành các dòng có thời gian hiệu lực; không ghi đè dữ liệu cũ.
- Chưa có biểu mẫu chính thức được cung cấp, nên các trường ở mục “cần xác nhận” chỉ là đề xuất, chưa coi là yêu cầu nghiệp vụ.
- Tab, API và từng thao tác đọc/sửa phải được kiểm tra quyền ở Backend. Ẩn tab trên giao diện không thay thế phân quyền.
- Không đưa dữ liệu PTIT thật vào seed, test hoặc môi trường phát triển.

## 2. Tab giao diện đề xuất

| Tab | Nội dung | Nguồn dữ liệu đề xuất | Trạng thái |
|---|---|---|---|
| Tổng quan | Mã hồ sơ, họ tên, trạng thái; Chi bộ/Tổ hiện tại; chức vụ hiện tại nếu có | Hồ sơ, lịch sử đơn vị, phân công chức vụ | Có thể làm khi module hồ sơ được duyệt; đơn vị/chức vụ là dữ liệu tổng hợp, không nhập lặp |
| Thông tin cá nhân | Thông tin chung, CCCD, địa chỉ và liên hệ | Bảng thông tin cá nhân và địa chỉ riêng | Bổ sung CCCD theo yêu cầu mới; không gồm hộ chiếu/mã bưu chính |
| Thông tin sinh viên | Mã sinh viên, trạng thái, khóa, Chi bộ khóa, đơn vị phụ trách, chương trình, ngành, chuyên ngành, lớp hành chính | Bảng sinh viên và liên kết sinh hoạt hiện hành | Các trường theo yêu cầu; Chi bộ lấy từ quan hệ tổ chức hiện hành, ví dụ hiển thị mã/tên `D25` |
| Quá trình Đảng | Mốc vào Đảng, công nhận chính thức, thông tin thẻ/quyết định nếu cần | Bảng quá trình Đảng | Cần xác nhận trường và tài liệu căn cứ |
| Sinh hoạt và đơn vị | Chi bộ chính, Tổ tùy chọn, lịch sử chuyển đơn vị | `lich_su_don_vi_dang_vien` | Đã có nguyên tắc nghiệp vụ; hiển thị lịch sử theo quyền |
| Chức vụ và nhiệm kỳ | Chức vụ, đơn vị, nhiệm kỳ, thời gian và quyết định phân công | Danh mục chức vụ, nhiệm kỳ, phân công chức vụ | Mô hình khái quát đã duyệt; cần xác nhận quy tắc nghiệp vụ còn mở |
| Công tác và đào tạo | Quá trình công tác, học vấn/đào tạo nếu biểu mẫu yêu cầu | Các bảng lịch sử riêng | Cần xác nhận có quản lý và mức chi tiết nào |
| Khen thưởng và kỷ luật | Sự kiện, loại, quyết định, ngày và đơn vị ban hành | Các bảng lịch sử riêng | Chưa xác nhận phạm vi nghiệp vụ; mặc định chưa đưa vào MVP |
| Gia đình/người thân | Chỉ mở nếu biểu mẫu/chức năng chính thức yêu cầu | Bảng riêng, quyền truy cập hạn chế | Chưa duyệt; không thu thập mặc định |
| Tài liệu hồ sơ | Danh mục tài liệu đính kèm và trạng thái | Bảng metadata; tệp lưu ở kho riêng | Cần duyệt loại tài liệu, nơi lưu và thời hạn giữ |
| Lịch sử thay đổi | Ai thay đổi, lúc nào, thao tác nào; hiển thị lịch sử được phép xem | Nhật ký kiểm toán | Read-only; cần quyền audit riêng |

Các tab có thể ẩn hoặc chỉ đọc khi tài khoản không có quyền. Quyền xem và quyền sửa được tách riêng theo nhóm dữ liệu; quyền xuất/tải tệp là quyền riêng nếu chức năng đó được duyệt.

## 3. Mô hình dữ liệu đề xuất

Tất cả bảng dùng UUID PK, tên bảng/cột tiếng Việt không dấu `snake_case`, thời điểm ghi bằng `timestamptz`, ngày nghiệp vụ bằng `date`. Trường FK có index khi dùng để truy vấn/join thường xuyên.

### 3.1. `ho_so_dang_vien` — lõi hồ sơ

| Trường | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `ma_ho_so` | UUID | PK |
| `ma_ho_so_noi_bo` | varchar(50) | Bắt buộc, unique; mã do hệ thống/quản trị cấp, không phải số thẻ Đảng |
| `so_phieu_ly_lich` | varchar(50) NULL | Số phiếu lý lịch, unique khi có giá trị |
| `so_the_dang_vien` | varchar(50) NULL | Số thẻ Đảng viên, unique khi có giá trị |
| `ho_va_ten` | varchar(200) | Bắt buộc |
| `trang_thai` | enum | Trạng thái hồ sơ theo danh mục được duyệt |
| `ma_tai_khoan` | UUID NULL | FK `tai_khoan_nguoi_dung`, UNIQUE; liên kết tùy chọn một-một |
| `ngay_tao`, `ngay_cap_nhat` | timestamptz | Bắt buộc |

Index trạng thái và họ tên để tra cứu. Chỉ cho tìm kiếm theo trường nhạy cảm nếu có quyền và lý do nghiệp vụ.

### 3.2. `thong_tin_ca_nhan_dang_vien` — dữ liệu định danh/liên hệ

Quan hệ một-một, `ma_ho_so` vừa PK vừa FK tới lõi hồ sơ.

| Trường đề xuất | Kiểu | Ghi chú |
|---|---|---|
| `ngay_sinh` | date NULL | Theo dữ liệu hồ sơ; bắt buộc hay không cần xác nhận |
| `gioi_tinh` | enum/varchar NULL | Danh mục giá trị cần xác nhận |
| `so_cancuoccongdan` | varchar(12) NULL | Dữ liệu định danh nhạy cảm; không dùng làm PK hoặc tên đăng nhập |
| `ngay_cap_ccancuoccongdan` | date NULL | Ngày cấp |
| `noi_cap_cancuoccongdan` | varchar(250) NULL | Nơi cấp |
| `quoc_tich` | varchar(100) NULL | Có thể cần danh mục chuẩn hóa sau |
| `dan_toc`, `ton_giao` | varchar(100) NULL | Nhạy cảm; chỉ thu thập nếu biểu mẫu/mục đích được duyệt |
| `so_dien_thoai`, `email_lien_he` | varchar(30), varchar(254) NULL | Không dùng làm khóa định danh hồ sơ |
| `ngay_tao`, `ngay_cap_nhat` | timestamptz | Bắt buộc |

Theo quyết định sản phẩm ngày 2026-11-03, CCCD lưu dạng rõ trong database và có unique constraint toàn hệ thống; không ghi CCCD vào log/audit hoặc dữ liệu xuất. CCCD bắt buộc 12 chữ số khi tạo tài khoản cùng hồ sơ; trường hợp trùng bị từ chối, không tự động gộp hồ sơ. Không cần cấu hình khóa mã hóa/HMAC. Do bỏ mã hóa tầng ứng dụng, quyền truy cập database và backup cần được giới hạn phù hợp. Không đưa số hộ chiếu vào mô hình.

### 3.3. `dia_chi_dang_vien` — địa chỉ theo loại

Một hồ sơ có tối đa một dòng cho mỗi `loai_dia_chi`; PK `ma_dia_chi UUID`, FK `ma_ho_so UUID`, `loai_dia_chi enum` (`NOI_SINH`, `QUE_QUAN`, `THUONG_TRU`), `phan_loai_noi_sinh enum NULL` (`TRONG_NUOC`, `NUOC_NGOAI`, chỉ áp dụng nơi sinh), `quoc_gia varchar(100) NULL`, `tinh_thanh_pho varchar(150) NULL`, `quan_huyen varchar(150) NULL`, `xa_phuong varchar(150) NULL`, `dia_chi_chi_tiet varchar(500) NULL`, `ngay_cap_nhat timestamptz`.

Unique `(ma_ho_so, loai_dia_chi)`; index `ma_ho_so`. Không có trường mã bưu chính. Tên/đơn vị hành chính được lưu theo nguồn được duyệt; mã địa giới và chuẩn hóa theo danh mục chính thức cần thiết kế cùng nguồn liên thông, không hard-code danh mục hiện hành vào thiết kế này.

### 3.4. `thong_tin_sinh_vien` — phần mở rộng hồ sơ sinh viên

Quan hệ một-một tùy chọn: `ma_ho_so UUID PK/FK`; không phải hồ sơ đảng viên nào cũng là sinh viên.

| Trường đề xuất | Kiểu | Ràng buộc / ghi chú |
|---|---|---|
| `ma_sinh_vien` | varchar(50) | Bắt buộc, unique sau chuẩn hóa |
| `trang_thai_hoc_tap` | varchar(50) | Mã/trạng thái lấy từ danh mục nguồn được duyệt; chưa chốt tập giá trị |
| `khoa_hoc` | varchar(50) NULL | Lưu mã khóa theo dữ liệu nguồn, ví dụ `D23CQ`; không tự suy ra từ năm |
| `don_vi_phu_trach` | varchar(200) NULL | Ví dụ nhãn “Đơn vị phụ trách” trong ảnh; chưa mã hóa danh mục |
| `chuong_trinh_dao_tao` | varchar(250) NULL | Tên chương trình |
| `nganh` | varchar(200) NULL | Tên ngành |
| `chuyen_nganh` | varchar(200) NULL | Tên chuyên ngành |
| `lop_hanh_chinh` | varchar(100) NULL | Bổ sung theo yêu cầu; lưu mã/tên lớp theo nguồn |
| `ma_nguon_du_lieu` | varchar(80) NULL | Dự phòng xác định hệ thống/phòng ban nguồn |
| `ma_ban_ghi_nguon` | varchar(120) NULL | ID bản ghi ở hệ thống nguồn; không phải mã sinh viên |
| `dong_bo_cuoi_luc` | timestamptz NULL | Thời điểm đồng bộ gần nhất |
| `ngay_tao`, `ngay_cap_nhat` | timestamptz | Bắt buộc |

Index unique `ma_sinh_vien`; index tùy chọn theo `lop_hanh_chinh`, ngành hoặc trạng thái khi chức năng tra cứu yêu cầu. Không sao chép các trường cá nhân đã có ở `thong_tin_ca_nhan_dang_vien` sang bảng sinh viên.

Các trường trên phản ánh nhãn trong ảnh: mã sinh viên, trạng thái, giới tính, ngày sinh, email, số điện thoại, quốc tịch, dân tộc, tôn giáo, nơi sinh, quê quán, địa chỉ thường trú, đơn vị phụ trách, chương trình đào tạo, ngành và chuyên ngành; bổ sung khóa học, Chi bộ khóa và lớp hành chính theo yêu cầu. Giới tính/ngày sinh/liên hệ/địa chỉ đặt ở bảng cá nhân/địa chỉ để không trùng dữ liệu; thông tin sinh viên riêng gồm mã, trạng thái học vụ, khóa, đơn vị học vụ, chương trình, ngành, chuyên ngành và lớp hành chính. Mã khóa như `D23CQ` lưu dưới dạng chuỗi đúng theo nguồn; không suy diễn rằng năm tuyển sinh `2025` phải chuyển thành một mã cụ thể.

**Chi bộ khóa** không lưu thêm chuỗi `chi_bo_khoa` trong bảng sinh viên. Tab lấy Chi bộ hiện hành từ `lich_su_don_vi_dang_vien.ma_chi_bo` (FK tới `don_vi_to_chuc`) và hiển thị mã/tên đơn vị, ví dụ `D25`. Khi ghi nhận sinh hoạt, Backend xác nhận đây là đơn vị loại `CHI_BO`; danh sách Chi bộ thực tế do quản trị cấu hình, không hard-code. Nếu sau này “Chi bộ khóa” là phân loại độc lập khác Chi bộ sinh hoạt hiện hành thì cần thiết kế quan hệ riêng để tránh nhập nhằng.

Ảnh được dùng làm căn cứ về **nhãn trường**, không sao chép dữ liệu thực tế hiển thị trong ảnh vào tài liệu, seed hoặc test. Hộ chiếu và mã bưu chính bị loại theo yêu cầu.

### 3.5. `qua_trinh_dang_vien` — mốc quá trình Đảng

`ma_qua_trinh UUID PK`, `ma_ho_so UUID FK`, `loai_su_kien enum`, `ngay_su_kien date`, `so_quyet_dinh varchar(100) NULL`, `ngay_quyet_dinh date NULL`, `noi_dung text NULL`, `nguoi_ghi_nhan UUID FK`, `ngay_tao timestamptz`.

- Một hồ sơ có nhiều sự kiện theo thời gian; index `(ma_ho_so, ngay_su_kien)`.
- Giá trị `loai_su_kien` và trường cần cho từng loại (ví dụ mốc kết nạp/công nhận chính thức/cấp thẻ) cần chốt theo biểu mẫu.
- Nếu mỗi sự kiện có trường riêng bắt buộc, dùng bảng chuyên biệt thay vì một bảng JSON linh động.

### 3.6. `lich_su_don_vi_dang_vien` — sinh hoạt và chuyển đơn vị

Dùng bảng đã đề xuất ở thiết kế nền: `ma_lich_su UUID PK`, `ma_ho_so UUID FK`, `ma_chi_bo UUID FK`, `ma_to UUID FK NULL`, `ngay_hieu_luc_tu timestamptz`, `ngay_hieu_luc_den timestamptz NULL`, `ly_do_chuyen text NULL`, `nguoi_ghi_nhan UUID FK`, `ngay_tao timestamptz`. Khoảng hiệu lực dùng `[bắt đầu, kết thúc)` theo giờ Việt Nam; ngày kết thúc nhập theo lịch bao gồm hết ngày đó.

Index `(ma_ho_so, ngay_hieu_luc_tu)` và unique có điều kiện cho dòng hiện hành theo hồ sơ. Tổ phải thuộc đúng Chi bộ. Chuyển đơn vị đóng dòng hiện tại và tạo dòng mới trong một transaction.

### 3.7. Công tác, đào tạo, khen thưởng/kỷ luật

Chỉ tạo các bảng này nếu được xác nhận là phạm vi hồ sơ cần quản lý. Nếu được duyệt, đề xuất dùng các bảng lịch sử độc lập:

- `qua_trinh_cong_tac`: hồ sơ, đơn vị công tác (text theo nguồn được duyệt hoặc FK tới danh mục nếu có), chức vụ công tác, từ ngày, đến ngày, ghi chú.
- `qua_trinh_dao_tao`: hồ sơ, loại hình/ trình độ, chuyên ngành, cơ sở đào tạo, từ ngày, đến ngày, văn bằng/chứng nhận nếu cần.
- `khen_thuong_dang_vien` và `ky_luat_dang_vien`: hồ sơ, hình thức, quyết định, cơ quan ban hành, ngày hiệu lực, ghi chú.

Mỗi bảng dùng UUID PK, FK hồ sơ, ngày tạo/cập nhật và index `(ma_ho_so, ngay_bat_dau)` hoặc `(ma_ho_so, ngay_su_kien)`. Chưa định nghĩa danh mục, tên cấp bậc hay giá trị enum thực tế.

### 3.8. Người thân và tệp đính kèm — chưa đưa vào mặc định

- Nếu được duyệt, `nguoi_than_dang_vien` phải là bảng riêng, giới hạn trường tối thiểu và cấp quyền rất hẹp; chưa đề xuất thu thập chi tiết thân nhân khi chưa biết biểu mẫu/mục đích.
- Nếu được duyệt, `tep_dinh_kem_ho_so` chỉ lưu metadata: UUID, hồ sơ FK, loại tài liệu, khóa lưu trữ nội bộ, tên gốc đã làm sạch, loại MIME, kích thước, người tải lên và thời điểm. Tệp không đặt dưới thư mục public; tải xuống phải qua kiểm tra quyền. Kho lưu, mã hóa, thời hạn lưu và quét tệp cần quyết định riêng.

## 4. Lịch sử, audit và bảo vệ dữ liệu

- Mỗi lần sửa lưu người thực hiện, thời điểm, lý do khi được yêu cầu và audit trước/sau đã lọc; không ghi mật khẩu, token hoặc toàn bộ hồ sơ vào log.
- Đọc nhóm dữ liệu nhạy cảm, xuất hồ sơ và tải tệp cần quyền tương ứng; từ chối mặc định nếu thiếu scope.
- Không dùng soft-delete thay cho lịch sử hiệu lực. Ngừng hiệu lực/ẩn hồ sơ phải có trạng thái và audit theo quy tắc được duyệt.
- Thời hạn lưu hồ sơ, tài liệu và audit phải theo chính sách của đơn vị; chưa tự gán thời hạn.
- Thông tin sinh viên có thể liên thông sau với phòng ban/hệ thống được PTIT cho phép. Trước khi xây tích hợp cần chốt hệ thống nguồn, quyền truy cập, trường nào nguồn nào làm chủ, tần suất đồng bộ, xử lý sai lệch và audit đồng bộ. Không để dữ liệu nguồn tự ghi đè không kiểm soát các chỉnh sửa được quản trị viên xác nhận.

## 5. Đề nghị duyệt

1. Duyệt cách chia các tab, gồm tab riêng “Thông tin sinh viên” chỉ hiện với hồ sơ sinh viên; Chi bộ khóa hiển thị từ liên kết sinh hoạt hiện hành, không lưu lặp; thông tin cá nhân/địa chỉ dùng bảng riêng.
2. Đã duyệt: CCCD (số, ngày cấp, nơi cấp), các trường theo nhãn trong ảnh, loại trừ hộ chiếu và mã bưu chính, bổ sung khóa học (mã như `D23CQ`), Chi bộ khóa (liên kết Chi bộ sinh hoạt hiện hành, ví dụ `D25`) và lớp hành chính. Còn cần chốt trường nào bắt buộc và danh mục chuẩn hóa.
3. Duyệt phạm vi MVP hồ sơ gồm lõi hồ sơ, thông tin cá nhân, thông tin sinh viên nếu áp dụng, quá trình Đảng và lịch sử đơn vị; các tab công tác/đào tạo, khen thưởng/kỷ luật, gia đình và tài liệu để sau khi xác nhận.
4. Chốt danh mục trạng thái sinh viên, tính bắt buộc của trường, chuẩn địa chỉ và quy tắc chống trùng CCCD theo biểu mẫu/nguồn chính thức.

Sau khi duyệt, cập nhật ERD/data dictionary tổng thể rồi mới tạo Prisma model và migration; không triển khai trường đang chờ xác nhận.

## Phần đã triển khai — 2026-11-03

- `ho_so_dang_vien` được bổ sung `trang_thai_dang_vien` nullable (`DU_BI`, `CHINH_THUC`, `DA_RA_KHOI_DANG`, `TU_TRAN`) và `ngay_vao_dang`; hồ sơ cũ giữ NULL do không có căn cứ để suy ra trạng thái. Thay đổi nằm trong migration bổ sung, không chỉnh sửa migration cũ.
- Số CCCD tiếp tục được lưu trong trường mã hóa hiện hữu. Backend yêu cầu khóa AES-256-GCM và khóa HMAC đối chiếu tách biệt qua biến môi trường; không ghi số CCCD hoặc digest vào nhật ký kiểm toán.
