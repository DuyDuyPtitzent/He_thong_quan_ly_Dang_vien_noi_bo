ALTER TABLE "thong_tin_ca_nhan_dang_vien"
  DROP CONSTRAINT "ck_cccd_gia_tri_va_ma_doi_chieu_di_cung_nhau";

DROP INDEX "ix_thong_tin_ca_nhan_cccd_doi_chieu";

ALTER TABLE "thong_tin_ca_nhan_dang_vien"
  DROP COLUMN "so_cccd_ma_hoa",
  DROP COLUMN "ma_cccd_doi_chieu_bam",
  ADD COLUMN "so_cccd" VARCHAR(12);

CREATE UNIQUE INDEX "uq_thong_tin_ca_nhan_so_cccd"
  ON "thong_tin_ca_nhan_dang_vien" ("so_cccd");
