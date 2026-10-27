import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PackageCard from '../components/PackageCard';
import EnrollmentStatus from '../components/EnrollmentStatus';

import {
  getAvailablePackages,
  getMyEnrollment,
} from '../services/enrollmentServices';

const getManilaScheduleParts = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const dayOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday) + 1;
  return { dayOfWeek, startMinute: Number(parts.hour) * 60 + Number(parts.minute) };
};

export default function Enrollments() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [activeTab, setActiveTab] = useState('enrollments');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [availablePackages, enrollment] = await Promise.all([
          getAvailablePackages(),
          getMyEnrollment(),
        ]);

        setPackages(Array.isArray(availablePackages) ? availablePackages : []);
        setMyEnrollments(
          Array.isArray(enrollment)
            ? enrollment
            : enrollment
              ? [enrollment]
              : [],
        );

        (Array.isArray(enrollment) ? enrollment : enrollment ? [enrollment] : [])
          .filter((item) => item.status === 'CANCELLED' && item.packageId && item.courseId)
          .forEach((item) => {
            const firstSession = item.sessions?.[0];
            const draftKey = `cadenza-enrollment-draft:${item.packageId}:${item.courseId}`;
            const existingDraft = JSON.parse(localStorage.getItem(draftKey) || 'null') || {};
            localStorage.setItem(draftKey, JSON.stringify({
              ...existingDraft,
              selectedInstructor: firstSession?.instructorId || existingDraft.selectedInstructor || '',
              startDate: firstSession?.scheduledStart
                ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(firstSession.scheduledStart))
                : existingDraft.startDate || '',
              scheduleSlots: (item.sessions || []).map((session) => getManilaScheduleParts(session.scheduledStart)).filter(Boolean),
              cancellationReason: item.metadata?.cancellationReason || '',
              sourceEnrollmentId: item.id,
              savedAt: new Date().toISOString(),
            }));
          });

        const availableDrafts = Object.keys(localStorage)
          .filter((key) => key.startsWith('cadenza-enrollment-draft:'))
          .map((key) => {
            try {
              const [, packageId, courseId] = key.split(':');
              const draft = JSON.parse(localStorage.getItem(key) || 'null');
              const packageData = (availablePackages || []).find(
                (item) => String(item.id) === String(packageId),
              );
              const course = packageData?.lessons?.find(
                (item) => String(item.id) === String(courseId),
              );
              return packageData && draft
                ? { key, packageData, course, ...draft }
                : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .sort((first, second) =>
            String(second.savedAt || '').localeCompare(String(first.savedAt || '')),
          );
        setDrafts(availableDrafts);
      } catch (error) {
        console.error(error);

        setError(
          error?.response?.data?.message ||
            'Unable to load enrollment information.',
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const refreshTimer = window.setInterval(loadData, 15000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const handleEnroll = (packageData) => {
    if (!packageData?.id) {
      console.error(
        'Cannot start enrollment: package ID is missing.',
        packageData,
      );
      return;
    }

    navigate(
      `/client/enrollments/new?package=${encodeURIComponent(
        packageData.id,
      )}&course=${encodeURIComponent(packageData.courseId)}`,
    );
  };

  const continueDraft = (draft) => {
    navigate(
      `/client/enrollments/new?package=${encodeURIComponent(draft.packageData.id)}&course=${encodeURIComponent(draft.course?.id || '')}`,
    );
  };

  const deleteDraft = (draftKey) => {
    localStorage.removeItem(draftKey);
    setDrafts((current) => current.filter((draft) => draft.key !== draftKey));
  };

  const enrolledCourseKeys = new Set(
    myEnrollments
      .filter((enrollment) => enrollment.status !== 'CANCELLED' && enrollment.packageId && enrollment.courseId)
      .map(
        (enrollment) =>
          `${String(enrollment.packageId)}:${String(enrollment.courseId)}`,
      ),
  );

  const packageGroups = packages.map((packageData) => ({
    ...packageData,
    courses: (packageData.lessons || [])
      .filter((course) => {
        const isCurrentlyEnrolled = enrolledCourseKeys.has(
          `${String(packageData.id)}:${String(course.id)}`,
        );

        return !isCurrentlyEnrolled;
      })
      .map((course) => ({
        ...packageData,
        courseId: course.id,
        courseName: course.name,
        courseDescription: course.description,
        lessons: [course],
      })),
  }));

  const enrollmentCards = myEnrollments.flatMap((enrollment) => {
    const enrolledPackage = enrollment.packageId
      ? packages.find(
          (packageData) =>
            String(packageData.id) === String(enrollment.packageId),
        )
      : null;
    const lessons = enrolledPackage?.allLessons || enrolledPackage?.lessons;
    const selectedLessons = enrollment.courseId
      ? (lessons || []).filter(
          (course) => String(course.id) === String(enrollment.courseId),
        )
      : enrollment.lessons || [];

    return selectedLessons.map((course) => ({
      ...(enrolledPackage || {}),
      id: enrollment.id,
      courseId: course.id || course.courseId,
      courseName: course.name,
      courseDescription: course.description,
      lessons: [course],
      numberOfSessions:
        enrolledPackage?.numberOfSessions || enrollment.numberOfSessions,
      sessionDurationMinutes:
        enrolledPackage?.sessionDurationMinutes ||
        enrollment.sessionDurationMinutes,
      sessionsPerWeek:
        enrolledPackage?.sessionsPerWeek || enrollment.sessionsPerWeek,
      price: enrolledPackage?.price || enrollment.price || 0,
      status: enrollment.status,
      cancellationReason: enrollment.metadata?.cancellationReason,
    }));
  });

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enrollments</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Explore available packages and enroll in a program.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Loading enrollment information...
          </p>
        </div>
      ) : (
        <>
          {(myEnrollments.length > 0 || drafts.length > 0) && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex gap-6 border-b border-border">
                <button type="button" onClick={() => setActiveTab('enrollments')} className={`border-b-2 pb-3 text-sm font-semibold ${activeTab === 'enrollments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                  My Enrollment
                </button>
                <button type="button" onClick={() => setActiveTab('drafts')} className={`border-b-2 pb-3 text-sm font-semibold ${activeTab === 'drafts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                  My drafts {drafts.length > 0 && `(${drafts.length})`}
                </button>
              </div>

              {activeTab === 'enrollments' && enrollmentCards.length > 0 && (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {enrollmentCards.map((courseData) => (
                    <div key={`${courseData.id}-${courseData.courseId}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">
                          {courseData.courseName || 'Enrollment'}
                        </p>
                        <EnrollmentStatus status={courseData.status} />
                      </div>
                      {courseData.status === 'CANCELLED' && courseData.cancellationReason && (
                        <p className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                          Front Desk reason: {courseData.cancellationReason}
                        </p>
                      )}
                      <PackageCard
                        packageData={courseData}
                        enrolled
                        onEnroll={handleEnroll}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'drafts' && (drafts.length > 0 ? (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {drafts.map((draft) => (
                    <div key={draft.key} className="rounded-xl border border-border p-4">
                      <p className="font-semibold">{draft.course?.name || 'Enrollment draft'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Package: {draft.packageData.name}</p>
                      {draft.cancellationReason && <p className="mt-2 text-sm text-destructive">Correction requested: {draft.cancellationReason}</p>}
                      <p className="mt-3 text-xs text-muted-foreground">
                        Saved {draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'recently'}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => continueDraft(draft)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Continue</button>
                        <button type="button" onClick={() => deleteDraft(draft.key)} className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-5 text-sm text-muted-foreground">You have no saved enrollment drafts.</p>)}
            </section>
          )}

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Available Packages</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Choose a course that you want to enroll in.
              </p>
            </div>

            {packageGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No courses are currently available for enrollment.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {packageGroups.map((packageData) => (
                  <section key={packageData.id}>
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold">
                        {packageData.name}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Courses included in this package
                      </p>
                    </div>

                    {packageData.courses.length > 0 ? (
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {packageData.courses.map((courseData) => (
                          <PackageCard
                            key={`${courseData.id}-${courseData.courseId}`}
                            packageData={courseData}
                            enrolled={false}
                            onEnroll={handleEnroll}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border p-6">
                        <p className="text-sm text-muted-foreground">
                          No courses are currently configured for this package.
                        </p>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
