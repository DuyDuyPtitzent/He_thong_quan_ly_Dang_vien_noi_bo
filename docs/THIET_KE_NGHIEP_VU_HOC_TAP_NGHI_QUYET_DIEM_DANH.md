# Thiết kế nghiệp vụ: Học tập nghị quyết và điểm danh

**Trạng thái:** Bản rà soát và đề xuất để duyệt; chưa triển khai  
**Ngày rà soát:** 09-11-2026

> Tài liệu mô tả hiện trạng và đề xuất nghiệp vụ. Không thay đổi code, schema, migration, Permission hoặc dữ liệu. Các điểm chưa quyết định cần được duyệt trước khi thiết kế nền tảng.

## 1. Tóm tắt

- Mô hình đề xuất: **Đợt học → Buổi học → Danh sách tham gia được chụp tại thời điểm xác nhận → Yêu cầu điểm danh → Kết quả chính thức → Lịch sử**.
- Mỗi Đảng viên tối đa một kết quả chính thức/buổi. Yêu cầu đang chờ không làm đổi kết quả chính thức.
- Trạng thái đợt, buổi, cửa sổ điểm danh, yêu cầu và kết quả là các vòng đời tách biệt.
- Phân công phụ trách là giao việc, không cấp Permission. API quản trị kiểm tra Permission + Scope trên Assignment đang hoạt động.
- Không suy diễn vắng mặt từ việc không quét QR. Form công khai tạo yêu cầu cần đối chiếu; không tạo hồ sơ mới và không tự chứng minh danh tính/sự hiện diện.
- Module thuộc nhóm Quản lý Đảng viên theo quy hoạch Sidebar. Mục hiện tại đang disabled, chưa có route/chức năng.

## 2. Hiện trạng đã kiểm chứng

### Có thể tái sử dụng

| Năng lực | Hiện trạng và giới hạn |
|---|---|
| Hồ sơ Đảng viên | Model HoSoDangVien có mã hồ sơ, họ tên, trạng thái, ngày vào Đảng/chính thức và liên kết tài khoản tùy chọn. API có danh sách, chi tiết, hồ sơ của tôi, kiểm tra quyền/phạm vi. Dùng hồ sơ làm định danh; họ tên không phải khóa duy nhất. |
| Lịch sử sinh hoạt | LichSuDonViDangVien liên kết hồ sơ với Chi bộ/Tổ tùy chọn theo thời gian hiệu lực. Dùng làm đầu vào dựng danh sách, nhưng phải snapshot đơn vị/tên tại mốc chốt để bảo toàn báo cáo lịch sử. |
| Cây tổ chức | DonViToChuc, LichSuQuanHeDonVi, LichSuTenDonVi; có API cây/danh sách và OrganizationUnitPicker. Tái sử dụng UUID, quan hệ và bộ chọn; không hard-code tên đơn vị. |
| Năm học | Module school-years có API/danh mục và Permission NAM_HOC_*. NamHoc hiện chưa có quan hệ nghiệp vụ tham chiếu. Đợt–năm học cần thiết kế quan hệ sau khi duyệt. |
| RBAC | Role–Permission–Assignment–Scope; phiên lưu maPhanCongVaiTroDangHoatDong. PhanQuyenService lọc Assignment hiệu lực được chọn và kiểm tra Permission + Scope trên cùng Assignment. Không cộng quyền giữa Assignment, không mặc định người tạo/phụ trách toàn quyền. |
| Audit | NhatKyKiemToan ghi người, hành động, đối tượng, kết quả, before/after, mã tương quan, IP và thời điểm. Module system-logs có API riêng. Cần thêm lịch sử miền dễ hiểu; không ghi CCCD, QR token hay input form nhạy cảm vào audit. |
| Ngày giờ | Có DatePicker, DateTimePicker, DateRangePicker, DateTimeRangePicker; quy ước date-only yyyy-MM-dd và local datetime yyyy-MM-dd'T'HH:mm. |
| UI | Có PageContainer (AdminLayout đã bọc), PageHeader, StatisticCard, DataTable, Table primitives, StandardSheet, Dialog, Empty/Loading state, OrganizationUnitPicker và chart primitive. Tái sử dụng; không bọc PageContainer lần nữa. Không thấy StarCard tổng quát riêng; hiện có StatisticCard và thẻ tổng hợp luồng Excel. |
| Excel | Backend data-transfer xử lý workbook; feature sở hữu mapping, validation, quyền, preview/xác nhận và audit. Báo cáo Excel sau này thuộc feature; module chung không ghi bảng nghiệp vụ. |

