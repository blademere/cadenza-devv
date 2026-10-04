import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Music,
  UserRound,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import EnrollmentStatus from "../components/EnrollmentStatus";

import { getEnrollmentById } from "../services/enrollment.service";

export default function EnrollmentDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [enrollment, setEnrollment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEnrollment() {
      try {
        const data = await getEnrollmentById(id);

        setEnrollment(data);
      } catch (error) {
        console.error(error);

        setError("Unable to find this enrollment.");
      } finally {
        setLoading(false);
      }
    }

    loadEnrollment();
  }, [id]);

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

  if (!enrollment) {
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
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 lg:px-6">
      <button
        type="button"
        onClick={() => navigate("/client/enrollments")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Enrollments
      </button>

      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Enrollment #{enrollment.id}
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              {enrollment.packageName}
            </h1>
          </div>

          <EnrollmentStatus status={enrollment.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Package</p>

              <p className="font-medium">{enrollment.packageName}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Instructor</p>

              <p className="font-medium">{enrollment.instructorName}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Preferred Start Date
              </p>

              <p className="font-medium">{enrollment.startDate}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>

            <p className="font-medium">{enrollment.enrolledAt}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Application Status</h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-5">
          {enrollment.status === "PENDING" && (
            <>
              <h3 className="font-medium">Application Under Review</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your enrollment application has been submitted and is waiting
                for staff approval.
              </p>
            </>
          )}

          {enrollment.status === "APPROVED" && (
            <>
              <h3 className="font-medium">Enrollment Approved</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your enrollment has been approved. You can now proceed with your
                program.
              </p>
            </>
          )}

          {enrollment.status === "REJECTED" && (
            <>
              <h3 className="font-medium">Enrollment Rejected</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Your enrollment application was not approved.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
