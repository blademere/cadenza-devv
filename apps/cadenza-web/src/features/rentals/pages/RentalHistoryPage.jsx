import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import PageHeader from '../../../components/page-header'
import LoadingState from '../../../components/loading-state'
import { rentalsApi } from '../api/rentals.api'

const unwrap = (value) => value?.data ?? value ?? []
const HISTORY_STATUSES = ['COMPLETED', 'RETURNED', 'CANCELLED']

export default function RentalHistoryPage() {
  const rentals = useQuery({ queryKey: ['cadenza', 'rentals'], queryFn: rentalsApi.list })
  if (rentals.isLoading) return <LoadingState label="Loading rental history…" rows={6} />
  if (rentals.error) return <Alert variant="destructive"><AlertDescription>{rentals.error.message}</AlertDescription></Alert>
  const rows = unwrap(rentals.data).filter((item) => HISTORY_STATUSES.includes(item.status)).sort((a, b) => new Date(b.scheduledStart ?? 0).getTime() - new Date(a.scheduledStart ?? 0).getTime())
  return <div className="space-y-6"><PageHeader title="Rental History" description="Review your completed and cancelled instrument and band-room rentals." />{rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No rental history yet.</CardContent></Card> : <div className="overflow-hidden rounded-xl border"><div className="hidden grid-cols-[1.3fr_1.2fr_1fr_120px] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid"><span>Resource</span><span>Date & time</span><span>Type</span><span>Status</span></div><div className="divide-y">{rows.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1.2fr_1fr_120px] md:items-center md:gap-4"><div><p className="font-medium">{item.resource?.name ?? (item.rentalType === 'ROOM' ? 'Band room' : 'Instrument')}</p><p className="text-xs text-muted-foreground">{item.id}</p></div><div className="text-sm">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleString() : '—'}</div><div className="text-sm text-muted-foreground">{item.rentalType === 'ROOM' ? 'Band room' : 'Instrument'}</div><div><Badge variant={item.status === 'COMPLETED' || item.status === 'RETURNED' ? 'secondary' : 'outline'}>{item.status}</Badge></div></div>)}</div></div>}</div>
}
