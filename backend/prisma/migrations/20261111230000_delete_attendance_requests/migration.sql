-- Preserve the source request identifier while allowing the request and its
-- submitted form data to be physically deleted without deleting attendance history.
ALTER TABLE "lich_su_diem_danh"
  ADD COLUMN "ma_yeu_cau_nguon" UUID;

UPDATE "lich_su_diem_danh"
SET "ma_yeu_cau_nguon" = "ma_yeu_cau"
WHERE "ma_yeu_cau" IS NOT NULL;

ALTER TABLE "lich_su_diem_danh"
  DROP CONSTRAINT "lich_su_diem_danh_ma_yeu_cau_fkey",
  ADD CONSTRAINT "lich_su_diem_danh_ma_yeu_cau_fkey"
    FOREIGN KEY ("ma_yeu_cau")
    REFERENCES "yeu_cau_diem_danh"("ma_yeu_cau")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
