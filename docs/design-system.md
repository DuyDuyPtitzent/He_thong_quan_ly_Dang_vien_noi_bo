# Design System: bộ chọn ngày và thời gian

## Nguyên tắc sử dụng

- Dùng các component export từ `frontend/src/shared/components/date-time/` cho mọi lựa chọn ngày, tháng, năm và khoảng thời gian khi API hiện tại đáp ứng được nghiệp vụ.
- Dùng semantic tokens và primitives hiện có; không thêm mã màu riêng cho module hay feature.
- Giữ lịch, giờ/phút và thao tác xác nhận trong cùng Popover. Trên màn hình nhỏ, vùng chọn thời gian được xếp dưới lịch và có thể cuộn; trên màn hình rộng, thời gian đứng cạnh lịch.
- Khoảng ngày có dải màu liên tục. Hover chỉ xem trước trong lúc chọn đầu cuối; sau khi chọn ngày kết thúc, dải màu giữ nguyên cho đến khi bắt đầu lượt chọn mới.
- Thành phần dùng focus ring, nút native, trạng thái disabled và nhãn tiếng Việt. Có thể nhập ngày/tháng/năm trực tiếp tại các picker tương ứng.

## Kiểu giá trị

| Nhu cầu | Kiểu | Ví dụ | Hiển thị |
|---|---|---|---|
| Ngày | `DateOnly` | `2026-11-08` | `08/11/2026` |
| Tháng | `string` (`yyyy-MM`) | `2026-11` | `11/2026` |
| Năm | `number` | `2026` | `2026` |
| Ngày giờ cục bộ | `LocalDateTime` | `2026-11-08T14:30` | `08/11/2026 14:30` |
| Khoảng ngày | `DateRangeValue` | `{ from, to }` | `dd/MM/yyyy – dd/MM/yyyy` |
| Khoảng ngày giờ | `DateTimeRangeValue` | `{ from, to }` | `dd/MM/yyyy HH:mm – ...` |

Date-only không đại diện một thời điểm UTC. Không parse thành UTC rồi đổi về giờ địa phương. Validation nghiệp vụ, tính bắt buộc theo ngữ cảnh và lưu trữ thuộc feature sử dụng component.
