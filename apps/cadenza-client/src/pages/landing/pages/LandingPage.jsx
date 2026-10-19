import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Guitar,
  Music2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import app from "@/config/app";
import { Button } from "@/components/ui";

import { Header, Footer } from "../components";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pb-32">
        <section className="relative overflow-hidden border-b bg-muted/30">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
            <div className="flex flex-col justify-center">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm text-muted-foreground shadow-sm">
                <Music2 className="size-4 text-primary" />
                Your music journey starts here
              </div>

              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Learn, practice, and make music with confidence.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {app.name} brings lessons, practice rooms, and instrument rentals
                together in one simple client portal.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => navigate("/signup")}>
                  Create your account
                  <ArrowRight />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Sign in to client portal
                </Button>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Already have an account? Sign in to view your schedule, requests,
                and payment records.
              </p>
            </div>

            <div className="relative flex min-h-[280px] items-center justify-center rounded-3xl border bg-card p-8 shadow-sm">
              <div className="absolute inset-5 rounded-2xl border border-dashed border-primary/20" />
              <div className="relative text-center">
                <img
                  src="/logo.png"
                  alt={`${app.name} logo`}
                  className="mx-auto size-28 object-contain drop-shadow-lg"
                />
                <p className="mt-6 text-xl font-semibold">Everything in one place</p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Discover services, submit requests, and keep track of every step.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">What you can do</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Choose what moves your music forward.</h2>
            <p className="mt-3 text-muted-foreground">The client portal keeps each service clear, organized, and easy to request.</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <ServiceCard icon={<Music2 />} title="Enroll in lessons" text="Explore available lesson packages and build a schedule that fits your goals." />
            <ServiceCard icon={<CalendarDays />} title="Book a band room" text="Reserve an available practice room during the center's registered operating hours." />
            <ServiceCard icon={<Guitar />} title="Rent an instrument" text="Check instrument availability and request a rental with clear return details." />
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
            <InfoItem icon={<Clock3 />} title="Operating hours" text="Booking times follow the center's current registered schedule." />
            <InfoItem icon={<ShieldCheck />} title="Clear request status" text="Track approvals, payments, schedules, and updates from your account." />
            <InfoItem icon={<ArrowRight />} title="Simple next steps" text="Create an account, choose a service, and submit your request." />
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to make your next move?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Start with a Cadenza account and manage your lessons, bookings, rentals, and payments in one place.</p>
          <Button className="mt-6" size="lg" onClick={() => navigate("/signup")}>Get started <ArrowRight /></Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ServiceCard({ icon, title, text }) {
  return (
    <article className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}

function InfoItem({ icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-primary">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
