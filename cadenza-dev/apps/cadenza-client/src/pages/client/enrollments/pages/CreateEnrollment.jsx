import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import InstructorCard from "../components/InstructorCard";
import EnrollmentSummary from "../components/EnrollmentSummary";

import {
  getPackageById,
  getInstructorsByInstrument,
  createEnrollment,
} from "../services/enrollment.service";

export default function CreateEnrollment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const packageId = searchParams.get("package");

  const [packageData, setPackageData] = useState(null);

  const [instructors, setInstructors] = useState([]);

  const [selectedInstructor, setSelectedInstructor] = useState(null);

  const [startDate, setStartDate] = useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!packageId) {
        setError("No package was selected.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const selectedPackage = await getPackageById(packageId);

        setPackageData(selectedPackage);

        const availableInstructors = await getInstructorsByInstrument(
          selectedPackage.instrument,
        );

        setInstructors(availableInstructors);
      } catch (error) {
        console.error(error);

        setError("Unable to load enrollment information.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [packageId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedInstructor) {
      setError("Please select an instructor.");
      return;
    }

    if (!startDate) {
      setError("Please select your preferred start date.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const enrollment = await createEnrollment({
        packageId: packageData.id,
        packageName: packageData.name,
        instrument: packageData.instrument,
        instructorId: selectedInstructor.id,
        instructorName: selectedInstructor.name,
        startDate,
        notes,
      });

      navigate(`/client/enrollments/${enrollment.id}`);
    } catch (error) {
      console.error(error);

      setError("Unable to submit your enrollment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading enrollment...
        </div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="space-y-4 px-4 py-6 lg:px-6">
        <button
          type="button"
          onClick={() => navigate("/client/enrollments")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Enrollments
        </button>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">
            {error || "Package not found."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/client/enrollments")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Enrollments
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Enrollment Application
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Complete your enrollment application for the {packageData.name}{" "}
          program.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[1fr_360px]"
      >
        <div className="space-y-6">
          {/* Package */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Selected Package</h2>

            <div className="mt-5 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{packageData.name}</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {packageData.description}
                  </p>
                </div>

                <p className="shrink-0 text-lg font-semibold">
                  ₱{packageData.price.toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          {/* Account information */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Your Information</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              This information comes from your client account.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Full Name</label>

                <input
                  type="text"
                  value="Juan Dela Cruz"
                  disabled
                  className="mt-2 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>

                <input
                  type="email"
                  value="juan@example.com"
                  disabled
                  className="mt-2 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>

                <input
                  type="text"
                  value="0912 345 6789"
                  disabled
                  className="mt-2 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Instructors */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div>
              <h2 className="text-lg font-semibold">Choose an Instructor</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Available {packageData.instrument} instructors.
              </p>
            </div>

            {instructors.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No instructors are currently available for this instrument.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {instructors.map((instructor) => (
                  <InstructorCard
                    key={instructor.id}
                    instructor={instructor}
                    selected={selectedInstructor?.id === instructor.id}
                    onSelect={setSelectedInstructor}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Schedule */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Preferred Start Date</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose when you would like to start your program.
            </p>

            <div className="mt-5">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>

              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Additional Information</h2>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Add any additional information or requests..."
              className="mt-4 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </section>
        </div>

        {/* Right side */}
        <div className="space-y-4">
          <div className="sticky top-6">
            <EnrollmentSummary
              packageData={packageData}
              instructor={selectedInstructor}
              startDate={startDate}
            />

            <button
              type="submit"
              disabled={submitting || !selectedInstructor || !startDate}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}

              {submitting ? "Submitting..." : "Submit Enrollment"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
