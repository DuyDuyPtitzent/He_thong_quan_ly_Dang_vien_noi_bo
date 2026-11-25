import { Module } from '@nestjs/common'
import { CauHinhModule } from './common/config/config.module'
import { CoSoDuLieuModule } from './infrastructure/database/database.module'
import { XacThucModule } from './modules/auth/auth.module'
import { PhanQuyenModule } from './modules/authorization/authorization.module'
import { ToChucModule } from './modules/organizations/organizations.module'
import { SucKhoeModule } from './modules/health/health.module'
import { TaiKhoanModule } from './modules/accounts/accounts.module'
import { HoSoDangVienModule } from './modules/member-profiles/member-profiles.module'
import { NamHocModule } from './modules/school-years/school-years.module'
import { NhatKyHeThongModule } from './modules/system-logs/system-logs.module'
import { HocTapNghiQuyetModule } from './modules/resolution-learning/learning.module'
import { DanhMucNghiepVuModule } from './modules/system-settings/business-catalogs.module'

@Module({
  imports: [CauHinhModule, CoSoDuLieuModule, XacThucModule, PhanQuyenModule, ToChucModule, TaiKhoanModule, HoSoDangVienModule, NamHocModule, NhatKyHeThongModule, SucKhoeModule, DanhMucNghiepVuModule, HocTapNghiQuyetModule],
})
export class UngDungModule {}
