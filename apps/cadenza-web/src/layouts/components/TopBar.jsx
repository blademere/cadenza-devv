import { CaretRight } from '@phosphor-icons/react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'
import { Separator } from '../../components/ui/separator'
import { SidebarTrigger } from '../../components/ui/sidebar'

export default function TopBar({ navigation = [] }) {
  const pathname = window.location.pathname
  const items = navigation.flatMap((section) => (section.items || []).map((item) => ({ ...item, section: section.name })))
  const current = items.find((item) => pathname === item.route || pathname.startsWith(item.route + '/'))
  return <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background"><div className="flex flex-1 items-center gap-2 px-3"><SidebarTrigger /><Separator orientation="vertical" className="mr-2 h-4" /><Breadcrumb><BreadcrumbList><BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="#">{current?.section || 'Cadenza'}</BreadcrumbLink></BreadcrumbItem>{current && <><BreadcrumbSeparator className="hidden md:block"><CaretRight size={13} /></BreadcrumbSeparator><BreadcrumbItem><BreadcrumbPage className="line-clamp-1">{current.name}</BreadcrumbPage></BreadcrumbItem></>}</BreadcrumbList></Breadcrumb></div></header>
}
