import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CaretDown, SignOut } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../../components/ui/sidebar'
import { branding } from '../../config/branding'

export default function Sidebar({ navigation = [], user, onNavigate, onLogout }) {
  const location = useLocation()
  const { state } = useSidebar()
  const name = useMemo(() => user?.name || user?.email?.split('@')[0] || 'User', [user])
  const initial = name.slice(0, 1).toUpperCase()

  return <aside className="flex h-full min-h-0 flex-col">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="h-10" tooltip={branding.workspaceName}>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">{branding.shortName}</div>
            {state === 'expanded' && <div className="min-w-0 flex-1 text-left"><div className="truncate text-sm font-semibold">{branding.workspaceName}</div><div className="truncate text-xs text-sidebar-foreground/60">{branding.name}</div></div>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <div className="h-px w-full bg-sidebar-border" />
    <SidebarContent>
      {navigation.map((section) => <SidebarGroup key={section.key}>
        <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
        <SidebarGroupContent><SidebarMenu>
          {section.items.map((item) => { const active = location.pathname === item.route || location.pathname.startsWith(item.route + '/'); const Icon = item.icon; return <SidebarMenuItem key={item.key}><SidebarMenuButton asChild isActive={active} tooltip={item.name}><NavLink to={item.route} onClick={onNavigate}>{Icon && <Icon size={16} />}{state === 'expanded' && <span>{item.name}</span>}</NavLink></SidebarMenuButton></SidebarMenuItem> })}
        </SidebarMenu></SidebarGroupContent>
      </SidebarGroup>)}
    </SidebarContent>
    <div className="h-px w-full bg-sidebar-border" />
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton className="h-10"  />}>
              <Avatar className="size-7"><AvatarFallback>{initial}</AvatarFallback></Avatar>
              {state === 'expanded' && <><div className="min-w-0 flex-1 text-left"><div className="truncate text-xs font-medium">{name}</div><div className="truncate text-[11px] text-sidebar-foreground/60">Account</div></div><CaretDown className="ml-auto" size={14} /></>}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56"><DropdownMenuItem onClick={onLogout}><SignOut size={16} />Sign out</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </aside>
}
