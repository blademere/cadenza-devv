import { Skeleton } from '../ui/skeleton'

export default function LoadingState({ label = 'Loading…', rows = 4 }) {
  return (
    <div className="grid min-h-[16rem] gap-4 p-6" aria-label={label} role="status">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="h-2.5 w-1/2" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}