### Đã có nhưng không phải điểm danh

- ThongTinDaoTaoDang lưu đào tạo/bồi dưỡng Đảng của cá nhân, không phải mô hình nhiều buổi/danh sách/điểm danh/phê duyệt.
- DotCapNhatHoSo và YeuCauCapNhatHoSo là luồng cập nhật hồ sơ; không tái sử dụng hoặc đổi nghĩa.
- Nhật ký audit không thay lịch sử miền điểm danh.
- NamHoc là danh mục độc lập, chưa có FK nghiệp vụ.

### Còn thiếu

Chưa có feature/route Frontend, endpoint Backend, model Prisma hoặc Permission riêng cho đợt, buổi, danh sách snapshot, QR, form công khai, yêu cầu xử lý, kết quả, chốt và thống kê. Chưa có chống gửi lặp/chống dò hồ sơ cho form công khai. Chưa có định nghĩa được duyệt cho tham gia đầy đủ, tỷ lệ tham gia, hay thay danh sách sau khi nhận điểm danh.

navigation.config.ts có mục “Học tập nghị quyết (Đang phát triển)” disabled, không có path; docs/sidebar-module-conventions.md xác nhận chưa có route/chức năng. Trang thống kê chuyên biệt có thể thuộc feature, nhưng vị trí so với nhóm Báo cáo cần chốt.

## 3. Mô hình nghiệp vụ

1. **Đợt học:** chương trình/chủ đề, năm học, đơn vị tổ chức, phạm vi và thời gian tổng thể.
2. **Buổi học:** lần tổ chức cụ thể, thời gian/địa điểm, đối tượng, cấu hình điểm danh, phụ trách và duyệt riêng.
3. **Danh sách tham gia:** hồ sơ thuộc diện đã xác nhận; mỗi dòng có snapshot Chi bộ/Tổ/tên đơn vị/mốc chụp. Ngoại lệ lưu người thao tác và audit.
4. **Yêu cầu:** đề nghị tạo mới hoặc thay đổi kết quả, trạng thái xử lý, người/thời điểm gửi. Đề xuất chỉ một yêu cầu chờ xung đột trên cùng kết quả.
5. **Kết quả chính thức:** trạng thái được công nhận của cặp buổi–hồ sơ; một kết quả duy nhất. Chưa điểm danh có thể là trạng thái hiển thị khi chưa có bản ghi.
6. **Lịch sử:** thay đổi chính thức và yêu cầu được duyệt/từ chối hoặc ghi trực tiếp; lưu người, thời điểm, before/after. Không lưu nguồn QR/form/thủ công trong kết quả chính thức.

Quy tắc: buổi thuộc một đợt; danh sách được snapshot khi xác nhận; chuyển tổ chức sau đó không viết lại lịch sử; yêu cầu chờ không phải kết quả; không tự đánh dấu vắng khi cửa sổ đóng; người tạo/phụ trách không có quyền ngầm.

## 4. Quy trình

**Tạo đợt Nháp → Hoàn thiện phạm vi/thông tin → Tạo buổi → Xác nhận danh sách và snapshot → Mở nhận điểm danh → QR/Form/Thủ công → Xác minh nếu cần → Duyệt nếu bật → Kết quả chính thức → Đóng online → Xử lý tồn đọng/thủ công → Kết thúc buổi → Chốt danh sách → Điều chỉnh theo quyền → Lịch sử/audit.**

