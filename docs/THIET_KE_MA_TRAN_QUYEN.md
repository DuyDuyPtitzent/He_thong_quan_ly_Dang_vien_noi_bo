# Thiết kế ma trận Permission và Scope

**Trạng thái:** Ma trận cơ sở và các quyết định được ghi nhận theo phê duyệt của người dùng ngày 2026-11-01; các quyết định quản trị cao nhất và đơn vị gốc được cập nhật ngày 2026-11-01. Backend có nền kiểm tra Permission + Assignment + Scope và API tổ chức/quản trị phân quyền; không có Role/Assignment PTIT được seed. Mọi mã Permission dưới đây là mã hệ thống theo quy ước tiếng Việt không dấu.

## 1. Nguyên tắc phân quyền

- Một Role gồm nhiều Permission. Tài khoản có thể có nhiều Assignment đồng thời.
- Permission xác định hành động; Scope xác định đối tượng/đơn vị mà hành động được phép tác động.
- Backend kiểm tra phiên, Permission, Assignment còn hiệu lực và Scope ở mỗi API. Mặc định từ chối khi thiếu quyền hoặc không xác định được phạm vi.
- Scope không tự cấp Permission. Quyền xem không bao gồm tạo, sửa, xóa, xuất hay xem dữ liệu nhạy cảm theo nghĩa rộng.
- Danh mục Permission do hệ thống định nghĩa; Role quản lý bằng cách gắn/bỏ Permission có sẵn.
- Phạm vi chức năng không bao gồm mô-đun cấp ủy/chi ủy.

## 2. Scope

| Mã trong CSDL | Cách hiểu | Quy tắc |
|---|---|---|
| `CA_NHAN` | SELF | Chỉ hồ sơ Đảng viên liên kết với tài khoản hiện tại. |
| `CAY_DON_VI` tại `TO` | Tổ | Chỉ đúng Tổ được gán. |
| `CAY_DON_VI` tại `CHI_BO` | Chi bộ và Tổ trực thuộc | Bao gồm cây con chỉ vì Assignment dùng `CAY_DON_VI`; chỉ với Permission đã gắn vào Role. |
| `CAY_DON_VI` tại `DANG_UY` | Đảng ủy và toàn bộ cây bên dưới | Không tự cấp mọi Permission; từng Permission vẫn phải có trong Role. |
| `DON_VI_CHI_DINH` | CUSTOM | Chỉ các đơn vị được chọn rõ; không bao gồm đơn vị con nếu không chọn riêng. |
| `TOAN_HE_THONG` | GLOBAL | Không giới hạn đơn vị; chỉ dùng cho Assignment Role `QUAN_TRI_VIEN_TOAN_HE_THONG` được cấp qua quy trình quản trị cao nhất có kiểm soát. Không phải Scope mặc định của Role quản trị phân quyền thông thường. |

Đối với hồ sơ Đảng viên, Scope tổ chức được kiểm tra theo Chi bộ/Tổ sinh hoạt hiện hành. Permission `CA_NHAN` kiểm tra liên kết tài khoản–hồ sơ, không dựa vào mã hồ sơ do trình duyệt gửi.

## 3. Danh mục Permission đề xuất đã được duyệt làm cơ sở

### 3.1. Cây tổ chức

| Mã Permission | Hành động |
|---|---|
| `TO_CHUC_XEM` | Xem đơn vị trong Scope. |
| `TO_CHUC_TAO` | Tạo đơn vị đúng tầng, đúng quan hệ cha–con. |
| `TO_CHUC_SUA_THONG_TIN` | Sửa thông tin đơn vị. |
| `TO_CHUC_SUA_LOAI` | Sửa loại đơn vị khi cấu trúc và lịch sử sau sửa hợp lệ. |
| `TO_CHUC_DOI_DON_VI_CHA` | Thay đổi quan hệ cha qua thao tác có kiểm tra lịch sử, tầng và chu trình. |
| `TO_CHUC_XEM_LICH_SU` | Xem lịch sử tên/quan hệ đơn vị trong Scope. |
| `TO_CHUC_SUA_LICH_SU` | Sửa lịch sử sai; kiểm tra hiệu lực và không chồng lấn. |
| `TO_CHUC_DOI_TRANG_THAI` | Đổi trạng thái đơn vị trong Scope; không dùng để khôi phục đơn vị đã ngừng hoạt động. |
| `TO_CHUC_KHOI_PHUC` | Khôi phục `NGUNG_HOAT_DONG` qua quy trình có thẩm quyền trong Scope. |
| `TO_CHUC_XOA` | Xóa hẳn đơn vị khi đã xử lý tham chiếu; FK chặn nếu còn tham chiếu, không cascade lịch sử. |

