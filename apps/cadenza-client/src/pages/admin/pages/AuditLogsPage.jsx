import { useEffect, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAuditLogs } from '@/services/admin/auditService';

const categories = ['ALL', 'ROOM_RENTALS', 'INSTRUMENT_RENTALS', 'ENROLLMENT_PACKAGES'];
const categoryLabel = { ALL: 'All categories', ROOM_RENTALS: 'Room Booking', INSTRUMENT_RENTALS: 'Item Rentals', ENROLLMENT_PACKAGES: 'Enrollment' };
const categoryName = (type) =>
  type === 'RoomBooking' || type === 'RoomRental'
    ? 'Room Booking'
    : type === 'EnrollmentPackage'
      ? 'Enrollment'
      : 'Item Rentals';
const fieldName = (field) =>
  field
    .replace(/At(?:Booking|Enrollment|Rental)$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase());
const valueName = (value) =>
  value === null || value === undefined
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
const changesFor = (log) => {
  const before = log.metadata?.before || {};
  const after = log.metadata?.after || {};
  return Object.keys(after)
    .filter((key) => valueName(before[key]) !== valueName(after[key]))
    .map((key) => ({
      key,
      before: valueName(before[key]),
      after: valueName(after[key]),
    }));
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAuditLogs({
      page,
      limit: 20,
      q: search.trim() || undefined,
      category: category === 'ALL' ? undefined : category,
    })
      .then((result) => {
        if (mounted) {
          setLogs(result.items);
          setPagination(result.pagination);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [page, category, search]);
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div>
            <h1 className="text-2xl font-semibold">Audit Logs</h1>
            <p className="text-muted-foreground">
              Review changes to rentals, bookings, and enrollment packages.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                Search and filter the exact values changed by administrators.
              </CardDescription>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full sm:max-w-sm">
                  <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search action, type, or ID..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item} value={item}>
                        {categoryLabel[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Exact changes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Loading audit logs...
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No audit logs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="secondary">
                              {categoryName(log.entityType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {log.action.replaceAll('_', ' ')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.entityId}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {changesFor(log).map((change) => (
                                <div
                                  key={change.key}
                                  className="text-xs whitespace-nowrap"
                                >
                                  <span className="font-medium">
                                    {fieldName(change.key)}:
                                  </span>{' '}
                                  {change.before} → {change.after}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                <span>{pagination?.total || 0} records</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination?.hasPreviousPage || loading}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {pagination?.page || page} of {pagination?.pages || 0}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination?.hasNextPage || loading}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
