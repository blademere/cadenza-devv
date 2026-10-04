import { Link } from "react-router-dom";
export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        The page you requested does not exist.
      </p>
      <Link className="mt-6 inline-block text-primary hover:underline" to="/">
        Return home
      </Link>
    </main>
  );
}
