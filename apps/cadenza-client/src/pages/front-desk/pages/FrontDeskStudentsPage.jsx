import { useState } from "react";
import { SearchIcon } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const students = [
  {
    id: 1,
    name: "Maria Santos",
    email: "maria@example.com",
    phone: "09171234567",
    instrument: "Piano",
    instructor: "John Cruz",
    status: "Active",
  },
  {
    id: 2,
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    phone: "09181234567",
    instrument: "Guitar",
    instructor: "Mark Reyes",
    status: "Active",
  },
  {
    id: 3,
    name: "Sofia Garcia",
    email: "sofia@example.com",
    phone: "09191234567",
    instrument: "Violin",
    instructor: "Anna Lee",
    status: "Inactive",
  },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.email} ${student.instrument}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Students</h1>
              <p className="text-muted-foreground">
                Manage students registered at Cadenza Music Center.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>
              <CardDescription>
                View and manage all registered students.
              </CardDescription>

              <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        {/* Student */}
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.name}</div>

                            <div className="text-sm text-muted-foreground">
                              {student.email}
                            </div>
                          </div>
                        </TableCell>

                        {/* Instrument */}
                        <TableCell>{student.instrument}</TableCell>

                        {/* Instructor */}
                        <TableCell>{student.instructor}</TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "Active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>

                        {/* View Details */}
                        <TableCell className="text-right" onClick={() => handleViewDetails(student)}>
                          <Button variant="link" className="h-auto p-0">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Student Details</DialogTitle>
                <DialogDescription>
                  View the student's personal and enrollment information.
                </DialogDescription>
              </DialogHeader>

              {selectedStudent && (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedStudent.name}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedStudent.phone}</p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedStudent.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Information */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">
                      Enrollment Information
                    </h3>

                    <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Instrument
                        </p>
                        <p className="font-medium">
                          {selectedStudent.instrument}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Instructor
                        </p>
                        <p className="font-medium">
                          {selectedStudent.instructor}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>

                        <Badge
                          variant={
                            selectedStudent.status === "Active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedStudent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Close */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowDetails(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
