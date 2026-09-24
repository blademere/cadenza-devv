import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CaretDown, CaretRight, SignOut } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
} from './ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { branding } from '../config/branding'

export default function AppSidebar({ navigation = [], user, onNavigate, onLogout }) {
  const location = useLocation()
  const { state } = useSidebar()
  const name = useMemo(
    () => user?.name || user?.email?.split('@')[0] || 'User',
    [user],
  )
  const initial = name.slice(0, 1).toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={branding.workspaceName}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                {branding.shortName}
              </div>
              {state === 'expanded' && (
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold">
                    {branding.workspaceName}
                  </div>
                  <div className="truncate text-xs text-sidebar-foreground/60">
                    {branding.name}
                  </div>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.key}>
            <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon

                  if (!item.children) {
                    const active =
                      location.pathname === item.route ||
                      location.pathname.startsWith(item.route + '/')

                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          render={<NavLink to={item.route} onClick={onNavigate} />}
                          isActive={active}
                          tooltip={item.name}
                        >
                          {Icon && <Icon />}
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  const activeChild = item.children.some(
                    (child) =>
                      location.pathname === child.route ||
                      location.pathname.startsWith(child.route + '/'),
                  )

                  return (
                    <Collapsible key={item.key} defaultOpen={activeChild} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuButton
                              isActive={activeChild}
                              tooltip={item.name}
                            />
                          }
                        >
                          {Icon && <Icon />}
                          <span>{item.name}</span>
                          <CaretRight
                            size={14}
                            className="ml-auto transition-transform group-data-open/collapsible:rotate-90"
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const childActive =
                                location.pathname === child.route ||
                                location.pathname.startsWith(child.route + '/')

                              return (
                                <SidebarMenuSubItem key={child.key}>
                                  <SidebarMenuButton
                                    render={<NavLink to={child.route} onClick={onNavigate} />}
                                    isActive={childActive}
                                    className="h-7 px-2 text-xs"
                                  >
                                    <span>{child.name}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <Avatar className="size-8">
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-medium">{name}</div>
                  <div className="truncate text-[11px] text-sidebar-foreground/60">
                    Account
                  </div>
                </div>
                <CaretDown className="ml-auto" size={14} />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={onLogout}>
                  <SignOut size={16} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
