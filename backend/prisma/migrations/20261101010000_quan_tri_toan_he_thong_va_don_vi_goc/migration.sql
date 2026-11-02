BEGIN;

ALTER TABLE "don_vi_to_chuc"
  ALTER COLUMN "trang_thai" SET DEFAULT 'DANG_HOAT_DONG',
  ADD CONSTRAINT "ck_don_vi_trang_thai_hop_le"
    CHECK ("trang_thai" IN ('DANG_HOAT_DONG', 'TAM_NGUNG', 'NGUNG_HOAT_DONG')),
  ADD CONSTRAINT "ck_don_vi_dang_uy_dinh_danh_goc"
    CHECK ("loai_don_vi" <> 'DANG_UY' OR ("ma_dinh_danh" IS NOT NULL AND "ma_dinh_danh" = 'PTIT_DANG_UY'));

ALTER TABLE "phan_cong_vai_tro"
  ALTER COLUMN "nguoi_cap" DROP NOT NULL;

ALTER TABLE "vai_tro_quyen"
  ALTER COLUMN "nguoi_ghi_nhan" DROP NOT NULL;

DROP INDEX "uq_don_vi_goc_dang_hoat_dong";
CREATE UNIQUE INDEX "uq_don_vi_goc_dang_uy_duy_nhat"
  ON "don_vi_to_chuc" ("loai_don_vi")
  WHERE "loai_don_vi" = 'DANG_UY';

COMMIT;
