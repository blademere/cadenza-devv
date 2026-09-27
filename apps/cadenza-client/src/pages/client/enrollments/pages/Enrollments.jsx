import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PackageCard from "../components/PackageCard";
import EnrollmentStatus from "../components/EnrollmentStatus";

import {
  getAvailablePackages,
  getMyEnrollment,
} from "../services/enrollment.service";

export default function Enrollments() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [myEnrollment, setMyEnrollment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [availablePackages, enrollment] = await Promise.all([
          getAvailablePackages(),
          getMyEnrollment(),
        ]);

        setPackages(availablePackages);
        setMyEnrollment(enrollment);
      } catch (error) {
        console.error(error);
        setError("Unable to load enrollment information.");
      }
    }

    loadData();
  }, []);

  const handleEnroll = (packageData) => {
    navigate(`/client/enrollments/new?package=${packageData.id}`);
  };

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enrollments</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Explore available packages and enroll in a program.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* My Enrollment */}
      {myEnrollment && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                My Enrollment
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {myEnrollment.packageName}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Instructor: {myEnrollment.instructorName}
              </p>

              <p className="text-sm text-muted-foreground">
                Start Date: {myEnrollment.startDate}
              </p>
            </div>

            <EnrollmentStatus status={myEnrollment.status} />
          </div>
        </section>
      )}

      {/* Packages */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Available Packages</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose a package that you want to enroll in.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No packages are currently available.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((packageData) => (
              <PackageCard
                key={packageData.id}
                packageData={packageData}
                enrolled={myEnrollment?.packageId === packageData.id}
                onEnroll={handleEnroll}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

