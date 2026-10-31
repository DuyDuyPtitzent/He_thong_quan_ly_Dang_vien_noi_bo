import type { PropsWithChildren } from 'react'
export function PageContainer({ children }: PropsWithChildren) {
  return <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-8">{children}</main>
}
