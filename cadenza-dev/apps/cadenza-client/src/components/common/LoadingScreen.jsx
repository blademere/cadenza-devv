export function LoadingScreen({ message = "Loading..." }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-foreground"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
          aria-hidden="true"
        />

        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
