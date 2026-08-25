const stats = [
  { label: 'Applications', value: '—' },
  { label: 'Pending reviews', value: '—' },
  { label: 'Professionals', value: '—' },
  { label: 'Appointments', value: '—' },
]

function App() {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Express App</p>
          <h1>Administration</h1>
        </div>
        <span className="environment">Admin Web</span>
      </header>

      <main className="admin-main">
        <section className="welcome-card">
          <p className="eyebrow">Control center</p>
          <h2>Admin dashboard</h2>
          <p>
            The administration portal is ready for platform operations, workflow
            management, and administrative features.
          </p>
        </section>

        <section className="stats-grid" aria-label="Administration summary">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="placeholder-card">
          <h2>Admin features</h2>
          <p>
            Feature modules can be added here without coupling administrative
            screens to the public web application.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
