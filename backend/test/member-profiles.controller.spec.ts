import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { XacThucGuard } from '../src/modules/auth/auth.guard'
import { PERMISSION_METADATA } from '../src/modules/authorization/authorization.types'
import { HoSoDangVienController } from '../src/modules/member-profiles/member-profiles.controller'

describe('HoSoDangVienController', () => {
  it('keeps authentication on list routes and lets their services enforce the requested unit scopes', () => {
    const controller = HoSoDangVienController.prototype
    const guards = Reflect.getMetadata(GUARDS_METADATA, HoSoDangVienController) as unknown[]

    expect(guards).toContain(XacThucGuard)
    expect(Reflect.getMetadata(PERMISSION_METADATA, controller.danhSach)).toBeUndefined()
    expect(Reflect.getMetadata(PERMISSION_METADATA, controller.donVi)).toBeUndefined()
  })
})
