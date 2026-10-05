'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableCell,
  TableRow,
} from '@/components/ui/Table';

import {
  Card,
  CardContent,
  CardTitle,
  CardHeader,
  CardDescription,
} from '@/components/ui/Card';

import { Input } from '@/components/ui/Input';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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
  createInstrument,
  getInstruments,
  updateInstrument,
} from '@/services/admin/instrumentsService';
import {
  getInstrumentTypes,
  getItemCategories,
} from '@/services/admin/settingsService';

const INSTRUMENT_STATUSES = [
  'AVAILABLE',
  'UNAVAILABLE',
  'MAINTENANCE',
  'RETIRED',
];

const emptyForm = {
  itemCategoryId: '',
  instrumentTypeId: '',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'AVAILABLE',
};

const formatStatus = (value) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-';

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState([]);
  const [instrumentTypes, setInstrumentTypes] = useState([]);
  const [itemCategories, setItemCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modelError, setModelError] = useState('');
  const [serialNumberError, setSerialNumberError] = useState('');

  const fetchInstruments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const [data, types, categories] = await Promise.all([
        getInstruments(),
        getInstrumentTypes('ACTIVE'),
        getItemCategories(),
      ]);

      let result = Array.isArray(data) ? data : [];

      setInstruments(result);
      setInstrumentTypes(Array.isArray(types) ? types : []);
      setItemCategories(
        Array.isArray(categories)
          ? categories.filter((category) => category.status === 'ACTIVE')
          : [],
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to load instruments.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  const filteredInstruments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return instruments;
    }

    return instruments.filter((instrument) =>
      [instrument.brand, instrument.model, instrument.serialNumber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [instruments, search]);

  const updateForm = (field, value) => {
    if (field === 'model') {
      setModelError('');
    }

    if (field === 'serialNumber') {
      setSerialNumberError('');
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openAddDialog = () => {
    setEditingInstrument(null);
    setForm({ ...emptyForm });
    setError('');
    setModelError('');
    setSerialNumberError('');
    setShowDialog(true);
  };

  const openEditDialog = (instrument) => {
    setEditingInstrument(instrument);

    setForm({
      itemCategoryId:
        instrument.itemCategoryId ||
        instrument.itemCategory?.id ||
        '',
      instrumentTypeId:
        instrument.instrumentTypeId || instrument.instrumentType?.id || '',
      brand: instrument.brand || '',
      model: instrument.model || '',
      serialNumber: instrument.serialNumber || '',
      status: instrument.status || 'AVAILABLE',
    });

    setError('');
    setModelError('');
    setSerialNumberError('');
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setModelError('');
      setSerialNumberError('');

      const model = form.model.trim();
      const serialNumber = form.serialNumber.trim();
      const normalizedModel = model.toLowerCase();
      const normalizedSerialNumber = serialNumber.toLowerCase();
      const duplicateModel = model
        ? instruments.find(
            (instrument) =>
              instrument.id !== editingInstrument?.id &&
              instrument.model?.trim().toLowerCase() === normalizedModel,
          )
        : null;
      const duplicateSerialNumber = serialNumber
        ? instruments.find(
            (instrument) =>
              instrument.id !== editingInstrument?.id &&
              instrument.serialNumber?.trim().toLowerCase() ===
                normalizedSerialNumber,
          )
        : null;

      if (duplicateModel || duplicateSerialNumber) {
        if (duplicateModel) {
          setModelError('An instrument with this model already exists.');
        }

        if (duplicateSerialNumber) {
          setSerialNumberError(
            'An instrument with this serial number already exists.',
          );
        }

        return;
      }

      const data = {
        status: form.status,
      };

      if (editingInstrument) {
        await updateInstrument(editingInstrument.id, data);
      } else {
        await createInstrument({
          instrumentTypeId: form.instrumentTypeId || null,
          itemCategoryId: form.itemCategoryId || null,
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          serialNumber: form.serialNumber.trim() || null,
          status: form.status,
        });
      }

      setShowDialog(false);
      setEditingInstrument(null);
      setForm({ ...emptyForm });

      await fetchInstruments();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          'Failed to save instrument.',
      );

      const message =
        requestError?.response?.data?.message ||
        requestError?.message ||
        '';

      if (message.includes('model already exists')) {
        setModelError(message);
      }

      if (message.includes('serial number already exists')) {
        setSerialNumberError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                Instruments & Equipments
              </h1>

              <p className="text-muted-foreground">
                Manage instrument details and availability.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchInstruments}
                disabled={isLoading}
              >
                <RefreshCwIcon className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>

              <Button onClick={openAddDialog}>
                <PlusIcon />
                Add Item
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Card>
            <CardHeader>
              <CardTitle>Instrument List</CardTitle>

              <CardDescription>
                All instruments currently registered in the system.
              </CardDescription>

              <div className="flex items-center justify-between gap-2 pt-4">
                <div className="relative max-w-sm flex-1">
                  <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />

                  <Input
                    className="pl-9"
                    placeholder="Search instrument..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Item</TableHead>

                      <TableHead>Brand</TableHead>

                      <TableHead>Model</TableHead>

                      <TableHead>Serial Number</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Loading instruments...
                        </TableCell>
                      </TableRow>
                    ) : filteredInstruments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No instruments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInstruments.map((instrument) => (
                        <TableRow key={instrument.id}>
                            <TableCell className="font-medium">
                              {instrument.itemCategory?.name || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {instrument.instrumentType?.name || '-'}
                          </TableCell>

                          <TableCell>{instrument.brand || '-'}</TableCell>

                          <TableCell>{instrument.model || '-'}</TableCell>

                          <TableCell>
                            {instrument.serialNumber || '-'}
                          </TableCell>

                          <TableCell>
                            {formatStatus(instrument.status)}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(instrument)}
                                aria-label="Edit instrument"
                              >
                                <PencilIcon />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingInstrument ? 'Update Instrument Status' : 'Add Item'}
                </DialogTitle>

                <DialogDescription>
                  {editingInstrument
                    ? 'Update the status for this instrument.'
                    : 'Add a new instrument and set its details.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-4">
                {!editingInstrument && (
                  <>
                <div className="grid gap-2">
                  <Label htmlFor="instrument-category">Category</Label>
                  <Select
                    value={form.itemCategoryId}
                    onValueChange={(value) =>
                      updateForm('itemCategoryId', value)
                    }
                  >
                    <SelectTrigger disabled={Boolean(editingInstrument)}>
                      <SelectValue placeholder="Select a category">
                        {itemCategories.find(
                          (category) => category.id === form.itemCategoryId,
                        )?.name || 'Select a category'}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      {itemCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label htmlFor="instrument-type">Instrument Type</Label>
                  <Select
                    value={form.instrumentTypeId}
                    onValueChange={(value) =>
                      updateForm('instrumentTypeId', value)
                    }
                  >
                    <SelectTrigger disabled={Boolean(editingInstrument)}>
                      <SelectValue placeholder="Select an instrument type">
                        {instrumentTypes.find(
                          (type) => type.id === form.instrumentTypeId,
                        )?.name || 'Select an instrument type'}
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      {instrumentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label htmlFor="instrument-brand">Brand</Label>

                  <Input
                    id="instrument-brand"
                    placeholder="e.g. Yamaha"
                    value={form.brand}
                    onChange={(event) =>
                      updateForm('brand', event.target.value)
                    }
                    disabled={Boolean(editingInstrument)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="instrument-model">Model</Label>

                  <Input
                    id="instrument-model"
                    placeholder="e.g. FG800"
                    value={form.model}
                    onChange={(event) =>
                      updateForm('model', event.target.value)
                    }
                    disabled={Boolean(editingInstrument)}
                    className={modelError ? 'border-destructive' : ''}
                    aria-invalid={Boolean(modelError)}
                    aria-describedby={modelError ? 'instrument-model-error' : undefined}
                  />
                  {modelError && (
                    <p
                      id="instrument-model-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {modelError}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="instrument-serial">Serial Number</Label>

                  <Input
                    id="instrument-serial"
                    placeholder="Optional"
                    value={form.serialNumber}
                    onChange={(event) =>
                      updateForm('serialNumber', event.target.value)
                    }
                    disabled={Boolean(editingInstrument)}
                    className={
                      serialNumberError ? 'border-destructive' : ''
                    }
                    aria-invalid={Boolean(serialNumberError)}
                    aria-describedby={
                      serialNumberError
                        ? 'instrument-serial-error'
                        : undefined
                    }
                  />
                  {serialNumberError && (
                    <p
                      id="instrument-serial-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {serialNumberError}
                    </p>
                  )}
                </div>
                  </>
                )}

                <div className="grid gap-2">
                  <Label>Status</Label>

                  <Select
                    value={form.status}
                    onValueChange={(value) => updateForm('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {INSTRUMENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving
                    ? 'Saving...'
                    : editingInstrument
                    ? 'Update Status'
                      : 'Add Instrument'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
