import { ArrowRight, CalendarDays, Check, Guitar, Music2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import app from '@/config/app';
import { Button } from '@/components/ui';
import { Header, Footer } from '../components';

const services = [
  { icon: Music2, title: 'Enroll in Lessons', text: 'Explore available lesson packages and build a schedule that fits your goals.' },
  { icon: CalendarDays, title: 'Book a Band Room', text: "Reserve an available practice room during the center's operating hours." },
  { icon: Guitar, title: 'Rent an Instrument', text: 'Check instrument availability and request a rental with clear return details.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950">
      <Header />
      <main>
        <section className="relative isolate overflow-hidden bg-[#eef6ff]">
          <div className="pointer-events-none absolute -bottom-32 -left-24 z-0 h-64 w-[70%] rotate-6 rounded-[50%] bg-white/80" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0c447c] shadow-sm"><Music2 className="size-4" /> Your music journey starts here</div>
              <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl">Learn, practice, and make music with <span className="text-blue-700">confidence.</span></h1>
              <p className="mt-5 max-w-xl text-lg leading-7 text-slate-600">{app.name} brings lessons, practice rooms, and instrument rentals together in one simple client portal.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button size="lg" onClick={() => navigate('/signup')}>Create your account <ArrowRight /></Button><Button size="lg" variant="outline" onClick={() => navigate('/login')}>Log in to your account</Button></div>
            </div>
            <img src="/cmc.png" alt="Cadenza Music Center practice room" className="relative z-10 h-[300px] w-full rounded-[2rem] object-cover shadow-xl sm:h-[390px]" />
          </div>
        </section>

        <section id="services" className="relative z-10 mx-auto max-w-7xl bg-white px-5 py-20 sm:px-8">
          <div className="relative z-10 mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">Our services</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Choose what moves your music forward.</h2><p className="mt-3 text-slate-600">The client portal keeps each service clear, organized, and easy to request.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{services.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="grid size-12 place-items-center rounded-xl bg-blue-100 text-blue-700"><Icon /></div><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><ArrowRight className="mt-5 size-5 text-blue-700" /></article>)}</div>
        </section>

        <section className="bg-white px-5 py-10 sm:px-8"><div className="mx-auto max-w-4xl text-center"><p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">How it works</p><h2 className="mt-3 text-3xl font-black">Get started in three simple steps.</h2><p className="mt-3 text-slate-600">Create an account, choose a service, and manage everything in one place.</p><div className="mt-12 grid gap-8 md:grid-cols-3">{[{ icon: UserRound, title: 'Create an Account', text: "Sign up as a client to access Cadenza's services." }, { icon: CalendarDays, title: 'Choose a Service', text: 'Enroll in a lesson, book a band room, or rent an instrument.' }, { icon: Check, title: 'Manage & Track', text: 'View schedules, requests, and payments in your portal.' }].map(({ icon: Icon, title, text }, index) => <div key={title}><div className="mx-auto grid size-14 place-items-center rounded-full bg-blue-100 text-blue-700"><Icon /><span className="absolute mt-20 grid size-6 place-items-center rounded-full bg-blue-700 text-xs font-bold text-white">{index + 1}</span></div><h3 className="mt-7 font-bold">{title}</h3><p className="mt-2 text-sm text-slate-600">{text}</p></div>)}</div></div></section>

        <section id="about" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">Why choose Cadenza</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">More than a music center — a complete experience.</h2><div className="mt-7 space-y-5">{[['All-in-One Portal', 'Manage lessons, bookings, rentals, and payments easily.'], ['Organized & Transparent', 'Clear schedules, request statuses, and rental details.'], ['Support for Every Musician', 'A convenient and reliable system for students, bands, and music enthusiasts.']].map(([title, text]) => <div key={title} className="flex gap-3"><Check className="mt-1 size-5 shrink-0 rounded-full bg-blue-100 p-1 text-blue-700" /><div><h3 className="font-bold">{title}</h3><p className="text-sm text-slate-600">{text}</p></div></div>)}</div></div><img src="/guitar.png" alt="Musician playing guitar" className="h-72 w-full rounded-[2rem] object-cover shadow-lg sm:h-96" /></section>

        <section id="contact" className="mx-5 rounded-3xl bg-blue-700 px-6 py-10 text-white sm:mx-auto sm:max-w-7xl sm:px-12"><div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-black">Ready to make your next move?</h2><p className="mt-2 text-blue-100">Start with a Cadenza account and manage your music journey in one place.</p></div><Button variant="secondary" onClick={() => navigate('/signup')}>Get started <ArrowRight /></Button></div></section>
      </main>
      <Footer />
    </div>
  );
}
