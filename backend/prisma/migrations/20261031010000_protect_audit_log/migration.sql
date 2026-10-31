CREATE FUNCTION "chan_sua_xoa_nhat_ky_kiem_toan"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Nhật ký kiểm toán chỉ được ghi thêm';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_nhat_ky_kiem_toan_chi_ghi_them"
  BEFORE UPDATE OR DELETE ON "nhat_ky_kiem_toan"
  FOR EACH ROW EXECUTE FUNCTION "chan_sua_xoa_nhat_ky_kiem_toan"();
