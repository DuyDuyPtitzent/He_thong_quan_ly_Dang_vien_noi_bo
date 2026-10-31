import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'
import { ThemeProvider } from '@/shared/components/theme-provider'
import { Toaster } from '@/shared/components/ui/sonner'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <>
          {children}
          <Toaster richColors />
        </>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
