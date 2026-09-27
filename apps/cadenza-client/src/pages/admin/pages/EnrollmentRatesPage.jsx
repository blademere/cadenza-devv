'use client';

import * as React from 'react';
import {
  BookOpenIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';

import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { toast } from 'sonner';

import {
  createEnrollmentPackage,
  deactivateEnrollmentPackage,
  getEnrollmentPackages,
  updateEnrollmentPackage,
} from '@/features/admin/enrollment-package.api';

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
});

export default function EnrollmentRatesPage() {
  const [packages, setPackages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);

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
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingPackage(item);

    setForm({
      name: item.name || '',
      price: item.price ?? '',
      sessions: item.sessions ?? '',
      duration: item.duration ?? 1,
      frequency: item.frequency ?? 1,
    });

    setDialogOpen(true);
  };

  const savePackage = async () => {
    if (!form.name.trim()) {
      toast.error('Package name is required.');
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
      sessionDurationMinutes: Number(form.duration) * 60,
      sessionsPerWeek: Number(form.frequency),
    };

    try {
      setSaving(true);

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
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async (id) => {
    try {
      setDeactivating(id);

      await deactivateEnrollmentPackage(id);

      toast.success(
        'Enrollment package deactivated successfully.',
      );

      await loadPackages();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          'Failed to deactivate enrollment package.',
      );
    } finally {
      setDeactivating(null);
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
                                  saving ||
                                  deactivating === item.id
                                }
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() =>
                                  deletePackage(item.id)
                                }
                                disabled={
                                  saving ||
                                  deactivating === item.id
                                }
                              >
                                {deactivating === item.id ? (
                                  <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2Icon className="h-4 w-4" />
                                )}
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
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage
                    ? 'Edit Enrollment Package'
                    : 'Add Enrollment Package'}
                </DialogTitle>

                <DialogDescription>
                  Set the package price, sessions, duration, and frequency.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="package-name">
                    Package Name
                  </Label>

                  <Input
                    id="package-name"
                    placeholder="e.g. Package 1"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
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
                      placeholder="1"
                      value={form.duration}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          duration: event.target.value,
                        }))
                      }
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

                {form.price &&
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