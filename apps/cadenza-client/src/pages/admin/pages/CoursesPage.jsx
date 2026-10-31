'use client';

import * as React from 'react';
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PowerIcon,
  PowerOffIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

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
  getCourses,
  deactivateCourse,
  reactivateCourse,
  deactivateCourseMaterial,
  reactivateCourseMaterial,
} from '@/services/admin/courses-materialsService';

import { getEnrollmentPackages } from '@/services/admin/enrollment-packageService';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EMPTY_FORM = {
  packageId: '',
  courseId: '',
  files: [],
};

const isActive = (item) =>
  String(item?.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE';

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
        name: course?.name ?? course?.lessonName ?? '',
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

  if (file?.fileName) {
    return file.fileName;
  }

  if (file?.localFile?.name) {
    return file.localFile.name;
  }

  if (file?.storageReference) {
    return file.storageReference.split('/').pop();
  }

  return 'Course material';
};

const validateCourseForm = (form, courses, packages) => {
  if (typeof form?.packageId !== 'string' || !form.packageId.trim()) {
    return 'Please select a package.';
  }

  const selectedPackage = packages.find(
    (item) => item.id === form.packageId && isActive(item),
  );

  if (!selectedPackage) {
    return 'Selected package is not available.';
  }

  if (typeof form?.courseId !== 'string' || !form.courseId.trim()) {
    return 'Please select a course.';
  }

  const selectedCourse = courses.find(
    (course) => course.id === form.courseId && isActive(course),
  );

  if (!selectedCourse) {
    return 'Selected course is not available.';
  }

  if (
    !Array.isArray(form.files) ||
    form.files.some(
      (file) =>
        !file ||
        (file.localFile && !(file.localFile instanceof File)),
    )
  ) {
    return 'Invalid course files.';
  }

  const newFiles = form.files.filter(
    (file) => file?.localFile instanceof File,
  );

  if (newFiles.length === 0) {
    return 'Select at least one new course material.';
  }

  const oversizedFile = newFiles.find(
    (file) => file.localFile.size > MAX_FILE_SIZE,
  );

  if (oversizedFile) {
    return `${oversizedFile.localFile.name || 'File'} is larger than 10 MB.`;
  }

  const invalidFile = newFiles.find(
    (file) =>
      !file.localFile.name || !file.localFile.name.trim(),
  );

  if (invalidFile) {
    return 'Uploaded file must have a valid name.';
  }

  return null;
};

