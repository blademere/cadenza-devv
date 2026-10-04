'use client';

import * as React from 'react';
import {
  BookOpenIcon,
  Loader2Icon,
  PlusIcon,
  ListMusic,
  PowerIcon,
} from 'lucide-react';

import { AppSidebar } from '../components/app-sidebar';
import { SiteHeader } from '../components/site-header';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

import { toast } from 'sonner';

import {
  createCourse,
  deactivateCourse,
  getCourses,
  reactivateCourse,
} from '@/services/admin/courses-materialsService';
import {
  createInstrumentType,
  createItemCategory,
  getItemCategories,
  getInstrumentTypes,
  updateItemCategoryStatus,
  updateInstrumentTypeStatus,
} from '@/services/admin/settingsService';

const EMPTY_COURSE_FORM = {
  courseName: '',
};

const EMPTY_INSTRUMENT_FORM = {
  instrumentType: '',
};
const EMPTY_CATEGORY_FORM = { categoryName: '' };

const INITIAL_COURSES = [];

const INITIAL_INSTRUMENTS = [];

const mapCourse = (item) => ({
  id: item?.id,
  name: item?.name || item?.lessonName || 'Unnamed course',
  status: item?.status || 'ACTIVE',
});

export default function SettingsPage() {
  const [courses, setCourses] = React.useState(INITIAL_COURSES);
  const [instruments, setInstruments] =
    React.useState(INITIAL_INSTRUMENTS);
  const [categories, setCategories] = React.useState([]);

  const [courseForm, setCourseForm] = React.useState(
    EMPTY_COURSE_FORM,
  );

  const [instrumentForm, setInstrumentForm] = React.useState(
    EMPTY_INSTRUMENT_FORM,
  );

  const [courseDialogOpen, setCourseDialogOpen] =
    React.useState(false);

  const [instrumentDialogOpen, setInstrumentDialogOpen] =
    React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] =
    React.useState(false);

  const [courseDeactivateDialogOpen, setCourseDeactivateDialogOpen] =
    React.useState(false);

  const [courseReactivateDialogOpen, setCourseReactivateDialogOpen] =
    React.useState(false);

  const [instrumentDeactivateDialogOpen, setInstrumentDeactivateDialogOpen] =
    React.useState(false);

  const [instrumentReactivateDialogOpen, setInstrumentReactivateDialogOpen] =
    React.useState(false);

  const [courseToDeactivate, setCourseToDeactivate] =
    React.useState(null);

  const [courseToReactivate, setCourseToReactivate] =
    React.useState(null);

  const [instrumentToDeactivate, setInstrumentToDeactivate] =
    React.useState(null);

  const [instrumentToReactivate, setInstrumentToReactivate] =
    React.useState(null);
  const [categoryToDeactivate, setCategoryToDeactivate] =
    React.useState(null);
  const [categoryToReactivate, setCategoryToReactivate] =
    React.useState(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deactivatingCourse, setDeactivatingCourse] =
    React.useState(false);
  const [reactivatingCourse, setReactivatingCourse] =
    React.useState(false);
  const [deactivatingInstrument, setDeactivatingInstrument] =
    React.useState(false);
  const [reactivatingInstrument, setReactivatingInstrument] =
    React.useState(false);
  const [categoryForm, setCategoryForm] =
    React.useState(EMPTY_CATEGORY_FORM);
  const [deactivatingCategory, setDeactivatingCategory] =
    React.useState(false);
  const [reactivatingCategory, setReactivatingCategory] =
    React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [courseData, instrumentTypeData, categoryData] =
        await Promise.all([
          getCourses(),
          getInstrumentTypes(),
          getItemCategories(),
        ]);

      setCourses(
        Array.isArray(courseData)
          ? courseData.map(mapCourse)
          : [],
      );
      setInstruments(
        Array.isArray(instrumentTypeData)
          ? instrumentTypeData
          : [],
      );
      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : [],
      );
    } catch (error) {
      toast.error(
        error?.message || 'Failed to load course setup.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddCourse = () => {
    setCourseForm({
      ...EMPTY_COURSE_FORM,
    });

    setCourseDialogOpen(true);
  };

  const closeCourseDialog = () => {
    if (saving) {
      return;
    }

    setCourseDialogOpen(false);

    setCourseForm({
      ...EMPTY_COURSE_FORM,
    });
  };

  const saveCourse = async () => {
    const courseName = courseForm.courseName.trim();

    if (!courseName) {
      toast.error('Course name is required.');
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append('courseName', courseName);

      await createCourse(formData);

      toast.success('Course created successfully.');

      setCourseDialogOpen(false);

      setCourseForm({
        ...EMPTY_COURSE_FORM,
      });

      await loadData();
    } catch (error) {
      toast.error(
        error?.message || 'Failed to create course.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openCourseDeactivateDialog = (course) => {
    setCourseToDeactivate(course);
    setCourseDeactivateDialogOpen(true);
  };

  const closeCourseDeactivateDialog = () => {
    if (deactivatingCourse) {
      return;
    }

    setCourseDeactivateDialogOpen(false);
    setCourseToDeactivate(null);
  };

  const confirmDeactivateCourse = async () => {
    if (!courseToDeactivate) {
      return;
    }

    try {
      setDeactivatingCourse(true);

      await deactivateCourse(courseToDeactivate.id);
      await loadData();

      toast.success(
        `${courseToDeactivate.name} has been deactivated.`,
      );

      setCourseDeactivateDialogOpen(false);
      setCourseToDeactivate(null);
    } catch (error) {
      toast.error(
        error?.message || 'Failed to deactivate course.',
      );
    } finally {
      setDeactivatingCourse(false);
    }
  };

  const openCourseReactivateDialog = (course) => {
    setCourseToReactivate(course);
    setCourseReactivateDialogOpen(true);
  };

  const closeCourseReactivateDialog = () => {
    if (reactivatingCourse) {
      return;
    }

    setCourseReactivateDialogOpen(false);
    setCourseToReactivate(null);
  };

  const confirmReactivateCourse = async () => {
    if (!courseToReactivate) {
      return;
    }

    try {
      setReactivatingCourse(true);

      await reactivateCourse(courseToReactivate.id);
      await loadData();

      toast.success(
        `${courseToReactivate.name} has been reactivated.`,
      );

      setCourseReactivateDialogOpen(false);
      setCourseToReactivate(null);
    } catch (error) {
      toast.error(
        error?.message || 'Failed to reactivate course.',
      );
    } finally {
      setReactivatingCourse(false);
    }
  };

  const openAddInstrumentType = () => {
    setInstrumentForm({
      ...EMPTY_INSTRUMENT_FORM,
    });

    setInstrumentDialogOpen(true);
  };

  const closeInstrumentDialog = () => {
    if (saving) {
      return;
    }

    setInstrumentDialogOpen(false);

    setInstrumentForm({
      ...EMPTY_INSTRUMENT_FORM,
    });
  };

  const saveInstrumentType = async () => {
    const instrumentName =
      instrumentForm.instrumentType.trim();

    if (!instrumentName) {
      toast.error('Instrument type is required.');
      return;
    }

    const existingInstrument = instruments.find(
      (instrument) =>
        instrument.name.toLowerCase() ===
        instrumentName.toLowerCase(),
    );

    if (existingInstrument) {
      toast.error(
        'This instrument type already exists.',
      );
      return;
    }

    try {
      setSaving(true);
      const created = await createInstrumentType(instrumentName);

      setInstruments((current) => [...current, created]);
      toast.success('Instrument type added successfully.');
      setInstrumentDialogOpen(false);
      setInstrumentForm({ ...EMPTY_INSTRUMENT_FORM });
    } catch (error) {
      toast.error(
        error?.message || 'Failed to create instrument type.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openInstrumentDeactivateDialog = (instrument) => {
    setInstrumentToDeactivate(instrument);
    setInstrumentDeactivateDialogOpen(true);
  };

  const closeInstrumentDeactivateDialog = () => {
    if (deactivatingInstrument) {
      return;
    }

    setInstrumentDeactivateDialogOpen(false);
    setInstrumentToDeactivate(null);
  };

  const confirmDeactivateInstrument = async () => {
    if (!instrumentToDeactivate) {
      return;
    }

    try {
      setDeactivatingInstrument(true);

      await updateInstrumentTypeStatus(
        instrumentToDeactivate.id,
        'INACTIVE',
      );
      await loadData();

      toast.success(
        `${instrumentToDeactivate.name} has been deactivated.`,
      );

      setInstrumentDeactivateDialogOpen(false);
      setInstrumentToDeactivate(null);
    } catch (error) {
      toast.error(
        error?.message ||
          'Failed to deactivate instrument type.',
      );
    } finally {
      setDeactivatingInstrument(false);
    }
  };

  const openInstrumentReactivateDialog = (instrument) => {
    setInstrumentToReactivate(instrument);
    setInstrumentReactivateDialogOpen(true);
  };

  const closeInstrumentReactivateDialog = () => {
    if (reactivatingInstrument) {
      return;
    }

    setInstrumentReactivateDialogOpen(false);
    setInstrumentToReactivate(null);
  };

  const confirmReactivateInstrument = async () => {
    if (!instrumentToReactivate) {
      return;
    }

    try {
      setReactivatingInstrument(true);

      await updateInstrumentTypeStatus(
        instrumentToReactivate.id,
        'ACTIVE',
      );
      await loadData();

      toast.success(
        `${instrumentToReactivate.name} has been reactivated.`,
      );

      setInstrumentReactivateDialogOpen(false);
      setInstrumentToReactivate(null);
    } catch (error) {
      toast.error(
        error?.message ||
          'Failed to reactivate instrument type.',
      );
    } finally {
      setReactivatingInstrument(false);
    }
  };

  const saveCategory = async () => {
    const name = categoryForm.categoryName.trim();

    if (!name) {
      toast.error('Category name is required.');
      return;
    }

    try {
      setSaving(true);
      await createItemCategory(name);
      await loadData();
      setCategoryDialogOpen(false);
      setCategoryForm({ ...EMPTY_CATEGORY_FORM });
      toast.success('Item category added successfully.');
    } catch (error) {
      toast.error(error?.message || 'Failed to create item category.');
    } finally {
      setSaving(false);
    }
  };

  const updateCategoryStatus = async (category, status) => {
    const isReactivate = status === 'ACTIVE';

    try {
      isReactivate
        ? setReactivatingCategory(true)
        : setDeactivatingCategory(true);
      await updateItemCategoryStatus(category.id, status);
      await loadData();
      toast.success(
        `${category.name} has been ${isReactivate ? 'reactivated' : 'deactivated'}.`,
      );
    } catch (error) {
      toast.error(
        error?.message ||
          `Failed to ${isReactivate ? 'reactivate' : 'deactivate'} item category.`,
      );
    } finally {
      setReactivatingCategory(false);
      setDeactivatingCategory(false);
      setCategoryToDeactivate(null);
      setCategoryToReactivate(null);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Settings
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage system setup and configuration.
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpenIcon className="h-5 w-5" />
                    Course Setup
                  </CardTitle>

                  <CardDescription>
                    Manage the available courses in Cadenza.
                  </CardDescription>
                </div>

                <Button onClick={openAddCourse}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Course
                </Button>
              </CardHeader>

              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Course Name
                        </TableHead>

                        <TableHead>
                          Status
                        </TableHead>

                        <TableHead className="w-[100px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center"
                          >
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                              Loading courses...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : courses.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No courses found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        courses.map((course) => (
                          <TableRow key={course.id}>
                            <TableCell className="font-medium">
                              {course.name}
                            </TableCell>

                            <TableCell>
                              <span
                                className={
                                  course.status === 'ACTIVE'
                                    ? 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700'
                                    : 'inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                                }
                              >
                                {course.status}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={
                                    course.status === 'INACTIVE'
                                      ? 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                      : 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                                  }
                                  onClick={() =>
                                    course.status === 'INACTIVE'
                                      ? openCourseReactivateDialog(course)
                                      : openCourseDeactivateDialog(course)
                                  }
                                >
                                  <PowerIcon className="h-4 w-4" />
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpenIcon className="h-5 w-5" />
                    Items Category Setup
                  </CardTitle>

                  <CardDescription>
                    Manage the available items categories in Cadenza.
                  </CardDescription>
                </div>

                <Button
                  onClick={() => {
                    setCategoryForm({ ...EMPTY_CATEGORY_FORM });
                    setCategoryDialogOpen(true);
                  }}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </CardHeader>

              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Category Name
                        </TableHead>

                        <TableHead>
                          Status
                        </TableHead>

                        <TableHead className="w-[100px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center"
                          >
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                              Loading categories...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : categories.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No categories found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">
                              {category.name}
                            </TableCell>

                            <TableCell>
                              <span
                                className={
                                  category.status === 'ACTIVE'
                                    ? 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700'
                                    : 'inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                                }
                              >
                                {category.status}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={
                                    category.status === 'INACTIVE'
                                      ? 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                      : 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                                  }
                                  onClick={() =>
                                    category.status === 'INACTIVE'
                                      ? setCategoryToReactivate(category)
                                      : setCategoryToDeactivate(category)
                                  }
                                >
                                  <PowerIcon className="h-4 w-4" />
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <ListMusic className="h-5 w-5" />
                    Instrument Type or Equipment Setup
                  </CardTitle>

                  <CardDescription>
                    Manage the available instrument types and equipment in Cadenza.
                  </CardDescription>
                </div>

                <Button onClick={openAddInstrumentType}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Equipment or Instrument Type
                </Button>
              </CardHeader>

              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Instrument Type or Equipment Name
                        </TableHead>

                        <TableHead>
                          Status
                        </TableHead>

                        <TableHead className="w-[100px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {instruments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No instrument types found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        instruments.map((instrument) => (
                          <TableRow key={instrument.id}>
                            <TableCell className="font-medium">
                              {instrument.name}
                            </TableCell>

                            <TableCell>
                              <span
                                className={
                                  instrument.status === 'ACTIVE'
                                    ? 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700'
                                    : 'inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground'
                                }
                              >
                                {instrument.status}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={
                                    instrument.status === 'INACTIVE'
                                      ? 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                      : 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                                  }
                                  onClick={() =>
                                    instrument.status === 'INACTIVE'
                                      ? openInstrumentReactivateDialog(instrument)
                                      : openInstrumentDeactivateDialog(instrument)
                                  }
                                >
                                  <PowerIcon className="h-4 w-4" />
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
          </div>
        </main>
      </SidebarInset>

      <Dialog
        open={courseDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCourseDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Course
            </DialogTitle>

            <DialogDescription>
              Add a new course to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="course-name">
              Course Name
            </Label>

            <Input
              id="course-name"
              value={courseForm.courseName}
              onChange={(event) =>
                setCourseForm({
                  ...courseForm,
                  courseName: event.target.value,
                })
              }
              placeholder="Enter course name"
              disabled={saving}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCourseDialog}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={saveCourse}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Course'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item Category</DialogTitle>
            <DialogDescription>
              Add a category for items in Cadenza.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="item-category">Category Name</Label>
            <Input
              id="item-category"
              value={categoryForm.categoryName}
              onChange={(event) =>
                setCategoryForm({
                  categoryName: event.target.value,
                })
              }
              placeholder="Enter category name"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveCategory}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(categoryToDeactivate)}
        onOpenChange={(open) => {
          if (!open && !deactivatingCategory) {
            setCategoryToDeactivate(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Item Category</DialogTitle>
            <DialogDescription>
              Deactivate {categoryToDeactivate?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryToDeactivate(null)}
              disabled={deactivatingCategory}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                updateCategoryStatus(categoryToDeactivate, 'INACTIVE')
              }
              disabled={deactivatingCategory}
            >
              {deactivatingCategory ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(categoryToReactivate)}
        onOpenChange={(open) => {
          if (!open && !reactivatingCategory) {
            setCategoryToReactivate(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reactivate Item Category</DialogTitle>
            <DialogDescription>
              Reactivate {categoryToReactivate?.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryToReactivate(null)}
              disabled={reactivatingCategory}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateCategoryStatus(categoryToReactivate, 'ACTIVE')
              }
              disabled={reactivatingCategory}
            >
              {reactivatingCategory ? 'Reactivating...' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={instrumentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeInstrumentDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Instrument Type or Equipment
            </DialogTitle>

            <DialogDescription>
              Add a new instrument type or equipment to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="instrument-type">
              Instrument Type or Equipment Name
            </Label>

            <Input
              id="instrument-type"
              value={instrumentForm.instrumentType}
              onChange={(event) =>
                setInstrumentForm({
                  ...instrumentForm,
                  instrumentType: event.target.value,
                })
              }
              placeholder="Enter instrument type"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeInstrumentDialog}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={saveInstrumentType}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={courseDeactivateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCourseDeactivateDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Deactivate Course
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">
                {courseToDeactivate?.name}
              </span>
              ? This course will no longer be available for active use.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCourseDeactivateDialog}
              disabled={deactivatingCourse}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeactivateCourse}
              disabled={deactivatingCourse}
            >
              {deactivatingCourse ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={courseReactivateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCourseReactivateDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reactivate Course
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to reactivate{' '}
              <span className="font-medium text-foreground">
                {courseToReactivate?.name}
              </span>
              ? This course will become available for active use again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCourseReactivateDialog}
              disabled={reactivatingCourse}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={confirmReactivateCourse}
              disabled={reactivatingCourse}
            >
              {reactivatingCourse ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={instrumentDeactivateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeInstrumentDeactivateDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Deactivate Instrument Type
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">
                {instrumentToDeactivate?.name}
              </span>
              ? This instrument type will no longer be available for active use.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeInstrumentDeactivateDialog}
              disabled={deactivatingInstrument}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeactivateInstrument}
              disabled={deactivatingInstrument}
            >
              {deactivatingInstrument ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={instrumentReactivateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeInstrumentReactivateDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reactivate Instrument Type
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to reactivate{' '}
              <span className="font-medium text-foreground">
                {instrumentToReactivate?.name}
              </span>
              ? This instrument type will become available for active use again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeInstrumentReactivateDialog}
              disabled={reactivatingInstrument}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={confirmReactivateInstrument}
              disabled={reactivatingInstrument}
            >
              {reactivatingInstrument ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}