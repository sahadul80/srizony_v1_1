function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`ui-skeleton ${className}`} />
}

export default function LoadingShell() {
  return (
    <div className="admin-loading-screen" role="status" aria-label="Loading admin dashboard">
      <div className="admin-loading-top">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="admin-loading-grid">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}
      </div>
    </div>
  )
}
