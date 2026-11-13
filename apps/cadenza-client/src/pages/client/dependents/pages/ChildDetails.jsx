import { ArrowLeft, CalendarDays, CreditCard, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getDependents } from '../services/dependents.service';

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatSchedule = (session) => {
  const start = new Date(session.scheduledStart);
  const end = new Date(session.scheduledEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Schedule unavailable';
  const date = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }).format(start);
  const time = (value) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(value).replace(/:00(?=\s*[AP]M)/, '').replace(/\s+/g, '').toLowerCase();
  return `${date}: ${time(start)} - ${time(end)}`;
};
const sessionLabel = (session) => {
  const status = String(session.status || '').toUpperCase();
  if (['COMPLETED', 'DONE'].includes(status)) return 'Done';
  if (session.attendance) return `Marked · ${String(session.attendance).replaceAll('_', ' ')}`;
  if (status === 'CANCELLED') return 'Cancelled';
  return new Date(session.scheduledEnd).getTime() < Date.now() ? 'Awaiting marking' : 'Upcoming';
};
export default function ChildDetails() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getDependents().then((items) => setChild(items.find((item) => item.id === childId) || null))
      .catch(() => toast.error('Unable to load child details.'))
      .finally(() => setLoading(false));
  }, [childId]);
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading child details...</div>;
  if (!child) return <div className="space-y-4 p-8"><Button variant="ghost" onClick={() => navigate('/client/children')}><ArrowLeft className="mr-2 h-4 w-4" />Back to My Children</Button><p>Child account not found.</p></div>;
  const studentName = [child.firstName, child.middleName, child.lastName].filter(Boolean).join(' ');
  const enrollments = child.activeEnrollments || [];
  return (
    <div className="space-y-6 p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate('/client/children')}><ArrowLeft className="mr-2 h-4 w-4" />Back to My Children</Button>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" />{studentName}</CardTitle><p className="text-sm text-muted-foreground">@{child.username} · Age {child.age} · {child.gender}</p></CardHeader></Card>
      <div className="grid gap-4 md:grid-cols-2">
        {enrollments.length ? enrollments.map((enrollment) => (
          <Card key={enrollment.id}>
            <CardHeader><CardTitle>{enrollment.course?.name || 'Course pending selection'}</CardTitle><p className="text-sm text-muted-foreground">{enrollment.packageName} · {enrollment.status.replaceAll('_', ' ')}</p></CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm"><span className="font-medium">Student:</span> {studentName}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs uppercase text-muted-foreground">Instructor</p><p>{enrollment.schedule?.find((session) => session.instructor)?.instructor || 'Pending assignment'}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Payment</p><p>{enrollment.billing?.paymentStatus?.replaceAll('_', ' ')}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Paid</p><p>{money(enrollment.billing?.paymentAmount)}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Balance due</p><p className="font-semibold text-amber-700">{money(enrollment.billing?.remainingAmount)}</p></div>
              </div>
              <div className="border-t pt-4">
                <p className="mb-3 flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4 text-primary" />All schedules ({enrollment.schedule?.length || 0} sessions)</p>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {[...(enrollment.schedule || [])].sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart)).map((session) => (
                    <div key={session.id} className="rounded-md bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{formatSchedule(session)}</p><span className="rounded-full bg-background px-2 py-1 text-xs">{sessionLabel(session)}</span></div>
                      <p className="mt-1 text-xs text-muted-foreground">Room: {session.room || 'Not assigned'}</p>
                      <p className="text-xs text-muted-foreground">Instructor: {session.instructor || 'Pending assignment'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground"><CreditCard className="h-4 w-4" />Total enrollment cost: {money(enrollment.billing?.totalAmount)}</div>
            </CardContent>
          </Card>
        )) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No enrollments for this child.</CardContent></Card>}
      </div>
    </div>
  );
}
