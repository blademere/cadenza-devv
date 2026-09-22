import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { PanelLeft } from '@phosphor-icons/react'
import { Sheet, SheetContent } from './sheet'
import { Button } from './button'
import { Separator } from './separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { cn } from '../../lib/utils'

const SidebarContext = createContext(null)
export function useSidebar() {
  const value = useContext(SidebarContext)
  if (!value) throw new Error('useSidebar must be used within SidebarProvider.')
  return value
}
export function SidebarProvider({ children, defaultOpen = true, open: controlledOpen, onOpenChange, className, style }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [openMobile, setOpenMobile] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value) => { const next = typeof value === 'function' ? value(open) : value; onOpenChange ? onOpenChange(next) : setInternalOpen(next) }
  useEffect(() => { const onResize = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize) }, [])
  useEffect(() => { const onKey = (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') { event.preventDefault(); isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [isMobile, open])
  const value = useMemo(() => ({ open, setOpen, openMobile, setOpenMobile, isMobile, state: open ? 'expanded' : 'collapsed', toggleSidebar: () => (isMobile ? setOpenMobile((v) => !v) : setOpen((v) => !v)) }), [open, openMobile, isMobile])
  return <SidebarContext.Provider value={value}><TooltipProvider delayDuration={0}><div data-sidebar-wrapper="" className={cn('group/sidebar-wrapper flex min-h-svh w-full', className)} style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3rem', ...style }}>{children}</div></TooltipProvider></SidebarContext.Provider>
}
export function Sidebar({ children, side = 'left', variant = 'sidebar', collapsible = 'icon', className }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
  const content = <div data-sidebar="sidebar" className={cn('flex h-full w-full flex-col bg-sidebar text-sidebar-foreground', className)}>{children}</div>
  if (isMobile) return <Sheet open={openMobile} onOpenChange={setOpenMobile}><SheetContent side={side} className="w-[18rem] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">{content}</SheetContent></Sheet>
  if (collapsible === 'none') return <div className="hidden h-svh w-[16rem] shrink-0 md:block">{content}</div>
  return <div data-state={state} data-collapsible={state === 'collapsed' ? collapsible : ''} data-variant={variant} className="group/sidebar peer hidden md:block"><div className={cn('relative h-svh w-[16rem] shrink-0 transition-[width] duration-200 ease-linear', 'group-data-[collapsible=icon]:w-[3rem]')}/><div className={cn('fixed inset-y-0 z-10 hidden h-svh w-[16rem] transition-[width] duration-200 ease-linear md:flex', 'left-0 border-r border-sidebar-border', 'group-data-[collapsible=icon]:w-[3rem]', 'group-data-[collapsible=icon]:overflow-hidden')}>{content}</div></div>
}
export function SidebarTrigger({ className, ...props }) {
  const { toggleSidebar } = useSidebar()
  return <Button variant="ghost" size="icon" className={cn('size-7', className)} onClick={toggleSidebar} {...props}><PanelLeft /><span className="sr-only">Toggle Sidebar</span></Button>
}
export function SidebarInset({ className, ...props }) { return <main data-sidebar-inset="" className={cn('relative flex min-h-svh min-w-0 flex-1 flex-col bg-background', className)} {...props} /> }
export function SidebarHeader({ className, ...props }) { return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} /> }
export function SidebarFooter({ className, ...props }) { return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} /> }
export function SidebarSeparator({ className, ...props }) { return <Separator className={cn('mx-2 w-auto bg-sidebar-border', className)} {...props} /> }
export function SidebarContent({ className, ...props }) { return <div className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)} {...props} /> }
export function SidebarGroup({ className, ...props }) { return <div className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} /> }
export function SidebarGroupLabel({ className, ...props }) { return <div className={cn('flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70', className)} {...props} /> }
export function SidebarGroupContent({ className, ...props }) { return <div className={cn('w-full text-sm', className)} {...props} /> }
export function SidebarMenu({ className, ...props }) { return <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} /> }
export function SidebarMenuItem({ className, ...props }) { return <li className={cn('group/menu-item relative', className)} {...props} /> }
export function SidebarMenuButton({ asChild = false, isActive = false, tooltip, className, children, ...props }) {
  const { isMobile, state } = useSidebar()
  const classes = cn('flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm font-normal transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground', state === 'collapsed' && 'justify-center px-2', className)
  const node = asChild ? <span data-active={isActive} className={classes} {...props}>{children}</span> : <button type="button" data-active={isActive} className={classes} {...props}>{children}</button>
  if (!tooltip) return node
  return <Tooltip><TooltipTrigger render={node} /><TooltipContent side="right" hidden={state !== 'collapsed' || isMobile}>{tooltip}</TooltipContent></Tooltip>
}
export function SidebarRail({ className }) { const { toggleSidebar } = useSidebar(); return <button type="button" aria-label="Toggle Sidebar" onClick={toggleSidebar} className={cn('absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 sm:flex', className)} /> }
