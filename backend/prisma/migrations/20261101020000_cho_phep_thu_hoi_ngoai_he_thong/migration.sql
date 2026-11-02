BEGIN;

ALTER TABLE "phan_cong_vai_tro"
  DROP CONSTRAINT "ck_phan_cong_vai_tro_thu_hoi_di_cung_nhau",
  ADD CONSTRAINT "ck_phan_cong_vai_tro_thu_hoi_can_thoi_diem"
    CHECK ("nguoi_thu_hoi" IS NULL OR "ngay_thu_hoi" IS NOT NULL);

COMMIT;
