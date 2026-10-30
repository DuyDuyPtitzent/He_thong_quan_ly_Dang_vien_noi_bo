export type User = {
  id: string
  name: string
  email: string
  avatarUrl?: string
  permissions: string[]
}
export interface AuthProvider {
  getCurrentUser(): Promise<User | null>
  login(input: { email: string; password: string }): Promise<User>
  logout(): Promise<void>
}
export const canAccess = (user: User | null, permission?: string) =>
  !permission || Boolean(user?.permissions.includes(permission))
