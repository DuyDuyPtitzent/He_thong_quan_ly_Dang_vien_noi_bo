ALTER TABLE "ho_so_dang_vien"
  ADD COLUMN "so_the_dang_vien" VARCHAR(50),
  ADD COLUMN "ngay_chinh_thuc" DATE;

CREATE UNIQUE INDEX "uq_ho_so_so_the_dang_vien"
  ON "ho_so_dang_vien"("so_the_dang_vien");

ALTER TABLE "qua_trinh_dang_vien"
  ADD COLUMN "don_vi_ban_hanh_quyet_dinh" VARCHAR(200),
  ADD COLUMN "nguoi_gioi_thieu_thu_nhat" VARCHAR(200),
  ADD COLUMN "nguoi_gioi_thieu_thu_hai" VARCHAR(200);
