-- CreateEnum
CREATE TYPE "trang_thai_dot_hoc_nghi_quyet" AS ENUM ('NHAP', 'SAP_DIEN_RA', 'DANG_DIEN_RA', 'DA_KET_THUC', 'DA_HUY');

-- CreateEnum
CREATE TYPE "trang_thai_buoi_hoc_nghi_quyet" AS ENUM ('NHAP', 'DA_LEN_LICH', 'DANG_DIEN_RA', 'DA_KET_THUC', 'DA_HUY');

-- CreateEnum
CREATE TYPE "trang_thai_danh_sach_tham_gia" AS ENUM ('TRONG_DANH_SACH', 'DA_LOAI');

-- CreateEnum
CREATE TYPE "nhiem_vu_buoi_hoc" AS ENUM ('QUAN_LY_DIEM_DANH', 'XAC_MINH', 'PHE_DUYET', 'CHOT_DANH_SACH');

-- CreateEnum
CREATE TYPE "loai_yeu_cau_diem_danh" AS ENUM ('TAO_MOI', 'DIEU_CHINH');

-- CreateEnum
CREATE TYPE "trang_thai_yeu_cau_diem_danh" AS ENUM ('CHO_XAC_MINH', 'CHO_PHE_DUYET', 'DA_DUYET', 'TU_CHOI');

-- CreateEnum
CREATE TYPE "ket_qua_diem_danh_chinh_thuc" AS ENUM ('CO_MAT', 'VANG_CO_PHEP', 'VANG_KHONG_PHEP');

-- CreateEnum
CREATE TYPE "hanh_dong_danh_sach_tham_gia" AS ENUM ('THEM', 'LOAI', 'KHOI_PHUC', 'CAP_NHAT_SNAPSHOT');

-- CreateEnum
CREATE TYPE "trang_thai_tep_hoc_tap" AS ENUM ('DANG_SU_DUNG', 'DA_XOA');

-- CreateTable
CREATE TABLE "dot_hoc_nghi_quyet" (
    "ma_dot" UUID NOT NULL,
    "ma_dot_nghi_quyet" VARCHAR(50) NOT NULL,
    "ten_dot" VARCHAR(200) NOT NULL,
    "mo_ta" VARCHAR(2000),
    "ma_nam_hoc" UUID NOT NULL,
    "ma_don_vi_to_chuc" UUID NOT NULL,
    "ma_nguoi_phu_trach" UUID,
    "ngay_bat_dau" TIMESTAMPTZ(6) NOT NULL,
    "ngay_ket_thuc" TIMESTAMPTZ(6) NOT NULL,
    "trang_thai" "trang_thai_dot_hoc_nghi_quyet" NOT NULL DEFAULT 'NHAP',
    "ma_nguoi_tao" UUID NOT NULL,
    "ma_nguoi_cap_nhat" UUID,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dot_hoc_nghi_quyet_pkey" PRIMARY KEY ("ma_dot")
);

-- CreateTable
CREATE TABLE "pham_vi_dot_hoc_nghi_quyet" (
    "ma_dot" UUID NOT NULL,
    "ma_don_vi" UUID NOT NULL,
    "ma_nguoi_them" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pham_vi_dot_hoc_nghi_quyet" PRIMARY KEY ("ma_dot","ma_don_vi")
);

-- CreateTable
CREATE TABLE "buoi_hoc_nghi_quyet" (
    "ma_buoi" UUID NOT NULL,
    "ma_dot" UUID NOT NULL,
    "ma_buoi_nghi_quyet" VARCHAR(50) NOT NULL,
    "ten_buoi" VARCHAR(200) NOT NULL,
    "hinh_thuc" VARCHAR(50) NOT NULL,
    "noi_dung" VARCHAR(2000),
    "dia_diem" VARCHAR(500),
    "bat_dau_luc" TIMESTAMPTZ(6) NOT NULL,
    "ket_thuc_luc" TIMESTAMPTZ(6) NOT NULL,
    "ma_nguoi_phu_trach" UUID,
    "yeu_cau_phe_duyet" BOOLEAN NOT NULL DEFAULT false,
    "trang_thai" "trang_thai_buoi_hoc_nghi_quyet" NOT NULL DEFAULT 'NHAP',
    "ma_nguoi_tao" UUID NOT NULL,
    "ma_nguoi_cap_nhat" UUID,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buoi_hoc_nghi_quyet_pkey" PRIMARY KEY ("ma_buoi")
);

