"use client";

import * as React from "react";
import {
  BookOpenIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { toast } from "sonner";

import {
  createCourse,
  deleteCourse,
  getCourses,
  updateCourse,
} from "@/services/admin/courses-materialsService";

const EMPTY_FORM = {
  courseName: "",
};

const mapCourse = (item) => ({
  id: item?.id,
  name: item?.name || item?.lessonName || "Unnamed course",
});

export default function SettingsPage() {
  const [courses, setCourses] = React.useState([]);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [editingCourse, setEditingCourse] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const courseData = await getCourses();
      setCourses(
        Array.isArray(courseData) ? courseData.map(mapCourse) : [],
      );
    } catch (error) {
      toast.error(error?.message || "Failed to load course setup.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditingCourse(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setForm({
      courseName: course.name,
    });
    setDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!form.courseName.trim()) {
      toast.error("Course name is required.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("courseName", form.courseName.trim());

      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
        toast.success("Course updated successfully.");
      } else {
        await createCourse(formData);
        toast.success("Course created successfully.");
      }

      setDialogOpen(false);
      setEditingCourse(null);
      setForm({ ...EMPTY_FORM });
      await loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    if (
      !window.confirm(
        `Delete ${course.name}? Its materials will also be removed.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(course.id);
      await deleteCourse(course.id);
      toast.success("Course deleted successfully.");
      await loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to delete course.");
    } finally {
      setDeletingId(null);
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
              <h1 className="text-2xl font-semibold tracking-tight">
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage Cadenza setup areas. More configuration sections can be added here over time.
              </p>
            </div>

            <Button onClick={openAdd} disabled={loading}>
              <PlusIcon />
              Add Course
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BookOpenIcon className="size-5 text-primary" />
                <div>
                  <CardTitle>Course Setup</CardTitle>
                  <CardDescription>
                    Course names are created here. Package mapping is handled in Courses.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                          <Loader2Icon className="mx-auto animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : courses.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No courses configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.name}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(course)}
                                aria-label={`Edit ${course.name}`}
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(course)}
                                disabled={deletingId === course.id}
                                aria-label={`Delete ${course.name}`}
                              >
                                {deletingId === course.id ? (
                                  <Loader2Icon className="animate-spin" />
                                ) : (
                                  <Trash2Icon />
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCourse ? "Edit Course" : "Add Course"}
                </DialogTitle>
              <DialogDescription>
                Create a course name. Package mapping is handled in Courses.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="course-name">Course Name</Label>
                  <Input
                    id="course-name"
                    value={form.courseName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        courseName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Beginner Piano"
                    disabled={saving}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={saveCourse} disabled={saving}>
                  {saving && <Loader2Icon className="animate-spin" />}
                  {editingCourse ? "Save Changes" : "Add Course"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