### 3.2. Hồ sơ, cá nhân, địa chỉ và sinh viên

| Mã Permission | Hành động |
|---|---|
| `HO_SO_DANG_VIEN_XEM_DANH_SACH` | Tìm kiếm/xem danh sách hồ sơ trong Scope. |
| `HO_SO_DANG_VIEN_XEM_TONG_QUAN` | Xem thông tin tổng quan được phép. |
| `HO_SO_DANG_VIEN_TAO` | Tạo hồ sơ. |
| `HO_SO_DANG_VIEN_SUA_THONG_TIN_CO_BAN` | Sửa dữ liệu lõi của hồ sơ theo Scope. |
| `HO_SO_DANG_VIEN_XOA` | Xóa vật lý hồ sơ tạo nhầm sau khi kiểm tra Permission + Scope; chỉ xóa sinh hoạt/quá trình ban đầu được xác minh, từ chối khi có lịch sử phát sinh, phân công chức vụ hoặc yêu cầu cập nhật cần bảo lưu. Tài khoản liên kết được giữ lại nhưng khóa đăng nhập, thu hồi Assignment và phiên đăng nhập. |
| `HO_SO_CA_NHAN_XEM` | Xem thông tin cá nhân; bao gồm xem CCCD bình thường theo quyền xem hồ sơ, không cần Permission CCCD riêng. |
| `HO_SO_CA_NHAN_SUA` | Sửa thông tin cá nhân thông thường theo Scope. Với SELF, chỉ số điện thoại/email liên hệ và phải qua quy trình mở khóa, gửi yêu cầu, Chi bộ phê duyệt tại mục 4. |
| `HO_SO_DIA_CHI_XEM` | Xem địa chỉ trong Scope. |
| `HO_SO_DIA_CHI_SUA` | Sửa địa chỉ trong Scope. |
| `HO_SO_SINH_VIEN_XEM` | Xem mã sinh viên, trạng thái học tập, khóa, lớp hành chính và thông tin học vụ trong Scope. |
| `HO_SO_SINH_VIEN_SUA` | Sửa thông tin sinh viên theo Scope khi nghiệp vụ nhập thủ công được triển khai. |
| `HO_SO_XUAT_DU_LIEU` | Xuất hồ sơ/danh sách; quyền riêng. Chưa cấp trong MVP. |
| `HO_SO_XEM_LICH_SU_THAY_DOI` | Xem lịch sử thay đổi hồ sơ được phép truy cập; chỉ đọc. |

Theo quyết định sản phẩm ngày 2026-11-03, CCCD được lưu dạng rõ và hiển thị theo quyền xem hồ sơ thông thường; không cần Permission/audit riêng cho từng lần xem. Không ghi CCCD vào log/audit hoặc dữ liệu xuất; giới hạn quyền truy cập database và backup.

### 3.3. Sinh hoạt và chuyển đơn vị

| Mã Permission | Hành động |
|---|---|
| `SINH_HOAT_XEM_HIEN_TAI` | Xem Chi bộ/Tổ hiện tại; SELF hoặc Scope tổ chức. |
| `SINH_HOAT_XEM_LICH_SU` | Xem lịch sử sinh hoạt được phép. |
| `SINH_HOAT_CHUYEN_DON_VI` | Thực hiện luồng chuyển; không sửa trực tiếp đơn vị hiện tại để né lịch sử. |
| `SINH_HOAT_SUA_LICH_SU` | Sửa lịch sử ghi sai với kiểm tra thời gian/chồng lấn và audit. |
| `SINH_HOAT_XOA_LICH_SU` | Xóa hẳn dòng lịch sử ghi nhầm bằng quyền riêng, có audit. |

Khi Chi bộ B đồng ý tiếp nhận Đảng viên từ Chi bộ A, quan hệ sinh hoạt hiện hành và quyền của Đảng viên gắn với Chi bộ A được chuyển sang Chi bộ B. Lịch sử A được kết thúc, lịch sử B bắt đầu sau khi tiếp nhận được chấp thuận; cập nhật dữ liệu liên quan phải nhất quán trong transaction. Việc này không tự thay đổi quyền quản trị/nhập liệu được gán độc lập cho tài khoản theo Assignment.

