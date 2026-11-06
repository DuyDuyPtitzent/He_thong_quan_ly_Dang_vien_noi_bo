BEGIN;

-- Organization identity and authorization references use the stable UUID key.
-- The business identifier is intentionally configurable and must not define the root.
ALTER TABLE "don_vi_to_chuc"
  DROP CONSTRAINT IF EXISTS "ck_don_vi_dang_uy_dinh_danh_goc";

COMMIT;
