-- AlterEnum
ALTER TYPE "loai_dia_chi" ADD VALUE 'NOI_O_HIEN_NAY';

-- AlterTable
ALTER TABLE "thong_tin_ca_nhan_dang_vien" ADD COLUMN     "so_dien_thoai_bo_nguoi_nuoi_duong" VARCHAR(30),
ADD COLUMN     "so_dien_thoai_me_nguoi_nuoi_duong" VARCHAR(30);

-- CreateTable
CREATE TABLE "chuyen_sinh_hoat_ngoai" (
    "ma_chuyen_sinh_hoat_ngoai" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "ma_lich_su_don_vi_tiep_nhan" UUID NOT NULL,
    "ten_chi_bo_chuyen_di" VARCHAR(200) NOT NULL,
    "ten_dang_uy_quan_ly" VARCHAR(200),
    "tinh_thanh_pho" VARCHAR(150),
    "thang_chuyen_di" INTEGER NOT NULL,
    "nam_chuyen_di" INTEGER NOT NULL,
    "ngay_chuyen_di" DATE,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chuyen_sinh_hoat_ngoai_pkey" PRIMARY KEY ("ma_chuyen_sinh_hoat_ngoai")
);

-- CreateTable
CREATE TABLE "thong_tin_dao_tao_dang" (
    "ma_dao_tao_dang" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "loai_lop" VARCHAR(50) NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ngay_hoan_thanh" DATE,
    "don_vi_to_chuc" VARCHAR(200),
    "ghi_chu" VARCHAR(1000),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_tin_dao_tao_dang_pkey" PRIMARY KEY ("ma_dao_tao_dang")
);

-- CreateTable
CREATE TABLE "tai_lieu_ho_so_dang_vien" (
    "ma_tai_lieu" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "loai_tai_lieu" VARCHAR(50) NOT NULL,
    "ten_tep_goc" VARCHAR(255) NOT NULL,
    "khoa_luu_tru" VARCHAR(80) NOT NULL,
    "kieu_noi_dung" VARCHAR(100) NOT NULL,
    "kich_thuoc" INTEGER NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL DEFAULT 'DANG_SU_DUNG',
    "ma_nguoi_tai_len" UUID NOT NULL,
    "ma_qua_trinh_dang_vien" UUID,
    "ma_dao_tao_dang" UUID,
    "ngay_tai_len" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tai_lieu_ho_so_dang_vien_pkey" PRIMARY KEY ("ma_tai_lieu")
);

-- CreateIndex
CREATE UNIQUE INDEX "chuyen_sinh_hoat_ngoai_ma_lich_su_don_vi_tiep_nhan_key" ON "chuyen_sinh_hoat_ngoai"("ma_lich_su_don_vi_tiep_nhan");

-- CreateIndex
CREATE INDEX "ix_chuyen_sinh_hoat_ngoai_ho_so" ON "chuyen_sinh_hoat_ngoai"("ma_ho_so");

-- CreateIndex
CREATE INDEX "ix_dao_tao_dang_ho_so_loai" ON "thong_tin_dao_tao_dang"("ma_ho_so", "loai_lop");

-- CreateIndex
CREATE UNIQUE INDEX "tai_lieu_ho_so_dang_vien_khoa_luu_tru_key" ON "tai_lieu_ho_so_dang_vien"("khoa_luu_tru");

-- CreateIndex
CREATE INDEX "ix_tai_lieu_ho_so_loai_ngay" ON "tai_lieu_ho_so_dang_vien"("ma_ho_so", "loai_tai_lieu", "ngay_tai_len");

-- AddForeignKey
ALTER TABLE "chuyen_sinh_hoat_ngoai" ADD CONSTRAINT "chuyen_sinh_hoat_ngoai_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chuyen_sinh_hoat_ngoai" ADD CONSTRAINT "chuyen_sinh_hoat_ngoai_ma_lich_su_don_vi_tiep_nhan_fkey" FOREIGN KEY ("ma_lich_su_don_vi_tiep_nhan") REFERENCES "lich_su_don_vi_dang_vien"("ma_lich_su") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thong_tin_dao_tao_dang" ADD CONSTRAINT "thong_tin_dao_tao_dang_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_ho_so_dang_vien" ADD CONSTRAINT "tai_lieu_ho_so_dang_vien_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_ho_so_dang_vien" ADD CONSTRAINT "tai_lieu_ho_so_dang_vien_ma_nguoi_tai_len_fkey" FOREIGN KEY ("ma_nguoi_tai_len") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_ho_so_dang_vien" ADD CONSTRAINT "tai_lieu_ho_so_dang_vien_ma_qua_trinh_dang_vien_fkey" FOREIGN KEY ("ma_qua_trinh_dang_vien") REFERENCES "qua_trinh_dang_vien"("ma_qua_trinh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_lieu_ho_so_dang_vien" ADD CONSTRAINT "tai_lieu_ho_so_dang_vien_ma_dao_tao_dang_fkey" FOREIGN KEY ("ma_dao_tao_dang") REFERENCES "thong_tin_dao_tao_dang"("ma_dao_tao_dang") ON DELETE RESTRICT ON UPDATE CASCADE;
