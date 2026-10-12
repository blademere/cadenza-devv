import { Badge } from '@/components/ui/Badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { ClipboardList, CreditCard, DoorOpen, Guitar, Inbox } from 'lucide-react';

const cards = [
  { key: 'enrollments', title: 'Enrollment Requests', footer: 'Review client enrollments', icon: ClipboardList },
  { key: 'roomBookings', title: 'Room Booking Requests', footer: 'Review room reservations', icon: DoorOpen },
  { key: 'rentals', title: 'Instrument Rental Requests', footer: 'Review instrument rentals', icon: Guitar },
  { key: 'billing', title: 'Billing Follow-up', footer: 'Continue pending payments', icon: CreditCard },
];

export function SectionCards({ stats = {}, loading = false }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = loading ? '—' : stats[card.key] ?? 0;
        return (
          <Card key={card.key} className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-2"><Icon className="size-4" />{card.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
              <CardAction><Badge variant={value > 0 ? 'secondary' : 'outline'}><Inbox className="size-3" />{value > 0 ? 'Needs attention' : 'Clear'}</Badge></CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">{card.footer}</CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
