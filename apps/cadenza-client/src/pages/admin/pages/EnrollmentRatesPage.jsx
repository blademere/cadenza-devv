'use client';

import * as React from 'react';
import {
  BookOpenIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
} from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';

import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

import { Button } from '@/components/ui/Button';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import { toast } from 'sonner';

import {
  createEnrollmentPackage,
  getEnrollmentPackages,
  updateEnrollmentPackage,
} from '@/services/admin/enrollment-packageService';

const emptyForm = {
  name: '',
  price: '',
  sessions: '',
  duration: '',
  frequency: '',
};

const mapPackage = (item) => ({
  ...item,
  price: Number(item.price),
  sessions: Number(item.numberOfSessions),
  duration: Number(item.sessionDurationMinutes) / 60,
  frequency: Number(item.sessionsPerWeek),
  activeEnrollmentCount: item._count?.enrollments || 0,
});

export default function EnrollmentRatesPage() {
  const [packages, setPackages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);
  const [packageNameError, setPackageNameError] = React.useState('');
  const [statusError, setStatusError] = React.useState('');

  const loadPackages = React.useCallback(async () => {
    try {
      setLoading(true);

      const data = await getEnrollmentPackages({
        status: 'ACTIVE',
      });

      setPackages(
        Array.isArray(data) ? data.map(mapPackage) : [],
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          'Failed to load enrollment packages.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const openAdd = () => {
    setEditingPackage(null);
    setForm({ ...emptyForm });
    setPackageNameError('');
    setStatusError('');
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingPackage(item);

    setForm({
      name: item.name || '',
      price: item.price ?? '',
      sessions: item.sessions ?? '',
      duration: 1,
      frequency: item.frequency ?? 1,
      status: item.status || 'ACTIVE',
    });

    setPackageNameError('');
    setStatusError('');
    setDialogOpen(true);
  };

  const savePackage = async () => {
    if (
      editingPackage?.activeEnrollmentCount > 0 &&
      form.status === 'INACTIVE'
    ) {
      setStatusError(
        'This package cannot be deactivated while it has active enrollments.',
      );
      return;
    }

    if (!form.name.trim()) {
      setPackageNameError('Package name is required.');
      return;
    }

    const normalizedName = form.name.trim().toLowerCase();
    const duplicatePackage = packages.find(
      (item) =>
        item.id !== editingPackage?.id &&
        item.name?.trim().toLowerCase() === normalizedName,
    );

    if (duplicatePackage) {
      setPackageNameError('Package name already exists.');
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      toast.error(
        'Package price must be greater than zero.',
      );
      return;
    }

    if (!form.sessions || Number(form.sessions) <= 0) {
      toast.error(
        'Number of sessions must be greater than zero.',
      );
      return;
    }

    if (!form.duration || Number(form.duration) <= 0) {
      toast.error(
        'Session duration must be greater than zero.',
      );
      return;
    }

    if (!form.frequency || Number(form.frequency) <= 0) {
      toast.error(
        'Times per week must be greater than zero.',
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      numberOfSessions: Number(form.sessions),
      sessionDurationMinutes: 60,
      sessionsPerWeek: Number(form.frequency),
      status: form.status || 'ACTIVE',
    };

    try {
      setSaving(true);
      setPackageNameError('');
      setStatusError('');

      if (editingPackage) {
        await updateEnrollmentPackage(
          editingPackage.id,
          payload,
        );

        toast.success(
          'Enrollment package updated successfully.',
        );
      } else {
        await createEnrollmentPackage(payload);

        toast.success(
          'Enrollment package created successfully.',
        );
      }

      setDialogOpen(false);
      setEditingPackage(null);
      setForm({ ...emptyForm });

      await loadPackages();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          'Failed to save enrollment package.',
      );

      const message = error?.response?.data?.message || '';
      if (
        message.toLowerCase().includes('active enrollments')
      ) {
        setStatusError(message);
      } else if (message.toLowerCase().includes('package')) {
        setPackageNameError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const minPrice = packages.length
    ? Math.min(...packages.map((item) => item.price))
    : 0;

  const maxPrice = packages.length
    ? Math.max(...packages.map((item) => item.price))
    : 0;

  return (
    <SidebarProvider
      style={{
        '--sidebar-width': 'calc(var(--spacing) * 72)',
        '--header-height': 'calc(var(--spacing) * 12)',
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Enrollment Packages
              </h1>

              <p className="text-muted-foreground">
                Manage the packages available for student enrollment.
              </p>
            </div>

            <Button onClick={openAdd}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Package
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardDescription>
                    Available Packages
                  </CardDescription>

                  <CardTitle className="text-2xl">
                    {packages.length}
                  </CardTitle>
                </div>

                <BookOpenIcon className="h-6 w-6 text-primary" />
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardDescription>
                    Package Price Range
                  </CardDescription>

                  <CardTitle className="text-2xl">
                    ₱{minPrice.toLocaleString()} - ₱
                    {maxPrice.toLocaleString()}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Packages</CardTitle>

              <CardDescription>
                Packages that students can choose when enrolling.
              </CardDescription>
            </CardHeader>

            <div className="px-6 pb-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package</TableHead>
                      <TableHead>Package Price</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Session Duration</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center"
                        >
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                            Loading enrollment packages...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : packages.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No enrollment packages configured.
                        </TableCell>
                      </TableRow>
                    ) : (
                      packages.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className="font-medium">
                              {item.name}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="font-medium">
                              ₱{item.price.toLocaleString()}
                            </span>

                            <div className="text-xs text-muted-foreground">
                              per month
                            </div>
                          </TableCell>

                          <TableCell>
                            {item.sessions} sessions
                          </TableCell>

                          <TableCell>
                            {item.duration}{' '}
                            {item.duration === 1
                              ? 'hour'
                              : 'hours'}
                          </TableCell>

                          <TableCell>
                            {item.frequency}x a week
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(item)}
                                disabled={
                                  saving
                                }
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!saving) {
                setDialogOpen(open);
              }
            }}
          >
            <DialogContent className="gap-5 sm:max-w-[500px]">
              <DialogHeader className="text-left">
                <DialogTitle>
                  {editingPackage
                    ? 'Update Enrollment Package Status'
                    : 'Add Enrollment Package'}
                </DialogTitle>

                <DialogDescription>
                  {editingPackage
                    ? 'Update the status for this enrollment package.'
                    : 'Set the package price, sessions, duration, and frequency.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5">
                {!editingPackage && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="package-name">
                        Package Name
                      </Label>

                      <Input
                        id="package-name"
                        placeholder="e.g. Package 1"
                        value={form.name}
                        onChange={(event) => {
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }));
                          setPackageNameError('');
                        }}
                        className={packageNameError ? 'border-destructive' : ''}
                        aria-invalid={Boolean(packageNameError)}
                        aria-describedby={
                          packageNameError ? 'package-name-error' : undefined
                        }
                      />
                      {packageNameError && (
                        <p
                          id="package-name-error"
                          role="alert"
                          className="text-sm text-destructive"
                        >
                          {packageNameError}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="package-price">
                        Monthly Price
                      </Label>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          ₱
                        </span>

                        <Input
                          id="package-price"
                          type="number"
                          min="1"
                          placeholder="1550"
                          className="pl-8"
                          value={form.price}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sessions">
                      Sessions
                    </Label>

                    <Input
                      id="sessions"
                      type="number"
                      min="1"
                      placeholder="4"
                      value={form.sessions}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          sessions: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration">
                      Hours / Session
                    </Label>

                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value="1"
                      readOnly
                      aria-readonly="true"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="frequency">
                      Times / Week
                    </Label>

                    <Input
                      id="frequency"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={form.frequency}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          frequency: event.target.value,
                        }))
                      }
                    />
                  </div>
                    </div>
                  </>
                )}

                {editingPackage && (
                  <div className="grid gap-2">
                    <Label htmlFor="package-status">Status</Label>
                    <select
                      id="package-status"
                      value={form.status || 'ACTIVE'}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }));
                        setStatusError('');
                      }}
                      className={`h-10 w-full rounded-md border bg-background px-3 text-sm ${
                        statusError ? 'border-destructive' : ''
                      }`}
                      disabled={saving}
                    >
                      <option value="ACTIVE">Active</option>
                      <option
                        value="INACTIVE"
                        disabled={
                          editingPackage.activeEnrollmentCount > 0
                        }
                      >
                        Inactive
                      </option>
                    </select>
                    {statusError && (
                      <p
                        role="alert"
                        className="text-sm text-destructive"
                      >
                        {statusError}
                      </p>
                    )}
                    {!statusError &&
                      editingPackage.activeEnrollmentCount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          This package has active enrollments and cannot be
                          deactivated.
                        </p>
                      )}
                  </div>
                )}

                {!editingPackage && form.price &&
                  form.sessions &&
                  form.duration &&
                  form.frequency && (
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <div className="font-medium">
                        {form.name || 'Package'}
                      </div>

                      <div className="mt-1">
                        ₱
                        {Number(form.price).toLocaleString()}
                        /month · {form.sessions} sessions ·{' '}
                        {form.duration}{' '}
                        {Number(form.duration) === 1
                          ? 'hour'
                          : 'hours'}{' '}
                        per session · {form.frequency}x a week
                      </div>
                    </div>
                  )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  onClick={savePackage}
                  disabled={saving}
                >
                  {saving && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {editingPackage
                    ? 'Save Changes'
                    : 'Add Package'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}