-- Persist planned attendance configuration separately from an operational attendance window.
CREATE TABLE "cau_hinh_diem_danh_buoi_hoc" (
    "ma_buoi" UUID NOT NULL,
    "cho_phep_truc_tuyen" BOOLEAN NOT NULL DEFAULT true,
    "cho_phep_qr" BOOLEAN NOT NULL DEFAULT true,
    "cho_phep_bieu_mau" BOOLEAN NOT NULL DEFAULT true,
    "cho_phep_khong_dang_nhap" BOOLEAN NOT NULL DEFAULT true,
    "chu_ky_qr_giay" INTEGER NOT NULL DEFAULT 15,
    "mo_theo_ke_hoach_luc" TIMESTAMPTZ(6) NOT NULL,
    "dong_theo_ke_hoach_luc" TIMESTAMPTZ(6) NOT NULL,
    "ngay_tao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_cap_nhat" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_cau_hinh_diem_danh_buoi_hoc" PRIMARY KEY ("ma_buoi"),
    CONSTRAINT "ck_cau_hinh_diem_danh_chu_ky_qr" CHECK ("chu_ky_qr_giay" IN (15, 30, 60)),
    CONSTRAINT "ck_cau_hinh_diem_danh_khoang_mo" CHECK ("mo_theo_ke_hoach_luc" < "dong_theo_ke_hoach_luc"),
    CONSTRAINT "fk_cau_hinh_diem_danh_buoi" FOREIGN KEY ("ma_buoi") REFERENCES "buoi_hoc_nghi_quyet"("ma_buoi") ON DELETE RESTRICT ON UPDATE CASCADE
);
