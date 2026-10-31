-- CreateEnum
CREATE TYPE "loai_don_vi" AS ENUM ('DANG_UY', 'CHI_BO', 'TO');

-- CreateEnum
CREATE TYPE "loai_pham_vi" AS ENUM ('CA_NHAN', 'CAY_DON_VI', 'DON_VI_CHI_DINH', 'TOAN_HE_THONG');

-- CreateEnum
CREATE TYPE "loai_dia_chi" AS ENUM ('NOI_SINH', 'QUE_QUAN', 'THUONG_TRU');

-- CreateEnum
CREATE TYPE "phan_loai_noi_sinh" AS ENUM ('TRONG_NUOC', 'NUOC_NGOAI');

-- CreateTable
CREATE TABLE "tai_khoan_nguoi_dung" (
    "ma_tai_khoan" UUID NOT NULL,
    "ten_dang_nhap" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254),
    "mat_khau_bam" TEXT NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL,
    "so_lan_dang_nhap_that_bai" INTEGER NOT NULL DEFAULT 0,
    "khoa_den" TIMESTAMPTZ(6),
    "doi_mat_khau_lan_dau" BOOLEAN NOT NULL DEFAULT true,
    "dang_nhap_cuoi_luc" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tai_khoan_nguoi_dung_pkey" PRIMARY KEY ("ma_tai_khoan")
);

-- CreateTable
CREATE TABLE "phien_dang_nhap" (
    "ma_phien" UUID NOT NULL,
    "ma_tai_khoan" UUID NOT NULL,
    "ma_lam_moi_bam" TEXT NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "het_han_luc" TIMESTAMPTZ(6) NOT NULL,
    "thu_hoi_luc" TIMESTAMPTZ(6),
    "dia_chi_ip" INET,
    "thiet_bi" TEXT,

    CONSTRAINT "phien_dang_nhap_pkey" PRIMARY KEY ("ma_phien")
);

-- CreateTable
CREATE TABLE "don_vi_to_chuc" (
    "ma_don_vi" UUID NOT NULL,
    "ma_dinh_danh" VARCHAR(50),
    "loai_don_vi" "loai_don_vi" NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "don_vi_to_chuc_pkey" PRIMARY KEY ("ma_don_vi")
);

-- CreateTable
CREATE TABLE "lich_su_ten_don_vi" (
    "ma_lich_su_ten" UUID NOT NULL,
    "ma_don_vi" UUID NOT NULL,
    "ten_don_vi" VARCHAR(200) NOT NULL,
    "ngay_hieu_luc_tu" DATE NOT NULL,
    "ngay_hieu_luc_den" DATE,
    "nguoi_ghi_nhan" UUID,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_ten_don_vi_pkey" PRIMARY KEY ("ma_lich_su_ten")
);

-- CreateTable
CREATE TABLE "lich_su_quan_he_don_vi" (
    "ma_lich_su_quan_he" UUID NOT NULL,
    "ma_don_vi_cha" UUID NOT NULL,
    "ma_don_vi_con" UUID NOT NULL,
    "ngay_hieu_luc_tu" DATE NOT NULL,
    "ngay_hieu_luc_den" DATE,
    "nguoi_ghi_nhan" UUID,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_quan_he_don_vi_pkey" PRIMARY KEY ("ma_lich_su_quan_he")
);

-- CreateTable
CREATE TABLE "ho_so_dang_vien" (
    "ma_ho_so" UUID NOT NULL,
    "ma_ho_so_noi_bo" VARCHAR(50) NOT NULL,
    "ho_va_ten" VARCHAR(200) NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ma_tai_khoan" UUID,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ho_so_dang_vien_pkey" PRIMARY KEY ("ma_ho_so")
);

-- CreateTable
CREATE TABLE "thong_tin_ca_nhan_dang_vien" (
    "ma_ho_so" UUID NOT NULL,
    "ngay_sinh" DATE,
    "gioi_tinh" VARCHAR(30),
    "so_cccd_ma_hoa" BYTEA,
    "ma_cccd_doi_chieu_bam" CHAR(64),
    "ngay_cap_cccd" DATE,
    "noi_cap_cccd" VARCHAR(250),
    "quoc_tich" VARCHAR(100),
    "dan_toc" VARCHAR(100),
    "ton_giao" VARCHAR(100),
    "so_dien_thoai" VARCHAR(30),
    "email_lien_he" VARCHAR(254),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_tin_ca_nhan_dang_vien_pkey" PRIMARY KEY ("ma_ho_so")
);