export default function CoursesPage() {
  const [courses, setCourses] = React.useState([]);
  const [packages, setPackages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingCourse, setDeletingCourse] = React.useState(null);
  const [courseToDeactivate, setCourseToDeactivate] = React.useState(null);
  const [courseToReactivate, setCourseToReactivate] = React.useState(null);
  const [materialToDeactivate, setMaterialToDeactivate] =
    React.useState(null);
  const [materialToReactivate, setMaterialToReactivate] =
    React.useState(null);
  const [deactivatingMaterial, setDeactivatingMaterial] =
    React.useState(false);
  const [actionError, setActionError] = React.useState('');
  const [openingFile, setOpeningFile] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [lockedMaterialTarget, setLockedMaterialTarget] =
    React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);

  React.useEffect(() => {
    if (!actionError) return undefined;

    const timeoutId = window.setTimeout(() => {
      setActionError('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [actionError]);

  const activePackages = React.useMemo(
    () => packages.filter(isActive),
    [packages],
  );

  const activeCourses = React.useMemo(
    () => courses.filter(isActive),
    [courses],
  );

  // Only offer active courses that are not already assigned to this package.
  // Keep the currently selected course available if the selection is retained.
  const selectableCourses = React.useMemo(() => {
    if (!form.packageId) {
      return [];
    }

    return activeCourses.filter(
      (course) =>
        course.id === form.courseId ||
        !course.packageIds.includes(form.packageId),
    );
  }, [activeCourses, form.packageId, form.courseId]);

  const listedCourses = React.useMemo(
    () =>
      courses.filter(
        (course) =>
          course.packageIds.length > 0 && course.files.length > 0,
      ),
    [courses],
  );

  const packageGroups = React.useMemo(
    () =>
      listedCourses.reduce((groups, course) => {
        const coursePackages =
          course.packages.length > 0
            ? course.packages
            : [
                {
                  id:
                    course.packageId ||
                    course.packageName ||
                    'unassigned',
                  name: course.packageName || 'Unassigned Package',
                },
              ];

        coursePackages.forEach((packageData) => {
          const existing = groups.find(
            (group) => group.id === packageData.id,
          );

          if (existing) {
            if (
              !existing.courses.some(
                (item) => item.id === course.id,
              )
            ) {
              existing.courses.push(course);
            }
          } else {
            groups.push({
              id: packageData.id,
              name: packageData.name || 'Enrollment Package',
              courses: [course],
            });
          }
        });

        return groups;
      }, []),
    [listedCourses],
  );

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [courseData, packageData] = await Promise.all([
        getCourses(),
        getEnrollmentPackages({ status: 'ACTIVE' }),
      ]);

      setCourses(
        Array.isArray(courseData)
          ? courseData.map(mapCourse)
          : [],
      );

      setPackages(
        Array.isArray(packageData)
          ? packageData.map(mapPackage).filter(isActive)
          : [],
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
      ...EMPTY_FORM,
      files: [],
    });
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openAddMaterials = (course, packageId) => {
    setLockedMaterialTarget(true);

    setForm({
      packageId: packageId || course.packageIds?.[0] || '',
      courseId: course.id || '',
      files: [],
    });

    setDialogOpen(true);
  };

  const handleFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) {
      return;
    }

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10 MB.`);
        return false;
      }

      if (!file.name || !file.name.trim()) {
        toast.error('Uploaded file must have a valid name.');
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
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
    }

    // Allow the same file to be selected again after removal.
    event.target.value = '';
  };

  const removePendingFile = (index) => {
    setForm((current) => ({
      ...current,
      files: current.files.filter(
        (_, fileIndex) => fileIndex !== index,
      ),
    }));
  };

  const saveCourse = async () => {
    const validationError = validateCourseForm(
      form,
      courses,
      activePackages,
    );

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const newFiles = form.files.filter(
      (file) => file?.localFile instanceof File,
    );

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append('packageId', form.packageId);
      formData.append('courseId', form.courseId);

      newFiles.forEach((file) => {
        formData.append('files', file.localFile);
      });

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

  const handleDeactivateCourse = async (course) => {
    try {
      setActionError('');
      setDeletingCourse(course.id);

      await deactivateCourse(course.id);

      toast.success('Course deactivated successfully.');

      await loadData();
    } catch (error) {
      console.error('Failed to deactivate course:', error);
      setActionError(error?.message || 'Failed to deactivate course.');
    } finally {
      setDeletingCourse(null);
    }
  };

  const confirmDeactivateCourse = async () => {
    if (!courseToDeactivate || deletingCourse) return;

    await handleDeactivateCourse(courseToDeactivate);
    setCourseToDeactivate(null);
  };

  const confirmReactivateCourse = async () => {
    if (!courseToReactivate || deletingCourse) return;

    try {
      setActionError('');
      setDeletingCourse(courseToReactivate.id);
      await reactivateCourse(courseToReactivate.id);
      toast.success('Course reactivated successfully.');
      setCourseToReactivate(null);
      await loadData();
    } catch (error) {
      setActionError(error?.message || 'Failed to reactivate course.');
    } finally {
      setDeletingCourse(null);
    }
  };

  const confirmDeactivateMaterial = async () => {
    if (!materialToDeactivate || deactivatingMaterial) return;

    try {
      setActionError('');
      setDeactivatingMaterial(true);
      await deactivateCourseMaterial(
        materialToDeactivate.course.id,
        materialToDeactivate.material.id,
      );
      toast.success('Course material deactivated successfully.');
      setMaterialToDeactivate(null);
      await loadData();
    } catch (error) {
      setActionError(
        error?.message || 'Failed to deactivate course material.',
      );
    } finally {
      setDeactivatingMaterial(false);
    }
  };

  const confirmReactivateMaterial = async () => {
    if (!materialToReactivate || deactivatingMaterial) return;

    try {
      setActionError('');
      setDeactivatingMaterial(true);
      await reactivateCourseMaterial(
        materialToReactivate.course.id,
        materialToReactivate.material.id,
      );
      toast.success('Course material reactivated successfully.');
      setMaterialToReactivate(null);
      await loadData();
    } catch (error) {
      setActionError(
        error?.message || 'Failed to reactivate course material.',
      );
    } finally {
      setDeactivatingMaterial(false);
    }
  };

  const openFile = async (file, courseId) => {
    if (!file?.storageReference || !courseId) {
      toast.error('File URL is not available.');
      return;
    }

    const fileName = file.storageReference.split('/').pop();

    if (!fileName) {
      toast.error('File name is not available.');
      return;
    }

    let blobUrl;

    try {
      setOpeningFile(file.id || file.storageReference);

      const response = await apiClient.file(
        `/courses/${courseId}/${encodeURIComponent(fileName)}`,
      );

      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

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

      window.setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      console.error('Failed to open course material:', error);
      toast.error(
        error?.message || 'Failed to open course material.',
      );
    } finally {
      setOpeningFile(null);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {actionError && (
            <div
              role="alert"
              aria-live="assertive"
              className="fixed right-4 bottom-4 z-[100] flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-lg"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
              />
              <span>{actionError}</span>
            </div>
          )}

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
                    Courses with Materials
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
                  <CardDescription>Total Materials</CardDescription>

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
                View courses and their materials grouped by enrollment
                package.
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
                  No active courses with materials found.
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {packageGroups.map((group) => (
                    <Card
                      key={group.id}
                      className="overflow-hidden"
                    >
                      <CardHeader className="border-b bg-muted/30">
                        <CardTitle>{group.name}</CardTitle>

                        <CardDescription>
                          {group.courses.length} course
                          {group.courses.length === 1 ? '' : 's'} mapped
                          to this package
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-0">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b bg-muted/20 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <span>Course and Materials</span>
                          <span>Actions</span>
                        </div>

                        <div>
                          {group.courses.map((course) => (
                            <div
                              key={`${group.id}-${course.id}`}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b px-5 py-4 last:border-b-0"
                            >
                              <div className="min-w-0 space-y-3">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">
                                    {course.name ||
                                      course.lessonName ||
                                      'Course'}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      isActive(course)
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className={`size-1.5 rounded-full ${
                                        isActive(course)
                                          ? 'bg-emerald-500'
                                          : 'bg-red-500'
                                      }`}
                                    />
                                    {isActive(course) ? 'Active' : 'Inactive'}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {course.files.map((file, index) => {
                                    const fileName = getFileName(file);
                                    const fileKey =
                                      file.id ||
                                      file.storageReference ||
                                      `${course.id}-${index}`;
                                    const isOpening =
                                      openingFile ===
                                      (file.id || file.storageReference);

                                    return (
                                      <div
                                        key={fileKey}
                                        className={`flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm ${isActive(file) ? 'text-primary' : 'text-muted-foreground opacity-70'}`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => openFile(file, course.id)}
                                          disabled={isOpening || !isActive(file)}
                                          className="group flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
                                        >
                                          {isOpening ? (
                                            <Loader2Icon className="h-4 w-4 shrink-0 animate-spin" />
                                          ) : (
                                            <FileTextIcon className="h-4 w-4 shrink-0" />
                                          )}

                                          <span className="min-w-0 flex-1 truncate">
                                          {fileName}
                                          </span>
                                        </button>

                                        {!isActive(file) ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                            title={`Activate ${fileName}`}
                                            aria-label={`Activate ${fileName}`}
                                            onClick={() =>
                                              setMaterialToReactivate({
                                                course,
                                                material: file,
                                              })
                                            }
                                            disabled={deactivatingMaterial}
                                          >
                                            <PowerIcon className="h-3.5 w-3.5" />
                                          </Button>
                                        ) : (
                                          <>
                                            <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive"
                                              title={`Deactivate ${fileName}`}
                                              aria-label={`Deactivate ${fileName}`}
                                              onClick={() =>
                                                setMaterialToDeactivate({
                                                  course,
                                                  material: file,
                                                })
                                              }
                                            >
                                              <PowerOffIcon className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-accent disabled:opacity-50"
                                  disabled={
                                    deletingCourse === course.id
                                  }
                                  aria-label={`Actions for ${course.name || 'course'}`}
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

                                  {isActive(course) ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        setCourseToDeactivate(course)
                                      }
                                    >
                                      <PowerOffIcon className="mr-2 h-4 w-4" />
                                      Deactivate Course
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="text-emerald-600 focus:text-emerald-700"
                                      onClick={() =>
                                        setCourseToReactivate(course)
                                      }
                                    >
                                      <PowerIcon className="mr-2 h-4 w-4" />
                                      Activate Course
                                    </DropdownMenuItem>
                                  )}
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
            <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-[500px] flex-col gap-0 overflow-hidden p-0">
              <DialogHeader className="shrink-0 border-b p-6">
                <DialogTitle>
                  Add Course Materials
                </DialogTitle>

                <DialogDescription>
                  Select an active enrollment package and course, then
                  upload new materials. Existing materials will be
                  preserved.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">
                <div className="grid gap-2">
                  <Label htmlFor="package">
                    Enrollment Package
                  </Label>

                  {lockedMaterialTarget ? (
                    <div className="flex min-h-10 items-center rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      {activePackages.find(
                        (item) => item.id === form.packageId,
                      )?.name || 'Package unavailable'}
                    </div>
                  ) : (
                    <select
                      id="package"
                      value={form.packageId}
                      onChange={(event) => {
                        const packageId = event.target.value;

                        setForm((current) => ({
                          ...current,
                          packageId,
                          courseId: '',
                        }));
                      }}
                      disabled={saving || loading}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">
                        Select an enrollment package
                      </option>

                      {activePackages.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="course">Course</Label>

                  {lockedMaterialTarget ? (
                    <div className="flex min-h-10 items-center rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      {activeCourses.find(
                        (course) => course.id === form.courseId,
                      )?.name || 'Course unavailable'}
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
                      disabled={
                        saving ||
                        loading ||
                        !form.packageId ||
                        selectableCourses.length === 0
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">
                        Select a course
                      </option>

                      {selectableCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name || course.lessonName || 'Course'}
                        </option>
                      ))}
                    </select>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Only active courses that are not already assigned
                    to the selected package are available here.
                  </p>

                  {!lockedMaterialTarget &&
                    form.packageId &&
                    selectableCourses.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No available active courses for this package.
                      </p>
                    )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="course-files">
                    Course Materials
                  </Label>

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
                        Select PDF or other course files. Maximum size:
                        10 MB per file.
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
                      {form.files.map((file, index) => (
                        <div
                          key={
                            file.id ||
                            `${file.fileName || getFileName(file)}-${index}`
                          }
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

                            <span className="truncate text-sm">
                              {getFileName(file)}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={saving}
                            onClick={() => removePendingFile(index)}
                            aria-label={`Remove ${getFileName(file)}`}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t p-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={saveCourse}
                  disabled={saving || loading}
                >
                  {saving && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Course Materials
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(courseToDeactivate)}
            onOpenChange={(open) => {
              if (!deletingCourse && !open) setCourseToDeactivate(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate course?</DialogTitle>
                <DialogDescription>
                  {courseToDeactivate
                    ? `Deactivate ${courseToDeactivate.name || 'this course'}? Existing records and materials will be preserved.`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCourseToDeactivate(null)}
                  disabled={Boolean(deletingCourse)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeactivateCourse}
                  disabled={Boolean(deletingCourse)}
                >
                  {deletingCourse && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Deactivate course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(materialToDeactivate)}
            onOpenChange={(open) => {
              if (!deactivatingMaterial && !open) {
                setMaterialToDeactivate(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate course material?</DialogTitle>
                <DialogDescription>
                  {materialToDeactivate
                    ? `Deactivate ${getFileName(materialToDeactivate.material)}? The material will be preserved but no longer available for use.`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaterialToDeactivate(null)}
                  disabled={deactivatingMaterial}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeactivateMaterial}
                  disabled={deactivatingMaterial}
                >
                  {deactivatingMaterial && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Deactivate material
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(courseToReactivate)}
            onOpenChange={(open) => {
              if (!deletingCourse && !open) setCourseToReactivate(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Activate course?</DialogTitle>
                <DialogDescription>
                  {courseToReactivate
                    ? `Activate ${courseToReactivate.name || 'this course'}? It will become available again for new enrollments.`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCourseToReactivate(null)}
                  disabled={Boolean(deletingCourse)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={confirmReactivateCourse}
                  disabled={Boolean(deletingCourse)}
                >
                  {deletingCourse && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Activate course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(materialToReactivate)}
            onOpenChange={(open) => {
              if (!deactivatingMaterial && !open) {
                setMaterialToReactivate(null);
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Activate course material?</DialogTitle>
                <DialogDescription>
                  {materialToReactivate
                    ? `Activate ${getFileName(materialToReactivate.material)}? It will become available for use again.`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaterialToReactivate(null)}
                  disabled={deactivatingMaterial}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={confirmReactivateMaterial}
                  disabled={deactivatingMaterial}
                >
                  {deactivatingMaterial && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Activate material
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