### 3.4. Quá trình Đảng

| Mã Permission | Hành động |
|---|---|
| `QUA_TRINH_DANG_XEM` | Xem quá trình Đảng trong Scope. |
| `QUA_TRINH_DANG_TAO` | Tạo sự kiện theo danh mục/nghiệp vụ được xác nhận. |
| `QUA_TRINH_DANG_SUA` | Sửa sự kiện ghi sai, có audit. |
| `QUA_TRINH_DANG_XOA` | Xóa hẳn sự kiện ghi nhầm bằng quyền riêng, có audit. |

### 3.5. Chức vụ, nhiệm kỳ và phân công

| Mã Permission | Hành động |
|---|---|
| `CHUC_VU_XEM` / `CHUC_VU_TAO` / `CHUC_VU_SUA` / `CHUC_VU_XOA` | Xem, tạo, sửa, xóa danh mục chức vụ; xóa bị từ chối nếu còn tham chiếu. |
| `NHIEM_KY_XEM` / `NHIEM_KY_TAO` / `NHIEM_KY_SUA` / `NHIEM_KY_XOA` | Quản lý nhiệm kỳ trong đơn vị; kiểm tra thời gian và tham chiếu. |
| `PHAN_CONG_CHUC_VU_XEM` / `PHAN_CONG_CHUC_VU_TAO` / `PHAN_CONG_CHUC_VU_SUA` | Xem, tạo, sửa phân công sau khi kiểm tra đối tượng, chức vụ, đơn vị, nhiệm kỳ và hiệu lực. |
| `PHAN_CONG_CHUC_VU_KET_THUC` | Kết thúc hiệu lực phân công. |
| `PHAN_CONG_CHUC_VU_XOA` | Xóa hẳn phân công ghi nhầm bằng quyền riêng, có audit. |

Các quyền này chỉ phục vụ chức vụ/nhiệm kỳ/phân công đã thống nhất; không tạo thực thể hoặc nghiệp vụ cấp ủy/chi ủy.

### 3.6. Tài khoản, Role và Assignment

| Mã Permission | Hành động |
|---|---|
| `TAI_KHOAN_XEM` | Xem tài khoản và trạng thái; không đọc hash mật khẩu. |
| `TAI_KHOAN_TAO` | Tạo tài khoản nội bộ theo thẩm quyền; không mở đăng ký công khai. |
| `TAI_KHOAN_SUA_THONG_TIN` | Sửa các thông tin tài khoản được phép. |
| `TAI_KHOAN_KHOA_MO_KHOA` | Khóa/mở khóa tài khoản; audit. |
| `TAI_KHOAN_THU_HOI_PHIEN` | Thu hồi phiên tài khoản; audit. |
| `TAI_KHOAN_LIEN_KET_HO_SO` | Liên kết/gỡ liên kết tài khoản và hồ sơ trong Scope. |
| — | Tài khoản được xem/sửa email của chính mình, đổi mật khẩu và xem Assignment/Role/Permission của mình qua các endpoint tự phục vụ; không được tự khóa/xóa hoặc sửa Assignment quản trị cao nhất. |
| `VAI_TRO_XEM` / `VAI_TRO_TAO` / `VAI_TRO_SUA` / `VAI_TRO_XOA` | Xem, tạo, sửa và xóa Role chưa được sử dụng; Role đang được gán phải được xử lý trước khi xóa. |
| `VAI_TRO_GAN_QUYEN` | Gắn/bỏ Permission hệ thống trong Role; không tạo Permission mới. |
| `PHAN_CONG_VAI_TRO_XEM` / `PHAN_CONG_VAI_TRO_TAO` / `PHAN_CONG_VAI_TRO_SUA` / `PHAN_CONG_VAI_TRO_THU_HOI` | Xem, cấp, điều chỉnh và thu hồi Assignment theo thẩm quyền. |
| `QUYEN_XEM_DANH_MUC` | Xem danh mục Permission có sẵn; danh mục chỉ đọc. |
| `CAU_HINH_HE_THONG_XEM` / `CAU_HINH_HE_THONG_SUA` | Xem/sửa cấu hình hệ thống qua thao tác được thiết kế riêng; chưa có module cấu hình. |
| `VAN_HANH_HE_THONG` | Thực hiện công việc kỹ thuật vận hành được cho phép; không bỏ qua kiểm tra Permission/Scope hoặc workflow nghiệp vụ. |

