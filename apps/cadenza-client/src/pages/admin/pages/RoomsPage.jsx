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
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { apiClient } from '@/core/api/apiClient';
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
  createRoom,
  getRooms,
  updateRoom,
} from '@/services/admin/roomsService';

const ROOM_TYPES = {
  BAND: 'BAND_ROOM',
  LESSON: 'LESSON_ROOM',
};

const ROOM_STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'RETIRED'];

const emptyForm = {
  roomType: '',
  roomName: '',
  capacity: '',
  status: 'AVAILABLE',
  courseIds: [],
};

const formatValue = (value) =>
  value
    ?.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '-';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRoom, setEditingRoom] = useState(null);

  const [bandRoomDialogOpen, setBandRoomDialogOpen] = useState(false);
  const [lessonRoomDialogOpen, setLessonRoomDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [roomNameError, setRoomNameError] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const data = await getRooms();
      setRooms(Array.isArray(data) ? data : []);
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

  const fetchCourses = useCallback(async () => {
    try {
      const response = await apiClient.get('/courses');
      const data = response?.data ?? response;
      const courseList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setCourses(courseList);
    } catch (requestError) {
      setError(
        requestError.message || 'Failed to load courses.',
      );
      setCourses([]);
      throw requestError;
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchCourses();
  }, [fetchRooms, fetchCourses]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingRoom(null);
    setRoomNameError('');
  };

  const closeDialogs = () => {
    setBandRoomDialogOpen(false);
    setLessonRoomDialogOpen(false);
    resetForm();
  };

  const openAddBandRoom = () => {
    setError('');
    resetForm();

    setForm({
      ...emptyForm,
      roomType: ROOM_TYPES.BAND,
    });

    setBandRoomDialogOpen(true);
  };

  const openAddLessonRoom = () => {
    setError('');
    resetForm();

    setForm({
      ...emptyForm,
      roomType: ROOM_TYPES.LESSON,
    });

    setLessonRoomDialogOpen(true);
  };

  const openEdit = async (room) => {
    setError('');
    setRoomNameError('');

    try {
      await fetchCourses();
    } catch {
      return;
    }

    setEditingRoom(room);

    setForm({
      roomType: room.roomType || '',
      roomName: room.roomName || '',
      capacity: String(room.capacity ?? ''),
      status: room.status || 'AVAILABLE',
      courseIds: Array.isArray(room.courseIds)
        ? room.courseIds.map((courseId) => String(courseId))
        : [],
    });

    if (room.roomType === ROOM_TYPES.BAND) {
      setBandRoomDialogOpen(true);
    } else if (room.roomType === ROOM_TYPES.LESSON) {
      setLessonRoomDialogOpen(true);
    }
  };

  const updateForm = (field, value) => {
    if (field === 'roomName') {
      setRoomNameError('');
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveRoom = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError('');
      setRoomNameError('');

      const capacity = Number(form.capacity);

      if (!form.roomType) {
        setError('Please select a room type.');
        return;
      }

      if (
        form.roomType === ROOM_TYPES.BAND &&
        (!Number.isInteger(capacity) || capacity < 1)
      ) {
        setError('Capacity must be at least 1.');
        return;
      }

      if (!form.roomName.trim()) {
        setRoomNameError('Please enter a room name.');
        return;
      }

      const roomName = form.roomName.trim().toLowerCase();
      const duplicateRoom = rooms.find(
        (room) =>
          room.id !== editingRoom?.id &&
          room.roomName?.trim().toLowerCase() === roomName,
      );

      if (duplicateRoom) {
        setRoomNameError('Room name already exists.');
        return;
      }

      if (
        form.roomType === ROOM_TYPES.LESSON &&
        form.courseIds.length === 0
      ) {
        setError('Please select at least one course.');
        return;
      }

      const data = {
        roomType: form.roomType,
        status: form.status,
        roomName: form.roomName.trim(),
        ...(form.roomType === ROOM_TYPES.BAND
          ? { capacity }
          : {}),
        ...(form.roomType === ROOM_TYPES.LESSON && {
          courseIds: form.courseIds,
        }),
      };

      if (editingRoom) {
        await updateRoom(editingRoom.id, data);
      } else {
        await createRoom(data);
      }

      closeDialogs();
      await fetchRooms();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Failed to save room.',
      );
      if (
        (requestError.response?.data?.message ||
          requestError.message) === 'Room name already exists.'
      ) {
        setRoomNameError('Room name already exists.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const bandRooms = rooms.filter((room) => room.roomType === ROOM_TYPES.BAND);

  const lessonRooms = rooms.filter(
    (room) => room.roomType === ROOM_TYPES.LESSON,
  );

  const renderRoomRows = (
    roomList,
    emptyMessage,
    showCapacity,
    showCourses = false,
  ) => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            Loading rooms...
          </TableCell>
        </TableRow>
      );
    }

    if (roomList.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={4}
            className="h-24 text-center text-muted-foreground"
          >
            {emptyMessage}
          </TableCell>
        </TableRow>
      );
    }

    return roomList.map((room) => (
      <TableRow key={room.id}>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted p-2">
              <DoorOpenIcon className="h-4 w-4" />
            </div>

            <span className="font-medium">
              {room.roomName || formatValue(room.roomType)}
            </span>
          </div>
        </TableCell>

        {showCapacity && <TableCell>{room.capacity}</TableCell>}

        {showCourses && (
          <TableCell>
            {room.courses?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {room.courses.map((course) => (
                  <span
                    key={course.id}
                    className="rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    {course.name || course.lessonName || 'Unnamed course'}
                    {course.status !== 'ACTIVE' && (
                      <span
                        className="ml-1 text-destructive"
                        title="This course is inactive"
                        aria-label="Inactive course"
                      >
                        *
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">No courses</span>
            )}
          </TableCell>
        )}

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
    ));
  };

  const renderRoomDialog = ({ open, onOpenChange, roomType }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={saveRoom}>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Edit Room' : `Add ${formatValue(roomType)}`}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`${roomType}-name`}>Room Name</Label>

              <Input
                id={`${roomType}-name`}
                placeholder={
                  roomType === ROOM_TYPES.BAND
                    ? 'e.g. Band Room A'
                    : 'e.g. Room 101'
                }
                value={form.roomName}
                onChange={(event) =>
                  updateForm('roomName', event.target.value)
                }
                required
                className={roomNameError ? 'border-destructive' : ''}
                aria-invalid={Boolean(roomNameError)}
                aria-describedby={
                  roomNameError ? `${roomType}-name-error` : undefined
                }
              />
              {roomNameError && (
                <p
                  id={`${roomType}-name-error`}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {roomNameError}
                </p>
              )}
            </div>

            {roomType === ROOM_TYPES.LESSON && (
              <div className="grid gap-2">
                <Label>Courses</Label>

                {courses.some((course) => course.status === 'ACTIVE') ? (
                  <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border p-3">
                    {courses
                      .filter((course) => course.status === 'ACTIVE')
                      .map((course) => {
                      const courseId = String(course.id);
                      const isSelected = form.courseIds.includes(courseId);

                      return (
                        <label
                          key={course.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) => {
                              const nextCourseIds = event.target.checked
                                ? [...form.courseIds, courseId]
                                : form.courseIds.filter(
                                    (selectedId) => selectedId !== courseId,
                                  );

                              updateForm('courseIds', nextCourseIds);
                            }}
                          />
                          {course.name || course.courseName || course.title}
                        </label>
                      );
                      })}
                  </div>
                ) : (
                  <p className="rounded-md border p-3 text-sm text-muted-foreground">
                    No courses available
                  </p>
                )}
              </div>
            )}

            {roomType === ROOM_TYPES.BAND && (
              <div className="grid gap-2">
                <Label htmlFor={`${roomType}-capacity`}>Capacity</Label>

                <Input
                  id={`${roomType}-capacity`}
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
            )}

            <div className="grid gap-2">
              <Label>Status</Label>

              <Select
                value={form.status}
                onValueChange={(value) => updateForm('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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
              onClick={closeDialogs}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isSaving ||
                !form.roomType ||
                !form.roomName.trim() ||
                (roomType === ROOM_TYPES.BAND && !form.capacity) ||
                (roomType === ROOM_TYPES.LESSON && form.courseIds.length === 0)
              }
            >
              {isSaving
                ? 'Saving...'
                : editingRoom
                  ? 'Save Changes'
                  : `Add ${formatValue(roomType)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

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

            <Button variant="outline" onClick={fetchRooms} disabled={isLoading}>
              <RefreshCwIcon
                className={
                  isLoading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'
                }
              />
              Refresh
            </Button>
          </div>

          {error && !bandRoomDialogOpen && !lessonRoomDialogOpen && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Band Rooms</CardTitle>

                  <CardDescription>
                    Band rooms registered in the Cadenza application.
                  </CardDescription>
                </div>

                <Button onClick={openAddBandRoom}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Name</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {renderRoomRows(bandRooms, 'No band rooms added yet.', true)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Lesson Rooms</CardTitle>

                  <CardDescription>
                    Lesson rooms registered in the Cadenza application.
                  </CardDescription>
                </div>

                <Button onClick={openAddLessonRoom}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Name</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {renderRoomRows(
                      lessonRooms,
                      'No lesson rooms added yet.',
                      false,
                      true,
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {renderRoomDialog({
            open: bandRoomDialogOpen,
            onOpenChange: (open) => {
              setBandRoomDialogOpen(open);

              if (!open) {
                resetForm();
              }
            },
            roomType: ROOM_TYPES.BAND,
          })}

          {renderRoomDialog({
            open: lessonRoomDialogOpen,
            onOpenChange: (open) => {
              setLessonRoomDialogOpen(open);

              if (!open) {
                resetForm();
              }
            },
            roomType: ROOM_TYPES.LESSON,
          })}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