-- CreateTable
CREATE TABLE "pham_vi_buoi_hoc_nghi_quyet" (
    "ma_buoi" UUID NOT NULL,
    "ma_don_vi" UUID NOT NULL,
    "ma_nguoi_them" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pham_vi_buoi_hoc_nghi_quyet" PRIMARY KEY ("ma_buoi","ma_don_vi")
);

-- CreateTable
CREATE TABLE "danh_sach_tham_gia_buoi_hoc" (
    "ma_danh_sach_tham_gia" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "trang_thai" "trang_thai_danh_sach_tham_gia" NOT NULL DEFAULT 'TRONG_DANH_SACH',
    "ma_chi_bo_snapshot" UUID NOT NULL,
    "ten_chi_bo_snapshot" VARCHAR(200) NOT NULL,
    "ma_to_snapshot" UUID,
    "ten_to_snapshot" VARCHAR(200),
    "ma_nguoi_them" UUID NOT NULL,
    "them_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ma_nguoi_loai" UUID,
    "loai_luc" TIMESTAMPTZ(6),
    "ma_nguoi_khoi_phuc" UUID,
    "khoi_phuc_luc" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "danh_sach_tham_gia_buoi_hoc_pkey" PRIMARY KEY ("ma_danh_sach_tham_gia")
);

-- CreateTable
CREATE TABLE "phan_cong_nhiem_vu_buoi_hoc" (
    "ma_phan_cong_nhiem_vu" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "ma_tai_khoan" UUID NOT NULL,
    "nhiem_vu" "nhiem_vu_buoi_hoc" NOT NULL,
    "ma_nguoi_giao" UUID NOT NULL,
    "hieu_luc_tu" TIMESTAMPTZ(6) NOT NULL,
    "hieu_luc_den" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phan_cong_nhiem_vu_buoi_hoc_pkey" PRIMARY KEY ("ma_phan_cong_nhiem_vu")
);

-- CreateTable
CREATE TABLE "cua_so_diem_danh_truc_tuyen" (
    "ma_cua_so" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "cho_phep_qr" BOOLEAN NOT NULL DEFAULT true,
    "cho_phep_bieu_mau" BOOLEAN NOT NULL DEFAULT true,
    "cho_phep_khong_dang_nhap" BOOLEAN NOT NULL DEFAULT true,
    "chu_ky_qr_giay" INTEGER NOT NULL DEFAULT 15,
    "ma_phien_qr" UUID NOT NULL,
    "phien_ban_lien_ket_bieu_mau" INTEGER NOT NULL DEFAULT 1,
    "het_han_lien_ket_bieu_mau_luc" TIMESTAMPTZ(6),
    "mo_theo_ke_hoach_luc" TIMESTAMPTZ(6) NOT NULL,
    "dong_theo_ke_hoach_luc" TIMESTAMPTZ(6) NOT NULL,
    "mo_luc_thuc_te" TIMESTAMPTZ(6),
    "dong_luc_thuc_te" TIMESTAMPTZ(6),
    "ma_nguoi_mo" UUID,
    "ma_nguoi_dong" UUID,
    "ma_nguoi_tao" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cua_so_diem_danh_truc_tuyen_pkey" PRIMARY KEY ("ma_cua_so")
);

-- CreateTable
CREATE TABLE "yeu_cau_diem_danh" (
    "ma_yeu_cau" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "ma_cua_so" UUID,
    "ma_ho_so" UUID,
    "loai_yeu_cau" "loai_yeu_cau_diem_danh" NOT NULL,
    "ma_ket_qua_hien_tai" UUID,
    "version_ket_qua_luc_tao" INTEGER,
    "ket_qua_du_kien" "ket_qua_diem_danh_chinh_thuc" NOT NULL,
    "trang_thai" "trang_thai_yeu_cau_diem_danh" NOT NULL DEFAULT 'CHO_XAC_MINH',
    "ho_va_ten_doi_chieu" VARCHAR(200) NOT NULL,
    "ma_don_vi_doi_chieu" UUID NOT NULL,
    "ten_don_vi_doi_chieu" VARCHAR(200) NOT NULL,
    "nam_sinh_doi_chieu" SMALLINT NOT NULL,
    "gui_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ma_nguoi_xac_minh" UUID,
    "xac_minh_luc" TIMESTAMPTZ(6),
    "ma_nguoi_xu_ly" UUID,
    "xu_ly_luc" TIMESTAMPTZ(6),
    "ghi_chu_tu_choi" VARCHAR(1000),
    "idempotency_hash" VARCHAR(64),
    "dau_van_tay_co_ban_bam" VARCHAR(64),
    "dau_van_tay_cccd_bam" VARCHAR(64),
    "phien_ban_khoa_bam" VARCHAR(40),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yeu_cau_diem_danh_pkey" PRIMARY KEY ("ma_yeu_cau")
);

