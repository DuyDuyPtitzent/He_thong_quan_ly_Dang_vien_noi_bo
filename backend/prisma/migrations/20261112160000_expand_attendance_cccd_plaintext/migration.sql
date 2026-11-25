ALTER TABLE "yeu_cau_diem_danh"
  ADD COLUMN "cccd" VARCHAR(12);

ALTER TABLE "yeu_cau_diem_danh"
  ADD CONSTRAINT "ck_yeu_cau_diem_danh_cccd_plaintext"
  CHECK ("cccd" IS NULL OR "cccd" ~ '^[0-9]{12}$');
