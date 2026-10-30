import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { appConfig } from '@/core/config/app.config'
import { navigationConfig } from '@/core/config/navigation.config'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'

export function AppSidebar() {
  const location = useLocation()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex min-h-10 items-center gap-3 px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            A
          </div>
          <span className="font-semibold leading-tight group-data-[collapsible=icon]:hidden">
            {appConfig.name}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationConfig.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((item) => !item.hidden)
                  .map((item) => {
                    const Icon = item.icon
                    if (!Icon) return null
                    const active =
                      location.pathname === item.path ||
                      Boolean(item.children?.some((child) => child.path === location.pathname))
                    return (
                      <Collapsible
                        key={item.id}
                        asChild
                        defaultOpen={active && Boolean(item.children?.length)}
                      >
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                            <Link to={item.path ?? '#'} aria-current={active ? 'page' : undefined}>
                              <Icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          {item.children?.length ? (
                            <>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction aria-label={`Mở rộng ${item.title}`}>
                                  <ChevronDown className="transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.children.map((child) => (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={location.pathname === child.path}
                                      >
                                        <Link to={child.path ?? '#'}>{child.title}</Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </>
                          ) : null}
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger className="w-full justify-start" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
