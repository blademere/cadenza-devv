'use client';

import { useCallback, useEffect, useState } from 'react';
import { MoreHorizontalIcon, PlusIcon, RefreshCwIcon } from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

import { staffService } from '@/services/admin/staffService';

const STAFF_TYPES = ['FRONT_DESK'];
const STAFF_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  staffType: 'FRONT_DESK',
  status: 'ACTIVE',
};

const getFullName = (person) =>
  person
    ? [person.firstName, person.middleName, person.lastName]
        .filter(Boolean)
        .join(' ') || 'Unknown User'
    : 'Unknown User';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

const formatValue = (value) =>
  value
    ? value
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : '—';

const getStatusVariant = (status) =>
  status === 'ACTIVE'
    ? 'default'
    : status === 'SUSPENDED'
      ? 'destructive'
      : 'secondary';

export default function UserManagementPage() {
  const [staff, setStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const result = await staffService.getStaff({
        status: statusFilter,
        staffType: typeFilter,
      });

      setStaff(result);
    } catch (error) {
      console.error(error);
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to load staff.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const openCreateDialog = () => {
    setSelectedStaff(null);
    setForm({ ...emptyForm });
    setError('');
    setEmailError('');
    setPhoneError('');
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setSelectedStaff(user);
    setForm({
      firstName: user.person?.firstName || '',
      lastName: user.person?.lastName || '',
      email: user.person?.email || '',
      phone: user.person?.phone || '',
      password: '',
      staffType: user.staffType || 'FRONT_DESK',
      status: user.status || 'ACTIVE',
    });
    setError('');
    setEmailError('');
    setPhoneError('');
    setDialogOpen(true);
  };

  const updateForm = (field, value) => {
    if (field === 'email') {
      setEmailError('');
    }

    if (field === 'phone') {
      setPhoneError('');
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveStaff = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError('');
      setEmailError('');
      setPhoneError('');

      const email = form.email.trim();
      const phone = form.phone.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError('Enter a valid email address.');
        return;
      }

      if (!/^09\d{9}$/.test(phone)) {
        setPhoneError(
          'Phone number must contain 11 digits and start with 09.',
        );
        return;
      }

      if (selectedStaff) {
        await staffService.updateStaff(selectedStaff.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email,
          phone,
          status: form.status,
        });
      } else {
        await staffService.createStaffAccount({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          staffType: form.staffType,
          status: form.status,
        });
      }

      setDialogOpen(false);
      await fetchStaff();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to save staff member.';

      setError(
        message,
      );

      if (message.toLowerCase().includes('email')) {
        setEmailError(message);
      }

      if (message.toLowerCase().includes('phone')) {
        setPhoneError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateStaff = async () => {
    if (!selectedStaff || selectedStaff.status === 'INACTIVE') {
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      await staffService.deactivateStaff(selectedStaff.id);

      setDialogOpen(false);
      await fetchStaff();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to deactivate staff member.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidebarProvider>
      {' '}
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">User Management</h1>
              <p className="text-muted-foreground">
                Manage staff accounts that can access the Cadenza system.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchStaff}
                disabled={isLoading}
              >
                <RefreshCwIcon className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>

              <Button onClick={openCreateDialog}>
                <PlusIcon />
                Add User
              </Button>
            </div>
          </div>

          {error && !dialogOpen && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>System Users</CardTitle>
                  <CardDescription>
                    Staff accounts registered in the Cadenza system.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>

                      {STAFF_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatValue(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter type" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="ALL">All types</SelectItem>

                      {STAFF_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatValue(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Loading staff...
                        </TableCell>
                      </TableRow>
                    ) : staff.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No staff accounts found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staff.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {getFullName(user.person)}
                          </TableCell>

                          <TableCell>{user.person?.email || '—'}</TableCell>

                          <TableCell>{user.person?.phone || '—'}</TableCell>

                          <TableCell>
                            <Badge variant="outline">
                              {formatValue(user.staffType)}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge variant={getStatusVariant(user.status)}>
                              {formatValue(user.status)}
                            </Badge>
                          </TableCell>

                          <TableCell>{formatDate(user.createdAt)}</TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                              aria-label={`Edit ${getFullName(user.person)}`}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={saveStaff}>
                <DialogHeader>
                  <DialogTitle>
                    {selectedStaff ? 'Edit staff account' : 'Add staff account'}
                  </DialogTitle>

                  <DialogDescription>
                    {selectedStaff
                      ? `Update ${getFullName(selectedStaff.person)}'s access and account status.`
                      : 'Create a new staff account for the Cadenza system.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="firstName">First name</Label>
                          <Input
                            id="firstName"
                            value={form.firstName}
                            onChange={(event) =>
                              updateForm('firstName', event.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input
                            id="lastName"
                            value={form.lastName}
                            onChange={(event) =>
                              updateForm('lastName', event.target.value)
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(event) => {
                            const email = event.target.value;

                            updateForm('email', email);

                            if (email && !email.includes('@')) {
                              setEmailError(
                                'Email must include the @ character.',
                              );
                            }
                          }}
                          className={emailError ? 'border-destructive' : ''}
                          aria-invalid={Boolean(emailError)}
                          aria-describedby={
                            emailError ? 'staff-email-error' : undefined
                          }
                          required
                        />
                        {emailError && (
                          <p
                            id="staff-email-error"
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {emailError}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone</Label>
                            <div
                              className={`flex h-10 items-center rounded-md border bg-background ${
                                phoneError ? 'border-destructive' : ''
                              }`}
                            >
                              <span className="border-r px-3 text-sm text-muted-foreground">
                                09
                              </span>
                              <Input
                                id="phone"
                                value={
                                  form.phone.startsWith('09')
                                    ? form.phone.slice(2)
                                    : ''
                                }
                                onChange={(event) =>
                                  updateForm(
                                    'phone',
                                    `09${event.target.value
                                      .replace(/\D/g, '')
                                      .slice(0, 9)}`,
                                  )
                                }
                                inputMode="numeric"
                                maxLength={9}
                                pattern="[0-9]{9}"
                                title="Enter the remaining 9 digits."
                                className="h-full border-0 shadow-none focus-visible:ring-0"
                                aria-invalid={Boolean(phoneError)}
                                aria-describedby={
                                  phoneError ? 'staff-phone-error' : undefined
                                }
                              />
                            </div>
                          {phoneError && (
                            <p
                              id="staff-phone-error"
                              role="alert"
                              className="text-sm text-destructive"
                            >
                              {phoneError}
                            </p>
                          )}
                        </div>

                        {!selectedStaff && (
                          <div className="grid gap-2">
                          <Label htmlFor="password">Temporary password</Label>
                          <Input
                            id="password"
                            type="password"
                            minLength={8}
                            value={form.password}
                            onChange={(event) =>
                              updateForm('password', event.target.value)
                            }
                            required
                          />
                          </div>
                        )}
                      </div>
                    </>

                  <div className="grid gap-2">
                    <Label>Account type</Label>

                    <Select
                      value={form.staffType}
                      disabled={Boolean(selectedStaff)}
                      onValueChange={(value) => updateForm('staffType', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {STAFF_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatValue(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Status</Label>

                    <Select
                      value={form.status}
                      onValueChange={(value) => updateForm('status', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {STAFF_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {formatValue(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                  {selectedStaff && selectedStaff.status !== 'INACTIVE' && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={deactivateStaff}
                      disabled={isSaving}
                    >
                      Deactivate
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving
                      ? 'Saving...'
                      : selectedStaff
                        ? 'Save changes'
                        : 'Add user'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