### Tạo đợt và buổi

1. Kiểm tra Assignment hiện hành và quyền.
2. Tạo đợt Nháp, mã sinh ở server; chọn năm học từ danh mục, đơn vị/phạm vi, mô tả, tài liệu, phụ trách, thời gian.
3. Kiểm tra Scope và ngày. Kết thúc/hủy bằng thao tác rõ; ngày không đảo trạng thái kết thúc/hủy.
4. Tạo buổi; lưu người tạo riêng người phụ trách. Phạm vi buổi kế thừa hoặc hẹp hơn phạm vi đợt.
5. Dựng danh sách ứng viên từ hồ sơ và lịch sử sinh hoạt; xem trước, tìm kiếm/lọc, thêm ngoại lệ theo quyền.
6. Xác nhận snapshot danh sách và tổ chức. Thay đổi sau khi bắt đầu cần version/ngoại lệ/audit, không xóa âm thầm.
7. Cấu hình kênh/cửa sổ/chu kỳ/duyệt; khóa cấu hình duyệt từ lần nhận yêu cầu đầu tiên.

### QR động

1. Người có quyền mở cửa sổ; server kiểm tra Permission + Scope.
2. QR đổi theo chu kỳ 15/30/60 giây, gắn buổi/cửa sổ, chứa token ngẫu nhiên ngắn hạn, không chứa PII.
3. Đã đăng nhập: server lấy hồ sơ từ tài khoản liên kết, không tin maHoSo client gửi.
4. Chưa đăng nhập: mở form công khai chỉ khi cho phép. QR không chứng minh hiện diện hay danh tính.
5. Server kiểm tra hạn, cửa sổ, danh sách/ngoại lệ, kết quả/yêu cầu hiện tại và gửi lặp.
6. Thiếu căn cứ thì Chờ xác minh; bật duyệt thì Chờ phê duyệt; chỉ ghi trực tiếp khi đủ căn cứ.

### Form công khai

Đầu vào theo yêu cầu: họ tên, Chi bộ, năm sinh, CCCD không bắt buộc. Đây là PII; đề xuất bỏ CCCD nếu không thật sự cần.

- Chỉ mở qua buổi đang mở; thông báo mục đích/xử lý dữ liệu.
- Rate limit/chống bot/chống gửi lặp; không trả danh sách hồ sơ hay thông báo tiết lộ hồ sơ nào tồn tại.
- Không khớp/nhiều khớp/thiếu căn cứ → Chờ xác minh; không tạo hồ sơ.
- Khớp duy nhất cũng không chứng minh hiện diện, không tự ghi Có mặt từ lời khai.
- Đề xuất không lưu CCCD dạng rõ. Nếu cần giữ, duyệt mục đích, mã hóa, quyền xem, retention và xóa. Audit không ghi input form.
- Đóng cửa sổ thì từ chối submit mới kể cả form đã mở trước; phản hồi không tiết lộ thông tin hồ sơ.

### Thủ công, xác minh, duyệt

- Cần Permission + Scope; nhiệm vụ phụ trách là gate bổ sung nếu policy yêu cầu.
- Xem danh sách snapshot, lọc trong Scope, cập nhật từng người/hàng loạt; trả trạng thái từng dòng.
- Bật duyệt: yêu cầu riêng từng người; tắt: cập nhật trực tiếp và lưu lịch sử.
- Cửa sổ online đóng vẫn cho thao tác thủ công.
- Xác minh chỉ liên kết hồ sơ hiện có. Bật duyệt thì chuyển chờ duyệt; tắt duyệt chỉ cập nhật chính thức nếu policy cho phép.
- Người duyệt có Permission riêng; không mặc định người gửi/phụ trách được duyệt.
- Duyệt yêu cầu mới tạo kết quả; duyệt điều chỉnh thay kết quả và lưu before/after. Từ chối giữ kết quả cũ.
- Xử lý đúng một lần; yêu cầu stale trả xung đột.

