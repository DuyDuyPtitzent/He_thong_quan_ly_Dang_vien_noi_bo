BEGIN;

-- Preserve the existing calendar day while introducing exact Vietnam-local times.
-- The prior exclusion constraint is date-based and cannot be rebuilt against
-- timestamptz columns. Replace it with the matching half-open time interval.
ALTER TABLE "lich_su_ten_don_vi"
  DROP CONSTRAINT "ex_lich_su_ten_don_vi_khong_chong_lan";

ALTER TABLE "lich_su_ten_don_vi"
  ALTER COLUMN "ngay_hieu_luc_tu" TYPE TIMESTAMPTZ(6)
    USING ("ngay_hieu_luc_tu"::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ALTER COLUMN "ngay_hieu_luc_den" TYPE TIMESTAMPTZ(6)
    USING ("ngay_hieu_luc_den"::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');

ALTER TABLE "lich_su_ten_don_vi"
  ADD CONSTRAINT "ex_lich_su_ten_don_vi_khong_chong_lan"
  EXCLUDE USING gist (
    "ma_don_vi" WITH =,
    tstzrange("ngay_hieu_luc_tu", "ngay_hieu_luc_den", '[)') WITH &&
  );

ALTER TABLE "lich_su_ten_don_vi"
  ADD COLUMN "nguon_ban_ghi" VARCHAR(30) NOT NULL DEFAULT 'CAN_XAC_MINH',
  ADD CONSTRAINT "ck_lich_su_ten_don_vi_nguon_ban_ghi"
    CHECK ("nguon_ban_ghi" IN ('KHOI_TAO', 'LICH_SU', 'CAN_XAC_MINH'));

ALTER TABLE "lich_su_quan_he_don_vi"
  ADD COLUMN "nguon_ban_ghi" VARCHAR(30) NOT NULL DEFAULT 'CAN_XAC_MINH',
  ADD CONSTRAINT "ck_lich_su_quan_he_don_vi_nguon_ban_ghi"
    CHECK ("nguon_ban_ghi" IN ('KHOI_TAO', 'LICH_SU', 'CAN_XAC_MINH'));

-- Existing history is deliberately left unclassified. Ambiguous rows continue
-- to block physical deletion until verified against audit evidence.
ALTER TABLE "phien_dang_nhap"
  ADD COLUMN "ma_phan_cong_vai_tro_dang_hoat_dong" UUID,
  ADD CONSTRAINT "phien_dang_nhap_phan_cong_dang_hoat_dong_fkey"
    FOREIGN KEY ("ma_phan_cong_vai_tro_dang_hoat_dong")
    REFERENCES "phan_cong_vai_tro"("ma_phan_cong") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ix_phien_phan_cong_vai_tro_dang_hoat_dong"
  ON "phien_dang_nhap"("ma_phan_cong_vai_tro_dang_hoat_dong");

ALTER TABLE "tai_khoan_nguoi_dung"
  ADD CONSTRAINT "ck_tai_khoan_trang_thai"
    CHECK ("trang_thai" IN ('DANG_HOAT_DONG', 'TAM_KHOA', 'NGUNG_HOAT_DONG'));

COMMIT;
