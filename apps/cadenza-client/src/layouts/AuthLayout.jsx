import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[#eef6ff]">
      <div className="pointer-events-none absolute -left-32 top-28 h-72 w-[55%] rotate-12 rounded-[50%] border-[18px] border-blue-200/30" />
      <div className="pointer-events-none absolute -bottom-32 right-[-10%] h-72 w-[65%] -rotate-6 rounded-[50%] border-[22px] border-blue-200/35" />
      <Link
        to="/"
        aria-label="Cadenza home"
        className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm font-bold text-slate-900 transition-opacity hover:opacity-80 sm:text-base"
      >
        <img src="/logo.png" alt="" className="size-8 rounded-full object-contain" />
        Cadenza Music Center
      </Link>

      <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-24 sm:px-6 md:px-10">
        <div
          className="flex w-full max-w-[calc(100vw-2rem)] justify-center"
          style={{ width: '560px', maxWidth: 'calc(100vw - 2rem)' }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
