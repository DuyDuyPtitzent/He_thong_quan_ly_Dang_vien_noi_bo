ALTER TABLE "ket_qua_diem_danh" ALTER COLUMN "trang_thai" DROP NOT NULL;
ALTER TABLE "lich_su_diem_danh" ALTER COLUMN "ket_qua_sau" DROP NOT NULL;
ALTER TABLE "yeu_cau_diem_danh" ALTER COLUMN "ket_qua_du_kien" DROP NOT NULL;

ALTER TABLE "ket_qua_diem_danh"
  DROP CONSTRAINT "ck_ket_qua_diem_danh_thoi_diem_co_mat",
  ADD CONSTRAINT "ck_ket_qua_diem_danh_thoi_diem_co_mat"
    CHECK (("trang_thai" IS DISTINCT FROM 'CO_MAT') = ("thoi_diem_co_mat" IS NULL));

ALTER TABLE "yeu_cau_diem_danh"
  DROP CONSTRAINT "ck_yeu_cau_diem_danh_dieu_chinh",
  ADD CONSTRAINT "ck_yeu_cau_diem_danh_dieu_chinh" CHECK (
    ("loai_yeu_cau" = 'TAO_MOI' AND "ma_ket_qua_hien_tai" IS NULL AND "version_ket_qua_luc_tao" IS NULL AND "ket_qua_du_kien" IS NOT NULL) OR
    ("loai_yeu_cau" = 'DIEU_CHINH' AND "ma_ho_so" IS NOT NULL AND "ma_ket_qua_hien_tai" IS NOT NULL AND "version_ket_qua_luc_tao" >= 1)
  );

CREATE TABLE "chi_tiet_chot_danh_sach_diem_danh" (
  "ma_chi_tiet_chot" UUID NOT NULL,
  "ma_chot" UUID NOT NULL,
  "ma_ho_so" UUID NOT NULL,
  "ma_chi_bo_snapshot" UUID NOT NULL,
  "trang_thai" "ket_qua_diem_danh_chinh_thuc" NOT NULL,
  "version_ket_qua" INTEGER,
  "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chi_tiet_chot_danh_sach_diem_danh_pkey" PRIMARY KEY ("ma_chi_tiet_chot"),
  CONSTRAINT "ck_chi_tiet_chot_version" CHECK ("version_ket_qua" IS NULL OR "version_ket_qua" >= 1),
  CONSTRAINT "uq_chi_tiet_chot_buoi_ho_so" UNIQUE ("ma_chot", "ma_ho_so"),
  CONSTRAINT "chi_tiet_chot_danh_sach_diem_danh_ma_chot_fkey" FOREIGN KEY ("ma_chot") REFERENCES "chot_danh_sach_diem_danh"("ma_chot") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chi_tiet_chot_danh_sach_diem_danh_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "chi_tiet_chot_danh_sach_diem_danh_ma_chi_bo_snapshot_fkey" FOREIGN KEY ("ma_chi_bo_snapshot") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ix_chi_tiet_chot_ho_so_chot" ON "chi_tiet_chot_danh_sach_diem_danh"("ma_ho_so", "ma_chot");
CREATE INDEX "ix_chi_tiet_chot_chi_bo" ON "chi_tiet_chot_danh_sach_diem_danh"("ma_chot", "ma_chi_bo_snapshot");
