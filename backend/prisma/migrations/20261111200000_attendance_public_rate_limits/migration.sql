CREATE TABLE "bo_dem_cong_khai_diem_danh" (
  "ma_khoa" VARCHAR(64) NOT NULL,
  "so_yeu_cau" INTEGER NOT NULL DEFAULT 1,
  "het_han_luc" TIMESTAMPTZ(6) NOT NULL,
  "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bo_dem_cong_khai_diem_danh_pkey" PRIMARY KEY ("ma_khoa"),
  CONSTRAINT "ck_bo_dem_cong_khai_so_yeu_cau" CHECK ("so_yeu_cau" > 0)
);

CREATE INDEX "ix_bo_dem_cong_khai_diem_danh_het_han"
  ON "bo_dem_cong_khai_diem_danh" ("het_han_luc");