Người quản trị phân quyền chỉ được cấp Permission và Scope mà bản thân được ủy quyền cấp. Không được tự nâng quyền, tự mở rộng phạm vi hoặc cấp `TOAN_HE_THONG` qua thao tác quản trị thông thường.

### 3.7. Audit

| Mã Permission | Hành động |
|---|---|
| `NHAT_KY_KIEM_TOAN_XEM` | Xem nhật ký toàn hệ thống; chỉ Quản trị viên toàn hệ thống có Assignment hiệu lực, chưa thu hồi, còn hạn và Scope `TOAN_HE_THONG`. |
| `NHAT_KY_BAO_MAT_XEM` | Xem nhật ký bảo mật theo cùng điều kiện Quản trị viên toàn hệ thống; Permission riêng vẫn bắt buộc. |
| `NHAT_KY_KIEM_TOAN_XUAT` | Xuất nhật ký bằng quyền riêng trong phạm vi. |
| `NHAT_KY_XOA` | Permission riêng cho API xem trước yêu cầu xóa trong Scope; không tự cấp cho Role nào. Catalog `DA_CO_API` cho API xem trước; API xóa vật lý chưa có và không được phép thực hiện. |

Tình trạng cập nhật 2026-11-07: Nhật ký hệ thống là chức năng quản trị đặc biệt, chỉ Quản trị viên toàn hệ thống có Assignment hợp lệ được truy cập. Mọi API đọc và xem trước dọn dẹp yêu cầu Role có mã `QUAN_TRI_VIEN_TOAN_HE_THONG`, tài khoản và Role đang hoạt động, Assignment chưa thu hồi/còn hạn, Scope `TOAN_HE_THONG`, cùng Permission riêng theo loại nhật ký. Các Permission xem cũ không đủ cho vai trò thông thường. Không tự động cấp quyền hoặc xóa lịch sử Assignment cũ; cần rà soát qua quy trình quản trị phân quyền. API chi tiết chưa trả JSON trước/sau do chưa có kiểm tra quyền dữ liệu nghiệp vụ riêng. Quyền xuất vẫn chưa có API; quyền xem không tự cấp quyền xuất. API xem trước xóa chỉ đếm số bản ghi khớp; chưa có chính sách lưu trữ được phê duyệt và không xóa.

Chưa có chính sách lưu trữ nhật ký PTIT được phê duyệt. Bảng `nhat_ky_kiem_toan` có trigger append-only từ chối UPDATE/DELETE. Không thay đổi trigger hoặc thêm API xóa vật lý trước khi phê duyệt phân loại, thời hạn, ngoại lệ kiểm toán/điều tra, cách lưu dấu vết riêng và phương án bảo toàn dữ liệu.

Audit không chứa mật khẩu, session token hoặc CCCD dạng rõ. Xem CCCD bình thường không tạo audit theo từng lượt xem.

## 4. Quy trình tự cập nhật thông tin cá nhân

Đảng viên có thể tự đề nghị cập nhật số điện thoại/email liên hệ trong một khoảng thời gian được mở khóa. Giá trị đang có không thay đổi ngay sau khi gửi; cập nhật chỉ hoàn tất sau khi Chi bộ phê duyệt.

Luồng thiết kế:

1. Mở một cửa sổ cho phép tài khoản/hồ sơ cụ thể tự gửi cập nhật trong khoảng thời gian có hạn.
2. Đảng viên gửi giá trị đề nghị cho các trường được phép; hệ thống ghi nhận người gửi và thời điểm.
3. Đề nghị ở trạng thái chờ duyệt; dữ liệu chính thức vẫn giữ nguyên.
4. Chi bộ có thẩm quyền phê duyệt hoặc từ chối. Chỉ khi phê duyệt, hệ thống mới cập nhật thông tin chính thức và ghi audit.
5. Kiểm tra thời hạn cửa sổ ở Backend; ngoài thời hạn không nhận đề nghị mới.

Quyền cho luồng này:

