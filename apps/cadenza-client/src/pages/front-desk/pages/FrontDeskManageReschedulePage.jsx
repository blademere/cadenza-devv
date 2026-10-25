import { ArrowLeftIcon, CheckCircle2Icon, RefreshCwIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function FrontDeskManageReschedulePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestId = params.get('requestId');

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
              <CardTitle>Manage Reschedule Request</CardTitle>
              <CardDescription>Review generated schedules and wait for both student and instructor approval before confirming.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">Request: {requestId || 'Selected reschedule request'}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4"><p className="font-medium">Generated schedules</p><p className="mt-1 text-sm text-muted-foreground">Available replacement schedules will appear here.</p></div>
                <div className="rounded-lg border p-4"><p className="font-medium">Approval status</p><p className="mt-1 text-sm text-muted-foreground">Student and instructor approvals are required.</p></div>
              </div>
              <Button disabled><CheckCircle2Icon className="mr-2 size-4" />Awaiting schedule selection</Button>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
