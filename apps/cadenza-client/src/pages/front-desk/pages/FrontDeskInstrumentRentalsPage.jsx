"use client";

import { useState } from "react";
import { FileIcon, ChevronDown, Check, X } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* --------------------------------------------------
   Mock Data
-------------------------------------------------- */

const initialRentals = [
  {
    id: "RNT-001",
    student: "Juan Dela Cruz",
    email: "juan@example.com",
    phone: "09181234567",

    instrument: "Yamaha Grand Piano",
    type: "Piano",

    rentalDate: "Sep 10, 2026",
    returnDate: "Sep 17, 2026",

    rentalFee: "₱2,500",
    deposit: "₱1,000",
    totalAmount: "₱3,500",

    paymentStatus: "Paid",
    paymentMethod: "GCash",
    paymentReference: "GC-20260910-001",
    paymentDate: "Sep 9, 2026",

    status: "Pending",
  },

  {
    id: "RNT-002",
    student: "Maria Santos",
    email: "maria@example.com",
    phone: "09171234567",

    instrument: "Fender Acoustic Guitar",
    type: "Guitar",

    rentalDate: "Sep 11, 2026",
    returnDate: "Sep 18, 2026",

    rentalFee: "₱1,500",
    deposit: "₱500",
    totalAmount: "₱2,000",

    paymentStatus: "Paid",
    paymentMethod: "Cash",
    paymentReference: "CASH-20260911-001",
    paymentDate: "Sep 10, 2026",

    status: "Approved",
  },

  {
    id: "RNT-003",
    student: "Pedro Reyes",
    email: "pedro@example.com",
    phone: "09191234567",

    instrument: "Yamaha Violin",
    type: "Violin",

    rentalDate: "Sep 12, 2026",
    returnDate: "Sep 19, 2026",

    rentalFee: "₱1,200",
    deposit: "₱500",
    totalAmount: "₱1,700",

    paymentStatus: "Pending",
    paymentMethod: "GCash",
    paymentReference: "GC-20260912-003",
    paymentDate: "Sep 11, 2026",

    status: "Pending",
  },

  {
    id: "RNT-004",
    student: "Ana Garcia",
    email: "ana@example.com",
    phone: "09181239876",

    instrument: "Fender Electric Guitar",
    type: "Guitar",

    rentalDate: "Sep 13, 2026",
    returnDate: "Sep 20, 2026",

    rentalFee: "₱2,000",
    deposit: "₱1,000",
    totalAmount: "₱3,000",

    paymentStatus: "Paid",
    paymentMethod: "GCash",
    paymentReference: "GC-20260913-004",
    paymentDate: "Sep 12, 2026",

    status: "Rejected",
  },
];

/* --------------------------------------------------
   Page
-------------------------------------------------- */

