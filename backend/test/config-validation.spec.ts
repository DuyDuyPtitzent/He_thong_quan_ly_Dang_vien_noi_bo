import { describe, expect, it } from 'vitest'
import { kiemTraCauHinh } from '../src/common/config/validate-config'

describe('kiemTraCauHinh', () => {
  it('chấp nhận cấu hình PostgreSQL và điền giá trị mặc định', () => {
    const cauHinh = kiemTraCauHinh({
      KET_NOI_CO_SO_DU_LIEU:
        'postgresql://ptit_dev:mat_khau@127.0.0.1:5432/quan_ly_dang_vien?schema=public',
    })

    expect(cauHinh['MOI_TRUONG']).toBe('PHAT_TRIEN')
    expect(cauHinh['CONG_MAY_CHU']).toBe(3001)
    expect(cauHinh['DIA_CHI_MAY_CHU']).toBe('127.0.0.1')
  })

  it('từ chối thiếu chuỗi kết nối và chỉ nêu tên biến, không lộ giá trị', () => {
    expect(() => kiemTraCauHinh({}))
      .toThrow('KET_NOI_CO_SO_DU_LIEU')
  })

  it('từ chối cổng ngoài phạm vi', () => {
    expect(() =>
      kiemTraCauHinh({
        KET_NOI_CO_SO_DU_LIEU: 'postgresql://ptit_dev:mat_khau@127.0.0.1:5432/quan_ly',
        CONG_MAY_CHU: '70000',
      }),
    ).toThrow('CONG_MAY_CHU')
  })
})
