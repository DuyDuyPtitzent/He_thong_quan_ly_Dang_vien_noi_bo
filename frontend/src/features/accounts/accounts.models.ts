export type AccountStatus = 'DANG_HOAT_DONG' | 'TAM_KHOA' | 'NGUNG_HOAT_DONG'

export type MemberProfile = {
  id: string
  code: string
  name: string
  cccd: string | null
  birthDate: string | null
  partyBranch: string
  branchId?: string | null
  group: string | null
  status: string
}

export type AccountAuditEntry = {
  at: string
  actor: string
  action: string
  change: string
  result: 'Thành công' | 'Từ chối'
}

export type AccountAssignment = {
  role: string
  scope: string
  expiresAt: string | null
  active: boolean
}

export type AccountRecord = {
  id: string
  login: string
  email: string
  status: AccountStatus
  createdAt: string
  updatedAt: string
  lastLogin: string | null
  lockedUntil: string | null
  passwordResetRequired: boolean
  profile: MemberProfile | null
  assignments: AccountAssignment[]
  sessions: { device: string; location: string; lastSeen: string; current: boolean }[]
  audit: AccountAuditEntry[]
  deletable: boolean
}
