ALTER TABLE "ho_so_dang_vien"
  ADD COLUMN "so_phieu_ly_lich" VARCHAR(50);

CREATE UNIQUE INDEX "uq_ho_so_so_phieu_ly_lich"
  ON "ho_so_dang_vien"("so_phieu_ly_lich");