### Đóng và chốt

- **Đóng trực tuyến:** QR/form vô hiệu, ngừng nhận mới; vẫn xử lý tồn đọng và thủ công.
- **Kết thúc buổi:** xác nhận hoạt động xong; không đồng nghĩa đóng online hoặc chốt.
- **Chốt danh sách:** ghi người, thời điểm và phiên bản. Đề xuất chặn nếu còn yêu cầu chờ.
- Sau chốt vẫn sửa với quyền riêng. Bật duyệt thì yêu cầu và giữ kết quả cũ; tắt thì cập nhật trực tiếp, luôn lưu lịch sử.
- Đầu vào không yêu cầu lý do điều chỉnh; cần xác nhận riêng việc sửa trạng thái vắng sau chốt.

## 5. Ma trận vai trò – chức năng

| Chức năng | Quản lý đợt | Tạo/quản lý buổi | Phụ trách điểm danh | Xác minh/duyệt/chốt | Đảng viên đăng nhập | Chưa đăng nhập |
|---|---|---|---|---|---|---|
| Xem đợt/buổi | Theo quyền/Scope | Theo quyền/Scope | Buổi được giao + Scope | Theo quyền/Scope | Buổi của mình | Form qua QR |
| Tạo/sửa/kết thúc đợt | Permission từng thao tác | Không mặc nhiên | Không | Không mặc nhiên | Không | Không |
| Tạo/sửa/cấu hình buổi | Khi được cấp | Permission + Scope | Không mặc nhiên | Không mặc nhiên | Không | Không |
| Chốt danh sách | Theo quyền | Theo quyền | Được giao + quyền | Theo quyền | Không | Không |
| Mở/đóng/QR | Không mặc nhiên | Không mặc nhiên | Được giao + Permission | Theo Permission | Quét khi mở | Gửi khi form mở |
| Ghi thủ công | Không mặc nhiên | Không mặc nhiên | Được giao + Permission | Theo Permission | Không tự sửa | Không |
| Xác minh/duyệt | Không mặc nhiên | Không mặc nhiên | Không mặc nhiên | Permission riêng | Theo dõi mình | Không tra cứu dữ liệu |
| Chốt/điều chỉnh/xuất | Quyền riêng | Quyền riêng | Chỉ nếu được cấp | Quyền riêng | Lịch sử mình nếu duyệt | Không |

Permission + Scope luôn bắt buộc; nhiệm vụ là điều kiện bổ sung. Người tạo không có đặc quyền. Mất quyền thì request kế tiếp bị từ chối, dữ liệu đã nhận vẫn giữ. Giao việc không cấp Permission/Scope. Tách quyền xem, thủ công, xác minh, duyệt, chốt, thống kê và xuất.

Scope cần hỗ trợ đúng chính sách: CAY_DON_VI theo cây, DON_VI_CHI_DINH đúng đơn vị, TOAN_HE_THONG chỉ khi chính Assignment có Permission, CA_NHAN chỉ hồ sơ liên kết chính tài khoản (nếu hỗ trợ). Với buổi liên đơn vị và Scope một phần, cần duyệt người thao tác thấy toàn buổi, phần được phép, hay bị chặn.

## 6. Trường và cấu hình

### Đợt học

