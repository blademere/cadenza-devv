import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getAvailablePackages,
  getEnrollmentOptions,
  getInstructorAvailability,
  validateEnrollmentSchedule,
} from '../services/enrollmentServices';
import { getMyProfile } from '../../profile/services/profile.service';
import { getHoursForDate, getOperatingHours } from '@/services/operatingHoursService';
import { getPaymentAccounts } from '@/services/paymentAccountsService';

const addDaysToDateKey = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getIsoDayOfWeek = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
};

const getManilaDateTime = (dateKey, minutes) => {
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(
    `${dateKey}T${String(hours).padStart(2, '0')}:${String(minute).padStart(
      2,
      '0',
    )}:00+08:00`,
  );
};

const getEnrollmentDraftKey = (packageId, courseId) =>
  `cadenza-enrollment-draft:${packageId || 'none'}:${courseId || 'none'}`;

const readEnrollmentDraft = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

export default function NewEnrollment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get('package');
  const courseId = searchParams.get('course');
  const draftKey = getEnrollmentDraftKey(packageId, courseId);
  const savedDraft = useMemo(() => readEnrollmentDraft(draftKey), [draftKey]);

  const [instructors, setInstructors] = useState([]);
  const [availability, setAvailability] = useState([]);

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [paymentPlan, setPaymentPlan] = useState(savedDraft?.paymentPlan || '');
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [paymentAccountId, setPaymentAccountId] = useState(savedDraft?.paymentAccountId || '');
  const [studentDetails, setStudentDetails] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '', address: '', age: '',
    gender: '', guardianName: '', contactNo: '',
  });

  const [startDate, setStartDate] = useState('');
  const [, setStartTime] = useState('');
  const [selectedAvailabilityIds, setSelectedAvailabilityIds] = useState([]);
  const [expandedAvailabilityDays, setExpandedAvailabilityDays] = useState({});

  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(true);
  const [profileEmail, setProfileEmail] = useState('');
  const [operatingHours, setOperatingHours] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        const person = profile?.person || {};
        const details = person.metadata?.studentDetails || {};
        setProfileEmail(profile?.user?.email || person.email || '');
        const address = typeof person.address === 'string'
          ? person.address
          : person.address?.line1 || person.address?.fullAddress || '';
        setStudentDetails({
          firstName: person.firstName || '',
          middleName: person.middleName || '',
          lastName: person.lastName || '',
          suffix: person.suffix || '',
          address,
          age: details.age ?? '',
          gender: details.gender || '',
          guardianName: details.guardianName || '',
          contactNo: person.phone || '',
        });
      })
      .catch(() => setError('Unable to load your student profile.'))
      .finally(() => setLoadingStudentProfile(false));
  }, []);

  useEffect(() => {
    getOperatingHours().then(setOperatingHours).catch(() => setOperatingHours(null));
  }, []);

  useEffect(() => {
    let active = true;
    getPaymentAccounts().then((accounts) => {
      if (!active) return;
      setPaymentAccounts(accounts);
      if (accounts.length === 1) setPaymentAccountId(String(accounts[0].id));
    }).catch(() => { if (active) setError('Unable to load active payment accounts.'); });
    return () => { active = false; };
  }, []);

  const isStudentProfileComplete = Boolean(
    profileEmail.trim() &&
      studentDetails.firstName.trim() &&
      studentDetails.lastName.trim() &&
      studentDetails.address.trim() &&
      studentDetails.age &&
      studentDetails.gender &&
      studentDetails.contactNo.trim() &&
      studentDetails.guardianName.trim(),
  );

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        paymentPlan,
        paymentAccountId,
        selectedInstructor,
        startDate,
        selectedAvailabilityIds,
        savedAt: new Date().toISOString(),
      }));
      setSuccess('Enrollment draft saved. You can continue later.');
      setError('');
    } catch {
      setError('Unable to save your enrollment draft in this browser.');
    }
  };

  useEffect(() => {
    const handlePaymentComplete = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== 'CADENZA_ENROLLMENT_PAYMENT_COMPLETED' ||
        !event.data?.enrollmentId
      ) {
        return;
      }

      setSubmitting(false);
      navigate(`/client/enrollments/${event.data.enrollmentId}`);
    };

    window.addEventListener('message', handlePaymentComplete);

    return () => {
      window.removeEventListener('message', handlePaymentComplete);
    };
  }, [navigate]);

  const selectedCourse = useMemo(
    () =>
      selectedPackage?.lessons?.find(
        (course) => String(course.id || course.courseId) === String(courseId),
      ) || selectedPackage?.lessons?.[0],
    [selectedPackage, courseId],
  );

  const selectedCourseId =
    selectedCourse?.id || selectedCourse?.courseId || courseId;

  useEffect(() => {
    async function loadPackage() {
      if (!packageId) {
        setError('No enrollment package was selected.');
        setLoadingPackages(false);
        return;
      }

      try {
        setLoadingPackages(true);
        setError('');

        const data = await getAvailablePackages();

        const currentPackage = data.find(
          (item) => String(item.id) === String(packageId),
        );

        if (!currentPackage) {
          setError('The selected package is not available.');
          return;
        }

        setSelectedPackage(currentPackage);
      } catch (error) {
        console.error(error);
        setError('Unable to load the selected package.');
      } finally {
        setLoadingPackages(false);
      }
    }

    loadPackage();
  }, [packageId]);

  useEffect(() => {
    async function loadInstructors() {
      if (!selectedPackage?.id || !selectedCourseId) {
        setInstructors([]);
        setLoadingInstructors(false);
        return;
      }

      try {
        setLoadingInstructors(true);
        setError('');
        setSelectedInstructor('');
        setAvailability([]);
        setStartTime('');
        setSelectedAvailabilityIds([]);
        setPaymentPlan('');

        const data = await getEnrollmentOptions(
          selectedPackage.id,
          selectedCourseId,
        );

        setInstructors(data);
      } catch (error) {
        console.error(error);
        setError(error?.message || 'Unable to load compatible instructors.');
      } finally {
        setLoadingInstructors(false);
      }
    }

    loadInstructors();
  }, [selectedPackage, selectedCourseId]);

  useEffect(() => {
    if (
      !selectedInstructor &&
      savedDraft?.selectedInstructor &&
      instructors.some(
        (instructor) => String(instructor.id) === String(savedDraft.selectedInstructor),
      )
    ) {
      setSelectedInstructor(String(savedDraft.selectedInstructor));
    }
  }, [instructors, savedDraft, selectedInstructor]);

  const selectedInstructorData = useMemo(
    () =>
      instructors.find(
        (instructor) => String(instructor.id) === String(selectedInstructor),
      ),
    [instructors, selectedInstructor],
  );

  useEffect(() => {
    setAvailability(selectedInstructorData?.availability || []);
    setSelectedAvailabilityIds([]);
    setStartDate('');
    setStartTime('');
  }, [selectedInstructorData]);

  useEffect(() => {
    if (
      !selectedInstructorData ||
      String(savedDraft?.selectedInstructor) !== String(selectedInstructor)
    ) {
      return;
    }

    const savedSlots = savedDraft.scheduleSlots || [];
    const restoredIds = savedSlots.length
      ? availability
          .filter((rule) => savedSlots.some((slot) => Number(slot.dayOfWeek) === Number(rule.dayOfWeek) && Number(slot.startMinute) === Number(rule.startMinute)))
          .map((rule) => rule.id)
      : savedDraft.selectedAvailabilityIds || [];
    setSelectedAvailabilityIds(restoredIds);
    setStartDate(savedDraft.startDate || '');
  }, [availability, savedDraft, selectedInstructor, selectedInstructorData]);

  // Once the student chooses a start date, refresh the selected instructor's
  // slots for that exact date. The API removes slots occupied by an active
  // enrollment or instructor block, so booked times cannot be selected again.
  useEffect(() => {
    if (
      !startDate ||
      !selectedPackage?.id ||
      !selectedInstructor ||
      !selectedCourseId
    ) {
      return undefined;
    }

    let cancelled = false;

    async function refreshAvailabilityForDate() {
      try {
        setLoadingAvailability(true);
        const result = await getInstructorAvailability(
          selectedPackage.id,
          selectedInstructor,
          selectedCourseId,
          startDate,
        );

        if (cancelled) {
          return;
        }

        const availableRules = Array.isArray(result?.availability)
          ? result.availability
          : [];

        // The API returns the instructor's complete availability after
        // removing occupied/conflicting times across the enrollment cycle.
        // Replace the list and retain only selections that are still valid.
        setAvailability(availableRules);
        setSelectedAvailabilityIds((current) =>
          current.filter((id) => availableRules.some((rule) => rule.id === id)),
        );
      } catch (error) {
        if (!cancelled) {
          setError(
            error?.message || 'Unable to refresh instructor availability.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    }

    refreshAvailabilityForDate();

    return () => {
      cancelled = true;
    };
  }, [startDate, selectedPackage?.id, selectedInstructor, selectedCourseId]);

  const availabilityForDisplay = useMemo(() => {
    const duration = Number(selectedPackage?.sessionDurationMinutes) || 0;
    const selectedHours = startDate ? getHoursForDate(operatingHours, startDate) : null;
    const openingMinute = selectedHours?.isClosed ? null : selectedHours?.startTime?.split(':').map(Number);
    const closingMinute = selectedHours?.isClosed ? null : selectedHours?.endTime?.split(':').map(Number);
    const opening = openingMinute ? openingMinute[0] * 60 + openingMinute[1] : null;
    const closing = closingMinute ? closingMinute[0] * 60 + closingMinute[1] : null;

    return availability.filter((rule) => {
      const ruleStart = Number(rule.startMinute);
      const ruleEnd = Number(rule.endMinute);

      if (ruleEnd - ruleStart < duration) return false;
      if (!startDate) return true;
      const selectedDateDay = new Date(`${startDate}T00:00:00`).getDay() || 7;
      if (Number(rule.dayOfWeek) !== selectedDateDay) return true;
      // A closed date does not make the weekday unavailable. The API rolls
      // this session forward to the same weekday in the following week.
      if (selectedHours?.isClosed) return true;
      return (
        opening !== null &&
        closing !== null &&
        ruleStart >= opening &&
        ruleEnd <= closing
      );
    }).sort((first, second) => {
      const dayDifference = Number(first.dayOfWeek) - Number(second.dayOfWeek);
      if (dayDifference !== 0) return dayDifference;
      const startDifference = Number(first.startMinute) - Number(second.startMinute);
      if (startDifference !== 0) return startDifference;
      const endDifference = Number(first.endMinute) - Number(second.endMinute);
      if (endDifference !== 0) return endDifference;
      return String(first.id).localeCompare(String(second.id));
    });
  }, [availability, operatingHours, selectedPackage?.sessionDurationMinutes, startDate]);

  const closedStartDateNotice = useMemo(() => {
    if (!startDate || !operatingHours) return null;
    const hours = getHoursForDate(operatingHours, startDate);
    if (!hours?.isClosed) return null;

    const nextWeekDate = addDaysToDateKey(startDate, 7);
    if (!nextWeekDate) return null;
    const formatDate = (dateKey) => new Date(`${dateKey}T00:00:00`).toLocaleDateString(
      undefined,
      { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' },
    );

    return {
      selected: formatDate(startDate),
      next: formatDate(nextWeekDate),
    };
  }, [operatingHours, startDate]);

  useEffect(() => {
    setSelectedAvailabilityIds((current) =>
      current.filter((id) => availabilityForDisplay.some((rule) => rule.id === id)),
    );
  }, [availabilityForDisplay]);

  // Keep the order in which the student selected the weekly schedule.
  // The first selected rule is the first day of the enrollment cycle.
  const selectedAvailability = selectedAvailabilityIds
    .map((id) => availabilityForDisplay.find((rule) => rule.id === id))
    .filter(Boolean);

  const availabilityByDay = useMemo(() => {
    return availabilityForDisplay.reduce((groups, rule) => {
      const day = Number(rule.dayOfWeek);
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(rule);
      return groups;
    }, {});
  }, [availabilityForDisplay]);

  const getDayOfWeekFromDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    const javascriptDay = date.getDay();
    return javascriptDay === 0 ? 7 : javascriptDay;
  };

  const startDayOfWeek = startDate ? getDayOfWeekFromDate(startDate) : null;
  // The first schedule is the one the student selected first, not the
  // chronologically earliest weekday. This lets a Tuesday-only selection
  // start on Tuesday instead of requiring a Monday schedule first.
  const firstSelectedRule = selectedAvailability[0] || null;
  const leastSelectedRule = firstSelectedRule;

  useEffect(() => {
    if (!leastSelectedRule) {
      setStartDate('');
      return;
    }

    const today = new Date();
    const todayDay = today.getDay() === 0 ? 7 : today.getDay();
    const daysUntil = (leastSelectedRule.dayOfWeek - todayDay + 7) % 7 || 7;
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setStartDate(addDaysToDateKey(todayKey, daysUntil));
    setStartTime('');
  }, [leastSelectedRule?.dayOfWeek]);

  const selectedStartRule =
    leastSelectedRule?.dayOfWeek === startDayOfWeek ? leastSelectedRule : null;
  const resolvedStartTime = selectedStartRule
    ? `${String(Math.floor(selectedStartRule.startMinute / 60)).padStart(
        2,
        '0',
      )}:${String(selectedStartRule.startMinute % 60).padStart(2, '0')}`
    : '';
  // End date is the date of the final recurring lesson, not the number of calendar days.
  const scheduleEndDate = useMemo(() => {
    const total = Number(selectedPackage?.numberOfSessions || 0);
    const perWeek = Number(selectedPackage?.sessionsPerWeek || 0);
    if (!startDate || !total || !perWeek || selectedAvailability.length < perWeek) return '';
    const rules = [...selectedAvailability]
      .sort((a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek))
      .filter((rule, index, all) =>
        all.findIndex((entry) => Number(entry.dayOfWeek) === Number(rule.dayOfWeek)) === index,
      );
    const first = rules[0];
    if (!first || getIsoDayOfWeek(startDate) !== Number(first.dayOfWeek)) return '';
    const selected = rules.slice(0, perWeek);
    if (selected.length !== perWeek) return '';
    const lastIndex = total - 1;
    const rule = selected[lastIndex % perWeek];
    const days = Math.floor(lastIndex / perWeek) * 7 +
      (Number(rule.dayOfWeek) - Number(first.dayOfWeek) + 7) % 7;
    return addDaysToDateKey(startDate, days) || '';
  }, [startDate, selectedPackage?.numberOfSessions, selectedPackage?.sessionsPerWeek, selectedAvailabilityIds.join(','), availabilityForDisplay]);

  const handleInstructorSelect = (instructor) => {
    setSelectedInstructor(instructor.id);
    setAvailability(instructor.availability || []);
    setSelectedAvailabilityIds([]);
    setStartDate('');
    setStartTime('');
    setError('');
  };

  const toggleAvailability = (rule) => {
    const isSelected = selectedAvailabilityIds.includes(rule.id);

    setSelectedAvailabilityIds((current) => {
      if (isSelected) {
        return current.filter((id) => id !== rule.id);
      }

      const requiredCount = Number(selectedPackage?.sessionsPerWeek);
      const selectedDays = availabilityForDisplay
        .filter((item) => current.includes(item.id))
        .map((item) => item.dayOfWeek);

      if (
        current.length >= requiredCount ||
        selectedDays.includes(rule.dayOfWeek)
      ) {
        return current;
      }

      return [...current, rule.id];
    });

    if (isSelected && rule.dayOfWeek === startDayOfWeek) {
      setStartTime('');
    } else if (!isSelected && rule.dayOfWeek === startDayOfWeek) {
      const hours = Math.floor(rule.startMinute / 60);
      const minutes = rule.startMinute % 60;
      setStartTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      );
    }
  };

  const handleStartDateChange = (value) => {
    if (!value) {
      setStartDate('');
      setStartTime('');
      setError('');
      return;
    }

    const dayOfWeek = getDayOfWeekFromDate(value);
    const firstRule = firstSelectedRule;

    if (!firstRule || firstRule.dayOfWeek !== dayOfWeek) {
      setStartDate(value);
      setStartTime('');
      setError(
        firstRule
          ? `The start date must be a ${formatDay(firstRule.dayOfWeek)} because that is the first day in your selected weekly schedule.`
          : 'Select your weekly schedule before choosing a start date.',
      );
      return;
    }

    setStartDate(value);
    setError('');

    const hours = Math.floor(firstRule.startMinute / 60);
    const minutes = firstRule.startMinute % 60;
    setStartTime(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    );
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;

    return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
  };

  const formatDay = (dayOfWeek) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
      // Availability uses ISO-style weekdays: Monday = 1, Sunday = 7.
      new Date(2024, 0, dayOfWeek),
    );

  const getDateTime = () => {
    if (!startDate || !resolvedStartTime) {
      return null;
    }

    return new Date(`${startDate}T${resolvedStartTime}:00+08:00`);
  };

  const formatLocalDateTime = (date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loadingStudentProfile) {
      setError('Please wait for your student profile to finish loading.');
      return;
    }

    if (
      !studentDetails.firstName.trim() ||
      !studentDetails.lastName.trim() ||
      !studentDetails.address.trim() ||
      !studentDetails.age ||
      !studentDetails.gender ||
      !studentDetails.contactNo.trim()
    ) {
      setError('Complete the required student details before continuing.');
      return;
    }

    setError('');
    setSuccess('');

    if (!selectedPackage) {
      setError('Please select a package.');
      return;
    }

    if (!selectedInstructor) {
      setError('Please select an instructor.');
      return;
    }

    if (!paymentPlan) {
      setError('Please select a payment option.');
      return;
    }

    if (!paymentAccountId) {
      setError('Please select a bank account for payment.');
      return;
    }

    if (!startDate) {
      setError('Please select a start date.');
      return;
    }

    if (selectedAvailability.length === 0) {
      setError('Please choose your weekly schedule.');
      return;
    }

    if (!resolvedStartTime) {
      setError(
        `The start date must be a ${formatDay(firstSelectedRule.dayOfWeek)} because it must match the first schedule you selected.`,
      );
      return;
    }

    const scheduledStart = getDateTime();

    if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
      setError('Invalid schedule.');
      return;
    }

    const sessionDuration = selectedPackage.sessionDurationMinutes;
    const sessionsPerWeek = Number(selectedPackage.sessionsPerWeek);

    if (!Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1) {
      setError(
        'This package does not have a valid Times per Week configuration.',
      );
      return;
    }

    const totalSessions = Number(selectedPackage.numberOfSessions);

    if (!Number.isInteger(totalSessions) || totalSessions < sessionsPerWeek) {
      setError(
        'This package must have at least enough sessions for one complete week.',
      );
      return;
    }

    if (selectedAvailability.length !== sessionsPerWeek) {
      setError(
        `Please choose exactly ${sessionsPerWeek} available time(s) per week for this package.`,
      );
      return;
    }

    if (!selectedStartRule) {
      setError(
        `The start date must be ${firstSelectedRule ? formatDay(firstSelectedRule.dayOfWeek) : 'the first selected schedule day'} because it starts the weekly schedule.`,
      );
      return;
    }

    const dayOfWeek = firstSelectedRule.dayOfWeek;
    const weeklyRules = [...selectedAvailability]
      .sort((first, second) => first.dayOfWeek - second.dayOfWeek)
      .filter(
        (rule, index, rules) =>
          rules.findIndex((item) => item.dayOfWeek === rule.dayOfWeek) ===
          index,
      );

    const selectedRuleIndex = weeklyRules.findIndex(
      (rule) => rule.dayOfWeek === dayOfWeek,
    );
    const orderedWeeklyRules = [
      ...weeklyRules.slice(selectedRuleIndex),
      ...weeklyRules.slice(0, selectedRuleIndex),
    ];
    const selectedWeeklyRules = orderedWeeklyRules.slice(0, sessionsPerWeek);

    let sessions;

    try {
      sessions = Array.from({ length: totalSessions }, (_, index) => {
        const week = Math.floor(index / sessionsPerWeek);
        const rule = selectedWeeklyRules[index % sessionsPerWeek];
        const dayOffset = (rule.dayOfWeek - dayOfWeek + 7) % 7;
        const sessionDate = addDaysToDateKey(
          startDate,
          week * 7 + dayOffset,
        );
        const sessionStart = getManilaDateTime(sessionDate, rule.startMinute);

        const sessionEnd = new Date(
          sessionStart.getTime() + sessionDuration * 60 * 1000,
        );

        if (rule.startMinute + sessionDuration > rule.endMinute) {
          throw new Error(
            `The generated ${formatDay(rule.dayOfWeek)} session is outside the instructor's availability.`,
          );
        }

        return {
          instructorId: selectedInstructor,
          scheduledStart: sessionStart,
          scheduledEnd: sessionEnd,
        };
      });
    } catch (error) {
      setError(error.message || 'Unable to create the requested schedule.');
      return;
    }

    const sessionsByWeek = sessions.reduce((counts, session) => {
      const week = Math.floor(
        (session.scheduledStart.getTime() - scheduledStart.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      counts[week] = (counts[week] || 0) + 1;
      return counts;
    }, {});

    if (
      Object.values(sessionsByWeek).some((count, index, counts) => {
        const isFinalWeek = index === counts.length - 1;
        return (
          count > sessionsPerWeek || (!isFinalWeek && count !== sessionsPerWeek)
        );
      })
    ) {
      setError(
        `This schedule must contain exactly ${sessionsPerWeek} session(s) per complete week.`,
      );
      return;
    }

    const formattedSessions = sessions.map((session) => ({
      ...session,
      scheduledStart: formatLocalDateTime(session.scheduledStart),
      scheduledEnd: formatLocalDateTime(session.scheduledEnd),
    }));

    let paymentWindow = null;

    try {
      paymentWindow = window.open('about:blank', '_blank');

      if (!paymentWindow) {
        setError(
          'The payment tab was blocked. Please allow popups for this site and try again.',
        );
        return;
      }

      setSubmitting(true);

      await validateEnrollmentSchedule({
        lessonPackageId: selectedPackage.id,
        sessions: formattedSessions,
        metadata: {
          courseId: selectedCourseId || null,
          studentDetails: {
            ...studentDetails,
            age: Number(studentDetails.age),
            email: profileEmail,
          },
        },
      });

      localStorage.setItem(
        'cadenza-pending-enrollment-checkout',
        JSON.stringify({
          package: selectedPackage,
          paymentPlan,
          paymentAccountId,
          lessonPackageId: selectedPackage.id,
          sessions: formattedSessions,
          metadata: {
            courseId: selectedCourseId || null,
            paymentPlan,
            studentDetails: {
              ...studentDetails,
              age: Number(studentDetails.age),
              email: profileEmail,
            },
          },
        }),
      );
      localStorage.removeItem(draftKey);

      paymentWindow.location.href = `${window.location.origin}/client/enrollments/payment`;
    } catch (error) {
      if (paymentWindow && !paymentWindow.closed) {
        paymentWindow.close();
      }

      console.error('Failed to submit enrollment:', error);

      setError(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to create enrollment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPackages) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Loading enrollment package...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/client/enrollments')}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Enrollments
        </button>

        <h1 className="text-2xl font-semibold tracking-tight">
          New Enrollment
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Choose an instructor and schedule for your selected package.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {selectedPackage && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Course
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {selectedCourse?.name || 'Course'}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Package: {selectedPackage.name}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xl font-semibold">
                ₱
                {Number(selectedPackage.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>

              <p className="text-sm text-muted-foreground">
                {selectedPackage.numberOfSessions} sessions
              </p>

              <p className="text-sm text-muted-foreground">
                {selectedPackage.sessionDurationMinutes} minutes per session
              </p>

              <p className="text-sm font-medium text-foreground">
                {selectedPackage.sessionsPerWeek} session(s) per week required
              </p>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Student Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These details are fetched from your Account profile and will be used for this enrollment.
            </p>
            {!loadingStudentProfile && !isStudentProfileComplete && (
              <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                <p className="font-medium">Complete your profile before enrolling.</p>
                <p className="mt-1">Required Student Details must be completed in your Account profile.</p>
                <button
                  type="button"
                  className="mt-2 font-medium underline"
                  onClick={() => navigate('/client/profile')}
                >
                  Go to Account profile
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {loadingStudentProfile ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">Loading student profile...</p>
            ) : (
              <>
                {[
                  ['firstName', 'First name'],
                  ['middleName', 'Middle name'],
                  ['lastName', 'Last name'],
                  ['suffix', 'Suffix'],
                  ['address', 'Address'],
                  ['age', 'Age'],
                  ['guardianName', 'Guardian name'],
                  ['contactNo', 'Contact number'],
                  ['gender', 'Gender'],
                ].map(([field, label]) => (
                  <DetailField key={field} label={label} value={studentDetails[field]} wide={field === 'address'} />
                ))}
                <DetailField label="Email" value={profileEmail} />
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Choose Instructor</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Active instructors mapped to{' '}
              <span className="font-medium text-foreground">
                {selectedCourse?.name || 'this course'}
              </span>{' '}
              with registered availability are shown.
            </p>
          </div>

          {loadingInstructors ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Loading compatible instructors...
              </p>
            </div>
          ) : instructors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No active instructors mapped to this course have registered
                availability.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {instructors.map((instructor) => {
                const selected = instructor.id === selectedInstructor;

                return (
                  <button
                    key={instructor.id}
                    type="button"
                    onClick={() => handleInstructorSelect(instructor)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{instructor.name}</p>

                        {instructor.email && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {instructor.email}
                          </p>
                        )}

                        {instructor.courses?.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Courses:{' '}
                            {instructor.courses
                              .map((course) => course.name)
                              .join(', ')}
                          </p>
                        )}
                      </div>

                      {selected && (
                        <span className="text-xs font-medium text-primary">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedInstructorData && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Choose Schedule</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Select the preferred starting date and time for your lessons
                with{' '}
                <span className="font-medium text-foreground">
                  {selectedInstructorData.name}
                </span>
                .
              </p>
            </div>

            <div className="space-y-5">
              {availability.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    This instructor does not have any availability configured
                    yet.
                  </p>
                </div>
              )}

              {availability.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-sm font-medium">
                    Choose {selectedPackage.sessionsPerWeek} time(s) per week
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Select the days and times you want to attend. You have
                    selected {selectedAvailability.length} of{' '}
                    {selectedPackage.sessionsPerWeek}.
                  </p>

                  <div className="mt-3 space-y-4">
                    {Object.entries(availabilityByDay).map(([day, rules]) => (
                      <div key={day} className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAvailabilityDays((current) => ({
                              ...current,
                              [day]: !current[day],
                            }))
                          }
                          className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm font-semibold hover:bg-accent"
                        >
                          <span>{formatDay(Number(day))}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {expandedAvailabilityDays[day]
                              ? 'Hide times'
                              : `${rules.length} registered time${rules.length === 1 ? '' : 's'}`}
                          </span>
                        </button>
                        {expandedAvailabilityDays[day] && (
                          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Registered times for {formatDay(Number(day))}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                          {rules.map((rule) =>
                            (() => {
                        const isSelected = selectedAvailabilityIds.includes(
                          rule.id,
                        );
                        const hasAnotherTimeOnDay = selectedAvailability.some(
                          (selectedRule) =>
                            selectedRule.dayOfWeek === rule.dayOfWeek &&
                            selectedRule.id !== rule.id,
                        );

                              return (
                          <button
                            type="button"
                            key={rule.id}
                            onClick={() => toggleAvailability(rule)}
                            disabled={
                              !isSelected &&
                              (selectedAvailability.length >=
                                Number(selectedPackage.sessionsPerWeek) ||
                                hasAnotherTimeOnDay)
                            }
                            className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-background hover:bg-accent'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <span className="font-medium">
                              {formatDay(rule.dayOfWeek)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatTime(rule.startMinute)} -{' '}
                              {formatTime(rule.endMinute)}
                            </span>
                          </button>
                              );
                            })(),
                          )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>

                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  readOnly
                  disabled
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              {startDate && (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  {!selectedStartRule ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select a start date on{' '}
                      {firstSelectedRule
                        ? formatDay(firstSelectedRule.dayOfWeek)
                        : 'the first selected schedule day'}{' '}
                      so the first class starts at that day&apos;s available
                      time.
                    </p>
                  ) : !resolvedStartTime ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      The instructor&apos;s availability is shorter than the
                      selected session duration.
                    </p>
                  ) : null}
                </div>
              )}

              {startDate && resolvedStartTime && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium">Selected Schedule</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(
                      `${startDate}T${resolvedStartTime}:00+08:00`,
                    ).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(
                      `${startDate}T${resolvedStartTime}:00+08:00`,
                    ).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Each session lasts {selectedPackage.sessionDurationMinutes}{' '}
                    minutes.
                  </p>

                  <p className="mt-1 text-xs font-medium text-primary">
                    The schedule will include exactly{' '}
                    {selectedPackage.sessionsPerWeek} session(s) per week.
                  </p>

                  {closedStartDateNotice && (
                    <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs font-medium text-amber-900">
                      {closedStartDateNotice.selected} is closed. Your schedule
                      will continue on {closedStartDateNotice.next} if that date
                      is open and has no custom operating-hours closure.
                    </p>
                  )}

                  <p className="mt-1 text-xs font-medium text-primary">
                    End date:{' '}
                    {scheduleEndDate
                      ? new Date(`${scheduleEndDate}T00:00:00`).toLocaleDateString(
                          undefined,
                          {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )
                      : 'Not available'}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Payment Option</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose your payment option before proceeding.
          </p>

          <div className="mt-4 grid gap-2">
            {[
              ['DOWN_PAYMENT', '50% down payment'],
              ['FULL_PAYMENT', 'Full payment'],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`rounded-lg border p-3 text-sm font-medium ${
                  paymentPlan === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <input
                  type="radio"
                  name="enrollment-payment-plan"
                  value={value}
                  checked={paymentPlan === value}
                  onChange={(event) => setPaymentPlan(event.target.value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label htmlFor="enrollment-payment-account" className="text-sm font-medium">Bank account for payment</label>
            <select id="enrollment-payment-account" value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} disabled={submitting || paymentAccounts.length === 0} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">{paymentAccounts.length ? 'Select an active bank account' : 'No active bank accounts available'}</option>
              {paymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankName} · {account.accountNumber}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">The next payment page will show the QR code for this account.</p>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            The QR payment page will open in a separate tab.
          </p>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/client/enrollments')}
            className="h-10 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveDraft}
            disabled={submitting}
            className="h-10 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Save draft
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              !selectedPackage ||
              !selectedInstructor ||
              !startDate ||
              !paymentPlan ||
              !paymentAccountId ||
              !isStudentProfileComplete
            }
            className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Enrollment'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailField({ label, value, wide = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="min-h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
        {value || 'Not provided'}
      </div>
    </div>
  );
}
