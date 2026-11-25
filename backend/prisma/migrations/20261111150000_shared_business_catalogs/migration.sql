CREATE TABLE "nhom_danh_muc_nghiep_vu" (
    "ma_nhom_danh_muc" UUID NOT NULL,
    "ma_nhom" VARCHAR(100) NOT NULL,
    "ten_nhom" VARCHAR(200) NOT NULL,
    "mo_ta" VARCHAR(1000),
    "trang_thai" VARCHAR(30) NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_nhom_danh_muc_nghiep_vu" PRIMARY KEY ("ma_nhom_danh_muc"),
    CONSTRAINT "uq_nhom_danh_muc_nghiep_vu_ma" UNIQUE ("ma_nhom"),
    CONSTRAINT "ck_nhom_danh_muc_trang_thai" CHECK ("trang_thai" IN ('DANG_HOAT_DONG', 'NGUNG_HOAT_DONG'))
);
CREATE INDEX "ix_nhom_danh_muc_nghiep_vu_trang_thai_ten" ON "nhom_danh_muc_nghiep_vu"("trang_thai", "ten_nhom");

CREATE TABLE "gia_tri_danh_muc_nghiep_vu" (
    "ma_gia_tri_danh_muc" UUID NOT NULL,
    "ma_nhom_danh_muc" UUID NOT NULL,
    "ma_gia_tri" VARCHAR(100) NOT NULL,
    "ten_hien_thi" VARCHAR(200) NOT NULL,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "trang_thai" VARCHAR(30) NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_gia_tri_danh_muc_nghiep_vu" PRIMARY KEY ("ma_gia_tri_danh_muc"),
    CONSTRAINT "uq_gia_tri_danh_muc_nhom_ma" UNIQUE ("ma_nhom_danh_muc", "ma_gia_tri"),
    CONSTRAINT "fk_gia_tri_danh_muc_nhom" FOREIGN KEY ("ma_nhom_danh_muc") REFERENCES "nhom_danh_muc_nghiep_vu"("ma_nhom_danh_muc") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ck_gia_tri_danh_muc_trang_thai" CHECK ("trang_thai" IN ('DANG_HOAT_DONG', 'NGUNG_HOAT_DONG'))
);
CREATE INDEX "ix_gia_tri_danh_muc_nhom_trang_thai_thu_tu" ON "gia_tri_danh_muc_nghiep_vu"("ma_nhom_danh_muc", "trang_thai", "thu_tu");

-- This is a category definition only; no domain values are preloaded.
INSERT INTO "nhom_danh_muc_nghiep_vu" ("ma_nhom_danh_muc", "ma_nhom", "ten_nhom", "mo_ta")
VALUES ('c871fc71-3f41-47ec-b031-7e22aa720101', 'HINH_THUC_BUOI_HOC_NGHI_QUYET', 'Hình thức buổi học nghị quyết', 'Danh mục hình thức buổi học nghị quyết.');

ALTER TABLE "buoi_hoc_nghi_quyet" ADD COLUMN "ma_gia_tri_hinh_thuc" UUID;
ALTER TABLE "buoi_hoc_nghi_quyet" ADD CONSTRAINT "fk_buoi_hoc_gia_tri_hinh_thuc" FOREIGN KEY ("ma_gia_tri_hinh_thuc") REFERENCES "gia_tri_danh_muc_nghiep_vu"("ma_gia_tri_danh_muc") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ix_buoi_hoc_ma_gia_tri_hinh_thuc" ON "buoi_hoc_nghi_quyet"("ma_gia_tri_hinh_thuc");
