import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Clock3Icon,
  DoorOpenIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react'

import { AppSidebar } from '../components/app-sidebar'
import { SiteHeader } from '../components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getRoomRentals, updateRoomRental } from '@/services/admin/room-rentalsService'

const emptyForm = {
  rentalRate: '',
  duration: '2',
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Not Set'
  }

  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function RoomRentalsPage() {
  const [rooms, setRooms] = useState([])
  const [durationMap, setDurationMap] = useState({})
  const [editingRoom, setEditingRoom] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const data = await getRoomRentals()

      setRooms(data || [])
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        'Failed to load room rentals.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void fetchRooms(), 0)

    return () => clearTimeout(timer)
  }, [fetchRooms])

  const configuredRooms = useMemo(
    () => rooms.filter((room) => room.rentalRate !== null && room.rentalRate !== undefined),
    [rooms]
  )

  const openAdd = (room) => {
    setEditingRoom(room)

    setForm({
      rentalRate:
        room.rentalRate !== null && room.rentalRate !== undefined
          ? String(room.rentalRate)
          : '',
      duration: durationMap[room.id] || '2',
    })

    setError('')
    setDialogOpen(true)
  }

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const saveRental = async (event) => {
    event?.preventDefault()

    if (!editingRoom) return

    try {
      setIsSaving(true)
      setError('')

      const rentalRate = Number(form.rentalRate)
      const duration = Number(form.duration)

      if (!Number.isFinite(rentalRate) || rentalRate <= 0) {
        throw new Error('Rental rate must be greater than zero.')
      }

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Duration must be greater than zero.')
      }

      await updateRoomRental(editingRoom.id, {
        rentalRate,
      })

      setDurationMap((current) => ({
        ...current,
        [editingRoom.id]: String(duration),
      }))

      setDialogOpen(false)
      setEditingRoom(null)
      setForm({ ...emptyForm })

      await fetchRooms()
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        'Failed to save rental setup.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Room Rentals
              </h1>

              <p className="text-muted-foreground">
                Configure rental rates and durations for available rooms.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={fetchRooms}
              disabled={isLoading}
            >
              <RefreshCwIcon
                className={isLoading ? 'animate-spin' : ''}
              />
              Refresh
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>Total Rooms</CardDescription>
                <CardTitle className="text-3xl">
                  {rooms.length}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Configured Rentals</CardDescription>
                <CardTitle className="text-3xl">
                  {configuredRooms.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rental Setup</CardTitle>

              <CardDescription>
                Rooms created from the Rooms feature appear here
                automatically.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Rental Rate</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center"
                        >
                          Loading rooms...
                        </TableCell>
                      </TableRow>
                    ) : rooms.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No rooms available. Add a room first.
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
                                {room.roomType}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            {room.capacity}
                          </TableCell>

                          <TableCell>
                            {formatCurrency(room.rentalRate)}
                          </TableCell>

                          <TableCell>
                            {durationMap[room.id] ? (
                              <div className="flex items-center gap-1.5">
                                <Clock3Icon className="h-4 w-4 text-muted-foreground" />
                                {durationMap[room.id]} hours
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Not Set
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {room.rentalRate !== null &&
                            room.rentalRate !== undefined ? (
                              <span className="text-sm font-medium">
                                Configured
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Not Configured
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAdd(room)}
                                aria-label={`Configure ${room.roomType}`}
                              >
                                {room.rentalRate !== null &&
                                room.rentalRate !== undefined ? (
                                  <PencilIcon />
                                ) : (
                                  <PlusIcon />
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
            </CardContent>
          </Card>

          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          >
            <DialogContent className="sm:max-w-[460px]">
              <form onSubmit={saveRental}>
                <DialogHeader>
                  <DialogTitle>
                    {editingRoom?.rentalRate !== null &&
                    editingRoom?.rentalRate !== undefined
                      ? 'Edit Rental Setup'
                      : 'Set Rental Setup'}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-background p-2">
                        <DoorOpenIcon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-medium">
                          {editingRoom?.roomType}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Capacity: {editingRoom?.capacity}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rental-rate">
                      Rental Rate
                    </Label>

                    <Input
                      id="rental-rate"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 300"
                      value={form.rentalRate}
                      onChange={(event) =>
                        updateForm(
                          'rentalRate',
                          event.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration">
                      Duration
                    </Label>

                    <div className="relative">
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 2"
                        value={form.duration}
                        onChange={(event) =>
                          updateForm(
                            'duration',
                            event.target.value
                          )
                        }
                        required
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        hours
                      </span>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Saving...'
                      : editingRoom?.rentalRate !== null &&
                        editingRoom?.rentalRate !== undefined
                        ? 'Save Changes'
                        : 'Set Rental'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}