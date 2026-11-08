ALTER TABLE "thong_tin_dao_tao_dang"
ADD COLUMN "ten_chuong_trinh" VARCHAR(200);

UPDATE "thong_tin_dao_tao_dang"
SET "ten_chuong_trinh" = CASE
  WHEN "loai_lop" = 'LOP_DANG_VIEN_MOI' THEN 'Lớp Đảng viên mới'
  ELSE "loai_lop"
END
WHERE "ten_chuong_trinh" IS NULL;