| Trường | Quy tắc |
|---|---|
| Mã đợt | Server sinh duy nhất; định dạng cần chốt; không dùng làm căn cứ quyền. |
| Tên | Bắt buộc. |
| Năm học | Chọn NamHoc; cần xác nhận có bắt buộc; không suy từ ngày. |
| Đơn vị tổ chức/phạm vi | Từ cây và trong Scope; không hard-code; snapshot tên khi cần. |
| Nội dung/mô tả | Tùy chọn. |
| Tài liệu | Tùy chọn; kho riêng, loại/dung lượng/quyền/retention cần duyệt; không dùng bảng tài liệu hồ sơ. |
| Người phụ trách | Tài khoản hợp lệ; không cấp quyền; chốt một hay nhiều người. |
| Thời gian dự kiến | Bắt buộc đề xuất, giờ địa phương, bắt đầu ≤ kết thúc. |
| Trạng thái | Nháp, Sắp diễn ra, Đang diễn ra, Đã kết thúc, Đã hủy. Kết thúc/hủy không tự đổi theo ngày. |
| Người/thời điểm tạo | Server ghi, audit. |

### Buổi học

Tên, đợt cha, thời gian bắt đầu/kết thúc (bắt đầu < kết thúc), địa điểm, nội dung, tài liệu, người tạo, người phụ trách, quy tắc phạm vi, danh sách snapshot và trạng thái. Mã do server sinh. Hiện chưa xác minh danh mục địa điểm; online/hybrid cần loại địa điểm/URL. Đề xuất trạng thái: Nháp, Đã lên lịch, Đang diễn ra, Đã kết thúc, Đã hủy; cần duyệt danh mục/chuyển trạng thái.

### Cấu hình điểm danh

| Cấu hình | Mặc định đầu vào | Quy tắc |
|---|---|---|
| Online | Bật | Nếu tắt, QR/form đóng; thủ công còn dùng được. |
| QR | Bật | QR động theo buổi/cửa sổ, không PII. |
| Form | Bật | Dùng đồng thời với QR được phép. |
| Chưa đăng nhập | Bật | Không đồng nghĩa auto-approve; cần anti-abuse/PII. |
| Mở/đóng | Người tạo cấu hình | Mở < đóng; server là đồng hồ chuẩn; đóng thủ công vô hiệu ngay. |
| Chu kỳ QR | 15 giây | Chọn 15/30/60; chốt biên hết hạn/clock skew. |
| Phê duyệt | Tắt | Khóa từ lần nhận đầu; không đổi sau khi bắt đầu. |
| Ngoài danh sách | Chưa chốt | Quyền, thời điểm, duyệt và ảnh hưởng số liệu. |

### Phê duyệt

Bật/tắt theo buổi; khi bật, yêu cầu mới, thủ công và điều chỉnh sau chốt đều qua duyệt. Một cấp. Người duyệt có Permission + Scope; nhiệm vụ có thể là điều kiện bổ sung. Từ chối lưu người/thời điểm; có bắt lý do cần xác nhận. Điều chỉnh chờ duyệt giữ kết quả cũ.

## 7. Trạng thái

| Đối tượng | Trạng thái và quy tắc |
|---|---|
| Đợt | NHAP → SAP_DIEN_RA → DANG_DIEN_RA → DA_KET_THUC; có thể DA_HUY theo quyền. Các trạng thái theo ngày có thể là dẫn xuất; kết thúc/hủy tường minh và không tự đảo. Đề xuất chỉ kết thúc khi mọi buổi xong/hủy. |
| Buổi | NHAP → DA_LEN_LICH → DANG_DIEN_RA → DA_KET_THUC; DA_HUY riêng. Kết thúc không đồng nghĩa cửa sổ đóng/chốt. |
| Cửa sổ | CHUA_MO → DANG_MO → DA_DONG. Đóng theo giờ hoặc thủ công; đề xuất không mở lại nếu chưa có policy. |
| Kết quả | Chưa điểm danh, Có mặt, Đi muộn, Vắng có phép, Vắng không phép. Không tự đánh dấu vắng. Mốc Đi muộn cần định nghĩa. |
| Yêu cầu | Chờ xác minh, Chờ phê duyệt, Đã duyệt, Đã từ chối. Đề xuất thêm Đã hủy nếu người gửi được rút trước xử lý. |
| Danh sách | Chưa chốt → Đã chốt; lưu người/thời điểm/version. Đề xuất chặn nếu yêu cầu còn chờ. Sau chốt sửa theo quyền/workflow, giữ lịch sử. |

