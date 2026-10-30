import { Outlet, useMatches } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { PageContainer } from '@/shared/components/PageContainer'
import { Button } from '@/shared/components/ui/button'
import { useTheme } from 'next-themes'
import { appConfig } from '@/core/config/app.config'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar'
import { UserDropdown } from './UserDropdown'

export function AdminLayout() {
  const matches = useMatches()
  const { theme, setTheme } = useTheme()
  const title = [...matches]
    .reverse()
    .find((match) => (match.handle as { title?: string } | undefined)?.title)?.handle as
    { title?: string } | undefined
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger aria-label="Mở menu" />
            <span className="text-sm font-medium text-muted-foreground">
              {title?.title ?? appConfig.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Chuyển giao diện"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <UserDropdown />
          </div>
        </header>
        <PageContainer>
          <Outlet />
        </PageContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}