-- CreateTable
CREATE TABLE "dia_chi_dang_vien" (
    "ma_dia_chi" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "loai_dia_chi" "loai_dia_chi" NOT NULL,
    "phan_loai_noi_sinh" "phan_loai_noi_sinh",
    "quoc_gia" VARCHAR(100),
    "tinh_thanh_pho" VARCHAR(150),
    "quan_huyen" VARCHAR(150),
    "xa_phuong" VARCHAR(150),
    "dia_chi_chi_tiet" VARCHAR(500),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dia_chi_dang_vien_pkey" PRIMARY KEY ("ma_dia_chi")
);

-- CreateTable
CREATE TABLE "thong_tin_sinh_vien" (
    "ma_ho_so" UUID NOT NULL,
    "ma_sinh_vien" VARCHAR(50) NOT NULL,
    "trang_thai_hoc_tap" VARCHAR(50),
    "khoa_hoc" VARCHAR(50),
    "don_vi_phu_trach" VARCHAR(200),
    "chuong_trinh_dao_tao" VARCHAR(250),
    "nganh" VARCHAR(200),
    "chuyen_nganh" VARCHAR(200),
    "lop_hanh_chinh" VARCHAR(100),
    "ma_nguon_du_lieu" VARCHAR(80),
    "ma_ban_ghi_nguon" VARCHAR(120),
    "dong_bo_cuoi_luc" TIMESTAMPTZ(6),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thong_tin_sinh_vien_pkey" PRIMARY KEY ("ma_ho_so")
);

-- CreateTable
CREATE TABLE "qua_trinh_dang_vien" (
    "ma_qua_trinh" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "loai_su_kien" VARCHAR(50) NOT NULL,
    "ngay_su_kien" DATE NOT NULL,
    "so_quyet_dinh" VARCHAR(100),
    "ngay_quyet_dinh" DATE,
    "noi_dung" TEXT,
    "nguoi_ghi_nhan" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qua_trinh_dang_vien_pkey" PRIMARY KEY ("ma_qua_trinh")
);

-- CreateTable
CREATE TABLE "lich_su_don_vi_dang_vien" (
    "ma_lich_su" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "ma_chi_bo" UUID NOT NULL,
    "ma_to" UUID,
    "ngay_hieu_luc_tu" DATE NOT NULL,
    "ngay_hieu_luc_den" DATE,
    "ly_do_chuyen" TEXT,
    "nguoi_ghi_nhan" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_don_vi_dang_vien_pkey" PRIMARY KEY ("ma_lich_su")
);

-- CreateTable
CREATE TABLE "danh_muc_chuc_vu" (
    "ma_chuc_vu" UUID NOT NULL,
    "ma_chuc_vu_noi_bo" VARCHAR(50),
    "ten_chuc_vu" VARCHAR(200) NOT NULL,
    "mo_ta" TEXT,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "danh_muc_chuc_vu_pkey" PRIMARY KEY ("ma_chuc_vu")
);

-- CreateTable
CREATE TABLE "nhiem_ky" (
    "ma_nhiem_ky" UUID NOT NULL,
    "ma_don_vi" UUID NOT NULL,
    "ten_nhiem_ky" VARCHAR(150) NOT NULL,
    "ngay_bat_dau" DATE NOT NULL,
    "ngay_ket_thuc" DATE NOT NULL,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhiem_ky_pkey" PRIMARY KEY ("ma_nhiem_ky")
);

-- CreateTable
CREATE TABLE "phan_cong_chuc_vu" (
    "ma_phan_cong" UUID NOT NULL,
    "ma_ho_so" UUID NOT NULL,
    "ma_chuc_vu" UUID NOT NULL,
    "ma_don_vi" UUID NOT NULL,
    "ma_nhiem_ky" UUID,
    "ngay_hieu_luc_tu" DATE NOT NULL,
    "ngay_hieu_luc_den" DATE,
    "so_quyet_dinh" VARCHAR(100),
    "ghi_chu" TEXT,
    "nguoi_ghi_nhan" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phan_cong_chuc_vu_pkey" PRIMARY KEY ("ma_phan_cong")
);

-- CreateTable
CREATE TABLE "vai_tro" (
    "ma_vai_tro" UUID NOT NULL,
    "ma_vai_tro_noi_bo" VARCHAR(80) NOT NULL,
    "ten_vai_tro" VARCHAR(150) NOT NULL,
    "mo_ta" TEXT,
    "la_vai_tro_he_thong" BOOLEAN NOT NULL DEFAULT false,
    "trang_thai" VARCHAR(30) NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vai_tro_pkey" PRIMARY KEY ("ma_vai_tro")
);

