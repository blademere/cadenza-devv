import { useCallback, useEffect, useState } from 'react';
import {
  DoorOpenIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createRoom, getRooms, updateRoom } from '@/services/admin/roomsService';

const ROOM_TYPES = ['BAND_ROOM', 'LESSON_ROOM'];

const ROOM_STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'RETIRED'];

const emptyForm = {
  roomType: '',
  capacity: '',
  status: 'AVAILABLE',
};

const formatValue = (value) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRoom, setEditingRoom] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      setRooms(await getRooms());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to load rooms.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void fetchRooms(), 0);

    return () => clearTimeout(timer);
  }, [fetchRooms]);

  const openAdd = () => {
    setEditingRoom(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);

    setForm({
      roomType: room.roomType,
      capacity: String(room.capacity),
      status: room.status,
    });

    setError('');
    setDialogOpen(true);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveRoom = async (event) => {
    event?.preventDefault();

    try {
      setIsSaving(true);
      setError('');

      const data = {
        roomType: form.roomType,
        capacity: Number(form.capacity),
        status: form.status,
      };

      if (editingRoom) {
        await updateRoom(editingRoom.id, data);
      } else {
        await createRoom(data);
      }

      setDialogOpen(false);
      setEditingRoom(null);
      setForm({ ...emptyForm });

      await fetchRooms();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to save room.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>

              <p className="text-muted-foreground">
                Manage rooms available at the music center.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchRooms}
                disabled={isLoading}
              >
                <RefreshCwIcon className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>

              <Button onClick={openAdd}>
                <PlusIcon />
                Add Room
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Card>
            <CardHeader>
              <CardTitle>Room List</CardTitle>

              <CardDescription>
                Rooms registered in the Cadenza Web application.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Loading rooms...
                        </TableCell>
                      </TableRow>
                    ) : rooms.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No rooms added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="rounded-md bg-muted p-2">
                                <DoorOpenIcon className="h-4 w-4" />
                              </div>

                              <span className="font-medium">
                                {formatValue(room.roomType)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>{room.capacity}</TableCell>

                          <TableCell>{formatValue(room.status)}</TableCell>

                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(room)}
                                aria-label={`Edit ${formatValue(room.roomType)}`}
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[460px]">
              <form onSubmit={saveRoom}>
                <DialogHeader>
                  <DialogTitle>
                    {editingRoom ? 'Edit Room' : 'Add Room'}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Room Type</Label>

                    <Select
                      value={form.roomType}
                      onValueChange={(value) => updateForm('roomType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>

                      <SelectContent>
                        {ROOM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatValue(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity</Label>

                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={form.capacity}
                      onChange={(event) =>
                        updateForm('capacity', event.target.value)
                      }
                      required
                    />
                  </div>

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
                        {ROOM_STATUSES.map((status) => (
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={isSaving || !form.roomType}>
                    {isSaving
                      ? 'Saving...'
                      : editingRoom
                        ? 'Save Changes'
                        : 'Add Room'}
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
