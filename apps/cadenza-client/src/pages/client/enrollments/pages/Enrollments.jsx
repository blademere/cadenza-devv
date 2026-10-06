import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PackageCard from '../components/PackageCard';
import EnrollmentStatus from '../components/EnrollmentStatus';

import {
  getAvailablePackages,
  getMyEnrollment,
} from '../services/enrollmentServices';

export default function Enrollments() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [myEnrollment, setMyEnrollment] = useState(null);

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
        setMyEnrollment(enrollment || null);
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

  const enrolledPackageId = myEnrollment?.packageId
    ? String(myEnrollment.packageId)
    : null;
  const enrolledCourseId = myEnrollment?.courseId
    ? String(myEnrollment.courseId)
    : null;

  const packageGroups = packages.map((packageData) => ({
    ...packageData,
    courses: (packageData.lessons || [])
      .filter((course) => {
        const isCurrentlyEnrolled =
          enrolledPackageId &&
          enrolledCourseId &&
          String(packageData.id) === enrolledPackageId &&
          String(course.id) === enrolledCourseId;

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

  const enrolledPackage = myEnrollment?.packageId
    ? packages.find(
        (packageData) =>
          String(packageData.id) === String(myEnrollment.packageId),
      )
    : null;

  const enrolledCourses =
    enrolledPackage && myEnrollment?.courseId
      ? (enrolledPackage.allLessons || enrolledPackage.lessons || [])
          .filter(
            (course) => String(course.id) === String(myEnrollment.courseId),
          )
          .map((course) => ({
            ...enrolledPackage,
            courseId: course.id,
            courseName: course.name,
            courseDescription: course.description,
            lessons: [course],
          }))
      : myEnrollment?.courseId
        ? []
        : (myEnrollment?.lessons || []).map((course) => ({
            courseId: course.id || course.courseId,
            courseName: course.name,
            courseDescription: course.description,
            lessons: [course],
            numberOfSessions: myEnrollment?.numberOfSessions,
            sessionDurationMinutes: myEnrollment?.sessionDurationMinutes,
            sessionsPerWeek: myEnrollment?.sessionsPerWeek,
            price: myEnrollment?.price || 0,
          }));

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
          {myEnrollment && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    My Enrollment
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    {enrolledPackage?.name ||
                      myEnrollment.packageName ||
                      'Enrollment'}
                  </h2>

                  {myEnrollment.sessions?.length > 0 && (
                    <>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Instructor:{' '}
                        {myEnrollment.sessions[0].instructorName ||
                          'Not assigned'}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Start Date:{' '}
                        {new Date(
                          myEnrollment.sessions[0].scheduledStart,
                        ).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>

                <EnrollmentStatus status={myEnrollment.status} />
              </div>

              {enrolledCourses.length > 0 && (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {enrolledCourses.map((courseData) => (
                    <PackageCard
                      key={`${courseData.id || 'enrollment'}-${courseData.courseId}`}
                      packageData={courseData}
                      enrolled
                      onEnroll={handleEnroll}
                    />
                  ))}
                </div>
              )}
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
