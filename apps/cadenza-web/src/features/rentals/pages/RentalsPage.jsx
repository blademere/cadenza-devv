import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import DataTable from '../../../components/data-table';
import PageHeader from '../../../components/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import SelectField from '../../../components/select-field';
import LoadingState from '../../../components/loading-state';
import { formatCurrency } from '../../../utils/currency';
import { rentalsApi } from '../api/rentals.api';
import { paymentsApi } from '../../payments/api/payments.api';
import { resourcesApi } from '../../resources/api/resources.api';
import { useAuthorization } from '../../authorization/components/AuthorizationProvider';

const unwrap = (r) => r?.data ?? r ?? [];

export default function RentalsPage() {
  const { can } = useAuthorization();
  const client = useQueryClient();
  const canCreate = can('cadenza_rentals:create');
  const canManage = can('cadenza_rentals:manage');
  const canPay = can('cadenza_payments:create');

  const rentals = useQuery({
    queryKey: ['cadenza', 'rentals'],
    queryFn: rentalsApi.list,
  });
  const customers = useQuery({
    queryKey: ['cadenza', 'customers'],
    queryFn: rentalsApi.customers,
    enabled: canManage,
  });
  const instruments = useQuery({
    queryKey: ['cadenza', 'instruments'],
    queryFn: resourcesApi.listInstruments,
  });
  const rooms = useQuery({
    queryKey: ['cadenza', 'rooms'],
    queryFn: resourcesApi.listRooms,
  });

  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState(null);
  const [amount, setAmount] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    resourceId: '',
    rentalType: 'INSTRUMENT',
    scheduledStart: '',
    scheduledEnd: '',
    requiredDownPayment: '',
    currency: 'PHP',
  });

  const availability = useQuery({
    queryKey: [
      'cadenza',
      'rental-availability',
      form.rentalType,
      form.scheduledStart,
      form.scheduledEnd,
    ],
    queryFn: () =>
      rentalsApi.availability({
        rentalType: form.rentalType,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      }),
    enabled: Boolean(
      form.scheduledStart &&
        form.scheduledEnd &&
        form.scheduledStart < form.scheduledEnd,
    ),
  });

  const create = useMutation({
    mutationFn: rentalsApi.create,
    onSuccess: () => {
      setOpen(false);
      client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] });
    },
  });
  const lifecycle = useMutation({
    mutationFn: ({ type, id }) => rentalsApi[type](id),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }),
  });
  const pay = useMutation({
    mutationFn: ({ id, value }) =>
      paymentsApi.pay(id, {
        amount: String(value),
        currency: 'PHP',
        method: 'CASH',
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['cadenza', 'rentals'] }),
  });
  const checkout = useMutation({
    mutationFn: (rental) =>
      paymentsApi.checkout(rental.paymentObligationId, {
        amount: String(rental.requiredDownPayment),
        description: 'Cadenza rental down payment',
      }),
    onSuccess: (response) => {
      const value = response?.data ?? response;
      if (value?.checkoutUrl)
        window.open(value.checkoutUrl, '_blank', 'noopener,noreferrer');
    },
  });

  const history = useQuery({
    queryKey: ['cadenza', 'payment-history', payment?.paymentObligationId],
    queryFn: () => paymentsApi.history(payment.paymentObligationId),
    enabled: Boolean(payment?.paymentObligationId && canManage),
  });
  const detail = useQuery({
    queryKey: ['cadenza', 'payment', payment?.paymentObligationId],
    queryFn: () => paymentsApi.get(payment.paymentObligationId),
    enabled: Boolean(payment?.paymentObligationId && canManage),
  });

  if (rentals.isLoading)
    return <LoadingState label="Loading rentals…" rows={4} />;
  if (rentals.error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{rentals.error.message}</AlertDescription>
      </Alert>
    );

  const rows = unwrap(rentals.data);
  const resourceRows = availability.isSuccess
    ? unwrap(availability.data).map((entry) => entry.domain)
    : form.rentalType === 'ROOM'
      ? unwrap(rooms.data)
      : unwrap(instruments.data);
  const customerRows = unwrap(customers.data);

  const submit = () =>
    create.mutate({
      ...form,
      customerId: canManage && form.customerId ? form.customerId : undefined,
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      requiredDownPayment: String(form.requiredDownPayment),
    });

  const error = create.error || lifecycle.error || pay.error || checkout.error;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Rentals"
        description={
          canManage
            ? 'Book rentals for walk-in customers, record payments, and manage check-out and returns. Online payment is also available.'
            : 'Book an instrument or band room rental and pay the required down payment online.'
        }
        actions={
          canCreate && (
            <Button onClick={() => setOpen(true)}>
              {canManage ? 'Book walk-in rental' : 'Book rental'}
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'type', header: 'Type', value: (r) => r.rentalType },
              {
                key: 'schedule',
                header: 'Schedule',
                value: (r) =>
                  new Date(r.scheduledStart).toLocaleString() +
                  ' – ' +
                  new Date(r.scheduledEnd).toLocaleString(),
              },
              {
                key: 'total',
                header: 'Total',
                value: (r) => formatCurrency(r.totalAmount),
              },
              {
                key: 'down',
                header: 'Down payment',
                value: (r) => formatCurrency(r.requiredDownPayment),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <Badge variant="secondary">{r.status}</Badge>,
              },
              {
                key: 'actions',
                header: 'Actions',
                searchable: false,
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    {canManage && r.paymentObligationId && canPay && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPayment(r);
                          setAmount(String(r.requiredDownPayment));
                        }}
                      >
                        Payment
                      </Button>
                    )}
                    {r.paymentObligationId &&
                      r.status === 'PENDING' &&
                      canPay && (
                        <Button
                          size="sm"
                          variant={canManage ? 'outline' : 'default'}
                          onClick={() => checkout.mutate(r)}
                        >
                          Pay down payment online
                        </Button>
                      )}
                    {r.status === 'RESERVED' && canManage && (
                      <Button
                        size="sm"
                        onClick={() =>
                          lifecycle.mutate({ type: 'checkout', id: r.id })
                        }
                      >
                        Check out
                      </Button>
                    )}
                    {r.status === 'CHECKED_OUT' && canManage && (
                      <Button
                        size="sm"
                        onClick={() =>
                          lifecycle.mutate({ type: 'returnRental', id: r.id })
                        }
                      >
                        Return
                      </Button>
                    )}
                    {canManage &&
                      (r.status === 'PENDING' || r.status === 'RESERVED') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            lifecycle.mutate({ type: 'cancel', id: r.id })
                          }
                        >
                          Cancel
                        </Button>
                      )}
                  </div>
                ),
              },
            ]}
            rows={rows}
            searchPlaceholder="Search rentals…"
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {canManage ? 'Book walk-in rental' : 'Book rental'}
            </DialogTitle>
            <DialogDescription>
              Availability is checked against existing rentals and lesson-room
              bookings. The server calculates the rental total.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {canManage && (
              <SelectField
                label="Customer"
                options={customerRows.map((c) => ({
                  value: c.id,
                  label:
                    [c.person?.firstName, c.person?.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    c.person?.email ||
                    c.id,
                }))}
                value={form.customerId}
                onChange={(v) => setForm({ ...form, customerId: v || '' })}
                placeholder="Choose a customer"
                disabled={customers.isLoading}
              />
            )}

            <SelectField
              label="Type"
              options={[
                { value: 'INSTRUMENT', label: 'Instrument' },
                { value: 'ROOM', label: 'Band room' },
              ]}
              value={form.rentalType}
              onChange={(v) =>
                setForm({
                  ...form,
                  rentalType: v || 'INSTRUMENT',
                  resourceId: '',
                })
              }
            />

            <SelectField
              label="Resource"
              options={resourceRows.map((r) => ({
                value: r.resourceId ?? r.id,
                label:
                  r.instrumentType ??
                  r.roomType ??
                  r.name ??
                  r.resourceId ??
                  r.id,
              }))}
              value={form.resourceId}
              onChange={(v) => setForm({ ...form, resourceId: v || '' })}
              placeholder="Choose a resource"
            />

            <div className="grid gap-2">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) =>
                  setForm({ ...form, scheduledStart: e.currentTarget.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={(e) =>
                  setForm({ ...form, scheduledEnd: e.currentTarget.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Required down payment</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.requiredDownPayment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    requiredDownPayment: e.currentTarget.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={
                !form.resourceId ||
                !form.scheduledStart ||
                !form.scheduledEnd ||
                !form.requiredDownPayment
              }
              onClick={submit}
            >
              {create.isPending ? 'Booking…' : 'Create rental'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(payment)}
        onOpenChange={(value) => !value && setPayment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rental payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {detail.isLoading ? (
              <p>Loading balance…</p>
            ) : (
              <>
                <p>Paid: {formatCurrency(detail.data?.paidAmount)}</p>
                <p className="font-bold">
                  Balance: {formatCurrency(detail.data?.balanceDue)}
                </p>
              </>
            )}
            <div className="grid gap-2">
              <Label>Manual payment</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.currentTarget.value)}
              />
            </div>
            <Button
              disabled={!amount || !payment}
              onClick={() =>
                pay.mutate({
                  id: payment.paymentObligationId,
                  value: amount,
                })
              }
            >
              {pay.isPending ? 'Recording…' : 'Record payment'}
            </Button>
            {history.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading payment history…
              </p>
            ) : (
              <div className="grid gap-2">
                <p className="font-semibold">Payment history</p>
                {unwrap(history.data).length ? (
                  unwrap(history.data).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span>
                        {entry.method ?? entry.provider ?? 'Payment'} ·{' '}
                        {entry.status}
                      </span>
                      <span>{formatCurrency(entry.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payments recorded.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
