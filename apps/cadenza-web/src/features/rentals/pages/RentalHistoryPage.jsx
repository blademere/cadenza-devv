import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { formatCurrency } from '../../../utils/currency'
import { rentalsApi } from '../api/rentals.api'

const unwrap = (value) => value?.data ?? value ?? []
const HISTORY_STATUSES = ['COMPLETED', 'RETURNED', 'CANCELLED']

export default function RentalHistoryPage() {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  if (rentals.isLoading) return <LoadingState label="Loading rental history…" rows={6} />
  if (rentals.error) return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>

  const rows = unwrap(rentals.data).filter((item) => HISTORY_STATUSES.includes(item.status)).sort((a, b) => new Date(b.scheduledStart ?? 0).getTime() - new Date(a.scheduledStart ?? 0).getTime())
  const filtered = rows.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.status === filter
    const name = item.resource?.name ?? (item.rentalType === 'ROOM' ? 'Band room' : 'Instrument')
    return matchesFilter && [name, item.rentalType, item.id].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  })

  return (
    <div className="space-y-8">
      <PageHeader title="Rental History" description="Review your completed, returned, and cancelled instrument and band-room rentals." />
      <div className="grid gap-4 sm:grid-cols-3">
        <HistoryStat label="Total rentals" value={rows.length} />
        <HistoryStat label="Completed / returned" value={rows.filter((item) => ['COMPLETED', 'RETURNED'].includes(item.status)).length} />
        <HistoryStat label="Cancelled" value={rows.filter((item) => item.status === 'CANCELLED').length} />
      </div>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-medium">Past rentals</p><h2 className="text-xl font-semibold">Your rental activity</h2></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Input className="sm:w-64" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Search history…" /><div className="flex rounded-lg border p-1"><Button size="sm" variant={filter === 'ALL' ? 'default' : 'ghost'} onClick={() => setFilter('ALL')}>All</Button><Button size="sm" variant={filter === 'COMPLETED' ? 'default' : 'ghost'} onClick={() => setFilter('COMPLETED')}>Completed</Button><Button size="sm" variant={filter === 'RETURNED' ? 'default' : 'ghost'} onClick={() => setFilter('RETURNED')}>Returned</Button><Button size="sm" variant={filter === 'CANCELLED' ? 'default' : 'ghost'} onClick={() => setFilter('CANCELLED')}>Cancelled</Button></div></div>
        </div>
        {filtered.length === 0 ? <Card><CardContent className="py-14 text-center"><p className="font-medium">{rows.length ? 'No history matches your filters' : 'No rental history yet'}</p><p className="mt-1 text-sm text-muted-foreground">{rows.length ? 'Try another search or status.' : 'Completed rentals will appear here after your first booking.'}</p></CardContent></Card> :
          <div className="grid gap-3">{filtered.map((item) => <HistoryCard key={item.id} rental={item} />)}</div>}
      </section>
    </div>
  )
}

function HistoryStat({ label, value }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>
}

function HistoryCard({ rental }) {
  const name = rental.resource?.name ?? (rental.rentalType === 'ROOM' ? 'Band room' : 'Instrument')
  const start = rental.scheduledStart ? new Date(rental.scheduledStart) : null
  const end = rental.scheduledEnd ? new Date(rental.scheduledEnd) : null
  const statusVariant = rental.status === 'CANCELLED' ? 'outline' : 'secondary'
  return <Card className="transition-shadow hover:shadow-sm"><CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
    <div className="flex gap-4"><div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-medium sm:flex">{rental.rentalType === 'ROOM' ? 'ROOM' : 'ITEM'}</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{name}</p><Badge variant={statusVariant}>{rental.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{rental.rentalType === 'ROOM' ? 'Band room' : 'Instrument'} · {start?.toLocaleDateString() ?? '—'}</p><p className="mt-1 text-xs text-muted-foreground">{start?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) ?? '—'}{end ? ` – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</p></div></div>
    <div className="text-left lg:text-right"><p className="text-xs text-muted-foreground">Rental total</p><p className="font-semibold">{formatCurrency(rental.totalAmount)}</p></div>
  </CardContent></Card>
}
