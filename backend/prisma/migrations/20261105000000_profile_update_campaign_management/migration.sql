CREATE TYPE "trang_thai_quan_ly_dot_cap_nhat_ho_so" AS ENUM (
    'BAN_NHAP',
    'DA_KICH_HOAT',
    'KET_THUC_SOM'
);

ALTER TABLE "dot_cap_nhat_ho_so"
ADD COLUMN "mo_ta" VARCHAR(2000),
ADD COLUMN "trang_thai_quan_ly" "trang_thai_quan_ly_dot_cap_nhat_ho_so" NOT NULL DEFAULT 'DA_KICH_HOAT',
ADD COLUMN "ma_nguoi_kich_hoat" UUID,
ADD COLUMN "thoi_diem_kich_hoat" TIMESTAMPTZ(6),
ADD COLUMN "ma_nguoi_ket_thuc_som" UUID,
ADD COLUMN "thoi_diem_ket_thuc_som" TIMESTAMPTZ(6);

ALTER TABLE "dot_cap_nhat_ho_so"
ADD CONSTRAINT "fk_dot_cap_nhat_ho_so_nguoi_kich_hoat"
FOREIGN KEY ("ma_nguoi_kich_hoat") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "fk_dot_cap_nhat_ho_so_nguoi_ket_thuc_som"
FOREIGN KEY ("ma_nguoi_ket_thuc_som") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ix_dot_cap_nhat_ho_so_trang_thai_quan_ly_thoi_gian"
ON "dot_cap_nhat_ho_so"("trang_thai_quan_ly", "ngay_bat_dau", "ngay_ket_thuc");
