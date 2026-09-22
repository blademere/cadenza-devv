import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CaretDown, SignOut, SidebarSimple } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { Separator } from '../../components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip'
import { branding } from '../../config/branding'

export default function Sidebar({ navigation = [], user, collapsed = false, onNavigate, onLogout, onToggleCollapse }) {
  const location = useLocation()
  const name = useMemo(() => user?.name || user?.email?.split('@')[0] || 'User', [user])
  const initial = name.slice(0, 1).toUpperCase()
  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="p-4"><div className={collapsed ? 'flex justify-center' : 'flex items-center justify-between gap-3'}><div className="flex min-w-0 items-center gap-2"><div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-extrabold text-sidebar-primary-foreground">{branding.shortName}</div>{!collapsed && <div className="min-w-0"><div className="truncate text-sm font-bold">{branding.workspaceName}</div><div className="truncate text-xs text-muted-foreground">{branding.name}</div></div>}</div><Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="hidden lg:inline-flex" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} />}><SidebarSimple size={18} /></TooltipTrigger><TooltipContent>{collapsed ? 'Expand' : 'Collapse'}</TooltipContent></Tooltip></div></div>
        <Separator />
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-4"><div className="space-y-6">{navigation.map((section) => <div key={section.key}><div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{!collapsed && section.name}</div><div className="space-y-1">{section.items.map((item) => { const active = location.pathname === item.route || location.pathname.startsWith(item.route + '/'); const Icon = item.icon; const classes = 'flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' + (active ? 'bg-sidebar-accent text-sidebar-accent-foreground ' : 'text-sidebar-foreground/80 ') + (collapsed ? 'justify-center' : ''); const link = <NavLink to={item.route} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={classes}>{Icon && <Icon size={16} />}{!collapsed && <span className="truncate">{item.name}</span>}</NavLink>; return collapsed ? <Tooltip key={item.key}><TooltipTrigger render={link} /><TooltipContent side="right">{item.name}</TooltipContent></Tooltip> : <div key={item.key}>{link}</div> })}</div></div>)}</div></nav>
        <Separator />
        <div className="p-2"><DropdownMenu><DropdownMenuTrigger render={<button type="button" className={'flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent ' + (collapsed ? 'justify-center' : '')} />}><Avatar className="size-8"><AvatarFallback>{initial}</AvatarFallback></Avatar>{!collapsed && <><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{name}</div><div className="text-[11px] text-muted-foreground">Account</div></div><CaretDown size={14} /></>}</DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-56"><DropdownMenuItem onClick={onLogout}><SignOut size={16} />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </div>
    </TooltipProvider>
  )
}
