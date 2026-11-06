ALTER TABLE "ho_so_dang_vien"
  ADD COLUMN "trang_thai_dang_vien" VARCHAR(30),
  ADD COLUMN "ngay_vao_dang" DATE;

ALTER TABLE "ho_so_dang_vien"
  ADD CONSTRAINT "ck_ho_so_trang_thai_dang_vien"
  CHECK ("trang_thai_dang_vien" IS NULL OR "trang_thai_dang_vien" IN ('DU_BI', 'CHINH_THUC', 'DA_RA_KHOI_DANG', 'TU_TRAN'));
