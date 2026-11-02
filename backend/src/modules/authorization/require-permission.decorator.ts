import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { XacThucGuard } from '../auth/auth.guard'
import { PhanQuyenGuard } from './authorization.guard'
import type { MaPermission } from './permission-catalog'
import { PERMISSION_METADATA } from './authorization.types'

/** Protect a route with a system-defined Permission code. */
export const RequirePermission = (maQuyen: MaPermission) =>
  applyDecorators(
    SetMetadata(PERMISSION_METADATA, maQuyen),
    UseGuards(XacThucGuard, PhanQuyenGuard),
  )
