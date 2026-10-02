'use client';

import * as React from 'react';
import {
BookOpenIcon,
ExternalLinkIcon,
FileTextIcon,
Loader2Icon,
MoreHorizontalIcon,
PencilIcon,
PowerOffIcon,
PlusIcon,
Trash2Icon,
UploadIcon,
XIcon,
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
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from '@/components/ui/dialog';

import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { toast } from 'sonner';

import { apiClient } from '@/core/api/apiClient';

import {
createCourse,
deleteCourse,
deleteCourseAttachment,
getCourses,
updateCourse,
deactivateCourse,
} from '@/services/admin/courses-materialsService';

import { getEnrollmentPackages } from '@/services/admin/enrollment-packageService';

const EMPTY_FORM = {
packageId: '',
courseId: '',
files: [],
};

const mapCourse = (item) => ({
id: item?.id,
packageId: item?.packageId ?? '',
packageName: item?.packageName ?? '',
packages: Array.isArray(item?.packages) ? item.packages : [],
packageIds: Array.isArray(item?.packageIds)
  ? item.packageIds
  : item?.packageId
    ? [item.packageId]
    : [],
name: item?.name ?? item?.lessonName ?? '',
lessonName: item?.name ?? item?.lessonName ?? '',
status: item?.status ?? 'ACTIVE',
files: Array.isArray(item?.files) ? item.files : [],
createdAt: item?.createdAt,
updatedAt: item?.updatedAt,
});

const mapPackage = (item) => ({
id: item?.id,
name: item?.name ?? '',
price: Number(item?.price ?? 0),
status: item?.status ?? 'ACTIVE',
courses: Array.isArray(item?.lessons)
  ? item.lessons.map((course) => ({
      id: course?.id,
      name: course?.name ?? '',
    }))
  : [],
});

const getFileName = (file) => {
if (file?.metadata?.fileName) {
return file.metadata.fileName;
}

if (file?.metadata?.name) {
return file.metadata.name;
}

if (file?.storageReference) {
return file.storageReference.split('/').pop();
}

return 'Course material';
};

export default function CoursesPage() {
const [courses, setCourses] = React.useState([]);
const [packages, setPackages] = React.useState([]);
const [loading, setLoading] = React.useState(true);
const [saving, setSaving] = React.useState(false);
const [deletingCourse, setDeletingCourse] = React.useState(null);
const [deletingAttachment, setDeletingAttachment] = React.useState(null);
const [openingFile, setOpeningFile] = React.useState(null);
const [dialogOpen, setDialogOpen] = React.useState(false);
const [editingCourse, setEditingCourse] = React.useState(null);
const [lockedMaterialTarget, setLockedMaterialTarget] = React.useState(false);
const [form, setForm] = React.useState(EMPTY_FORM);

// A mapped course can be selected again so additional materials can be
// appended without changing or replacing its existing materials.
const selectableCourses = courses.filter(
  (course) =>
    course.status === 'ACTIVE' &&
    (course.id === form.courseId ||
      !course.packageIds.includes(form.packageId)),
);

const listedCourses = courses.filter(
  (course) =>
    course.status === 'ACTIVE' &&
    course.packageIds.length > 0 && course.files.length > 0,
);

const packageGroups = listedCourses.reduce((groups, course) => {
  const coursePackages = course.packages.length > 0
    ? course.packages
    : [{
        id: course.packageId || course.packageName || 'unassigned',
        name: course.packageName || 'Unassigned Package',
      }];

  coursePackages.forEach((packageData) => {
    const existing = groups.find((group) => group.id === packageData.id);

    if (existing) {
      existing.courses.push(course);
    } else {
      groups.push({
        id: packageData.id,
        name: packageData.name,
        courses: [course],
      });
    }
  });

  return groups;
}, []);

const loadData = React.useCallback(async () => {
try {
setLoading(true);

  const [courseData, packageData] = await Promise.all([
    getCourses(),
    getEnrollmentPackages({
      status: 'ACTIVE',
    }),
  ]);

  setCourses(
    Array.isArray(courseData) ? courseData.map(mapCourse) : [],
  );

  setPackages(
    Array.isArray(packageData) ? packageData.map(mapPackage) : [],
  );
} catch (error) {
  console.error('Failed to load courses:', error);

  toast.error(error?.message || 'Failed to load courses.');
} finally {
  setLoading(false);
}

}, []);

React.useEffect(() => {
loadData();
}, [loadData]);

const resetForm = () => {
setLockedMaterialTarget(false);
setForm({
packageId: '',
courseId: '',
files: [],
});

setEditingCourse(null);

};

const openAdd = () => {
resetForm();
setDialogOpen(true);
};

const openAddMaterials = (course, packageId) => {
  setEditingCourse(null);
  setLockedMaterialTarget(true);
  setForm({
    packageId: packageId || course.packageIds?.[0] || '',
    courseId: course.id || '',
    files: [],
  });
  setDialogOpen(true);
};

const openEdit = (course) => {
setEditingCourse(course);

setForm({
  packageId: course.packageId || '',
  courseId: course.id || '',
  files: Array.isArray(course.files) ? course.files : [],
});

setDialogOpen(true);

};

const handleFiles = (event) => {
const selectedFiles = Array.from(event.target.files || []);

if (!selectedFiles.length) {
  return;
}

const maxSize = 10 * 1024 * 1024;

const validFiles = selectedFiles.filter((file) => {
  if (file.size > maxSize) {
    toast.error(`${file.name} is larger than 10 MB.`);
    return false;
  }

  return true;
});

if (!validFiles.length) {
  event.target.value = '';
  return;
}

const newFiles = validFiles.map((file) => ({
  localFile: file,
  fileName: file.name,
  type: file.type,
  size: file.size,
}));

setForm((current) => ({
  ...current,
  files: [...current.files, ...newFiles],
}));

event.target.value = '';

};

const removePendingFile = (index) => {
setForm((current) => ({
...current,
files: current.files.filter((_, fileIndex) => fileIndex !== index),
}));
};

const removeExistingAttachment = async (attachment) => {
if (!editingCourse?.id || !attachment?.id) {
return;
}

try {
  setDeletingAttachment(attachment.id);

  await deleteCourseAttachment(editingCourse.id, attachment.id);

  toast.success('Course material removed successfully.');

  const refreshed = await getCourses();

  const mapped = Array.isArray(refreshed)
    ? refreshed.map(mapCourse)
    : [];

  setCourses(mapped);

  const course = mapped.find(
    (item) => item.id === editingCourse.id,
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
    error?.message || 'Failed to remove course material.',
  );
} finally {
  setDeletingAttachment(null);
}

};

const saveCourse = async () => {
if (!form.packageId) {
toast.error('Please select a package.');
return;
}

if (!form.courseId) {
  toast.error('Please select a course.');
  return;
}

const newFiles = form.files.filter(
  (file) => file?.localFile instanceof File,
);

if (newFiles.length === 0) {
  toast.error('Select at least one new course material.');
  return;
}

try {
  setSaving(true);

  const formData = new FormData();

  formData.append('packageId', form.packageId);
  formData.append('courseId', form.courseId);

  newFiles.forEach((file) => {
    formData.append('files', file.localFile);
  });

  // Always create an attachment record. Existing materials are never
  // replaced, edited, or removed from this page.
  await createCourse(formData);

  toast.success('Course materials added successfully.');

  setDialogOpen(false);
  resetForm();

  await loadData();
} catch (error) {
  console.error('Failed to save course materials:', error);

  toast.error(
    error?.message || 'Failed to save course materials.',
  );
} finally {
  setSaving(false);
}

};

const handleDeleteCourse = async (id) => {
try {
setDeletingCourse(id);

  await deleteCourse(id);

  toast.success('Course deleted successfully.');

  await loadData();
} catch (error) {
  console.error(error);

  toast.error(
    error?.message || 'Failed to delete course.',
  );
} finally {
  setDeletingCourse(null);
}

};

const handleDeactivateCourse = async (course) => {
  if (
    !window.confirm(
      `Deactivate ${course.name || 'this course'}? Existing records and materials will be preserved.`,
    )
  ) {
    return;
  }

  try {
    setDeletingCourse(course.id);

    await deactivateCourse(course.id);

    toast.success('Course deactivated successfully.');

    await loadData();
  } catch (error) {
    console.error(error);

    toast.error(
      error?.message || 'Failed to deactivate course.',
    );
  } finally {
    setDeletingCourse(null);
  }
};

const openFile = async (file, courseId) => {
if (!file?.storageReference || !courseId) {
toast.error('File URL is not available.');
return;
}

const fileName = file.storageReference
  .split('/')
  .pop();

if (!fileName) {
  toast.error('File name is not available.');
  return;
}

try {
  setOpeningFile(file.id);

  const response = await apiClient.file(
    `/courses/${courseId}/${encodeURIComponent(fileName)}`,
  );

  const blob = await response.blob();

  const blobUrl = URL.createObjectURL(blob);

  const newWindow = window.open(
    blobUrl,
    '_blank',
    'noopener,noreferrer',
  );

  if (!newWindow) {
    const link = document.createElement('a');

    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

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
    error?.message || 'Failed to open course material.',
  );
} finally {
  setOpeningFile(null);
}

};

return (
<SidebarProvider
style={{
'--sidebar-width': 'calc(var(--spacing) * 72)',
'--header-height': 'calc(var(--spacing) * 12)',
}}
> <AppSidebar variant="inset" />

  <SidebarInset>
    <SiteHeader />

    <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Courses
          </h1>

          <p className="text-muted-foreground">
            Manage courses and their learning materials.
          </p>
        </div>

        <Button onClick={openAdd} disabled={loading}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Course Materials
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>
                Total Courses
              </CardDescription>

              <CardTitle className="text-2xl">
                {listedCourses.length}
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
                    {listedCourses.reduce(
                  (total, course) =>
                    total + course.files.length,
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
          <CardTitle>Courses</CardTitle>

          <CardDescription>
            Courses can be mapped to enrollment packages here.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 rounded-md border text-muted-foreground">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              Loading courses...
            </div>
          ) : packageGroups.length === 0 ? (
            <div className="rounded-md border p-10 text-center text-muted-foreground">
              No mapped courses with materials found.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {packageGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/30">
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group.courses.length} course
                      {group.courses.length === 1 ? '' : 's'} mapped to this package
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.7fr)_auto] gap-4 border-b bg-muted/20 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Course</span>
                      <span>Materials</span>
                      <span aria-hidden="true" />
                    </div>

                    <div>
                      {group.courses.map((course) => (
                        <div
                          key={course.id}
                          className="grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.7fr)_auto] items-start gap-4 border-b px-5 py-4 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <h3 className="font-semibold">
                              {course.name || course.lessonName || 'Course'}
                            </h3>
                          </div>

                          <div className="min-w-0 space-y-2">
                            {course.files.map((file) => {
                              const fileName = getFileName(file);
                              const isOpening = openingFile === file.id;

                              return (
                                <button
                                  key={file.id || file.storageReference}
                                  type="button"
                                  onClick={() => openFile(file, course.id)}
                                  disabled={isOpening}
                                  className="group flex w-full items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-left text-sm text-primary hover:bg-muted disabled:opacity-60"
                                >
                                  {isOpening ? (
                                    <Loader2Icon className="h-4 w-4 shrink-0 animate-spin" />
                                  ) : (
                                    <FileTextIcon className="h-4 w-4 shrink-0" />
                                  )}
                                  <span className="min-w-0 flex-1 truncate">
                                    {fileName}
                                  </span>
                                  <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                </button>
                              );
                            })}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-accent"
                              disabled={deletingCourse === course.id}
                            >
                              {deletingCourse === course.id ? (
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontalIcon className="h-4 w-4" />
                              )}
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  openAddMaterials(course, group.id)
                                }
                              >
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Add Materials
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeactivateCourse(course)}
                              >
                                <PowerOffIcon className="mr-2 h-4 w-4" />
                                Deactivate Course
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Materials</TableHead>
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
                        Loading courses...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : listedCourses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No courses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  listedCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <span className="font-medium">
                          {course.packageName || '—'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm font-medium">
                          {course.lessonName || '—'}
                        </span>
                      </TableCell>

                      <TableCell>
                        {course.files.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {course.files.map((file) => {
                              const fileName =
                                getFileName(file);

                              const isOpening =
                                openingFile === file.id;

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
                                      course.id,
                                    )
                                  }
                                  disabled={isOpening}
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
                            })}
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
                                deletingCourse === course.id
                              }
                            >
                              {deletingCourse === course.id ? (
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontalIcon className="h-4 w-4" />
                              )}
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  openAddMaterials(course, group.id)
                                }
                              >
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Add Materials
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
                                  Delete Course
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
            <DialogTitle>Add Course Materials</DialogTitle>

            <DialogDescription>
              Select an enrollment package and course, then add new
              materials. Existing materials cannot be edited here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="package">
                Enrollment Package
              </Label>

              {lockedMaterialTarget ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {packages.find((item) => item.id === form.packageId)?.name || '—'}
                </div>
              ) : (
                <select
                  id="package"
                  value={form.packageId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      packageId: event.target.value,
                      courseId: '',
                    }))
                  }
                  disabled={saving}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">
                    Select an enrollment package
                  </option>

                  {packages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="course">
                Course
              </Label>

              {lockedMaterialTarget ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {courses.find((course) => course.id === form.courseId)?.name || '—'}
                </div>
              ) : (
                <select
                  id="course"
                  value={form.courseId}
                  onChange={(event) => {
                    const courseId = event.target.value;

                    setForm((current) => ({
                      ...current,
                      courseId,
                    }));
                  }}
                  disabled={saving || !form.packageId}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">
                    Select a course
                  </option>

                  {selectableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              )}

              <p className="text-xs text-muted-foreground">
                Select a course name, then assign it to the selected package.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Course Materials</Label>

              <div className="rounded-md border border-dashed p-4">
                <label
                  htmlFor="course-files"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
                >
                  <UploadIcon className="h-6 w-6 text-muted-foreground" />

                  <span className="text-sm font-medium">
                    Upload course materials
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Select PDF or other course files
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
                  {form.files.map((file, index) => {
                    const isExisting = Boolean(file.id);

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
                              ? getFileName(file)
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
                            removePendingFile(index)
                          }
                        >
                          {deletingAttachment === file.id ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <XIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
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

            <Button
              onClick={saveCourse}
              disabled={saving}
            >
              {saving && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}

              Add Course Materials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  </SidebarInset>
</SidebarProvider>

);
}
