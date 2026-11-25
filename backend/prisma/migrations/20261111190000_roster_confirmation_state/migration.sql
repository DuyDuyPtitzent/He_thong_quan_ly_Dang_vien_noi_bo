ALTER TABLE "buoi_hoc_nghi_quyet"
  ADD COLUMN "phien_ban_danh_sach" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "phien_ban_danh_sach_da_xac_nhan" INTEGER,
  ADD COLUMN "ma_nguoi_xac_nhan_danh_sach" UUID,
  ADD COLUMN "xac_nhan_danh_sach_luc" TIMESTAMPTZ(6);

ALTER TABLE "buoi_hoc_nghi_quyet"
  ADD CONSTRAINT "buoi_hoc_nghi_quyet_ma_nguoi_xac_nhan_danh_sach_fkey"
    FOREIGN KEY ("ma_nguoi_xac_nhan_danh_sach")
    REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ck_buoi_hoc_phien_ban_danh_sach"
    CHECK (
      "phien_ban_danh_sach" >= 0
      AND (
        ("phien_ban_danh_sach_da_xac_nhan" IS NULL
          AND "ma_nguoi_xac_nhan_danh_sach" IS NULL
          AND "xac_nhan_danh_sach_luc" IS NULL)
        OR
        ("phien_ban_danh_sach_da_xac_nhan" IS NOT NULL
          AND "phien_ban_danh_sach_da_xac_nhan" >= 0
          AND "phien_ban_danh_sach_da_xac_nhan" <= "phien_ban_danh_sach"
          AND "ma_nguoi_xac_nhan_danh_sach" IS NOT NULL
          AND "xac_nhan_danh_sach_luc" IS NOT NULL)
      )
    );
