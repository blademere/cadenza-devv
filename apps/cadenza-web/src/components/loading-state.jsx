import { Skeleton } from './ui/skeleton'

export default function LoadingState({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="grid gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}
