CREATE TABLE "nam_hoc" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ma_nam_hoc" VARCHAR(30) NOT NULL,
  "ten_nam_hoc" VARCHAR(100) NOT NULL,
  "ngay_bat_dau" DATE NOT NULL,
  "ngay_ket_thuc" DATE NOT NULL,
  "trang_thai" VARCHAR(30) NOT NULL DEFAULT 'DANG_HOAT_DONG',
  "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_nam_hoc" PRIMARY KEY ("id"),
  CONSTRAINT "ck_nam_hoc_ngay_hop_le" CHECK ("ngay_bat_dau" < "ngay_ket_thuc"),
  CONSTRAINT "ck_nam_hoc_trang_thai" CHECK ("trang_thai" IN ('DANG_HOAT_DONG', 'NGUNG_HOAT_DONG')),
  CONSTRAINT "ex_nam_hoc_khong_chong_lan" EXCLUDE USING gist
    (daterange("ngay_bat_dau", "ngay_ket_thuc" + 1, '[)') WITH &&)
);
CREATE UNIQUE INDEX "uq_nam_hoc_ma" ON "nam_hoc"("ma_nam_hoc");
CREATE INDEX "ix_nam_hoc_thoi_gian" ON "nam_hoc"("ngay_bat_dau", "ngay_ket_thuc");