-- CreateTable
CREATE TABLE "quyen" (
    "ma_quyen" UUID NOT NULL,
    "ma_quyen_noi_bo" VARCHAR(120) NOT NULL,
    "ten_quyen" VARCHAR(150) NOT NULL,
    "mo_ta" TEXT,
    "phan_loai_du_lieu" VARCHAR(50),
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quyen_pkey" PRIMARY KEY ("ma_quyen")
);

-- CreateTable
CREATE TABLE "vai_tro_quyen" (
    "ma_vai_tro" UUID NOT NULL,
    "ma_quyen" UUID NOT NULL,
    "nguoi_ghi_nhan" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_vai_tro_quyen" PRIMARY KEY ("ma_vai_tro","ma_quyen")
);

-- CreateTable
CREATE TABLE "phan_cong_vai_tro" (
    "ma_phan_cong" UUID NOT NULL,
    "ma_tai_khoan" UUID NOT NULL,
    "ma_vai_tro" UUID NOT NULL,
    "loai_pham_vi" "loai_pham_vi" NOT NULL,
    "ma_don_vi_goc" UUID,
    "ngay_hieu_luc_tu" TIMESTAMPTZ(6) NOT NULL,
    "ngay_hieu_luc_den" TIMESTAMPTZ(6),
    "nguoi_cap" UUID NOT NULL,
    "nguoi_thu_hoi" UUID,
    "ngay_thu_hoi" TIMESTAMPTZ(6),
    "ly_do" TEXT,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phan_cong_vai_tro_pkey" PRIMARY KEY ("ma_phan_cong")
);

-- CreateTable
CREATE TABLE "pham_vi_don_vi" (
    "ma_phan_cong" UUID NOT NULL,
    "ma_don_vi" UUID NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pham_vi_don_vi" PRIMARY KEY ("ma_phan_cong","ma_don_vi")
);

