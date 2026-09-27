"use client";

import * as React from "react";
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";

import { apiClient } from "@/core/api/apiClient";

import {
  createCourse,
  deleteCourse,
  deleteCourseAttachment,
  getCourses,
  updateCourse,
} from "@/features/admin/courses-materials.api";

import {
  getEnrollmentPackages,
} from "@/features/admin/enrollment-package.api";

const EMPTY_FORM = {
  packageId: "",
  lessonName: "",
  files: [],
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const mapCourse = (item) => ({
  id: item?.id,
  packageId: item?.packageId ?? "",
  packageName: item?.packageName ?? "",
  lessonName: item?.lessonName ?? item?.name ?? "",
  files: Array.isArray(item?.files)
    ? item.files
    : [],
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const mapPackage = (item) => ({
  id: item?.id,
  name: item?.name ?? "",
  price: Number(item?.price ?? 0),
  status: item?.status ?? "ACTIVE",
});

const getFileName = (file) => {
  if (file?.metadata?.fileName) {
    return file.metadata.fileName;
  }

  if (file?.metadata?.name) {
    return file.metadata.name;
  }

  if (file?.storageReference) {
    return file.storageReference.split("/").pop();
  }

  return "Lesson material";
};

const getFileUrl = (file) => {
  if (!file?.storageReference) {
    return null;
  }

  const reference = file.storageReference.trim();

  if (
    reference.startsWith("http://") ||
    reference.startsWith("https://")
  ) {
    return reference;
  }

  if (reference.startsWith("/api/v1/")) {
    return reference;
  }

  if (reference.startsWith("api/v1/")) {
    return `/${reference}`;
  }

  return `${API_BASE_URL}/${reference.replace(
    /^\/+/,
    "",
  )}`;
};

export default function CoursesPage() {
  const [courses, setCourses] =
    React.useState([]);

  const [packages, setPackages] =
    React.useState([]);

  const [loading, setLoading] =
    React.useState(true);

  const [saving, setSaving] =
    React.useState(false);

  const [deletingCourse, setDeletingCourse] =
    React.useState(null);

  const [
    deletingAttachment,
    setDeletingAttachment,
  ] = React.useState(null);

  const [openingFile, setOpeningFile] =
    React.useState(null);

  const [dialogOpen, setDialogOpen] =
    React.useState(false);

  const [editingCourse, setEditingCourse] =
    React.useState(null);

  const [form, setForm] =
    React.useState(EMPTY_FORM);

  const loadData =
    React.useCallback(async () => {
      try {
        setLoading(true);

        const [courseData, packageData] =
          await Promise.all([
            getCourses(),
            getEnrollmentPackages({
              status: "ACTIVE",
            }),
          ]);

        setCourses(
          Array.isArray(courseData)
            ? courseData.map(mapCourse)
            : [],
        );

        setPackages(
          Array.isArray(packageData)
            ? packageData.map(mapPackage)
            : [],
        );
      } catch (error) {
        console.error(
          "Failed to load courses:",
          error,
        );

        toast.error(
          error?.message ||
            "Failed to load courses.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm({
      packageId: "",
      lessonName: "",
      files: [],
    });

    setEditingCourse(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourse(course);

    setForm({
      packageId: course.packageId || "",
      lessonName: course.lessonName || "",
      files: Array.isArray(course.files)
        ? course.files
        : [],
    });

    setDialogOpen(true);
  };

  const handleFiles = (event) => {
    const selectedFiles = Array.from(
      event.target.files || [],
    );

    if (!selectedFiles.length) {
      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    const validFiles =
      selectedFiles.filter((file) => {
        if (file.size > maxSize) {
          toast.error(
            `${file.name} is larger than 10 MB.`,
          );

          return false;
        }

        return true;
      });

    if (!validFiles.length) {
      event.target.value = "";
      return;
    }

    const newFiles =
      validFiles.map((file) => ({
        localFile: file,
        fileName: file.name,
        type: file.type,
        size: file.size,
      }));

    setForm((current) => ({
      ...current,
      files: [
        ...current.files,
        ...newFiles,
      ],
    }));

    event.target.value = "";
  };

  const removePendingFile = (index) => {
    setForm((current) => ({
      ...current,
      files: current.files.filter(
        (_, fileIndex) =>
          fileIndex !== index,
      ),
    }));
  };

  const removeExistingAttachment =
    async (attachment) => {
      if (
        !editingCourse?.id ||
        !attachment?.id
      ) {
        return;
      }

      try {
        setDeletingAttachment(
          attachment.id,
        );

        await deleteCourseAttachment(
          editingCourse.id,
          attachment.id,
        );

        toast.success(
          "Lesson material removed successfully.",
        );

        const refreshed =
          await getCourses();

        const mapped =
          Array.isArray(refreshed)
            ? refreshed.map(mapCourse)
            : [];

        setCourses(mapped);

        const course =
          mapped.find(
            (item) =>
              item.id ===
              editingCourse.id,
          );

        if (course) {
          setEditingCourse(course);

          setForm((current) => ({
            ...current,
            files: course.files,
          }));
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Failed to remove lesson material.",
        );
      } finally {
        setDeletingAttachment(null);
      }
    };

  const saveCourse = async () => {
    if (!form.packageId) {
      toast.error(
        "Please select a package.",
      );
      return;
    }

    if (!form.lessonName.trim()) {
      toast.error(
        "Lesson name is required.",
      );
      return;
    }

    const newFiles =
      form.files.filter(
        (file) =>
          file?.localFile instanceof File,
      );

    if (
      !editingCourse &&
      newFiles.length === 0
    ) {
      toast.error(
        "At least one lesson material is required.",
      );
      return;
    }

    try {
      setSaving(true);

      const formData =
        new FormData();

      formData.append(
        "packageId",
        form.packageId,
      );

      formData.append(
        "lessonName",
        form.lessonName.trim(),
      );

      newFiles.forEach((file) => {
        formData.append(
          "files",
          file.localFile,
        );
      });

      if (editingCourse?.id) {
        await updateCourse(
          editingCourse.id,
          formData,
        );

        toast.success(
          "Lesson updated successfully.",
        );
      } else {
        await createCourse(formData);

        toast.success(
          "Lesson created successfully.",
        );
      }

      setDialogOpen(false);
      resetForm();

      await loadData();
    } catch (error) {
      console.error(
        "Failed to save lesson:",
        error,
      );

      toast.error(
        error?.message ||
          "Failed to save lesson.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse =
    async (id) => {
      try {
        setDeletingCourse(id);

        await deleteCourse(id);

        toast.success(
          "Lesson deleted successfully.",
        );

        await loadData();
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Failed to delete lesson.",
        );
      } finally {
        setDeletingCourse(null);
      }
    };

  const openFile = async (file) => {
    const fileUrl =
      getFileUrl(file);

    if (!fileUrl) {
      toast.error(
        "File URL is not available.",
      );
      return;
    }

    try {
      setOpeningFile(file.id);

      const url = new URL(
        fileUrl,
        window.location.origin,
      );

      let apiPath =
        `${url.pathname}${url.search}`;

      if (
        apiPath.startsWith("/api/v1/")
      ) {
        apiPath = apiPath.replace(
          "/api/v1",
          "",
        );
      }

      const response =
        await apiClient.file(apiPath);

      const blob =
        await response.blob();

      const blobUrl =
        URL.createObjectURL(blob);

      const newWindow =
        window.open(
          blobUrl,
          "_blank",
          "noopener,noreferrer",
        );

      if (!newWindow) {
        const link =
          document.createElement("a");

        link.href = blobUrl;
        link.target = "_blank";
        link.rel =
          "noopener noreferrer";

        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to open lesson material.",
      );
    } finally {
      setOpeningFile(null);
    }
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width":
          "calc(var(--spacing) * 72)",
        "--header-height":
          "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Lessons
              </h1>

              <p className="text-muted-foreground">
                Manage lessons and their learning materials.
              </p>
            </div>

            <Button
              onClick={openAdd}
              disabled={loading}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardDescription>
                    Total Lessons
                  </CardDescription>

                  <CardTitle className="text-2xl">
                    {courses.length}
                  </CardTitle>
                </div>

                <BookOpenIcon className="h-6 w-6 text-primary" />
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardDescription>
                    Total Materials
                  </CardDescription>

                  <CardTitle className="text-2xl">
                    {courses.reduce(
                      (total, course) =>
                        total +
                        course.files.length,
                      0,
                    )}
                  </CardTitle>
                </div>

                <FileTextIcon className="h-6 w-6 text-primary" />
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Lessons
              </CardTitle>

              <CardDescription>
                Lessons assigned to enrollment packages.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Package
                      </TableHead>

                      <TableHead>
                        Lesson Name
                      </TableHead>

                      <TableHead>
                        Materials
                      </TableHead>

                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-32 text-center"
                        >
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                            Loading lessons...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : courses.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No lessons found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <span className="font-medium">
                              {course.packageName ||
                                "—"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm font-medium">
                              {course.lessonName ||
                                "—"}
                            </span>
                          </TableCell>

                          <TableCell>
                            {course.files.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {course.files.map(
                                  (file) => {
                                    const fileName =
                                      getFileName(
                                        file,
                                      );

                                    const isOpening =
                                      openingFile ===
                                      file.id;

                                    return (
                                      <button
                                        key={
                                          file.id ||
                                          file.storageReference
                                        }
                                        type="button"
                                        onClick={() =>
                                          openFile(
                                            file,
                                          )
                                        }
                                        disabled={
                                          isOpening
                                        }
                                        className="group flex w-fit max-w-full items-center gap-2 text-left text-sm text-primary hover:underline disabled:opacity-60"
                                      >
                                        {isOpening ? (
                                          <Loader2Icon className="h-4 w-4 shrink-0 animate-spin" />
                                        ) : (
                                          <FileTextIcon className="h-4 w-4 shrink-0" />
                                        )}

                                        <span className="max-w-[400px] truncate">
                                          {fileName}
                                        </span>

                                        <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No materials
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                                  disabled={
                                    deletingCourse ===
                                    course.id
                                  }
                                >
                                  {deletingCourse ===
                                  course.id ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontalIcon className="h-4 w-4" />
                                  )}
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openEdit(
                                        course,
                                      )
                                    }
                                  >
                                    <PencilIcon className="mr-2 h-4 w-4" />
                                    Edit Lesson
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      handleDeleteCourse(
                                        course.id,
                                      )
                                    }
                                  >
                                    <Trash2Icon className="mr-2 h-4 w-4" />
                                    Delete Lesson
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
            onOpenChange={(open) => {
              if (saving) {
                return;
              }

              setDialogOpen(open);

              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCourse
                    ? "Edit Lesson"
                    : "Add Lesson"}
                </DialogTitle>

                <DialogDescription>
                  Assign a lesson name to an enrollment package and upload its materials.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="package">
                    Enrollment Package
                  </Label>

                  <select
                    id="package"
                    value={form.packageId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        packageId:
                          event.target.value,
                      }))
                    }
                    disabled={saving}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">
                      Select an enrollment package
                    </option>

                    {packages.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lessonName">
                    Lesson Name
                  </Label>

                  <Input
                    id="lessonName"
                    value={form.lessonName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lessonName:
                          event.target.value,
                      }))
                    }
                    placeholder="Enter lesson name"
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>
                    Lesson Materials
                  </Label>

                  <div className="rounded-md border border-dashed p-4">
                    <label
                      htmlFor="course-files"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
                    >
                      <UploadIcon className="h-6 w-6 text-muted-foreground" />

                      <span className="text-sm font-medium">
                        Upload lesson materials
                      </span>

                      <span className="text-xs text-muted-foreground">
                        Select PDF or other lesson files
                      </span>

                      <Input
                        id="course-files"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFiles}
                        disabled={saving}
                      />
                    </label>
                  </div>

                  {form.files.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {form.files.map(
                        (file, index) => {
                          const isExisting =
                            Boolean(file.id);

                          return (
                            <div
                              key={
                                file.id ||
                                `${file.fileName}-${index}`
                              }
                              className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

                                <span className="truncate text-sm">
                                  {isExisting
                                    ? getFileName(
                                        file,
                                      )
                                    : file.fileName}
                                </span>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={
                                  saving ||
                                  deletingAttachment ===
                                    file.id
                                }
                                onClick={() =>
                                  isExisting
                                    ? removeExistingAttachment(
                                        file,
                                      )
                                    : removePendingFile(
                                        index,
                                      )
                                }
                              >
                                {deletingAttachment ===
                                file.id ? (
                                  <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setDialogOpen(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  onClick={saveCourse}
                  disabled={saving}
                >
                  {saving && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {editingCourse
                    ? "Save Changes"
                    : "Add Lesson"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}