| Mã Permission | Tác dụng | Scope |
|---|---|---|
| `HO_SO_CA_NHAN_TU_CAP_NHAT` | Đảng viên gửi đề nghị sửa số điện thoại/email của hồ sơ được liên kết với tài khoản mình | `CA_NHAN`, trong đợt đang mở |
| `HO_SO_CA_NHAN_MO_DOT_CAP_NHAT` | Mở/đóng đợt cho đơn vị được giao | Scope Chi bộ hoặc cao hơn được cấp |
| `HO_SO_CA_NHAN_XEM_YEU_CAU_CAP_NHAT` | Xem các yêu cầu trong phạm vi | Chi bộ hoặc Scope cấp trên được cấp rõ ràng |
| `HO_SO_CA_NHAN_DUYET_CAP_NHAT` | Phê duyệt/từ chối yêu cầu trong phạm vi | Chi bộ; Đảng ủy chỉ khi được cấp riêng cả Permission và Scope |

Chi bộ là cấp duyệt thông thường trong phạm vi được giao. Đảng ủy không tự kế thừa quyền duyệt từ Chi bộ. Đảng ủy có thể được cấp quyền xem để giám sát; quyền xem không bao gồm duyệt. Nếu Đảng ủy cần duyệt, phải được cấp rõ `HO_SO_CA_NHAN_DUYET_CAP_NHAT` cùng Scope phù hợp, chẳng hạn `CAY_DON_VI` tại Đảng ủy. Không yêu cầu duyệt lần hai sau khi Chi bộ đã duyệt.

**Chưa quyết định:** thời lượng cửa sổ, ai được mở cửa sổ, mở theo cá nhân hay theo đợt, và cách xử lý đề nghị đã gửi nhưng cửa sổ hết hạn. Không tự đặt các giá trị này. CSDL/API cần mô hình yêu cầu cập nhật chờ duyệt và dấu thời gian cửa sổ trước khi triển khai tính năng này.

## 5. Chuyển sinh hoạt và quyền sau tiếp nhận

- Khi Chi bộ B đồng ý tiếp nhận, lịch sử sinh hoạt hiện hành chuyển từ A sang B và quyền của Đảng viên gắn với quan hệ sinh hoạt cũng chuyển theo.
- Thời điểm có hiệu lực là lúc quy trình tiếp nhận hoàn tất; phải lưu được lịch sử trước/sau và audit.
- Các Assignment quản trị/nhập liệu được gán độc lập cho tài khoản không tự chuyển theo hồ sơ Đảng viên.
- Cần xác nhận trước khi xây API: ai được khởi tạo đề nghị chuyển và Chi bộ A có cần xác nhận ngoài việc Chi bộ B đồng ý hay không.

## 6. Cấp quyền và tài khoản bootstrap

- Assignment đồng thời được phép. Tính quyền bằng hợp các quyền từ từng Assignment hợp lệ; tuyệt đối không ghép Permission của Assignment này với Scope của Assignment khác.
- Assignment có thể không đặt thời điểm hết hạn; khi có `ngayHieuLucDen`, thời điểm đó là cận hết hiệu lực. Quyền chỉ hợp lệ khi Assignment chưa bị thu hồi, đang trong thời hạn, tài khoản và Role đang hoạt động.
- Quản trị phân quyền thông thường chỉ cấp Role, Permission và Scope nằm trong thẩm quyền được giao; không tự nâng quyền, tự mở rộng Scope hoặc cấp `TOAN_HE_THONG`.
- Quản trị viên toàn hệ thống được phân bổ Permission nghiệp vụ cho Role/tài khoản khác trong quy trình quản trị; việc đó không gắn Permission nghiệp vụ lên chính Role cao nhất và không làm phát sinh quyền phê duyệt trực tiếp.
- Bootstrap tài khoản chỉ tạo tài khoản ban đầu theo quy trình tài khoản; không gán Role, Permission hay Assignment. Không tự động tạo hoặc cấp lại Quản trị viên toàn hệ thống khi bootstrap chạy.
- Role cao nhất là `QUAN_TRI_VIEN_TOAN_HE_THONG`; Assignment của Role này có Scope `TOAN_HE_THONG` và mặc định không hết hạn. Có thể có nhiều tài khoản cùng giữ Role này nếu từng tài khoản được chỉ định và cấp rõ ràng. Không có giới hạn cứng một quản trị viên.
- Cấp, thay đổi hoặc thu hồi Assignment Role cao nhất phải qua quy trình vận hành có kiểm soát, xác minh thẩm quyền và audit; không cung cấp API công khai/API thường để cấp quyền cao nhất hoặc khôi phục quyền cao nhất. Mọi thao tác phải ghi người thực hiện, đối tượng, lý do, thời điểm, kết quả và dữ liệu trước/sau phù hợp.
- Khôi phục quyền quản trị khi sự cố chỉ qua công cụ/quy trình vận hành ngoài API, do người vận hành được ủy quyền thực hiện sau khi xác minh thẩm quyền. Không có cơ chế tự khôi phục hoặc tự cấp lại quyền cao nhất.
- Backend phải bảo vệ Quản trị viên toàn hệ thống hợp lệ cuối cùng. Một quản trị viên hợp lệ là tài khoản đang hoạt động, Role cao nhất đang hoạt động, cùng Assignment `TOAN_HE_THONG` đã có hiệu lực, chưa hết hạn (nếu có hạn) và chưa thu hồi. Trước khi khóa, xóa hoặc thu hồi Assignment cao nhất, Backend kiểm tra trong transaction số tài khoản hợp lệ còn lại; phép kiểm tra và ghi thay đổi phải được tuần tự hóa để hai thao tác đồng thời không cùng vượt qua kiểm tra cuối cùng. Từ chối nếu thao tác làm số đó về 0; thao tác tự khóa, tự xóa, tự thu hồi Assignment cao nhất hoặc tự sửa Assignment để nâng quyền đều bị từ chối. Kiểm tra này áp dụng ở Backend, không phụ thuộc UI.
- Role cao nhất có toàn bộ Permission trong catalog, gồm quyền phê duyệt nghiệp vụ. Quyền này không bỏ qua Scope, workflow, audit hoặc kiểm tra dữ liệu; các guard vẫn được thực thi theo quy trình đã duyệt.