export default function RentalsPage() {
  const [rentals, setRentals] = useState(initialRentals);

  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedRental, setSelectedRental] = useState(null);

  const [showDetails, setShowDetails] = useState(false);

  /* --------------------------------------------------
     Filter
  -------------------------------------------------- */

  const filteredRentals =
    statusFilter === "All"
      ? rentals
      : rentals.filter((rental) => rental.status === statusFilter);

  /* --------------------------------------------------
     View Details
  -------------------------------------------------- */

  const handleViewDetails = (rental) => {
    setSelectedRental(rental);
    setShowDetails(true);
  };

  /* --------------------------------------------------
     Approve
  -------------------------------------------------- */

  const handleApprove = () => {
    if (!selectedRental) return;

    setRentals((currentRentals) =>
      currentRentals.map((rental) =>
        rental.id === selectedRental.id
          ? {
              ...rental,
              status: "Approved",
            }
          : rental,
      ),
    );

    setSelectedRental((current) =>
      current
        ? {
            ...current,
            status: "Approved",
          }
        : null,
    );
  };

  /* --------------------------------------------------
     Reject
  -------------------------------------------------- */

  const handleReject = () => {
    if (!selectedRental) return;

    setRentals((currentRentals) =>
      currentRentals.map((rental) =>
        rental.id === selectedRental.id
          ? {
              ...rental,
              status: "Rejected",
            }
          : rental,
      ),
    );

    setSelectedRental((current) =>
      current
        ? {
            ...current,
            status: "Rejected",
          }
        : null,
    );
  };

  /* --------------------------------------------------
     Status Badge
  -------------------------------------------------- */

  const getStatusVariant = (status) => {
    if (status === "Approved") {
      return "default";
    }

    if (status === "Rejected") {
      return "destructive";
    }

    return "secondary";
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          {/* ---------------------------------------------
              Page Header
          --------------------------------------------- */}
          <div>
            <h1 className="text-2xl font-semibold">Rentals</h1>

            <p className="text-muted-foreground">
              Review and manage instrument rental requests.
            </p>
          </div>
          {/* ---------------------------------------------
              Rental Card
          --------------------------------------------- */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Rental Requests</CardTitle>

                  <CardDescription>
                    View and manage all instrument rental requests.
                  </CardDescription>
                </div>

                {/* -----------------------------------------
                    Status Filter
                ----------------------------------------- */}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-w-[140px] justify-between"
                    >
                      {statusFilter === "All" ? "All Rentals" : statusFilter}

                      <ChevronDown className="ml-2 size-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                      All Rentals
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Pending")}
                    >
                      Pending
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Approved")}
                    >
                      Approved
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setStatusFilter("Rejected")}
                    >
                      Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {/* ---------------------------------------------
                Table
            --------------------------------------------- */}

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rental ID</TableHead>

                      <TableHead>Student</TableHead>

                      <TableHead>Instrument</TableHead>

                      <TableHead>Rental Period</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="w-[80px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRentals.length > 0 ? (
                      filteredRentals.map((rental) => (
                        <TableRow key={rental.id}>
                          {/* Rental ID */}

                          <TableCell className="font-medium">
                            {rental.id}
                          </TableCell>

                          {/* Student */}

                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {rental.student}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {rental.email}
                              </div>
                            </div>
                          </TableCell>

                          {/* Instrument */}

                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {rental.instrument}
                              </div>

                              <div className="text-sm text-muted-foreground">
                                {rental.type}
                              </div>
                            </div>
                          </TableCell>

                          {/* Rental Period */}

                          <TableCell>
                            <div>
                              <div>{rental.rentalDate}</div>

                              <div className="text-sm text-muted-foreground">
                                to {rental.returnDate}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status */}

                          <TableCell>
                            <Badge variant={getStatusVariant(rental.status)}>
                              {rental.status}
                            </Badge>
                          </TableCell>

                          {/* Actions */}

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View rental details"
                              onClick={() => handleViewDetails(rental)}
                            >
                              <FileIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No rental requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* ---------------------------------------------
              Rental Details Dialog
          --------------------------------------------- */}
          ```jsx
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="sm:max-w-[520px]">
              {selectedRental && (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <DialogTitle>Rental Request</DialogTitle>
                        <DialogDescription>
                          {selectedRental.id} · Review rental information
                        </DialogDescription>
                      </div>

                      <Badge variant={getStatusVariant(selectedRental.status)}>
                        {selectedRental.status}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Student & Instrument */}
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Student
                          </p>
                          <p className="font-medium">
                            {selectedRental.student}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Instrument
                          </p>
                          <p className="font-medium">
                            {selectedRental.instrument}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="truncate font-medium">
                            {selectedRental.email}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedRental.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Rental Period */}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">
                        Rental Period
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Rental Date
                          </p>
                          <p className="font-medium">
                            {selectedRental.rentalDate}
                          </p>
                        </div>

                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">
                            Return Date
                          </p>
                          <p className="font-medium">
                            {selectedRental.returnDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Payment</h3>

                        <Badge
                          variant={
                            selectedRental.paymentStatus === "Paid"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedRental.paymentStatus}
                        </Badge>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Rental Fee
                            </p>
                            <p className="font-medium">
                              {selectedRental.rentalFee}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Deposit
                            </p>
                            <p className="font-medium">
                              {selectedRental.deposit}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Total
                            </p>
                            <p className="font-semibold">
                              {selectedRental.totalAmount}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Method
                            </p>
                            <p className="font-medium">
                              {selectedRental.paymentMethod}
                            </p>
                          </div>

                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">
                              Reference
                            </p>
                            <p className="font-medium">
                              {selectedRental.paymentReference}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <DialogFooter className="border-t pt-4">
                    {selectedRental.status === "Pending" ? (
                      <>
                        <Button variant="outline" onClick={handleReject}>
                          <X className="mr-2 size-4" />
                          Reject
                        </Button>

                        <Button
                          onClick={handleApprove}
                          disabled={selectedRental.paymentStatus !== "Paid"}
                        >
                          <Check className="mr-2 size-4" />
                          Approve Rental
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowDetails(false)}
                      >
                        Close
                      </Button>
                    )}
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
