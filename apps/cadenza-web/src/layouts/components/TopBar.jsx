import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CaretRight, List, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '../../components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'

export default function TopBar({ onMenu, navigation = [] }) {
  const nav = useNavigate(), loc = useLocation()
  const items = useMemo(() => navigation.flatMap((s) => (s.items || []).map((i) => ({ ...i, section: s.name }))), [navigation])
  const current = items.find((i) => loc.pathname === i.route) || null
  return <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6"><Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation"><List size={20} /></Button><div className="min-w-0 flex-1"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Workspace</BreadcrumbLink></BreadcrumbItem>{current?.section && <><BreadcrumbSeparator><CaretRight size={13} /></BreadcrumbSeparator><BreadcrumbItem><BreadcrumbLink href="#">{current.section}</BreadcrumbLink></BreadcrumbItem></>}<BreadcrumbSeparator><CaretRight size={13} /></BreadcrumbSeparator><BreadcrumbItem><BreadcrumbPage>{current?.name || 'Dashboard'}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb></div><InputGroup className="hidden w-72 md:flex"><InputGroupAddon><MagnifyingGlass size={17} /></InputGroupAddon><InputGroupInput placeholder="Search workspace" onKeyDown={(e) => e.key === 'Enter' && nav('/app/dashboard')} /><InputGroupAddon align="inline-end"><span className="rounded border px-1.5 py-0.5 text-[10px]">Ctrl K</span></InputGroupAddon></InputGroup></div>
}