## 6.1. Khởi tạo và vận hành Quản trị viên toàn hệ thống

1. Người có thẩm quyền chỉ định cụ thể tài khoản đầu tiên trước triển khai. Người vận hành được ủy quyền xác minh chỉ định, danh tính/chủ tài khoản và trạng thái tài khoản qua quy trình vận hành kín.
2. Công cụ khởi tạo có kiểm soát kiểm tra Role/Assignment hiện có để tránh cấp trùng hoặc phát hành lại ngoài ý muốn; tạo Role hệ thống `QUAN_TRI_VIEN_TOAN_HE_THONG` nếu chưa có theo cấu hình được duyệt, gắn các Permission quản trị mặc định theo danh mục (ngoại trừ `NHAT_KY_XOA`, không tự động cấp cho Role nào) và cấp Assignment `TOAN_HE_THONG` không đặt hạn mặc định. Quản trị viên toàn hệ thống có thể cập nhật ma trận Role hệ thống qua API có kiểm tra Assignment hiệu lực, Scope toàn hệ thống và `VAI_TRO_GAN_QUYEN`; có thể cấp `NHAT_KY_XOA` bằng thao tác ma trận có chủ đích. Các quyền `QUYEN_XEM_DANH_MUC`, `VAI_TRO_XEM`, `VAI_TRO_GAN_QUYEN` được giữ để tránh tự khóa khả năng quản trị. Mọi thay đổi ma trận được ghi audit; không ghi bí mật xác thực vào log.
3. Tài khoản quản trị viên tự đổi/thiết lập thông tin xác thực theo quy trình bảo mật. Các tài khoản quản trị viên tiếp theo chỉ được cấp khi có chỉ định rõ và qua cùng kiểm soát/audit; không có API thường cấp Role hệ thống hoặc Scope toàn hệ thống.
4. Quản trị viên phân quyền xuống tài khoản khác bằng Assignment thông thường, đúng Permission và phạm vi trong thẩm quyền của mình. Backend không cho tự cấp, tự mở rộng Scope, hoặc ghép Permission và Scope từ hai Assignment khác nhau.
5. Khi thu hồi/khóa/xóa một quản trị viên, Backend kiểm tra invariant quản trị viên hợp lệ cuối cùng. Thu hồi/quyền cao nhất cần ghi audit; nếu không còn quản trị viên hợp lệ sau thao tác thì từ chối.
6. Khi mất toàn bộ quyền quản trị, người vận hành được ủy quyền xác minh yêu cầu và dùng công cụ/quy trình khôi phục ngoài API. Công cụ phải ghi nhật ký kiểm toán bất biến/đầy đủ; không tự chạy khi khởi động ứng dụng hoặc bootstrap.

