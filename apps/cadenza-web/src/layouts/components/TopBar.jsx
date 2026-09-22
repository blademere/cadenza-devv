import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CaretRight, List, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '../../components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { Kbd } from '../../components/ui/kbd'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../../components/ui/breadcrumb'

export default function TopBar({ onMenu, navigation = [] }) {
  const nav = useNavigate()
  const loc = useLocation()
  const items = useMemo(() => navigation.flatMap((s) => (s.items || []).map((i) => ({ ...i, section: s.name }))), [navigation])
  const current = items.find((i) => loc.pathname === i.route) || null

  return (
    <header className="flex h-16 w-full items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <List size={20} />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Workspace</BreadcrumbLink></BreadcrumbItem>
            {current?.section && <><BreadcrumbSeparator><CaretRight size={13} /></BreadcrumbSeparator><BreadcrumbItem><BreadcrumbLink href="#">{current.section}</BreadcrumbLink></BreadcrumbItem></>}
            <BreadcrumbSeparator><CaretRight size={13} /></BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbPage>{current?.name || 'Dashboard'}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <InputGroup className="hidden w-72 md:flex">
        <InputGroupInput placeholder="Search workspace" onKeyDown={(e) => e.key === 'Enter' && nav('/app/dashboard')} />
        <InputGroupAddon align="inline-end"><Kbd>Ctrl K</Kbd></InputGroupAddon>
        <InputGroupAddon><MagnifyingGlass size={17} /></InputGroupAddon>
      </InputGroup>
    </header>
  )
}
