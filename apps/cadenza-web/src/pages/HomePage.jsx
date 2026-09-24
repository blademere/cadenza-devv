import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarBlank,
  CheckCircle,
  DoorOpen,
  Guitar,
  MusicNotes,
  PlayCircle,
} from '@phosphor-icons/react'
import { branding } from '../config/branding'
import './HomePage.css'

const services = [
  {
    icon: MusicNotes,
    eyebrow: 'Learn',
    title: 'Music lessons',
    description: 'Structured lesson packages, scheduled sessions, instructor-led learning, and attendance tracking.',
  },
  {
    icon: Guitar,
    eyebrow: 'Rent',
    title: 'Instruments',
    description: 'Browse available instruments, reserve what you need, and manage your rental from one place.',
  },
  {
    icon: DoorOpen,
    eyebrow: 'Create',
    title: 'Band rooms',
    description: 'Book rehearsal spaces around your schedule with clear availability and rental details.',
  },
]

const highlights = [
  'One account for lessons and rentals',
  'Clear schedules and booking details',
  'Secure payments and account history',
]

export default function HomePage() {
  return (
    <main className="cadenza-home">
      <nav className="cadenza-home-nav">
        <Link className="cadenza-brand" to="/" aria-label={branding.name}>
          <img src="/logo.png" alt="" className="cadenza-brand-logo" />
          <span>{branding.name}</span>
        </Link>

        <div className="cadenza-home-nav-links">
          <a href="#services">Services</a>
          <a href="#how-it-works">How it works</a>
          <Link className="cadenza-nav-login" to="/login">Sign in</Link>
        </div>
      </nav>

      <section className="cadenza-hero">
        <div className="cadenza-hero-copy">
          <div className="cadenza-kicker">
            <span className="cadenza-kicker-dot" />
            Your music, your space, your rhythm.
          </div>

          <h1>
            Make room for
            <span> what moves you.</span>
          </h1>

          <p className="cadenza-hero-description">
            Cadenza brings music lessons, instrument rentals, and rehearsal rooms together
            in one beautifully simple place.
          </p>

          <div className="cadenza-hero-actions">
            <Link className="cadenza-primary-button" to="/login">
              Get started
              <ArrowRight weight="bold" />
            </Link>
            <a className="cadenza-secondary-button" href="#services">
              <PlayCircle weight="fill" />
              Explore Cadenza
            </a>
          </div>

          <div className="cadenza-proof-row">
            {highlights.map((highlight) => (
              <div key={highlight} className="cadenza-proof-item">
                <CheckCircle weight="fill" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cadenza-hero-visual" aria-hidden="true">
          <div className="cadenza-visual-grid" />
          <div className="cadenza-visual-orbit cadenza-visual-orbit-one" />
          <div className="cadenza-visual-orbit cadenza-visual-orbit-two" />
          <div className="cadenza-visual-card cadenza-visual-card-main">
            <div className="cadenza-visual-card-top">
              <span>NOW PLAYING</span>
              <span className="cadenza-live-dot" />
            </div>
            <div className="cadenza-waveform">
              {[18, 32, 52, 28, 68, 42, 82, 36, 58, 26, 72, 46, 64, 30, 52, 20].map((height, index) => (
                <i key={index} style={{ height }} />
              ))}
            </div>
            <div className="cadenza-visual-track">
              <div>
                <strong>Make Something</strong>
                <span>Cadenza Studio · Session 01</span>
              </div>
              <span className="cadenza-track-time">04:18</span>
            </div>
          </div>
          <div className="cadenza-visual-card cadenza-visual-card-float">
            <CalendarBlank weight="bold" />
            <div>
              <span>Next session</span>
              <strong>Today · 4:30 PM</strong>
            </div>
          </div>
          <div className="cadenza-visual-note">♪</div>
        </div>
      </section>

      <section id="services" className="cadenza-services">
        <div className="cadenza-section-heading">
          <div>
            <span className="cadenza-section-label">The Cadenza experience</span>
            <h2>Everything you need to keep making music.</h2>
          </div>
          <p>
            From your first lesson to your next rehearsal, the essentials stay connected,
            organized, and easy to manage.
          </p>
        </div>

        <div className="cadenza-service-grid">
          {services.map(({ icon: Icon, eyebrow, title, description }) => (
            <article key={title} className="cadenza-service-card">
              <div className="cadenza-service-icon"><Icon weight="duotone" /></div>
              <span className="cadenza-service-eyebrow">{eyebrow}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to="/login" aria-label={`Explore ${title}`}>
                Explore
                <ArrowUpRight weight="bold" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="cadenza-workflow">
        <div className="cadenza-workflow-panel">
          <div>
            <span className="cadenza-section-label">Designed around your flow</span>
            <h2>Less admin. More music.</h2>
            <p>
              Keep bookings, lesson sessions, payments, and history in one focused workspace
              so your next session is always easy to find.
            </p>
          </div>
          <div className="cadenza-workflow-steps">
            <div><span>01</span><strong>Choose</strong><small>Find a lesson, instrument, or room.</small></div>
            <div><span>02</span><strong>Book</strong><small>Pick a schedule that works for you.</small></div>
            <div><span>03</span><strong>Play</strong><small>Show up, learn, rehearse, and create.</small></div>
          </div>
        </div>
      </section>

      <section className="cadenza-final-cta">
        <div>
          <span className="cadenza-section-label">Ready when you are</span>
          <h2>Find your next rhythm.</h2>
          <p>Sign in to manage your lessons, rentals, schedules, and payments.</p>
        </div>
        <Link className="cadenza-primary-button" to="/login">
          Enter Cadenza
          <ArrowRight weight="bold" />
        </Link>
      </section>

      <footer className="cadenza-footer">
        <div className="cadenza-brand">
          <img src="/logo.png" alt="" className="cadenza-brand-logo" />
          <span>{branding.name}</span>
        </div>
        <span>Music lessons · Instrument rentals · Band rooms</span>
        <span>© {new Date().getFullYear()} {branding.name}</span>
      </footer>
    </main>
  )
}
