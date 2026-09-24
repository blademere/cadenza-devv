import { useLocation } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb'
import { Separator } from './ui/separator'
import { SidebarTrigger } from './ui/sidebar'

export default function SiteHeader({ navigation = [] }) {
  const { pathname } = useLocation()
  const items = navigation.flatMap((section) =>
    (section.items || []).map((item) => ({ ...item, section: section.name })),
  )
  const current = items.find(
    (item) =>
      pathname === item.route || pathname.startsWith(item.route + '/'),
  )

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1 rounded-md" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {current?.section && (
            <>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbPage>{current.section}</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block">
                <CaretRight size={13} />
              </BreadcrumbSeparator>
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">
              {current?.name || 'Cadenza'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