-- CreateTable
CREATE TABLE "nhat_ky_kiem_toan" (
    "ma_nhat_ky" UUID NOT NULL,
    "ma_nguoi_thuc_hien" UUID,
    "hanh_dong" VARCHAR(120) NOT NULL,
    "loai_doi_tuong" VARCHAR(120) NOT NULL,
    "ma_doi_tuong" UUID,
    "ket_qua" VARCHAR(30) NOT NULL,
    "ly_do" TEXT,
    "du_lieu_truoc" JSONB,
    "du_lieu_sau" JSONB,
    "ma_tuong_quan" VARCHAR(80) NOT NULL,
    "dia_chi_ip" INET,
    "thoi_diem" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhat_ky_kiem_toan_pkey" PRIMARY KEY ("ma_nhat_ky")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_tai_khoan_ten_dang_nhap" ON "tai_khoan_nguoi_dung"("ten_dang_nhap");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tai_khoan_email" ON "tai_khoan_nguoi_dung"("email");

-- CreateIndex
CREATE INDEX "ix_tai_khoan_trang_thai" ON "tai_khoan_nguoi_dung"("trang_thai");

-- CreateIndex
CREATE INDEX "ix_phien_tai_khoan_het_han" ON "phien_dang_nhap"("ma_tai_khoan", "het_han_luc");

-- CreateIndex
CREATE INDEX "ix_phien_tai_khoan_thu_hoi" ON "phien_dang_nhap"("ma_tai_khoan", "thu_hoi_luc");

-- CreateIndex
CREATE UNIQUE INDEX "uq_don_vi_ma_dinh_danh" ON "don_vi_to_chuc"("ma_dinh_danh");

-- CreateIndex
CREATE INDEX "ix_don_vi_loai_trang_thai" ON "don_vi_to_chuc"("loai_don_vi", "trang_thai");

-- CreateIndex
CREATE INDEX "ix_lich_su_ten_don_vi_thoi_diem" ON "lich_su_ten_don_vi"("ma_don_vi", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE INDEX "ix_quan_he_don_vi_cha_thoi_diem" ON "lich_su_quan_he_don_vi"("ma_don_vi_cha", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE INDEX "ix_quan_he_don_vi_con_thoi_diem" ON "lich_su_quan_he_don_vi"("ma_don_vi_con", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ho_so_ma_noi_bo" ON "ho_so_dang_vien"("ma_ho_so_noi_bo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ho_so_tai_khoan" ON "ho_so_dang_vien"("ma_tai_khoan");

-- CreateIndex
CREATE INDEX "ix_ho_so_trang_thai" ON "ho_so_dang_vien"("trang_thai");

-- CreateIndex
CREATE INDEX "ix_ho_so_ho_va_ten" ON "ho_so_dang_vien"("ho_va_ten");

-- CreateIndex
CREATE INDEX "ix_dia_chi_ho_so" ON "dia_chi_dang_vien"("ma_ho_so");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dia_chi_ho_so_loai" ON "dia_chi_dang_vien"("ma_ho_so", "loai_dia_chi");

-- CreateIndex
CREATE UNIQUE INDEX "uq_thong_tin_sinh_vien_ma_sinh_vien" ON "thong_tin_sinh_vien"("ma_sinh_vien");

-- CreateIndex
CREATE INDEX "ix_sinh_vien_khoa_hoc" ON "thong_tin_sinh_vien"("khoa_hoc");

-- CreateIndex
CREATE INDEX "ix_sinh_vien_lop_hanh_chinh" ON "thong_tin_sinh_vien"("lop_hanh_chinh");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sinh_vien_nguon_ban_ghi" ON "thong_tin_sinh_vien"("ma_nguon_du_lieu", "ma_ban_ghi_nguon");

-- CreateIndex
CREATE INDEX "ix_qua_trinh_dang_vien_ho_so_ngay" ON "qua_trinh_dang_vien"("ma_ho_so", "ngay_su_kien");

-- CreateIndex
CREATE INDEX "ix_lich_su_sinh_hoat_ho_so_thoi_diem" ON "lich_su_don_vi_dang_vien"("ma_ho_so", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE INDEX "ix_lich_su_sinh_hoat_chi_bo_thoi_diem" ON "lich_su_don_vi_dang_vien"("ma_chi_bo", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE UNIQUE INDEX "uq_chuc_vu_ma_noi_bo" ON "danh_muc_chuc_vu"("ma_chuc_vu_noi_bo");

-- CreateIndex
CREATE INDEX "ix_danh_muc_chuc_vu_trang_thai" ON "danh_muc_chuc_vu"("trang_thai");

-- CreateIndex
CREATE INDEX "ix_nhiem_ky_don_vi_thoi_gian" ON "nhiem_ky"("ma_don_vi", "ngay_bat_dau", "ngay_ket_thuc");

-- CreateIndex
CREATE INDEX "ix_phan_cong_chuc_vu_ho_so_thoi_gian" ON "phan_cong_chuc_vu"("ma_ho_so", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE INDEX "ix_phan_cong_chuc_vu_don_vi_thoi_gian" ON "phan_cong_chuc_vu"("ma_don_vi", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE INDEX "ix_phan_cong_chuc_vu_chuc_vu_thoi_gian" ON "phan_cong_chuc_vu"("ma_chuc_vu", "ngay_hieu_luc_tu");

-- CreateIndex
CREATE UNIQUE INDEX "uq_vai_tro_ma_noi_bo" ON "vai_tro"("ma_vai_tro_noi_bo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_quyen_ma_noi_bo" ON "quyen"("ma_quyen_noi_bo");

-- CreateIndex
CREATE INDEX "ix_vai_tro_quyen_quyen" ON "vai_tro_quyen"("ma_quyen");

-- CreateIndex
CREATE INDEX "ix_phan_cong_vai_tro_tai_khoan_thoi_gian" ON "phan_cong_vai_tro"("ma_tai_khoan", "ngay_hieu_luc_tu", "ngay_hieu_luc_den");

-- CreateIndex
CREATE INDEX "ix_phan_cong_vai_tro_vai_tro" ON "phan_cong_vai_tro"("ma_vai_tro");

-- CreateIndex
CREATE INDEX "ix_phan_cong_vai_tro_don_vi_goc" ON "phan_cong_vai_tro"("ma_don_vi_goc");

-- CreateIndex
CREATE INDEX "ix_pham_vi_don_vi_don_vi" ON "pham_vi_don_vi"("ma_don_vi");

-- CreateIndex
CREATE INDEX "ix_nhat_ky_nguoi_thuc_hien_thoi_diem" ON "nhat_ky_kiem_toan"("ma_nguoi_thuc_hien", "thoi_diem");

-- CreateIndex
CREATE INDEX "ix_nhat_ky_doi_tuong_thoi_diem" ON "nhat_ky_kiem_toan"("loai_doi_tuong", "ma_doi_tuong", "thoi_diem");

-- CreateIndex
CREATE INDEX "ix_nhat_ky_ma_tuong_quan" ON "nhat_ky_kiem_toan"("ma_tuong_quan");

-- AddForeignKey
ALTER TABLE "phien_dang_nhap" ADD CONSTRAINT "phien_dang_nhap_ma_tai_khoan_fkey" FOREIGN KEY ("ma_tai_khoan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_ten_don_vi" ADD CONSTRAINT "lich_su_ten_don_vi_ma_don_vi_fkey" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_ten_don_vi" ADD CONSTRAINT "lich_su_ten_don_vi_nguoi_ghi_nhan_fkey" FOREIGN KEY ("nguoi_ghi_nhan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quan_he_don_vi" ADD CONSTRAINT "lich_su_quan_he_don_vi_ma_don_vi_cha_fkey" FOREIGN KEY ("ma_don_vi_cha") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quan_he_don_vi" ADD CONSTRAINT "lich_su_quan_he_don_vi_ma_don_vi_con_fkey" FOREIGN KEY ("ma_don_vi_con") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quan_he_don_vi" ADD CONSTRAINT "lich_su_quan_he_don_vi_nguoi_ghi_nhan_fkey" FOREIGN KEY ("nguoi_ghi_nhan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_dang_vien" ADD CONSTRAINT "ho_so_dang_vien_ma_tai_khoan_fkey" FOREIGN KEY ("ma_tai_khoan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thong_tin_ca_nhan_dang_vien" ADD CONSTRAINT "thong_tin_ca_nhan_dang_vien_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dia_chi_dang_vien" ADD CONSTRAINT "dia_chi_dang_vien_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thong_tin_sinh_vien" ADD CONSTRAINT "thong_tin_sinh_vien_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qua_trinh_dang_vien" ADD CONSTRAINT "qua_trinh_dang_vien_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qua_trinh_dang_vien" ADD CONSTRAINT "qua_trinh_dang_vien_nguoi_ghi_nhan_fkey" FOREIGN KEY ("nguoi_ghi_nhan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_don_vi_dang_vien" ADD CONSTRAINT "lich_su_don_vi_dang_vien_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_don_vi_dang_vien" ADD CONSTRAINT "lich_su_don_vi_dang_vien_ma_chi_bo_fkey" FOREIGN KEY ("ma_chi_bo") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_don_vi_dang_vien" ADD CONSTRAINT "lich_su_don_vi_dang_vien_ma_to_fkey" FOREIGN KEY ("ma_to") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_don_vi_dang_vien" ADD CONSTRAINT "lich_su_don_vi_dang_vien_nguoi_ghi_nhan_fkey" FOREIGN KEY ("nguoi_ghi_nhan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhiem_ky" ADD CONSTRAINT "nhiem_ky_ma_don_vi_fkey" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_chuc_vu" ADD CONSTRAINT "phan_cong_chuc_vu_ma_ho_so_fkey" FOREIGN KEY ("ma_ho_so") REFERENCES "ho_so_dang_vien"("ma_ho_so") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_chuc_vu" ADD CONSTRAINT "phan_cong_chuc_vu_ma_chuc_vu_fkey" FOREIGN KEY ("ma_chuc_vu") REFERENCES "danh_muc_chuc_vu"("ma_chuc_vu") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_chuc_vu" ADD CONSTRAINT "phan_cong_chuc_vu_ma_don_vi_fkey" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_chuc_vu" ADD CONSTRAINT "phan_cong_chuc_vu_ma_nhiem_ky_fkey" FOREIGN KEY ("ma_nhiem_ky") REFERENCES "nhiem_ky"("ma_nhiem_ky") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_chuc_vu" ADD CONSTRAINT "phan_cong_chuc_vu_nguoi_ghi_nhan_fkey" FOREIGN KEY ("nguoi_ghi_nhan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_quyen" ADD CONSTRAINT "vai_tro_quyen_ma_vai_tro_fkey" FOREIGN KEY ("ma_vai_tro") REFERENCES "vai_tro"("ma_vai_tro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_quyen" ADD CONSTRAINT "vai_tro_quyen_ma_quyen_fkey" FOREIGN KEY ("ma_quyen") REFERENCES "quyen"("ma_quyen") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vai_tro_quyen" ADD CONSTRAINT "vai_tro_quyen_nguoi_ghi_nhan_fkey" FOREIGN KEY ("nguoi_ghi_nhan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_vai_tro" ADD CONSTRAINT "phan_cong_vai_tro_ma_tai_khoan_fkey" FOREIGN KEY ("ma_tai_khoan") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_vai_tro" ADD CONSTRAINT "phan_cong_vai_tro_ma_vai_tro_fkey" FOREIGN KEY ("ma_vai_tro") REFERENCES "vai_tro"("ma_vai_tro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_vai_tro" ADD CONSTRAINT "phan_cong_vai_tro_ma_don_vi_goc_fkey" FOREIGN KEY ("ma_don_vi_goc") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_vai_tro" ADD CONSTRAINT "phan_cong_vai_tro_nguoi_cap_fkey" FOREIGN KEY ("nguoi_cap") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phan_cong_vai_tro" ADD CONSTRAINT "phan_cong_vai_tro_nguoi_thu_hoi_fkey" FOREIGN KEY ("nguoi_thu_hoi") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_don_vi" ADD CONSTRAINT "pham_vi_don_vi_ma_phan_cong_fkey" FOREIGN KEY ("ma_phan_cong") REFERENCES "phan_cong_vai_tro"("ma_phan_cong") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pham_vi_don_vi" ADD CONSTRAINT "pham_vi_don_vi_ma_don_vi_fkey" FOREIGN KEY ("ma_don_vi") REFERENCES "don_vi_to_chuc"("ma_don_vi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhat_ky_kiem_toan" ADD CONSTRAINT "nhat_ky_kiem_toan_ma_nguoi_thuc_hien_fkey" FOREIGN KEY ("ma_nguoi_thuc_hien") REFERENCES "tai_khoan_nguoi_dung"("ma_tai_khoan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional integrity rules which Prisma schema cannot express declaratively.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "tai_khoan_nguoi_dung"
  ADD CONSTRAINT "ck_tai_khoan_so_lan_dang_nhap_khong_am"
  CHECK ("so_lan_dang_nhap_that_bai" >= 0);

ALTER TABLE "phien_dang_nhap"
  ADD CONSTRAINT "ck_phien_dang_nhap_thoi_han_hop_le"
  CHECK ("het_han_luc" > "ngay_tao");

ALTER TABLE "don_vi_to_chuc"
  ADD CONSTRAINT "ck_don_vi_ma_khong_rong"
  CHECK ("ma_dinh_danh" IS NULL OR length(btrim("ma_dinh_danh")) > 0);

CREATE UNIQUE INDEX "uq_don_vi_goc_dang_hoat_dong"
  ON "don_vi_to_chuc" ("loai_don_vi")
  WHERE "loai_don_vi" = 'DANG_UY' AND "trang_thai" = 'DANG_HOAT_DONG';

ALTER TABLE "lich_su_ten_don_vi"
  ADD CONSTRAINT "ck_lich_su_ten_don_vi_khoang_ngay_hop_le"
  CHECK ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" >= "ngay_hieu_luc_tu");

CREATE UNIQUE INDEX "uq_lich_su_ten_don_vi_hien_hanh"
  ON "lich_su_ten_don_vi" ("ma_don_vi") WHERE "ngay_hieu_luc_den" IS NULL;

ALTER TABLE "lich_su_ten_don_vi"
  ADD CONSTRAINT "ex_lich_su_ten_don_vi_khong_chong_lan"
  EXCLUDE USING gist (
    "ma_don_vi" WITH =,
    daterange("ngay_hieu_luc_tu", "ngay_hieu_luc_den", '[]') WITH &&
  );

ALTER TABLE "lich_su_quan_he_don_vi"
  ADD CONSTRAINT "ck_lich_su_quan_he_don_vi_khoang_ngay_hop_le"
  CHECK ("ma_don_vi_cha" <> "ma_don_vi_con" AND ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" >= "ngay_hieu_luc_tu"));

CREATE UNIQUE INDEX "uq_quan_he_don_vi_cha_hien_hanh"
  ON "lich_su_quan_he_don_vi" ("ma_don_vi_con") WHERE "ngay_hieu_luc_den" IS NULL;

ALTER TABLE "lich_su_quan_he_don_vi"
  ADD CONSTRAINT "ex_lich_su_quan_he_don_vi_khong_chong_lan"
  EXCLUDE USING gist (
    "ma_don_vi_con" WITH =,
    daterange("ngay_hieu_luc_tu", "ngay_hieu_luc_den", '[]') WITH &&
  );

CREATE FUNCTION "kiem_tra_cap_don_vi"() RETURNS trigger AS $$
DECLARE
  "loai_cha" "loai_don_vi";
  "loai_con" "loai_don_vi";
BEGIN
  SELECT "loai_don_vi" INTO "loai_cha" FROM "don_vi_to_chuc" WHERE "ma_don_vi" = NEW."ma_don_vi_cha";
  SELECT "loai_don_vi" INTO "loai_con" FROM "don_vi_to_chuc" WHERE "ma_don_vi" = NEW."ma_don_vi_con";

  IF "loai_cha" IS NULL OR "loai_con" IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy đơn vị cha hoặc con';
  END IF;
  IF "loai_cha" = 'DANG_UY' AND "loai_con" = 'CHI_BO' THEN
    RETURN NEW;
  END IF;
  IF "loai_cha" = 'CHI_BO' AND "loai_con" = 'TO' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Quan hệ cha-con không đúng tầng tổ chức';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_kiem_tra_cap_don_vi"
  BEFORE INSERT OR UPDATE OF "ma_don_vi_cha", "ma_don_vi_con"
  ON "lich_su_quan_he_don_vi"
  FOR EACH ROW EXECUTE FUNCTION "kiem_tra_cap_don_vi"();

CREATE FUNCTION "chan_doi_loai_don_vi"() RETURNS trigger AS $$
BEGIN
  IF OLD."loai_don_vi" IS DISTINCT FROM NEW."loai_don_vi" THEN
    RAISE EXCEPTION 'Không được đổi loại đơn vị sau khi tạo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_chan_doi_loai_don_vi"
  BEFORE UPDATE OF "loai_don_vi" ON "don_vi_to_chuc"
  FOR EACH ROW EXECUTE FUNCTION "chan_doi_loai_don_vi"();

ALTER TABLE "thong_tin_ca_nhan_dang_vien"
  ADD CONSTRAINT "ck_cccd_gia_tri_va_ma_doi_chieu_di_cung_nhau"
  CHECK (("so_cccd_ma_hoa" IS NULL) = ("ma_cccd_doi_chieu_bam" IS NULL));

CREATE INDEX "ix_thong_tin_ca_nhan_cccd_doi_chieu"
  ON "thong_tin_ca_nhan_dang_vien" ("ma_cccd_doi_chieu_bam");

ALTER TABLE "dia_chi_dang_vien"
  ADD CONSTRAINT "ck_phan_loai_noi_sinh_chi_dung_cho_noi_sinh"
  CHECK ("phan_loai_noi_sinh" IS NULL OR "loai_dia_chi" = 'NOI_SINH');

ALTER TABLE "lich_su_don_vi_dang_vien"
  ADD CONSTRAINT "ck_lich_su_sinh_hoat_khoang_ngay_hop_le"
  CHECK ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" >= "ngay_hieu_luc_tu");

CREATE UNIQUE INDEX "uq_lich_su_sinh_hoat_hien_hanh"
  ON "lich_su_don_vi_dang_vien" ("ma_ho_so") WHERE "ngay_hieu_luc_den" IS NULL;

ALTER TABLE "lich_su_don_vi_dang_vien"
  ADD CONSTRAINT "ex_lich_su_sinh_hoat_khong_chong_lan"
  EXCLUDE USING gist (
    "ma_ho_so" WITH =,
    daterange("ngay_hieu_luc_tu", "ngay_hieu_luc_den", '[]') WITH &&
  );

CREATE FUNCTION "kiem_tra_don_vi_sinh_hoat"() RETURNS trigger AS $$
DECLARE
  "loai_chi_bo" "loai_don_vi";
  "loai_to" "loai_don_vi";
BEGIN
  SELECT "loai_don_vi" INTO "loai_chi_bo" FROM "don_vi_to_chuc" WHERE "ma_don_vi" = NEW."ma_chi_bo";
  IF "loai_chi_bo" IS DISTINCT FROM 'CHI_BO' THEN
    RAISE EXCEPTION 'Đơn vị sinh hoạt chính phải là Chi bộ';
  END IF;

  IF NEW."ma_to" IS NOT NULL THEN
    SELECT "loai_don_vi" INTO "loai_to" FROM "don_vi_to_chuc" WHERE "ma_don_vi" = NEW."ma_to";
    IF "loai_to" IS DISTINCT FROM 'TO' THEN
      RAISE EXCEPTION 'Đơn vị con phải là Tổ';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM "lich_su_quan_he_don_vi" AS q
      WHERE q."ma_don_vi_cha" = NEW."ma_chi_bo"
        AND q."ma_don_vi_con" = NEW."ma_to"
        AND q."ngay_hieu_luc_tu" <= NEW."ngay_hieu_luc_tu"
        AND (q."ngay_hieu_luc_den" IS NULL OR (NEW."ngay_hieu_luc_den" IS NOT NULL AND q."ngay_hieu_luc_den" >= NEW."ngay_hieu_luc_den"))
    ) THEN
      RAISE EXCEPTION 'Tổ không trực thuộc Chi bộ trong toàn khoảng sinh hoạt';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_kiem_tra_don_vi_sinh_hoat"
  BEFORE INSERT OR UPDATE OF "ma_chi_bo", "ma_to", "ngay_hieu_luc_tu", "ngay_hieu_luc_den"
  ON "lich_su_don_vi_dang_vien"
  FOR EACH ROW EXECUTE FUNCTION "kiem_tra_don_vi_sinh_hoat"();

ALTER TABLE "danh_muc_chuc_vu"
  ADD CONSTRAINT "ck_ten_chuc_vu_khong_rong"
  CHECK (length(btrim("ten_chuc_vu")) > 0);

ALTER TABLE "nhiem_ky"
  ADD CONSTRAINT "ck_nhiem_ky_khoang_ngay_hop_le"
  CHECK ("ngay_ket_thuc" >= "ngay_bat_dau");

ALTER TABLE "phan_cong_chuc_vu"
  ADD CONSTRAINT "ck_phan_cong_chuc_vu_khoang_ngay_hop_le"
  CHECK ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" >= "ngay_hieu_luc_tu");

CREATE FUNCTION "kiem_tra_phan_cong_theo_nhiem_ky"() RETURNS trigger AS $$
DECLARE
  "ma_don_vi_nhiem_ky" UUID;
  "ngay_bat_dau_nhiem_ky" DATE;
  "ngay_ket_thuc_nhiem_ky" DATE;
BEGIN
  IF NEW."ma_nhiem_ky" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "ma_don_vi", "ngay_bat_dau", "ngay_ket_thuc"
    INTO "ma_don_vi_nhiem_ky", "ngay_bat_dau_nhiem_ky", "ngay_ket_thuc_nhiem_ky"
    FROM "nhiem_ky" WHERE "ma_nhiem_ky" = NEW."ma_nhiem_ky";

  IF "ma_don_vi_nhiem_ky" IS NULL
    OR "ma_don_vi_nhiem_ky" <> NEW."ma_don_vi"
    OR NEW."ngay_hieu_luc_tu" < "ngay_bat_dau_nhiem_ky"
    OR NEW."ngay_hieu_luc_den" IS NULL
    OR NEW."ngay_hieu_luc_den" > "ngay_ket_thuc_nhiem_ky" THEN
    RAISE EXCEPTION 'Phân công chức vụ không khớp đơn vị hoặc thời gian nhiệm kỳ';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_kiem_tra_phan_cong_theo_nhiem_ky"
  BEFORE INSERT OR UPDATE OF "ma_don_vi", "ma_nhiem_ky", "ngay_hieu_luc_tu", "ngay_hieu_luc_den"
  ON "phan_cong_chuc_vu"
  FOR EACH ROW EXECUTE FUNCTION "kiem_tra_phan_cong_theo_nhiem_ky"();

CREATE FUNCTION "chan_thay_doi_nhiem_ky_vo_hieu"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "phan_cong_chuc_vu" AS p
    WHERE p."ma_nhiem_ky" = NEW."ma_nhiem_ky"
      AND (p."ma_don_vi" <> NEW."ma_don_vi"
        OR p."ngay_hieu_luc_tu" < NEW."ngay_bat_dau"
        OR p."ngay_hieu_luc_den" IS NULL
        OR p."ngay_hieu_luc_den" > NEW."ngay_ket_thuc")
  ) THEN
    RAISE EXCEPTION 'Thay đổi nhiệm kỳ làm mất hiệu lực phân công hiện có';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_chan_thay_doi_nhiem_ky_vo_hieu"
  BEFORE UPDATE OF "ma_don_vi", "ngay_bat_dau", "ngay_ket_thuc"
  ON "nhiem_ky"
  FOR EACH ROW EXECUTE FUNCTION "chan_thay_doi_nhiem_ky_vo_hieu"();

ALTER TABLE "phan_cong_vai_tro"
  ADD CONSTRAINT "ck_phan_cong_vai_tro_pham_vi"
  CHECK (
    ("loai_pham_vi" IN ('CA_NHAN', 'TOAN_HE_THONG') AND "ma_don_vi_goc" IS NULL)
    OR ("loai_pham_vi" = 'CAY_DON_VI' AND "ma_don_vi_goc" IS NOT NULL)
    OR ("loai_pham_vi" = 'DON_VI_CHI_DINH' AND "ma_don_vi_goc" IS NULL)
  );

ALTER TABLE "phan_cong_vai_tro"
  ADD CONSTRAINT "ck_phan_cong_vai_tro_thoi_gian_hop_le"
  CHECK ("ngay_hieu_luc_den" IS NULL OR "ngay_hieu_luc_den" > "ngay_hieu_luc_tu");

ALTER TABLE "phan_cong_vai_tro"
  ADD CONSTRAINT "ck_phan_cong_vai_tro_thu_hoi_di_cung_nhau"
  CHECK (("nguoi_thu_hoi" IS NULL) = ("ngay_thu_hoi" IS NULL));

ALTER TABLE "nhat_ky_kiem_toan"
  ADD CONSTRAINT "ck_nhat_ky_ma_tuong_quan_khong_rong"
  CHECK (length(btrim("ma_tuong_quan")) > 0);
