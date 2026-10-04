import { Link } from "react-router-dom";
export default function ErrorPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        Please try again in a moment.
      </p>
      <Link className="mt-6 inline-block text-primary hover:underline" to="/">
        Return home
      </Link>
    </main>
  );
}