-- CreateTable
CREATE TABLE "ket_qua_diem_danh" (
    "ma_ket_qua" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "trang_thai" "ket_qua_diem_danh_chinh_thuc" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "ghi_nhan_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_co_mat" TIMESTAMPTZ(6),
    "ma_nguoi_cap_nhat" UUID NOT NULL,
    "thoi_diem_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ghi_chu" VARCHAR(1000),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ket_qua_diem_danh_pkey" PRIMARY KEY ("ma_ket_qua")
);

-- CreateTable
CREATE TABLE "chot_danh_sach_diem_danh" (
    "ma_chot" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "phien_ban" INTEGER NOT NULL DEFAULT 1,
    "tong_thuoc_dien" INTEGER NOT NULL DEFAULT 0,
    "tong_co_mat" INTEGER NOT NULL DEFAULT 0,
    "tong_vang_co_phep" INTEGER NOT NULL DEFAULT 0,
    "tong_vang_khong_phep" INTEGER NOT NULL DEFAULT 0,
    "tong_chua_diem_danh" INTEGER NOT NULL DEFAULT 0,
    "ma_nguoi_chot" UUID NOT NULL,
    "chot_luc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chot_danh_sach_diem_danh_pkey" PRIMARY KEY ("ma_chot")
);

-- CreateTable
CREATE TABLE "lich_su_danh_sach_tham_gia" (
    "ma_lich_su_danh_sach" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "hanh_dong" "hanh_dong_danh_sach_tham_gia" NOT NULL,
    "trang_thai_truoc" "trang_thai_danh_sach_tham_gia",
    "trang_thai_sau" "trang_thai_danh_sach_tham_gia" NOT NULL,
    "snapshot_truoc" JSONB,
    "snapshot_sau" JSONB,
    "ma_nguoi_thuc_hien" UUID NOT NULL,
    "thoi_diem" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ma_tuong_quan" VARCHAR(80) NOT NULL,

    CONSTRAINT "lich_su_danh_sach_tham_gia_pkey" PRIMARY KEY ("ma_lich_su_danh_sach")
);

-- CreateTable
CREATE TABLE "lich_su_diem_danh" (
    "ma_lich_su_diem_danh" UUID NOT NULL,
    "ma_buoi" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "ma_yeu_cau" UUID,
    "ket_qua_truoc" "ket_qua_diem_danh_chinh_thuc",
    "ket_qua_sau" "ket_qua_diem_danh_chinh_thuc" NOT NULL,
    "version_truoc" INTEGER,
    "version_sau" INTEGER NOT NULL,
    "ma_nguoi_thuc_hien" UUID NOT NULL,
    "thoi_diem" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ma_tuong_quan" VARCHAR(80) NOT NULL,

    CONSTRAINT "lich_su_diem_danh_pkey" PRIMARY KEY ("ma_lich_su_diem_danh")
);