## 8. Thống kê

Chỉ tính kết quả chính thức được duyệt/ghi trực tiếp; yêu cầu chờ/từ chối/chưa xác minh không tính. Với buổi, N là số hồ sơ snapshot; CM, DM, VP, VK là Có mặt, Đi muộn, Vắng có phép, Vắng không phép; CD là chưa có kết quả.

- Thuộc diện: số hồ sơ duy nhất snapshot.
- Tỷ lệ tham gia đề xuất (CM + DM) / N; N=0 hiển thị “—”. Cần duyệt Đi muộn có tính không.
- Tỷ lệ xử lý: (CM + DM + VP + VK) / N; tách CD khỏi vắng.
- Tham gia đầy đủ: thuộc diện mọi buổi áp dụng và đạt tiêu chí tất cả; cần chốt Đi muộn/miễn.
- Chưa đầy đủ: ít nhất một buổi áp dụng không đạt.
- Không tham gia buổi nào: có buổi áp dụng nhưng không CM/DM ở bất cứ buổi nào; bỏ buổi không thuộc danh sách.
- Mức tham gia đợt phải chọn tỷ lệ người đủ điều kiện hoặc tổng lượt/tổng lượt dự kiến; không trộn người và lượt.
- Theo Chi bộ dùng snapshot từng buổi; đợt nhiều buổi báo số người duy nhất và số lượt riêng.
- Đợt chưa chốt cần gắn nhãn; buổi hủy đề xuất loại khỏi mẫu số và hiển thị rõ.
- Biểu đồ: theo Chi bộ, từng buổi, xu hướng qua đợt, mức hoàn thành. Thống kê/xuất có quyền riêng.

## 9. Ngoại lệ

| Tình huống | Xử lý |
|---|---|
| Trùng điểm danh | Unique buổi–hồ sơ; idempotency hoặc trả xung đột/kết quả hiện có. |
| QR hết hạn/sai buổi | Từ chối, không ghi. |
| Form hết hạn/đóng | Từ chối trước đối chiếu. |
| Ngoài danh sách | Không tự thêm; ngoại lệ theo quyền, snapshot/audit. |
| Không khớp/nhiều hồ sơ | Chờ xác minh, không tạo hồ sơ/không tiết lộ ứng viên. |
| Đã có kết quả | Không ghi đè; workflow điều chỉnh. |
| Chuyển Chi bộ | Báo cáo dùng snapshot từng buổi; số người/lượt tách riêng. |
| Mất Permission/Scope/Assignment | Request kế tiếp từ chối; dữ liệu/yêu cầu giữ. |
| Mất nhiệm vụ | Chặn thao tác nếu nhiệm vụ là gate; quyết định cửa sổ có tự đóng không. |
| Cập nhật đồng thời | Version/concurrency; thao tác stale tải lại; audit đúng before/after. |
| Nhiều yêu cầu chờ | Đề xuất một yêu cầu chờ/kết quả; request xung đột trả rõ. |
| Chốt khi còn chờ | Đề xuất chặn chốt. |
| Từ chối | Giữ kết quả cũ; ghi người/thời điểm/lý do nếu policy yêu cầu. |
| Sửa sau chốt | Bật duyệt tạo yêu cầu; tắt cập nhật trực tiếp; luôn lịch sử. |
| Hủy sau điểm danh | Không xóa; quy tắc loại mẫu số phải công bố. |
| Sửa danh sách sau bắt đầu | Version/ngoại lệ/audit; quy định ảnh hưởng mẫu số/kết quả. |
| Lạm dụng form | Rate limit, anti-bot, không tiết lộ hồ sơ, không log PII. |
| Tệp không hợp lệ | Whitelist, size/content validation, kho riêng, không link công khai. |

