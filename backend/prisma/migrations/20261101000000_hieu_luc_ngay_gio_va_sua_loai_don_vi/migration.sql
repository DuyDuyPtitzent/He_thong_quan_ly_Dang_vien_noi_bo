BEGIN;

-- Convert date-only closed intervals to timestamp intervals with an exclusive
-- upper bound. Existing end dates included the whole local calendar day.
ALTER TABLE "lich_su_quan_he_don_vi"
  DROP CONSTRAINT "ex_lich_su_quan_he_don_vi_khong_chong_lan",
  DROP CONSTRAINT "ck_lich_su_quan_he_don_vi_khoang_ngay_hop_le";

ALTER TABLE "lich_su_don_vi_dang_vien"
  DROP CONSTRAINT "ex_lich_su_sinh_hoat_khong_chong_lan",
  DROP CONSTRAINT "ck_lich_su_sinh_hoat_khoang_ngay_hop_le";

DROP TRIGGER "trg_kiem_tra_don_vi_sinh_hoat" ON "lich_su_don_vi_dang_vien";

ALTER TABLE "lich_su_quan_he_don_vi"
  ALTER COLUMN "ngay_hieu_luc_tu" TYPE TIMESTAMPTZ(6)
    USING ("ngay_hieu_luc_tu"::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ALTER COLUMN "ngay_hieu_luc_den" TYPE TIMESTAMPTZ(6)
    USING (("ngay_hieu_luc_den" + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');

ALTER TABLE "lich_su_don_vi_dang_vien"
  ALTER COLUMN "ngay_hieu_luc_tu" TYPE TIMESTAMPTZ(6)
    USING ("ngay_hieu_luc_tu"::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ALTER COLUMN "ngay_hieu_luc_den" TYPE TIMESTAMPTZ(6)
    USING (("ngay_hieu_luc_den" + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');

ALTER TABLE "lich_su_quan_he_don_vi"
  ADD CONSTRAINT "ck_lich_su_quan_he_don_vi_khoang_thoi_gian_hop_le"
  CHECK ("ma_don_vi_cha" <> "ma_don_vi_con"
    AND ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" > "ngay_hieu_luc_tu"));

ALTER TABLE "lich_su_quan_he_don_vi"
  ADD CONSTRAINT "ex_lich_su_quan_he_don_vi_khong_chong_lan"
  EXCLUDE USING gist (
    "ma_don_vi_con" WITH =,
    tstzrange("ngay_hieu_luc_tu", "ngay_hieu_luc_den", '[)') WITH &&
  );

ALTER TABLE "lich_su_don_vi_dang_vien"
  ADD CONSTRAINT "ck_lich_su_sinh_hoat_khoang_thoi_gian_hop_le"
  CHECK ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" > "ngay_hieu_luc_tu");

ALTER TABLE "lich_su_don_vi_dang_vien"
  ADD CONSTRAINT "ex_lich_su_sinh_hoat_khong_chong_lan"
  EXCLUDE USING gist (
    "ma_ho_so" WITH =,
    tstzrange("ngay_hieu_luc_tu", "ngay_hieu_luc_den", '[)') WITH &&
  );

CREATE TRIGGER "trg_kiem_tra_don_vi_sinh_hoat"
  BEFORE INSERT OR UPDATE OF "ma_chi_bo", "ma_to", "ngay_hieu_luc_tu", "ngay_hieu_luc_den"
  ON "lich_su_don_vi_dang_vien"
  FOR EACH ROW EXECUTE FUNCTION "kiem_tra_don_vi_sinh_hoat"();

COMMENT ON COLUMN "lich_su_quan_he_don_vi"."ngay_hieu_luc_den" IS
  'Moc ket thuc khong bao gom; ngay ket thuc nhap theo lich duoc chuyen thanh 00:00 ngay tiep theo gio Viet Nam.';
COMMENT ON COLUMN "lich_su_don_vi_dang_vien"."ngay_hieu_luc_den" IS
  'Moc ket thuc khong bao gom; ngay ket thuc nhap theo lich duoc chuyen thanh 00:00 ngay tiep theo gio Viet Nam.';

DROP TRIGGER "trg_chan_doi_loai_don_vi" ON "don_vi_to_chuc";
DROP FUNCTION "chan_doi_loai_don_vi"();

CREATE FUNCTION "kiem_tra_sua_loai_don_vi"() RETURNS trigger AS $$
BEGIN
  IF OLD."loai_don_vi" IS NOT DISTINCT FROM NEW."loai_don_vi" THEN
    RETURN NEW;
  END IF;

  IF NEW."loai_don_vi" = 'DANG_UY' THEN
    IF EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" q
      WHERE q."ma_don_vi_con" = NEW."ma_don_vi"
    ) OR EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" q
      JOIN "don_vi_to_chuc" c ON c."ma_don_vi" = q."ma_don_vi_con"
      WHERE q."ma_don_vi_cha" = NEW."ma_don_vi" AND c."loai_don_vi" <> 'CHI_BO'
    ) THEN
      RAISE EXCEPTION 'Không thể đổi loại đơn vị: quan hệ lịch sử không phù hợp với Đảng ủy';
    END IF;
  ELSIF NEW."loai_don_vi" = 'CHI_BO' THEN
    IF EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" q
      JOIN "don_vi_to_chuc" p ON p."ma_don_vi" = q."ma_don_vi_cha"
      WHERE q."ma_don_vi_con" = NEW."ma_don_vi" AND p."loai_don_vi" <> 'DANG_UY'
    ) OR EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" q
      JOIN "don_vi_to_chuc" c ON c."ma_don_vi" = q."ma_don_vi_con"
      WHERE q."ma_don_vi_cha" = NEW."ma_don_vi" AND c."loai_don_vi" <> 'TO'
    ) THEN
      RAISE EXCEPTION 'Không thể đổi loại đơn vị: quan hệ lịch sử không phù hợp với Chi bộ';
    END IF;
  ELSIF NEW."loai_don_vi" = 'TO' THEN
    IF EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" q
      JOIN "don_vi_to_chuc" p ON p."ma_don_vi" = q."ma_don_vi_cha"
      WHERE q."ma_don_vi_con" = NEW."ma_don_vi" AND p."loai_don_vi" <> 'CHI_BO'
    ) OR EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" q
      WHERE q."ma_don_vi_cha" = NEW."ma_don_vi"
    ) THEN
      RAISE EXCEPTION 'Không thể đổi loại đơn vị: quan hệ lịch sử không phù hợp với Tổ';
    END IF;
  END IF;

  IF NEW."loai_don_vi" <> 'CHI_BO' AND EXISTS (
    SELECT 1 FROM "lich_su_don_vi_dang_vien" h
    WHERE h."ma_chi_bo" = NEW."ma_don_vi"
  ) THEN
    RAISE EXCEPTION 'Không thể đổi loại đơn vị: đơn vị đang được dùng làm Chi bộ sinh hoạt';
  END IF;

  IF NEW."loai_don_vi" <> 'TO' AND EXISTS (
    SELECT 1 FROM "lich_su_don_vi_dang_vien" h
    WHERE h."ma_to" = NEW."ma_don_vi"
  ) THEN
    RAISE EXCEPTION 'Không thể đổi loại đơn vị: đơn vị đang được dùng làm Tổ sinh hoạt';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_kiem_tra_sua_loai_don_vi"
  BEFORE UPDATE OF "loai_don_vi" ON "don_vi_to_chuc"
  FOR EACH ROW EXECUTE FUNCTION "kiem_tra_sua_loai_don_vi"();

COMMIT;
