import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