## 10. Giao diện đề xuất

Trong nhóm Quản lý Đảng viên, đầu vào quy hoạch:

1. **Quản lý đợt học:** danh sách, tạo/sửa/xem, buổi, kết thúc/hủy.
2. **Quản lý điểm danh:** buổi được giao, snapshot danh sách, QR, yêu cầu, thủ công, chốt.
3. **Kết quả & Thống kê:** theo đợt/buổi/Chi bộ, xuất theo quyền.

Đây chưa phải route. Cần xác nhận trang thống kê thuộc module hay nhóm Báo cáo chung. Luồng cá nhân ở Hồ sơ của tôi/QR, không thêm Sidebar riêng. Người chưa đăng nhập chỉ vào form qua QR/link buổi.

Dùng PageHeader, Card/Table, StatisticCard; bảng rộng cuộn ngang trong Card; StandardSheet/Dialog; danh mục năm học/đơn vị từ API; shared date-time picker. Điểm danh tách cửa sổ, QR, snapshot, yêu cầu và kết quả; biểu diễn riêng trạng thái lỗi/loading/rỗng/không quyền. Form công khai tối thiểu PII. Dùng token màu hiện có, không tạo bảng màu riêng.

## 11. Hướng CSDL/API sau khi duyệt (không phải schema)

Cần mô hình hóa đợt, buổi, phạm vi, nhiệm vụ, snapshot danh sách/tổ chức, cấu hình cửa sổ, version/chốt, yêu cầu, kết quả, lịch sử miền và audit. Không nhất thiết mỗi khái niệm là một bảng; ERD, field dictionary, ràng buộc, retention thiết kế sau duyệt.

Bảo đảm unique kết quả theo buổi–hồ sơ; idempotency; snapshot bất biến; QR ngẫu nhiên/hết hạn/gắn buổi/không PII; auth + Permission + Assignment đang chọn + hiệu lực + Scope; public endpoint tối thiểu hóa/chống lạm dụng; kết quả + lịch sử + audit nhất quán; báo cáo giới hạn dữ liệu theo quyền.

Permission mới phải đề xuất trong permission-catalog.ts. Chỉ đánh dấu DA_CO_API khi endpoint thật sự kiểm tra xác thực, Permission và Scope. Rà CAY_DON_VI, DON_VI_CHI_DINH, TOAN_HE_THONG và CA_NHAN cho luồng cá nhân nếu hỗ trợ. Không tự cấp quyền/Role/Scope.