**Ranh giới triển khai:** Permission cấu hình/vận hành được thêm vào catalog và Role quản trị; API/module cấu hình và thao tác bảo trì cụ thể chưa được triển khai. Các hành động này phải có kiểm tra riêng; `VAN_HANH_HE_THONG` không phải quyền bỏ qua guard hoặc workflow.

Theo quyết định ngày 2026-11-07, ma trận Permission của Role hệ thống được sửa qua API chỉ khi phiên hiện tại có Assignment hợp lệ của `QUAN_TRI_VIEN_TOAN_HE_THONG` với Scope `TOAN_HE_THONG` và Permission `VAI_TRO_GAN_QUYEN`. Quyền sửa thông tin, tạm ngừng, xóa Role hệ thống và thay đổi Assignment hệ thống vẫn bị khóa. Các quyền `QUYEN_XEM_DANH_MUC`, `VAI_TRO_XEM`, `VAI_TRO_GAN_QUYEN` được bảo vệ khỏi việc gỡ khỏi Role quản trị viên để tránh tự khóa công cụ quản trị. `NHAT_KY_XOA` không được bootstrap/sync tự động; chỉ có thể thêm bằng thao tác ma trận được ủy quyền.

## 7. Role chức năng mẫu

Các Role là nhóm Permission theo chức năng, không phải chức danh PTIT. Một tài khoản có thể nhận nhiều Assignment.

| Role mẫu | Nhóm quyền chính | Scope thường dùng |
|---|---|---|
| `DOC_HO_SO_CA_NHAN` | Xem hồ sơ được liên kết với tài khoản; tự đề nghị cập nhật số điện thoại/email qua luồng duyệt | `CA_NHAN` |
| `NHAP_LIEU_HO_SO` | Xem danh sách, tạo/sửa thông tin hồ sơ được giao; quyền CCCD theo quyền xem hồ sơ thông thường | Tổ hoặc Chi bộ |
| `QUAN_LY_SINH_HOAT` | Xem sinh hoạt, tiếp nhận/chuyển đơn vị và quản lý lịch sử được giao | Chi bộ hoặc Đảng ủy |
| `QUAN_LY_TO_CHUC` | Quản lý cây và lịch sử tổ chức; xóa là Permission riêng | Theo đơn vị được giao |
| `QUAN_LY_TAI_KHOAN` | Quản lý tài khoản, phiên và liên kết hồ sơ được giao | Theo phạm vi quản trị |
| `QUAN_TRI_PHAN_QUYEN` | Quản lý Role, Permission trong Role và Assignment trong thẩm quyền | Không tự có `TOAN_HE_THONG` |
| `QUAN_TRI_VIEN_TOAN_HE_THONG` | Toàn bộ Permission trong catalog hệ thống, gồm nghiệp vụ và quản trị | `TOAN_HE_THONG`; chỉ cấp qua quy trình vận hành có kiểm soát; các ràng buộc an toàn, audit và workflow vẫn được thực thi |
| `KIEM_TRA_NHAT_KY` | Xem audit/bảo mật trong phạm vi | Theo phân công |
| `QUAN_LY_CHUC_VU_NHIEM_KY` | Quản lý chức vụ, nhiệm kỳ, phân công được giao | Theo đơn vị |

Các Role mẫu không tự được gán khi bootstrap. Việc cấp Role/Assignment ban đầu tuân thủ quy trình an toàn ở mục 6.

## 8. Ca kiểm tra truy cập

