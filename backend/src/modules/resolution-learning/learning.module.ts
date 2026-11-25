import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { PhanQuyenModule } from '../authorization/authorization.module'
import { DanhMucNghiepVuModule } from '../system-settings/business-catalogs.module'
import { DotHocNghiQuyetController } from './learning.controller'
import { HocTapNghiQuyetService } from './learning.service'
import { CongKhaiDiemDanhController, VanHanhDiemDanhController } from './attendance.controller'
import { VanHanhDiemDanhService } from './attendance-operations.service'
import { BaoMatDiemDanhService } from './attendance-security.service'
import { GioiHanDiemDanhCongKhaiMiddleware } from './attendance-rate-limit.middleware'
import { XuLyYeuCauDiemDanhService } from './attendance-requests.service'
import { DiemDanhThuCongService } from './attendance-manual.service'
import { ChotDiemDanhService } from './attendance-finalization.service'
import { ThongKeHocTapNghiQuyetController } from './statistics.controller'
import { ThongKeHocTapNghiQuyetService } from './statistics.service'
import { HocTapCaNhanController } from './personal-learning.controller'
import { HocTapCaNhanService } from './personal-learning.service'
import { DataTransferModule } from '../data-transfer/data-transfer.module'
import { XuatKetQuaDiemDanhController } from './attendance-export.controller'
import { XuatKetQuaDiemDanhService } from './attendance-export.service'
import { TepDinhKemHocTapController } from './learning-files.controller'
import { TepDinhKemHocTapService } from './learning-files.service'
import { PrivateStorageModule } from '../../common/private-storage/private-storage.module'

@Module({ imports: [PhanQuyenModule, DanhMucNghiepVuModule, DataTransferModule, PrivateStorageModule], controllers: [DotHocNghiQuyetController, VanHanhDiemDanhController, CongKhaiDiemDanhController, ThongKeHocTapNghiQuyetController, HocTapCaNhanController, XuatKetQuaDiemDanhController, TepDinhKemHocTapController], providers: [HocTapNghiQuyetService, VanHanhDiemDanhService, XuLyYeuCauDiemDanhService, DiemDanhThuCongService, ChotDiemDanhService, ThongKeHocTapNghiQuyetService, HocTapCaNhanService, XuatKetQuaDiemDanhService, TepDinhKemHocTapService, BaoMatDiemDanhService, GioiHanDiemDanhCongKhaiMiddleware] })
export class HocTapNghiQuyetModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GioiHanDiemDanhCongKhaiMiddleware).forRoutes(CongKhaiDiemDanhController)
  }
}