## 12. Cần xác nhận trước khi chốt

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| 1 | Đợt bắt buộc gắn năm học? | Có; ngoại lệ phải khai báo policy. |
| 2 | Phạm vi đơn vị/cây có gồm gốc? | Theo policy; quy định tường minh đơn vị gốc. |
| 3 | Tiêu chí hồ sơ vào danh sách? | Nghiệp vụ xác định trạng thái và mốc sinh hoạt; không coi mọi hồ sơ đủ điều kiện. |
| 4 | Ai/thời điểm thêm ngoại lệ? | Permission + Scope, audit, ảnh hưởng mẫu số được chốt. |
| 5 | Form có cần CCCD? | Bỏ nếu có thể; nếu giữ duyệt retention/mã hóa/quyền/mục đích. |
| 6 | QR có chứng minh hiện diện? | Không; cần biện pháp khác nếu nghiệp vụ yêu cầu. |
| 7 | Đối chiếu form đủ tin cậy khi nào? | Không auto-verify từ tên/năm sinh/Chi bộ. |
| 8 | Người chưa đăng nhập xem trạng thái thế nào? | Không tra bằng CCCD/họ tên; mã ngẫu nhiên + xác thực nếu cần. |
| 9 | Cửa sổ mở ngoài giờ/mở lại được không? | Đóng một chiều; mở lại quyền riêng và audit. |
| 10 | Một/nhiều phụ trách; ai giao? | Nhiều người có thể được giao; người giao có quyền trong Scope. |
| 11 | Nhiệm vụ gate thao tác nào? | Vận hành; xác minh/duyệt/chốt thêm Permission riêng. |
| 12 | Người gửi tự duyệt? | Khuyến nghị không; ngoại lệ audit. |
| 13 | Chốt khi còn yêu cầu chờ? | Chặn mặc định; chốt tạm cần version và xử lý hậu duyệt. |
| 14 | Form được yêu cầu trạng thái nào? | Chốt Có mặt/Đi muộn và tiêu chí thời gian. |
| 15 | Định nghĩa Đi muộn/Vắng có phép? | Ngưỡng theo policy cấu hình; ai ghi/minh chứng cần chốt. |
| 16 | Đi muộn tính đầy đủ/tỷ lệ? | Tính tham gia riêng; tiêu chí toàn đợt cần duyệt. |
| 17 | Buổi/đợt hủy tác động thống kê? | Giữ lịch sử, loại mẫu số, hiện nhãn hủy. |
| 18 | Sửa danh sách sau bắt đầu? | Version/ngoại lệ/audit; chốt ảnh hưởng số liệu. |
| 19 | Scope một phần trên buổi liên đơn vị thấy gì? | Chọn chặn resource hay trả phần được phép. |
| 20 | Tài liệu lưu đâu/loại/size/retention? | Kho riêng và Permission riêng; không dùng tài liệu hồ sơ. |
| 21 | Từ chối có bắt lý do? | Nên bắt lý do ngắn; sửa trực tiếp không bắt theo đầu vào. |
| 22 | Người gửi rút yêu cầu? | Cho rút trước xử lý, lưu lịch sử; sau duyệt dùng yêu cầu điều chỉnh. |
| 23 | Cá nhân xem lịch sử nào? | CA_NHAN qua liên kết; quyết định có hiện người quản lý/audit. |
| 24 | Trang thống kê ở Sidebar nào? | Trong module hoặc chuyển nhóm Báo cáo sau duyệt. |
| 25 | Mẫu mã đợt/buổi? | Server sinh unique; định dạng năm/sequence cần yêu cầu. |
| 26 | Lưu input công khai bao lâu? | Đủ xử lý; chốt hạn xóa/ẩn danh trước khi bật. |

## 13. Các bước sau khi duyệt

1. Chốt chính sách, phạm vi, PII, trạng thái, danh sách, quyền, báo cáo.
2. Lập ERD, từ điển, ràng buộc, snapshot/lịch sử/retention, ma trận Permission–API–Scope.
3. Đặc tả API, QR/form, anti-abuse, transaction, idempotency, concurrency và audit.
4. Thiết kế UI theo design system, luồng vai trò, mobile/QR, trạng thái và accessibility.
5. Chỉ sau duyệt mới triển khai. Migration sau này phải áp dụng PostgreSQL phát triển và ghi kết quả SESSION_HANDOFF.md; không áp dụng production.

## 14. Nguồn đã đối chiếu

AGENTS.md, docs/SESSION_HANDOFF.md, docs/AI_CONTEXT.md, docs/sidebar-module-conventions.md, docs/architecture.md; backend/prisma/schema.prisma; Backend modules member-profiles, organizations, school-years, authorization, auth, system-logs, data-transfer; frontend/src/core/config/navigation.config.ts, frontend/src/core/auth/, các feature tương ứng và frontend/src/shared/components/.

**Kết luận:** nền tảng hồ sơ, tổ chức, RBAC, audit, năm học và UI dùng chung có thể tái sử dụng. Quy trình Học tập nghị quyết & Điểm danh chưa triển khai; các câu hỏi Mục 12 cần duyệt trước khi đóng thiết kế CSDL/API/UI.
