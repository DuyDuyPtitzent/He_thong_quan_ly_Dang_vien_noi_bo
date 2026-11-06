ALTER TABLE "ho_so_dang_vien"
ADD COLUMN "anh_dai_dien_khoa" VARCHAR(255);

CREATE TABLE "dot_cap_nhat_ho_so" (
    "ma_dot_cap_nhat" UUID NOT NULL,
    "ten_dot" VARCHAR(200) NOT NULL,
    "ma_don_vi" UUID,
    "ngay_bat_dau" TIMESTAMPTZ(6) NOT NULL,
    "ngay_ket_thuc" TIMESTAMPTZ(6) NOT NULL,
    "cac_truong_duoc_phep" TEXT[] NOT NULL,
    "ma_nguoi_tao" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_dot_cap_nhat_ho_so" PRIMARY KEY ("ma_dot_cap_nhat"),
    CONSTRAINT "ck_dot_cap_nhat_ho_so_thoi_gian" CHECK ("ngay_ket_thuc" > "ngay_bat_dau"),
    CONSTRAINT "ck_dot_cap_nhat_ho_so_truong" CHECK (cardinality("cac_truong_duoc_phep") > 0)
);

CREATE TABLE "yeu_cau_cap_nhat_ho_so" (
    "ma_yeu_cau" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "ma_dot_cap_nhat" UUID NOT NULL,
    "ma_don_vi_duyet" UUID NOT NULL,
    "ma_nguoi_gui" UUID NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL DEFAULT 'CHO_DUYET',
    "gia_tri_truoc" JSONB NOT NULL,
    "gia_tri_de_nghi" JSONB NOT NULL,
    "anh_dai_dien_tam_khoa" VARCHAR(255),
    "ma_nguoi_xu_ly" UUID,
    "thoi_diem_xu_ly" TIMESTAMPTZ(6),
    "ly_do_xu_ly" VARCHAR(1000),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_yeu_cau_cap_nhat_ho_so" PRIMARY KEY ("ma_yeu_cau"),
    CONSTRAINT "ck_yeu_cau_cap_nhat_ho_so_trang_thai" CHECK ("trang_thai" IN ('CHO_DUYET', 'DA_DUYET', 'DA_TU_CHOI', 'DA_HUY'))
);

CREATE INDEX "ix_dot_cap_nhat_ho_so_don_vi_thoi_gian"
ON "dot_cap_nhat_ho_so"("ma_don_vi", "ngay_bat_dau", "ngay_ket_thuc");
CREATE INDEX "ix_yeu_cau_cap_nhat_ho_so_ho_so_thoi_gian"
ON "yeu_cau_cap_nhat_ho_so"("ma_ho_so", "ngay_tao");
CREATE INDEX "ix_yeu_cau_cap_nhat_ho_so_don_vi_trang_thai"
ON "yeu_cau_cap_nhat_ho_so"("ma_don_vi_duyet", "trang_thai", "ngay_tao");
CREATE UNIQUE INDEX "uq_yeu_cau_cap_nhat_ho_so_dang_cho"
ON "yeu_cau_cap_nhat_ho_so"("ma_ho_so") WHERE "trang_thai" = 'CHO_DUYET';

ALTER TABLE "dot_cap_nhat_ho_so"
ADD CONSTRAINT "fk_dot_cap_nhat_ho_so_don_vi" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "fk_dot_cap_nhat_ho_so_nguoi_tao" FOREIGN KEY ("ma_nguoi_tao") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "yeu_cau_cap_nhat_ho_so"
ADD CONSTRAINT "fk_yeu_cau_cap_nhat_ho_so_ho_so" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "fk_yeu_cau_cap_nhat_ho_so_dot" FOREIGN KEY ("ma_dot_cap_nhat") REFERENCES "dot_cap_nhat_ho_so"("ma_dot_cap_nhat") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "fk_yeu_cau_cap_nhat_ho_so_don_vi" FOREIGN KEY ("ma_don_vi_duyet") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "fk_yeu_cau_cap_nhat_ho_so_nguoi_gui" FOREIGN KEY ("ma_nguoi_gui") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "fk_yeu_cau_cap_nhat_ho_so_nguoi_xu_ly" FOREIGN KEY ("ma_nguoi_xu_ly") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;
