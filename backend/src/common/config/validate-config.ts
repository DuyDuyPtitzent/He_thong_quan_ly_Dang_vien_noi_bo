import Joi from 'joi'

const mauCauHinh = Joi.object({
  MOI_TRUONG: Joi.string().valid('PHAT_TRIEN', 'KIEM_THU', 'VAN_HANH').default('PHAT_TRIEN'),
  DIA_CHI_MAY_CHU: Joi.string().min(1).default('127.0.0.1'),
  CONG_MAY_CHU: Joi.number().integer().min(1).max(65_535).default(3001),
  URL_GIAO_DIEN_DUOC_PHEP: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://127.0.0.1:5173'),
  THOI_HAN_PHIEN_DANG_NHAP_GIO: Joi.number().integer().min(1).max(72).default(8),
  SO_LAN_DANG_NHAP_THAT_BAI_TOI_DA: Joi.number().integer().min(3).max(10).default(5),
  THOI_GIAN_KHOA_DANG_NHAP_PHUT: Joi.number().integer().min(1).max(120).default(15),
  KET_NOI_CO_SO_DU_LIEU: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  KHO_TEP_RIENG: Joi.string().min(1).default('./storage/private'),
}).unknown(true)

export function kiemTraCauHinh(bienMoiTruong: Record<string, unknown>) {
  const { error, value } = mauCauHinh.validate(bienMoiTruong, {
    abortEarly: false,
    convert: true,
  })

  if (error) {
    const tenBien = error.details
      .map((muc) => muc.path.join('.'))
      .filter(Boolean)
      .join(', ')
    throw new Error(`Cấu hình môi trường không hợp lệ: ${tenBien || 'kiểm tra lại các giá trị'}.`)
  }

  return value as Record<string, unknown>
}