| Trường hợp | Kết quả |
|---|---|
| Đảng viên có `CA_NHAN` đọc hồ sơ được liên kết | Cho phép theo các Permission xem đã gán. |
| Đảng viên tự cập nhật điện thoại/email khi cửa sổ mở | Ghi đề nghị chờ duyệt; chưa thay dữ liệu chính thức. |
| Đảng viên tự cập nhật sau khi cửa sổ đóng | Từ chối. |
| Chi bộ phê duyệt đề nghị | Cập nhật dữ liệu chính thức và audit. |
| Assignment Chi bộ dùng `CAY_DON_VI` truy cập Tổ trực thuộc | Cho phép nếu Role có Permission tương ứng. |
| Assignment dùng `DON_VI_CHI_DINH` truy cập đơn vị con không được chọn | Từ chối. |
| Role có quyền xem nhưng không có quyền xuất | Xem được theo Scope; xuất bị từ chối. |
| Assignment hết hạn/thu hồi | Từ chối. |
| Người quản trị cấp quyền vượt thẩm quyền hoặc tự mở `TOAN_HE_THONG` | Từ chối và audit. |
| Người cuối cùng có Assignment Quản trị viên toàn hệ thống bị khóa/xóa/thu hồi quyền | Backend từ chối trong transaction và ghi audit kết quả từ chối. |
| Quản trị viên tự thu hồi Assignment cao nhất của mình | Backend từ chối và audit. |
| Quản trị viên toàn hệ thống duyệt nghiệp vụ chỉ dựa vào quyền kỹ thuật | Từ chối nếu thiếu Permission/workflow nghiệp vụ tương ứng. |
| Chi bộ B chấp thuận tiếp nhận Đảng viên A | Chuyển quan hệ sinh hoạt và quyền của Đảng viên gắn với Chi bộ sang B; lưu lịch sử. |
| Xóa hồ sơ có lịch sử sinh hoạt/quá trình ngoài dữ liệu tạo ban đầu, chức vụ hoặc yêu cầu cập nhật | Từ chối và ghi audit; không cascade. |
| Người chỉ có quyền xem nhật ký yêu cầu xóa | Từ chối vì thiếu `NHAT_KY_XOA`. |
| Người có `NHAT_KY_XOA` yêu cầu xóa vật lý audit khi chưa có chính sách lưu trữ | Chỉ cho xem trước số bản ghi trong phạm vi; không xóa. |

## 9. Các nội dung chưa chốt trước khi triển khai

1. Thời lượng, người mở và phạm vi áp dụng cửa sổ tự cập nhật; xử lý đề nghị còn chờ khi hết hạn.
2. Ai được khởi tạo chuyển sinh hoạt; Chi bộ A có cần xác nhận ngoài việc Chi bộ B tiếp nhận không.

Các nội dung đã được quyết định tại tài liệu này không mở lại: `DON_VI_CHI_DINH` chọn đúng đơn vị, `CAY_DON_VI` tại Chi bộ bao gồm Tổ trực thuộc, không cho xuất hồ sơ trong MVP, Role tự xem hồ sơ cá nhân có trong MVP, CCCD xem theo quyền hồ sơ thông thường. Quyết định ngày 2026-11-06 cho phép xóa vật lý hồ sơ tạo nhầm cùng các bản ghi sinh hoạt/quá trình ban đầu đã xác minh; lịch sử phát sinh sau đó vẫn phải bảo toàn.

## 10. Cập nhật quyết định về quyền duyệt cấp trên

**Quyết định đã duyệt:** Chi bộ xử lý/phê duyệt yêu cầu cá nhân trong phạm vi được giao. Đảng ủy không tự động kế thừa Permission duyệt của Chi bộ và không có bước phê duyệt lần hai mặc định. Đảng ủy có thể xem yêu cầu để giám sát nếu được cấp Permission xem cùng Scope rõ ràng. Đảng ủy chỉ được trực tiếp phê duyệt khi được cấp riêng `HO_SO_CA_NHAN_DUYET_CAP_NHAT` cùng Scope phù hợp; cấp quyền này cũng phải tuân theo nguyên tắc không vượt thẩm quyền của người cấp.

Quyết định này thay thế mọi nội dung trước đó coi chủ thể phê duyệt tại Chi bộ là chưa chốt. Các mục còn mở khác trong mục 9 vẫn giữ nguyên.

## 11. Đơn vị gốc cây tổ chức PTIT

**Quyết định kiến trúc hiện hành:** Đơn vị gốc là nút loại `DANG_UY` không có đơn vị cha; mã nghiệp vụ do người có thẩm quyền đặt. UUID nội bộ và quan hệ tổ chức thực tế là căn cứ cho Assignment/Scope. Các Chi bộ trực thuộc Đảng ủy; các Tổ trực thuộc Chi bộ. `TOAN_HE_THONG` độc lập với cây. Ba trạng thái hợp lệ là `DANG_HOAT_DONG`, `TAM_NGUNG`, `NGUNG_HOAT_DONG`; khôi phục trạng thái ngừng hoạt động phải qua quy trình có thẩm quyền, Permission + Scope và audit.

Khởi tạo phải idempotent theo loại và cấu trúc: nếu đã có Đảng ủy gốc thì không tạo trùng. CSDL cần bảo đảm chỉ có một Đảng ủy. Không xóa lịch sử đơn vị khi đổi trạng thái. Không tạo đơn vị `TOAN_HE_THONG` trong cây tổ chức.