-- CreateTable
CREATE TABLE "tep_dinh_kem_hoc_tap" (
    "ma_tep" UUID NOT NULL,
    "ma_dot" UUID,
    "ma_buoi" UUID,
    "ten_tep_goc" VARCHAR(255) NOT NULL,
    "khoa_luu_tru" VARCHAR(80) NOT NULL,
    "kieu_noi_dung" VARCHAR(100) NOT NULL,
    "kich_thuoc" INTEGER NOT NULL,
    "ma_sha256" VARCHAR(64) NOT NULL,
    "trang_thai" "trang_thai_tep_hoc_tap" NOT NULL DEFAULT 'DANG_SU_DUNG',
    "ma_nguoi_tai_len" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_xoa" TIMESTAMPTZ(6),
    "ma_nguoi_xoa" UUID,

    CONSTRAINT "tep_dinh_kem_hoc_tap_pkey" PRIMARY KEY ("ma_tep")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_dot_hoc_nghi_quyet_ma" ON "dot_hoc_nghi_quyet"("ma_dot_nghi_quyet");

-- CreateIndex
CREATE INDEX "ix_dot_hoc_trang_thai_thoi_gian" ON "dot_hoc_nghi_quyet"("trang_thai", "ngay_bat_dau", "ngay_ket_thuc");

-- CreateIndex
CREATE INDEX "ix_dot_hoc_don_vi_trang_thai" ON "dot_hoc_nghi_quyet"("ma_don_vi_to_chuc", "trang_thai");

-- CreateIndex
CREATE INDEX "ix_dot_hoc_nam_hoc_trang_thai" ON "dot_hoc_nghi_quyet"("ma_nam_hoc", "trang_thai");

-- CreateIndex
CREATE INDEX "ix_pham_vi_dot_don_vi_dot" ON "pham_vi_dot_hoc_nghi_quyet"("ma_don_vi", "ma_dot");

-- CreateIndex
CREATE INDEX "ix_buoi_hoc_dot_bat_dau" ON "buoi_hoc_nghi_quyet"("ma_dot", "bat_dau_luc");

-- CreateIndex
CREATE INDEX "ix_buoi_hoc_trang_thai_bat_dau" ON "buoi_hoc_nghi_quyet"("trang_thai", "bat_dau_luc");

-- CreateIndex
CREATE UNIQUE INDEX "uq_buoi_hoc_dot_ma_buoi" ON "buoi_hoc_nghi_quyet"("ma_dot", "ma_buoi_nghi_quyet");

-- CreateIndex
CREATE INDEX "ix_pham_vi_buoi_don_vi_buoi" ON "pham_vi_buoi_hoc_nghi_quyet"("ma_don_vi", "ma_buoi");

-- CreateIndex
CREATE INDEX "ix_danh_sach_tham_gia_buoi_trang_thai_chi_bo" ON "danh_sach_tham_gia_buoi_hoc"("ma_buoi", "trang_thai", "ma_chi_bo_snapshot");

-- CreateIndex
CREATE INDEX "ix_danh_sach_tham_gia_ho_so_buoi" ON "danh_sach_tham_gia_buoi_hoc"("ma_ho_so", "ma_buoi");

-- CreateIndex
CREATE UNIQUE INDEX "uq_danh_sach_tham_gia_buoi_ho_so" ON "danh_sach_tham_gia_buoi_hoc"("ma_buoi", "ma_ho_so");

-- CreateIndex
CREATE INDEX "ix_phan_cong_nhiem_vu_tai_khoan_hieu_luc" ON "phan_cong_nhiem_vu_buoi_hoc"("ma_tai_khoan", "hieu_luc_tu", "hieu_luc_den");

-- CreateIndex
CREATE INDEX "ix_phan_cong_nhiem_vu_buoi_nhiem_vu" ON "phan_cong_nhiem_vu_buoi_hoc"("ma_buoi", "nhiem_vu", "hieu_luc_den");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cua_so_diem_danh_phien_qr" ON "cua_so_diem_danh_truc_tuyen"("ma_phien_qr");

-- CreateIndex
CREATE INDEX "ix_cua_so_diem_danh_buoi_thuc_te" ON "cua_so_diem_danh_truc_tuyen"("ma_buoi", "mo_luc_thuc_te", "dong_luc_thuc_te");

-- CreateIndex
CREATE INDEX "ix_yeu_cau_diem_danh_buoi_trang_thai_gui" ON "yeu_cau_diem_danh"("ma_buoi", "trang_thai", "gui_luc");

-- CreateIndex
CREATE INDEX "ix_yeu_cau_diem_danh_buoi_ho_so" ON "yeu_cau_diem_danh"("ma_buoi", "ma_ho_so");

-- CreateIndex
CREATE INDEX "ix_yeu_cau_diem_danh_fingerprint_co_ban" ON "yeu_cau_diem_danh"("ma_buoi", "dau_van_tay_co_ban_bam", "trang_thai");

-- CreateIndex
CREATE INDEX "ix_yeu_cau_diem_danh_buoi_cua_so" ON "yeu_cau_diem_danh"("ma_buoi", "ma_cua_so");

-- CreateIndex
CREATE INDEX "ix_ket_qua_diem_danh_buoi_trang_thai" ON "ket_qua_diem_danh"("ma_buoi", "trang_thai");

-- CreateIndex
CREATE INDEX "ix_ket_qua_diem_danh_ho_so_buoi" ON "ket_qua_diem_danh"("ma_ho_so", "ma_buoi");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ket_qua_diem_danh_buoi_ho_so" ON "ket_qua_diem_danh"("ma_buoi", "ma_ho_so");

-- CreateIndex
CREATE UNIQUE INDEX "uq_chot_danh_sach_buoi" ON "chot_danh_sach_diem_danh"("ma_buoi");

-- CreateIndex
CREATE INDEX "ix_lich_su_danh_sach_buoi_ho_so_thoi_diem" ON "lich_su_danh_sach_tham_gia"("ma_buoi", "ma_ho_so", "thoi_diem");

-- CreateIndex
CREATE INDEX "ix_lich_su_danh_sach_ma_tuong_quan" ON "lich_su_danh_sach_tham_gia"("ma_tuong_quan");

-- CreateIndex
CREATE INDEX "ix_lich_su_diem_danh_buoi_ho_so_thoi_diem" ON "lich_su_diem_danh"("ma_buoi", "ma_ho_so", "thoi_diem");

-- CreateIndex
CREATE INDEX "ix_lich_su_diem_danh_ma_tuong_quan" ON "lich_su_diem_danh"("ma_tuong_quan");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tep_dinh_kem_hoc_tap_khoa_luu_tru" ON "tep_dinh_kem_hoc_tap"("khoa_luu_tru");

-- CreateIndex
CREATE INDEX "ix_tep_hoc_tap_dot_trang_thai" ON "tep_dinh_kem_hoc_tap"("ma_dot", "trang_thai");

-- CreateIndex
CREATE INDEX "ix_tep_hoc_tap_buoi_trang_thai" ON "tep_dinh_kem_hoc_tap"("ma_buoi", "trang_thai");

-- AddForeignKey
ALTER TABLE "dot_hoc_nghi_quyet" ADD CONSTRAINT "dot_hoc_nghi_quyet_ma_nam_hoc_fkey" FOREIGN KEY ("ma_nam_hoc") REFERENCES "nam_hoc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_hoc_nghi_quyet" ADD CONSTRAINT "dot_hoc_nghi_quyet_ma_don_vi_to_chuc_fkey" FOREIGN KEY ("ma_don_vi_to_chuc") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_hoc_nghi_quyet" ADD CONSTRAINT "dot_hoc_nghi_quyet_ma_nguoi_phu_trach_fkey" FOREIGN KEY ("ma_nguoi_phu_trach") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_hoc_nghi_quyet" ADD CONSTRAINT "dot_hoc_nghi_quyet_ma_nguoi_tao_fkey" FOREIGN KEY ("ma_nguoi_tao") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dot_hoc_nghi_quyet" ADD CONSTRAINT "dot_hoc_nghi_quyet_ma_nguoi_cap_nhat_fkey" FOREIGN KEY ("ma_nguoi_cap_nhat") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_dot_hoc_nghi_quyet" ADD CONSTRAINT "pham_vi_dot_hoc_nghi_quyet_ma_dot_fkey" FOREIGN KEY ("ma_dot") REFERENCES "dot_hoc_nghi_quyet"("ma_dot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_dot_hoc_nghi_quyet" ADD CONSTRAINT "pham_vi_dot_hoc_nghi_quyet_ma_don_vi_fkey" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_dot_hoc_nghi_quyet" ADD CONSTRAINT "pham_vi_dot_hoc_nghi_quyet_ma_nguoi_them_fkey" FOREIGN KEY ("ma_nguoi_them") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc_nghi_quyet" ADD CONSTRAINT "buoi_hoc_nghi_quyet_ma_dot_fkey" FOREIGN KEY ("ma_dot") REFERENCES "dot_hoc_nghi_quyet"("ma_dot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc_nghi_quyet" ADD CONSTRAINT "buoi_hoc_nghi_quyet_ma_nguoi_phu_trach_fkey" FOREIGN KEY ("ma_nguoi_phu_trach") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc_nghi_quyet" ADD CONSTRAINT "buoi_hoc_nghi_quyet_ma_nguoi_tao_fkey" FOREIGN KEY ("ma_nguoi_tao") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoi_hoc_nghi_quyet" ADD CONSTRAINT "buoi_hoc_nghi_quyet_ma_nguoi_cap_nhat_fkey" FOREIGN KEY ("ma_nguoi_cap_nhat") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_buoi_hoc_nghi_quyet" ADD CONSTRAINT "pham_vi_buoi_hoc_nghi_quyet_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_buoi_hoc_nghi_quyet" ADD CONSTRAINT "pham_vi_buoi_hoc_nghi_quyet_ma_don_vi_fkey" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_buoi_hoc_nghi_quyet" ADD CONSTRAINT "pham_vi_buoi_hoc_nghi_quyet_ma_nguoi_them_fkey" FOREIGN KEY ("ma_nguoi_them") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_chi_bo_snapshot_fkey" FOREIGN KEY ("ma_chi_bo_snapshot") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_to_snapshot_fkey" FOREIGN KEY ("ma_to_snapshot") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_nguoi_them_fkey" FOREIGN KEY ("ma_nguoi_them") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_nguoi_loai_fkey" FOREIGN KEY ("ma_nguoi_loai") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danh_sach_tham_gia_buoi_hoc" ADD CONSTRAINT "danh_sach_tham_gia_buoi_hoc_ma_nguoi_khoi_phuc_fkey" FOREIGN KEY ("ma_nguoi_khoi_phuc") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_nhiem_vu_buoi_hoc" ADD CONSTRAINT "phan_cong_nhiem_vu_buoi_hoc_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_nhiem_vu_buoi_hoc" ADD CONSTRAINT "phan_cong_nhiem_vu_buoi_hoc_ma_tai_khoan_fkey" FOREIGN KEY ("ma_tai_khoan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_nhiem_vu_buoi_hoc" ADD CONSTRAINT "phan_cong_nhiem_vu_buoi_hoc_ma_nguoi_giao_fkey" FOREIGN KEY ("ma_nguoi_giao") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cua_so_diem_danh_truc_tuyen" ADD CONSTRAINT "cua_so_diem_danh_truc_tuyen_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cua_so_diem_danh_truc_tuyen" ADD CONSTRAINT "cua_so_diem_danh_truc_tuyen_ma_nguoi_tao_fkey" FOREIGN KEY ("ma_nguoi_tao") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cua_so_diem_danh_truc_tuyen" ADD CONSTRAINT "cua_so_diem_danh_truc_tuyen_ma_nguoi_mo_fkey" FOREIGN KEY ("ma_nguoi_mo") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cua_so_diem_danh_truc_tuyen" ADD CONSTRAINT "cua_so_diem_danh_truc_tuyen_ma_nguoi_dong_fkey" FOREIGN KEY ("ma_nguoi_dong") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_cua_so_fkey" FOREIGN KEY ("ma_cua_so") REFERENCES "cua_so_diem_danh_truc_tuyen"("ma_cua_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_don_vi_doi_chieu_fkey" FOREIGN KEY ("ma_don_vi_doi_chieu") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_ket_qua_hien_tai_fkey" FOREIGN KEY ("ma_ket_qua_hien_tai") REFERENCES "ket_qua_diem_danh"("ma_ket_qua") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_nguoi_xac_minh_fkey" FOREIGN KEY ("ma_nguoi_xac_minh") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yeu_cau_diem_danh" ADD CONSTRAINT "yeu_cau_diem_danh_ma_nguoi_xu_ly_fkey" FOREIGN KEY ("ma_nguoi_xu_ly") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_diem_danh" ADD CONSTRAINT "ket_qua_diem_danh_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_diem_danh" ADD CONSTRAINT "ket_qua_diem_danh_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ket_qua_diem_danh" ADD CONSTRAINT "ket_qua_diem_danh_ma_nguoi_cap_nhat_fkey" FOREIGN KEY ("ma_nguoi_cap_nhat") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chot_danh_sach_diem_danh" ADD CONSTRAINT "chot_danh_sach_diem_danh_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chot_danh_sach_diem_danh" ADD CONSTRAINT "chot_danh_sach_diem_danh_ma_nguoi_chot_fkey" FOREIGN KEY ("ma_nguoi_chot") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_danh_sach_tham_gia" ADD CONSTRAINT "lich_su_danh_sach_tham_gia_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_danh_sach_tham_gia" ADD CONSTRAINT "lich_su_danh_sach_tham_gia_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_danh_sach_tham_gia" ADD CONSTRAINT "lich_su_danh_sach_tham_gia_ma_nguoi_thuc_hien_fkey" FOREIGN KEY ("ma_nguoi_thuc_hien") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_diem_danh" ADD CONSTRAINT "lich_su_diem_danh_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_diem_danh" ADD CONSTRAINT "lich_su_diem_danh_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_diem_danh" ADD CONSTRAINT "lich_su_diem_danh_ma_yeu_cau_fkey" FOREIGN KEY ("ma_yeu_cau") REFERENCES "yeu_cau_diem_danh"("ma_yeu_cau") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_diem_danh" ADD CONSTRAINT "lich_su_diem_danh_ma_nguoi_thuc_hien_fkey" FOREIGN KEY ("ma_nguoi_thuc_hien") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tep_dinh_kem_hoc_tap" ADD CONSTRAINT "tep_dinh_kem_hoc_tap_ma_dot_fkey" FOREIGN KEY ("ma_dot") REFERENCES "dot_hoc_nghi_quyet"("ma_dot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tep_dinh_kem_hoc_tap" ADD CONSTRAINT "tep_dinh_kem_hoc_tap_ma_buoi_fkey" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tep_dinh_kem_hoc_tap" ADD CONSTRAINT "tep_dinh_kem_hoc_tap_ma_nguoi_tai_len_fkey" FOREIGN KEY ("ma_nguoi_tai_len") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tep_dinh_kem_hoc_tap" ADD CONSTRAINT "tep_dinh_kem_hoc_tap_ma_nguoi_xoa_fkey" FOREIGN KEY ("ma_nguoi_xoa") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants not expressible in the Prisma schema.
ALTER TABLE "dot_hoc_nghi_quyet"
  ADD CONSTRAINT "ck_dot_hoc_thoi_gian_hop_le" CHECK ("ngay_bat_dau" < "ngay_ket_thuc");

ALTER TABLE "buoi_hoc_nghi_quyet"
  ADD CONSTRAINT "ck_buoi_hoc_thoi_gian_hop_le" CHECK ("bat_dau_luc" < "ket_thuc_luc");

ALTER TABLE "danh_sach_tham_gia_buoi_hoc"
  ADD CONSTRAINT "ck_danh_sach_tham_gia_trang_thai_loai"
  CHECK (("trang_thai" = 'TRONG_DANH_SACH' AND "ma_nguoi_loai" IS NULL AND "loai_luc" IS NULL)
      OR ("trang_thai" = 'DA_LOAI' AND "ma_nguoi_loai" IS NOT NULL AND "loai_luc" IS NOT NULL));

ALTER TABLE "phan_cong_nhiem_vu_buoi_hoc"
  ADD CONSTRAINT "ck_phan_cong_nhiem_vu_hieu_luc" CHECK ("hieu_luc_den" IS NULL OR "hieu_luc_tu" <= "hieu_luc_den");
CREATE UNIQUE INDEX "uq_phan_cong_nhiem_vu_dang_hieu_luc"
  ON "phan_cong_nhiem_vu_buoi_hoc" ("ma_buoi", "ma_tai_khoan", "nhiem_vu") WHERE "hieu_luc_den" IS NULL;

ALTER TABLE "cua_so_diem_danh_truc_tuyen"
  ADD CONSTRAINT "ck_cua_so_diem_danh_qr_chu_ky" CHECK ("chu_ky_qr_giay" IN (15, 30, 60)),
  ADD CONSTRAINT "ck_cua_so_diem_danh_phien_ban_bieu_mau" CHECK ("phien_ban_lien_ket_bieu_mau" >= 1),
  ADD CONSTRAINT "ck_cua_so_diem_danh_ke_hoach" CHECK ("mo_theo_ke_hoach_luc" < "dong_theo_ke_hoach_luc"),
  ADD CONSTRAINT "ck_cua_so_diem_danh_actor_thuc_te" CHECK (
    (("mo_luc_thuc_te" IS NULL) = ("ma_nguoi_mo" IS NULL)) AND
    (("dong_luc_thuc_te" IS NULL) = ("ma_nguoi_dong" IS NULL)) AND
    ("dong_luc_thuc_te" IS NULL OR ("mo_luc_thuc_te" IS NOT NULL AND "mo_luc_thuc_te" <= "dong_luc_thuc_te"))
  );
CREATE UNIQUE INDEX "uq_cua_so_diem_danh_dang_mo"
  ON "cua_so_diem_danh_truc_tuyen" ("ma_buoi") WHERE "mo_luc_thuc_te" IS NOT NULL AND "dong_luc_thuc_te" IS NULL;

ALTER TABLE "yeu_cau_diem_danh"
  ADD CONSTRAINT "ck_yeu_cau_diem_danh_dieu_chinh" CHECK (
    ("loai_yeu_cau" = 'TAO_MOI' AND "ma_ket_qua_hien_tai" IS NULL AND "version_ket_qua_luc_tao" IS NULL) OR
    ("loai_yeu_cau" = 'DIEU_CHINH' AND "ma_ho_so" IS NOT NULL AND "ma_ket_qua_hien_tai" IS NOT NULL AND "version_ket_qua_luc_tao" >= 1)
  ),
  ADD CONSTRAINT "ck_yeu_cau_diem_danh_xac_minh" CHECK (("ma_nguoi_xac_minh" IS NULL) = ("xac_minh_luc" IS NULL)),
  ADD CONSTRAINT "ck_yeu_cau_diem_danh_xu_ly" CHECK (
    (("trang_thai" IN ('DA_DUYET', 'TU_CHOI')) = ("ma_nguoi_xu_ly" IS NOT NULL)) AND
    (("trang_thai" IN ('DA_DUYET', 'TU_CHOI')) = ("xu_ly_luc" IS NOT NULL)) AND
    (("ma_nguoi_xu_ly" IS NULL) = ("xu_ly_luc" IS NULL))
  );
CREATE UNIQUE INDEX "uq_yeu_cau_diem_danh_idempotency"
  ON "yeu_cau_diem_danh" ("ma_buoi", "idempotency_hash") WHERE "idempotency_hash" IS NOT NULL;
CREATE UNIQUE INDEX "uq_yeu_cau_diem_danh_pending_ho_so"
  ON "yeu_cau_diem_danh" ("ma_buoi", "ma_ho_so")
  WHERE "ma_ho_so" IS NOT NULL AND "trang_thai" IN ('CHO_XAC_MINH', 'CHO_PHE_DUYET');
CREATE UNIQUE INDEX "uq_yeu_cau_diem_danh_pending_cccd_fingerprint"
  ON "yeu_cau_diem_danh" ("ma_buoi", "phien_ban_khoa_bam", "dau_van_tay_cccd_bam")
  WHERE "dau_van_tay_cccd_bam" IS NOT NULL AND "trang_thai" IN ('CHO_XAC_MINH', 'CHO_PHE_DUYET');

ALTER TABLE "ket_qua_diem_danh"
  ADD CONSTRAINT "ck_ket_qua_diem_danh_thoi_diem_co_mat"
  CHECK (("trang_thai" = 'CO_MAT') = ("thoi_diem_co_mat" IS NOT NULL)),
  ADD CONSTRAINT "ck_ket_qua_diem_danh_version" CHECK ("version" >= 1);

ALTER TABLE "chot_danh_sach_diem_danh"
  ADD CONSTRAINT "ck_chot_danh_sach_phien_ban" CHECK ("phien_ban" >= 1),
  ADD CONSTRAINT "ck_chot_danh_sach_so_luong" CHECK (
    "tong_thuoc_dien" >= 0 AND "tong_co_mat" >= 0 AND "tong_vang_co_phep" >= 0 AND
    "tong_vang_khong_phep" >= 0 AND "tong_chua_diem_danh" >= 0 AND
    "tong_co_mat" + "tong_vang_co_phep" + "tong_vang_khong_phep" + "tong_chua_diem_danh" <= "tong_thuoc_dien"
  );

ALTER TABLE "lich_su_diem_danh"
  ADD CONSTRAINT "ck_lich_su_diem_danh_version" CHECK (
    ("version_truoc" IS NULL AND "version_sau" = 1) OR
    ("version_truoc" IS NOT NULL AND "version_sau" = "version_truoc" + 1)
  );
CREATE UNIQUE INDEX "uq_lich_su_diem_danh_yeu_cau"
  ON "lich_su_diem_danh" ("ma_yeu_cau") WHERE "ma_yeu_cau" IS NOT NULL;

ALTER TABLE "tep_dinh_kem_hoc_tap"
  ADD CONSTRAINT "ck_tep_dinh_kem_hoc_tap_chu_so_huu" CHECK (("ma_dot" IS NULL) <> ("ma_buoi" IS NULL)),
  ADD CONSTRAINT "ck_tep_dinh_kem_hoc_tap_kich_thuoc" CHECK ("kich_thuoc" > 0),
  ADD CONSTRAINT "ck_tep_dinh_kem_hoc_tap_xoa" CHECK (("trang_thai" = 'DANG_SU_DUNG' AND "ngay_xoa" IS NULL AND "ma_nguoi_xoa" IS NULL) OR ("trang_thai" = 'DA_XOA' AND "ngay_xoa" IS NOT NULL AND "ma_nguoi_xoa" IS NOT NULL));
