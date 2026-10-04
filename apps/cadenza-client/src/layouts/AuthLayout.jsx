import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="relative min-h-svh bg-muted">
      {/* Logo */}
      <Link
        to="/"
        aria-label="Cadenza home"
        className="absolute left-1/2 top-4 -translate-x-1/2"
      >
        <span className="text-xl font-bold tracking-tight text-primary sm:text-2xl p-auto">
          Cadenza
        </span>
      </Link>

      <main className="flex min-h-svh items-center justify-center px-4 py-20 sm:px-6 md:px-10">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
