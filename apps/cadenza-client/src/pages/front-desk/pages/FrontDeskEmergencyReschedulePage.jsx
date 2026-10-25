import { ArrowLeftIcon, CalendarDaysIcon, RefreshCwIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function FrontDeskEmergencyReschedulePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || new Date().toISOString().slice(0, 10);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <Button variant="outline" className="w-fit" onClick={() => navigate('/front-desk/schedule')}>
            <ArrowLeftIcon className="mr-2 size-4" /> Back to Class Schedule
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Emergency Center Reschedule</CardTitle>
              <CardDescription>Select the closure or affected date, then manage the enrolled classes that need replacement schedules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block max-w-xs space-y-2 text-sm font-medium" htmlFor="emergency-date-page">Closed / affected date
                <input id="emergency-date-page" type="date" value={date} onChange={(event) => setParams({ date: event.target.value })} className="block h-9 w-full rounded-md border bg-background px-3 font-normal" />
              </label>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><CalendarDaysIcon className="mr-2 inline size-4" />Emergency reschedule process for {date}. Affected enrolled classes will be shown here.</div>
              <Button disabled><RefreshCwIcon className="mr-2 size-4" />Generate Replacement Schedules</Button>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
