'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  BookOpenIcon,
  Loader2Icon,
  PlusIcon,
  ListMusic,
  PowerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
import { Badge } from '@/components/ui/Badge';

import {
  Dialog as BaseDialog,
  DialogContent as BaseDialogContent,
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
  getOperatingHours,
  updateOperatingHours,
  getBankAccounts,
  createBankAccount,
  updateBankAccountStatus,
  replaceBankAccountQr,
  getBankAccountQr,
} from '@/services/admin/settingsService';

function Dialog(props) {
  return <BaseDialog {...props} disablePointerDismissal />;
}

function DialogContent(props) {
  return <BaseDialogContent {...props} onInteractOutside={(event) => event.preventDefault()} />;
}

const EMPTY_COURSE_FORM = {
  courseName: '',
};

const EMPTY_INSTRUMENT_FORM = {
  instrumentType: '',
};
const EMPTY_CATEGORY_FORM = { categoryName: '' };

const INITIAL_COURSES = [];

const INITIAL_INSTRUMENTS = [];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${minute}`;
});
const formatTimeOption = (value) => {
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
};
const DEFAULT_OPERATING_HOURS = {
  weeklyHours: Object.fromEntries(WEEKDAYS.map((_, index) => [String(index), {
    isClosed: false, startTime: '08:00', endTime: '17:00',
  }])),
  dateOverrides: {},
  timezone: 'Asia/Manila',
};

const mapCourse = (item) => ({
  id: item?.id,
  name: item?.name || item?.lessonName || 'Unnamed course',
  status: item?.status || 'ACTIVE',
});

const SETTINGS_PAGE_SIZE = 5;

function TablePagination({ page, setPage, total }) {
  const pageCount = Math.max(1, Math.ceil(total / SETTINGS_PAGE_SIZE));
  if (total <= SETTINGS_PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
      <span>Page {page} of {pageCount}</span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="size-7" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page"><ChevronLeftIcon className="size-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Next page"><ChevronRightIcon className="size-4" /></Button>
      </div>
    </div>
  );
}

const pageItems = (items, page) => items.slice((page - 1) * SETTINGS_PAGE_SIZE, page * SETTINGS_PAGE_SIZE);

export default function SettingsPage() {
  const [courses, setCourses] = React.useState(INITIAL_COURSES);
  const [instruments, setInstruments] = React.useState(INITIAL_INSTRUMENTS);
  const [categories, setCategories] = React.useState([]);
  const [bankAccounts, setBankAccounts] = React.useState([]);
  const [bankName, setBankName] = React.useState('');
  const [bankAccountNumber, setBankAccountNumber] = React.useState('');
  const [bankAccountQr, setBankAccountQr] = React.useState(null);
  const [bankAccountSaving, setBankAccountSaving] = React.useState(false);
  const [bankAccountUpdating, setBankAccountUpdating] = React.useState(null);
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = React.useState(false);
  const [bankAccountToToggle, setBankAccountToToggle] = React.useState(null);
  const [bankAccountQrUrls, setBankAccountQrUrls] = React.useState({});
  const bankAccountQrUrlsRef = React.useRef({});
  const [operatingHours, setOperatingHours] = React.useState(DEFAULT_OPERATING_HOURS);
  const [hoursSaving, setHoursSaving] = React.useState(false);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = React.useState(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}`);
  const [selectedDate, setSelectedDate] = React.useState(tomorrowKey);
  const [overrideForm, setOverrideForm] = React.useState({ isClosed: false, reason: '', startTime: '08:00', endTime: '17:00' });
  const [bankPage, setBankPage] = React.useState(1);
  const [coursePage, setCoursePage] = React.useState(1);
  const [categoryPage, setCategoryPage] = React.useState(1);
  const [instrumentPage, setInstrumentPage] = React.useState(1);
  const [overridePage, setOverridePage] = React.useState(1);

  const [courseForm, setCourseForm] = React.useState(EMPTY_COURSE_FORM);

  const [instrumentForm, setInstrumentForm] = React.useState(
    EMPTY_INSTRUMENT_FORM,
  );

  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);

  const [instrumentDialogOpen, setInstrumentDialogOpen] = React.useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);

  const [courseDeactivateDialogOpen, setCourseDeactivateDialogOpen] =
    React.useState(false);

  const [courseReactivateDialogOpen, setCourseReactivateDialogOpen] =
    React.useState(false);

  const [instrumentDeactivateDialogOpen, setInstrumentDeactivateDialogOpen] =
    React.useState(false);

  const [instrumentReactivateDialogOpen, setInstrumentReactivateDialogOpen] =
    React.useState(false);

  const [courseToDeactivate, setCourseToDeactivate] = React.useState(null);

  const [courseToReactivate, setCourseToReactivate] = React.useState(null);

  const [instrumentToDeactivate, setInstrumentToDeactivate] =
    React.useState(null);

  const [instrumentToReactivate, setInstrumentToReactivate] =
    React.useState(null);
  const [categoryToDeactivate, setCategoryToDeactivate] = React.useState(null);
  const [categoryToReactivate, setCategoryToReactivate] = React.useState(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deactivatingCourse, setDeactivatingCourse] = React.useState(false);
  const [reactivatingCourse, setReactivatingCourse] = React.useState(false);
  const [deactivatingInstrument, setDeactivatingInstrument] =
    React.useState(false);
  const [reactivatingInstrument, setReactivatingInstrument] =
    React.useState(false);
  const [categoryForm, setCategoryForm] = React.useState(EMPTY_CATEGORY_FORM);
  const [deactivatingCategory, setDeactivatingCategory] = React.useState(false);
  const [reactivatingCategory, setReactivatingCategory] = React.useState(false);

  const selectableDates = React.useMemo(() => {
    const dates = [];
    for (let index = 1; index <= 365; index += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
      dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    }
    return [...new Set([...dates, ...Object.keys(operatingHours.dateOverrides || {})].filter((date) => date >= tomorrowKey))].sort();
  }, [operatingHours.dateOverrides, tomorrowKey]);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [courseData, instrumentTypeData, categoryData, hoursData, bankAccountData] = await Promise.all([
        getCourses(),
        getInstrumentTypes(),
        getItemCategories(),
        getOperatingHours(),
        getBankAccounts(),
      ]);

      setCourses(Array.isArray(courseData) ? courseData.map(mapCourse) : []);
      setInstruments(
        Array.isArray(instrumentTypeData) ? instrumentTypeData : [],
      );
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setOperatingHours({ ...DEFAULT_OPERATING_HOURS, ...(hoursData || {}), weeklyHours: { ...DEFAULT_OPERATING_HOURS.weeklyHours, ...(hoursData?.weeklyHours || {}) } });
      setBankAccounts(Array.isArray(bankAccountData) ? bankAccountData : []);
    } catch (error) {
      toast.error(error?.message || 'Failed to load course setup.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWeeklyHour = (day, changes) => setOperatingHours((current) => ({
    ...current,
    weeklyHours: { ...current.weeklyHours, [day]: { ...current.weeklyHours[day], ...changes } },
  }));

  const saveOperatingHours = async () => {
    try {
      setHoursSaving(true);
      const saved = await updateOperatingHours(operatingHours);
      setOperatingHours(saved);
      toast.success('Operating hours saved.');
    } catch (error) { toast.error(error?.message || 'Failed to save operating hours.'); }
    finally { setHoursSaving(false); }
  };

  const selectOperatingDate = (date) => {
    if (date < tomorrowKey) return;
    setSelectedDate(date);
    setOverrideForm(operatingHours.dateOverrides?.[date] || { ...DEFAULT_OPERATING_HOURS.weeklyHours['1'], isClosed: false, reason: '' });
  };

  const saveDateOverride = async () => {
    if (selectedDate < tomorrowKey) return toast.error('Custom operating hours can only be set from tomorrow onward.');
    if (overrideForm.isClosed && !overrideForm.reason?.trim()) return toast.error('A reason is required when closing a date.');
    try {
      setHoursSaving(true);
      const nextOperatingHours = {
        ...operatingHours,
        dateOverrides: {
          ...operatingHours.dateOverrides,
          [selectedDate]: { ...overrideForm, reason: overrideForm.isClosed ? overrideForm.reason.trim() : '' },
        },
      };
      const saved = await updateOperatingHours(nextOperatingHours);
      setOperatingHours(saved);
      setSelectedDate(tomorrowKey);
      setSelectedMonth(tomorrowKey.slice(0, 7));
      setOverrideForm({ ...DEFAULT_OPERATING_HOURS.weeklyHours['1'], isClosed: false, reason: '' });
      toast.success(`${selectedDate} customization saved.`);
    } catch (error) {
      toast.error(error?.message || 'Failed to save date customization.');
    } finally {
      setHoursSaving(false);
    }
  };

  const removeOverride = async (date) => {
    try {
      setHoursSaving(true);
      const nextDateOverrides = { ...operatingHours.dateOverrides };
      delete nextDateOverrides[date];
      const saved = await updateOperatingHours({
        ...operatingHours,
        dateOverrides: nextDateOverrides,
      });
      setOperatingHours(saved);
      toast.success(`${date} customization removed.`);
    } catch (error) {
      toast.error(error?.message || 'Failed to remove date customization.');
    } finally {
      setHoursSaving(false);
    }
  };

  const monthDays = React.useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1);
    return { offset: first.getDay(), days, year, month };
  }, [selectedMonth]);

  const formatDate = (day) => `${monthDays.year}-${String(monthDays.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const updateDefaultHours = (changes) => setOperatingHours((current) => ({
    ...current,
    weeklyHours: Object.fromEntries(WEEKDAYS.map((_, index) => [String(index), { ...current.weeklyHours[String(index)], ...changes, isClosed: false }])),
  }));

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => () => {
    Object.values(bankAccountQrUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const saveBankAccount = async (event) => {
    event.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountQr) {
      toast.error('Bank name, account number, and QR image are required.');
      return;
    }
    try {
      setBankAccountSaving(true);
      const formData = new FormData();
      formData.append('bankName', bankName.trim());
      formData.append('accountNumber', bankAccountNumber.trim());
      formData.append('qr', bankAccountQr);
      const saved = await createBankAccount(formData);
      setBankAccounts((current) => [...current, saved]);
      setBankName('');
      setBankAccountNumber('');
      setBankAccountQr(null);
      event.currentTarget.reset();
      toast.success('Bank account added.');
    } catch (error) {
      toast.error(error?.message || 'Failed to add bank account.');
    } finally { setBankAccountSaving(false); }
  };

  const toggleBankAccount = async (account) => {
    const status = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setBankAccountUpdating(account.id);
      const updated = await updateBankAccountStatus(account.id, status);
      setBankAccounts((current) => current.map((item) => item.id === account.id ? updated : item));
      toast.success(`Bank account ${status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
    } catch (error) { toast.error(error?.message || 'Failed to update bank account.'); }
    finally { setBankAccountUpdating(null); }
  };

  const openBankAccountDialog = (account) => {
    setBankAccountToToggle(account);
    setBankAccountDialogOpen(true);
  };

  const closeBankAccountDialog = () => {
    if (bankAccountUpdating) return;
    setBankAccountDialogOpen(false);
    setBankAccountToToggle(null);
  };

  const confirmBankAccountToggle = async () => {
    if (!bankAccountToToggle) return;
    await toggleBankAccount(bankAccountToToggle);
    setBankAccountDialogOpen(false);
    setBankAccountToToggle(null);
  };

  const replaceQrForAccount = async (account, file) => {
    if (!file) return;
    try {
      setBankAccountUpdating(account.id);
      const updated = await replaceBankAccountQr(account.id, file);
      setBankAccounts((current) => current.map((item) =>
        item.id === account.id ? updated : item,
      ));
      const previousUrl = bankAccountQrUrlsRef.current[account.id];
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      const nextUrls = { ...bankAccountQrUrlsRef.current };
      delete nextUrls[account.id];
      bankAccountQrUrlsRef.current = nextUrls;
      setBankAccountQrUrls(nextUrls);
      toast.success('QR image replaced. Clients can now load the updated QR.');
    } catch (error) {
      toast.error(error?.message || 'Unable to replace QR image.');
    } finally {
      setBankAccountUpdating(null);
    }
  };

  const viewBankAccountQr = async (account) => {
    try {
      let url = bankAccountQrUrls[account.id];
      if (!url) {
        const response = await getBankAccountQr(account.id);
        url = URL.createObjectURL(await response.blob());
        bankAccountQrUrlsRef.current = { ...bankAccountQrUrlsRef.current, [account.id]: url };
        setBankAccountQrUrls(bankAccountQrUrlsRef.current);
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) { toast.error(error?.message || 'Failed to open QR image.'); }
  };

  const openAddCourse = () => {
    setCourseForm({
      ...EMPTY_COURSE_FORM,
    });

    setCourseError('');
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

    setCourseError('');
  };

  const saveCourse = async () => {
    const courseName = courseForm.courseName.trim();

    if (!courseName) {
      setCourseError('Course name is required.');
      return;
    }

    const duplicateCourse = courses.find(
      (course) =>
        course.name.trim().toLowerCase() === courseName.toLowerCase(),
    );

    if (duplicateCourse) {
      setCourseError('Course name already exists.');
      return;
    }

    try {
      setSaving(true);
      setCourseError('');

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
      setCourseError(error?.message || 'Failed to create course.');
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

      toast.success(`${courseToDeactivate.name} has been deactivated.`);

      setCourseDeactivateDialogOpen(false);
      setCourseToDeactivate(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to deactivate course.');
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

      toast.success(`${courseToReactivate.name} has been reactivated.`);

      setCourseReactivateDialogOpen(false);
      setCourseToReactivate(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to reactivate course.');
    } finally {
      setReactivatingCourse(false);
    }
  };

  const openAddInstrumentType = () => {
    setInstrumentForm({
      ...EMPTY_INSTRUMENT_FORM,
    });

    setInstrumentError('');
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

    setInstrumentError('');
  };

  const saveInstrumentType = async () => {
    const instrumentName = instrumentForm.instrumentType.trim();

    if (!instrumentName) {
      setInstrumentError('Instrument type or equipment name is required.');
      return;
    }

    const existingInstrument = instruments.find(
      (instrument) =>
        instrument.name.trim().toLowerCase() === instrumentName.toLowerCase(),
    );

    if (existingInstrument) {
      setInstrumentError('Instrument type or equipment name already exists.');
      return;
    }

    try {
      setSaving(true);
      setInstrumentError('');
      const created = await createInstrumentType(instrumentName);

      setInstruments((current) => [...current, created]);
      toast.success('Instrument type added successfully.');
      setInstrumentDialogOpen(false);
      setInstrumentForm({ ...EMPTY_INSTRUMENT_FORM });
    } catch (error) {
      setInstrumentError(
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

      await updateInstrumentTypeStatus(instrumentToDeactivate.id, 'INACTIVE');
      await loadData();

      toast.success(`${instrumentToDeactivate.name} has been deactivated.`);

      setInstrumentDeactivateDialogOpen(false);
      setInstrumentToDeactivate(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to deactivate instrument type.');
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

      await updateInstrumentTypeStatus(instrumentToReactivate.id, 'ACTIVE');
      await loadData();

      toast.success(`${instrumentToReactivate.name} has been reactivated.`);

      setInstrumentReactivateDialogOpen(false);
      setInstrumentToReactivate(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to reactivate instrument type.');
    } finally {
      setReactivatingInstrument(false);
    }
  };

  const saveCategory = async () => {
    const name = categoryForm.categoryName.trim();

    if (!name) {
      setCategoryError('Category name is required.');
      return;
    }

    const existingCategory = categories.find(
      (category) =>
        category.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (existingCategory) {
      setCategoryError('Category name already exists.');
      return;
    }

    try {
      setSaving(true);
      setCategoryError('');
      await createItemCategory(name);
      await loadData();
      setCategoryDialogOpen(false);
      setCategoryForm({ ...EMPTY_CATEGORY_FORM });
      toast.success('Item category added successfully.');
    } catch (error) {
      setCategoryError(
        error?.message || 'Failed to create item category.',
      );
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

  const [courseError, setCourseError] = useState('');
  const [instrumentError, setInstrumentError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const visibleBankAccounts = pageItems(bankAccounts, bankPage);
  const visibleCourses = pageItems(courses, coursePage);
  const visibleCategories = pageItems(categories, categoryPage);
  const visibleInstruments = pageItems(instruments, instrumentPage);
  const customizedDates = Object.entries(operatingHours.dateOverrides || {}).sort(([first], [second]) => first.localeCompare(second));
  const visibleCustomizedDates = pageItems(customizedDates, overridePage);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

            <p className="text-sm text-muted-foreground">
              Manage system setup and configuration.
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>Operating Hours</CardTitle>
                    <CardDescription>
                      The system baseline for rentals, bookings, schedules, and excess-time calculations. Times use Asia/Manila.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Default operating hours</CardTitle><CardDescription>Applied to dates without a customization. The default is 8:00 AM–5:00 PM.</CardDescription></CardHeader>
                  <CardContent><div className="grid max-w-xl grid-cols-2 gap-3"><div><Label htmlFor="default-start">Starting time</Label><select id="default-start" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={operatingHours.weeklyHours['1']?.startTime || '08:00'} onChange={(event) => updateDefaultHours({ startTime: event.target.value })}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{formatTimeOption(time)}</option>)}</select></div><div><Label htmlFor="default-end">Ending time</Label><select id="default-end" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={operatingHours.weeklyHours['1']?.endTime || '17:00'} onChange={(event) => updateDefaultHours({ endTime: event.target.value })}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{formatTimeOption(time)}</option>)}</select></div></div><p className="mt-3 text-xs text-muted-foreground">Changes become active tomorrow. Today keeps its current operating hours.</p><Button className="mt-4" onClick={saveOperatingHours} disabled={hoursSaving}>{hoursSaving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}Save default hours</Button></CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Customize a date</CardTitle><CardDescription>Choose tomorrow or a future date, then set its special hours or mark it closed.</CardDescription></CardHeader>
                  <CardContent><div className="space-y-4"><div className="flex items-center justify-between gap-3"><div><Label htmlFor="custom-month">Calendar month</Label><p className="text-sm text-muted-foreground">Select tomorrow or a future date.</p></div><Input id="custom-month" className="w-auto" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></div><div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{WEEKDAYS.map((day) => <div key={day} className="py-2">{day.slice(0, 3)}</div>)}{Array.from({ length: monthDays.offset }).map((_, index) => <div key={`empty-${index}`} />)}{monthDays.days.map((day) => { const date = formatDate(day); const unavailable = date < tomorrowKey; const customized = Boolean(operatingHours.dateOverrides?.[date]); return <button key={date} type="button" disabled={unavailable} onClick={() => selectOperatingDate(date)} className={`min-h-10 rounded-md border p-2 text-sm transition ${unavailable ? 'cursor-not-allowed bg-muted text-muted-foreground/50' : selectedDate === date ? 'border-primary bg-primary text-primary-foreground' : customized ? 'border-amber-400 bg-amber-50 text-amber-900' : 'hover:bg-muted'}`}>{day}</button>; })}</div><p className="text-sm font-medium">Selected date: {selectedDate}</p><div className="grid max-w-2xl gap-4 md:grid-cols-3 md:items-end"><div><Label htmlFor="selected-start">Starting time</Label><select id="selected-start" disabled={overrideForm.isClosed} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" value={overrideForm.startTime} onChange={(event) => setOverrideForm({ ...overrideForm, startTime: event.target.value })}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{formatTimeOption(time)}</option>)}</select></div><div><Label htmlFor="selected-end">Ending time</Label><select id="selected-end" disabled={overrideForm.isClosed} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" value={overrideForm.endTime} onChange={(event) => setOverrideForm({ ...overrideForm, endTime: event.target.value })}>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{formatTimeOption(time)}</option>)}</select></div><Button type="button" variant={overrideForm.isClosed ? 'outline' : 'destructive'} onClick={() => setOverrideForm((current) => ({ ...current, isClosed: !current.isClosed }))}>{overrideForm.isClosed ? 'Reopen date' : 'Close date'}</Button></div>{overrideForm.isClosed && <div><Label htmlFor="close-reason">Reason for closing</Label><Input id="close-reason" value={overrideForm.reason || ''} placeholder="e.g. Holiday or private event" onChange={(event) => setOverrideForm({ ...overrideForm, reason: event.target.value })} /></div>}<Button className="mt-4" type="button" onClick={saveDateOverride}>Save date customization</Button></div></CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Customized dates only</CardTitle><CardDescription>These dates override the default 8:00 AM–5:00 PM schedule.</CardDescription></CardHeader>
                  <CardContent>{customizedDates.length === 0 ? <p className="text-sm text-muted-foreground">No customized dates yet.</p> : <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Operating hours</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{visibleCustomizedDates.map(([date, entry]) => <TableRow key={date}><TableCell className="font-medium">{date}</TableCell><TableCell><Badge variant="outline" className={entry.isClosed ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>{entry.isClosed ? 'Closed' : `${entry.startTime} – ${entry.endTime}`}</Badge></TableCell><TableCell>{entry.reason || '—'}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="sm" onClick={() => removeOverride(date)}>Remove</Button></TableCell></TableRow>)}</TableBody></Table><TablePagination page={overridePage} setPage={setOverridePage} total={customizedDates.length} /></div>}</CardContent>
                </Card>
                <div className="hidden">
                  <div><h3 className="font-medium">Date-specific overrides and closures</h3><p className="text-sm text-muted-foreground">Use these for holidays, special events, or extended hours. An override replaces that day’s weekly hours.</p></div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                    <div><Label htmlFor="override-date">Date</Label><Input id="override-date" type="date" value={selectedDate} onChange={(event) => selectOperatingDate(event.target.value)} /></div>
                    <div><Label htmlFor="override-start">Open</Label><Input id="override-start" type="time" disabled={overrideForm.isClosed} value={overrideForm.startTime} onChange={(event) => setOverrideForm({ ...overrideForm, startTime: event.target.value })} /></div>
                    <div><Label htmlFor="override-end">Close</Label><Input id="override-end" type="time" disabled={overrideForm.isClosed} value={overrideForm.endTime} onChange={(event) => setOverrideForm({ ...overrideForm, endTime: event.target.value })} /></div>
                    <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={overrideForm.isClosed} onChange={(event) => setOverrideForm({ ...overrideForm, isClosed: event.target.checked })} /> Closed</label><Button type="button" variant="outline" onClick={saveDateOverride}>Add</Button></div>
                  </div>
                  {Object.keys(operatingHours.dateOverrides || {}).length > 0 && <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Hours</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{Object.entries(operatingHours.dateOverrides).sort(([a], [b]) => a.localeCompare(b)).map(([date, entry]) => <TableRow key={date}><TableCell className="font-medium">{date}</TableCell><TableCell>{entry.isClosed ? 'Closed' : `${entry.startTime} – ${entry.endTime}`}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="sm" onClick={() => removeOverride(date)}>Remove</Button></TableCell></TableRow>)}</TableBody></Table></div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Bank Accounts</CardTitle>
                <CardDescription>Manage the bank accounts and QR codes customers can use when sending payment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="grid gap-4 rounded-md border p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" onSubmit={saveBankAccount}>
                  <div>
                    <Label htmlFor="bank-name">Bank name</Label>
                    <Input id="bank-name" value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="e.g. BDO" required />
                  </div>
                  <div>
                    <Label htmlFor="bank-account-number">Account number</Label>
                    <Input id="bank-account-number" value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} placeholder="Enter account number" required />
                  </div>
                  <div>
                    <Label htmlFor="bank-account-qr">QR image</Label>
                    <Input id="bank-account-qr" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setBankAccountQr(event.target.files?.[0] || null)} required />
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WebP up to 5 MB.</p>
                  </div>
                  <Button type="submit" disabled={bankAccountSaving}>{bankAccountSaving ? 'Adding...' : 'Add bank account'}</Button>
                </form>

                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bank accounts have been added yet.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Account number</TableHead><TableHead>QR code</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                      <TableBody>{visibleBankAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.bankName || 'Bank name not set'}</TableCell>
                          <TableCell>{account.accountNumber}</TableCell>
                          <TableCell>{account.hasQr ? <Button type="button" variant="ghost" size="sm" onClick={() => viewBankAccountQr(account)}>View QR</Button> : 'Not uploaded'}</TableCell>
                          <TableCell><Badge variant="outline" className={account.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>{account.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-right">
                             <div className="flex flex-wrap items-center justify-end gap-2">
                               <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium">
                                 Replace QR
                                 <input
                                   type="file"
                                   accept="image/png,image/jpeg,image/webp"
                                   className="sr-only"
                                   disabled={bankAccountUpdating === account.id}
                                   onChange={async (event) => {
                                     const file = event.target.files?.[0];
                                     event.target.value = '';
                                     await replaceQrForAccount(account, file);
                                   }}
                                 />
                               </label>
                               <Button type="button" variant="ghost" size="icon" className={account.status === 'ACTIVE' ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'} title={account.status === 'ACTIVE' ? 'Deactivate account' : 'Activate account'} aria-label={account.status === 'ACTIVE' ? 'Deactivate account' : 'Activate account'} disabled={bankAccountUpdating === account.id} onClick={() => openBankAccountDialog(account)}><PowerIcon className="size-4" /></Button>
                             </div>
                           </TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                    <TablePagination page={bankPage} setPage={setBankPage} total={bankAccounts.length} />
                  </div>
                )}
              </CardContent>
            </Card>

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
                        <TableHead>Course Name</TableHead>

                        <TableHead>Status</TableHead>

                        <TableHead className="w-[100px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
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
                        visibleCourses.map((course) => (
                          <TableRow key={course.id}>
                            <TableCell className="font-medium">
                              {course.name}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className={course.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>{course.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
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
                  <TablePagination page={coursePage} setPage={setCoursePage} total={courses.length} />
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
                    setCategoryError('');
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
                        <TableHead>Category Name</TableHead>

                        <TableHead>Status</TableHead>

                        <TableHead className="w-[100px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
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
                        visibleCategories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">
                              {category.name}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className={category.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>{category.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
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
                  <TablePagination page={categoryPage} setPage={setCategoryPage} total={categories.length} />
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
                    Manage the available instrument types and equipment in
                    Cadenza.
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
                        <TableHead>Instrument Type or Equipment Name</TableHead>

                        <TableHead>Status</TableHead>

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
                        visibleInstruments.map((instrument) => (
                          <TableRow key={instrument.id}>
                            <TableCell className="font-medium">
                              {instrument.name}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className={instrument.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>{instrument.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
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
                                      ? openInstrumentReactivateDialog(
                                          instrument,
                                        )
                                      : openInstrumentDeactivateDialog(
                                          instrument,
                                        )
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
                  <TablePagination page={instrumentPage} setPage={setInstrumentPage} total={instruments.length} />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>

      <Dialog
        open={bankAccountDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeBankAccountDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bankAccountToToggle?.status === 'ACTIVE' ? 'Deactivate payment bank account?' : 'Activate payment bank account?'}
            </DialogTitle>
            <DialogDescription>
              {bankAccountToToggle?.status === 'ACTIVE'
                ? <>This account will no longer be available for client payments: <span className="font-medium text-foreground">{bankAccountToToggle?.bankName || 'Payment account'}</span>.</>
                : <>This account will become available for client payments again: <span className="font-medium text-foreground">{bankAccountToToggle?.bankName || 'Payment account'}</span>.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeBankAccountDialog} disabled={Boolean(bankAccountUpdating)}>Cancel</Button>
            <Button type="button" variant={bankAccountToToggle?.status === 'ACTIVE' ? 'destructive' : 'default'} onClick={confirmBankAccountToggle} disabled={Boolean(bankAccountUpdating)}>
              {bankAccountUpdating ? <><Loader2Icon className="mr-2 size-4 animate-spin" />Saving...</> : bankAccountToToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Add Course</DialogTitle>

            <DialogDescription>
              Add a new course to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="course-name">Course Name</Label>

            <Input
              id="course-name"
              value={courseForm.courseName}
              onChange={(event) => {
                setCourseForm({
                  ...courseForm,
                  courseName: event.target.value,
                });

                setCourseError('');
              }}
              placeholder="Enter course name"
              disabled={saving}
              className={courseError ? 'border-destructive' : ''}
              aria-invalid={Boolean(courseError)}
              aria-describedby={courseError ? 'course-name-error' : undefined}
            />

            {courseError && (
              <p
                id="course-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {courseError}
              </p>
            )}
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

            <Button type="button" onClick={saveCourse} disabled={saving}>
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
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) {
            setCategoryError('');
          }
        }}
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
                {
                  setCategoryForm({
                    categoryName: event.target.value,
                  });
                  setCategoryError('');
                }
              }
              placeholder="Enter category name"
              className={categoryError ? 'border-destructive' : ''}
              aria-invalid={Boolean(categoryError)}
              aria-describedby={categoryError ? 'item-category-error' : undefined}
            />
            {categoryError && (
              <p
                id="item-category-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {categoryError}
              </p>
            )}
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
            <Button type="button" onClick={saveCategory} disabled={saving}>
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
            <DialogTitle>Add Instrument Type or Equipment</DialogTitle>

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
                {
                  setInstrumentForm({
                    ...instrumentForm,
                    instrumentType: event.target.value,
                  });
                  setInstrumentError('');
                }
              }
              placeholder="Enter instrument type"
              className={instrumentError ? 'border-destructive' : ''}
              aria-invalid={Boolean(instrumentError)}
              aria-describedby={
                instrumentError ? 'instrument-type-error' : undefined
              }
            />
            {instrumentError && (
              <p
                id="instrument-type-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {instrumentError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeInstrumentDialog}
            >
              Cancel
            </Button>

            <Button type="button" onClick={saveInstrumentType}>
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
            <DialogTitle>Deactivate Course</DialogTitle>

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
            <DialogTitle>Reactivate Course</DialogTitle>

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
            <DialogTitle>Deactivate Instrument Type</DialogTitle>

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
            <DialogTitle>Reactivate Instrument Type</DialogTitle>

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
