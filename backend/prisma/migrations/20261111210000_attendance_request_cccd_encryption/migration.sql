ALTER TABLE "yeu_cau_diem_danh"
  ADD COLUMN "cccd_ma_hoa" VARCHAR(512),
  ADD COLUMN "phien_ban_khoa_cccd" VARCHAR(40),
  ADD CONSTRAINT "ck_yeu_cau_diem_danh_cccd_ma_hoa" CHECK (("cccd_ma_hoa" IS NULL) = ("phien_ban_khoa_cccd" IS NULL));
