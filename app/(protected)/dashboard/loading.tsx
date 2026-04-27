function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <section>
          <Skeleton className="mb-3 h-5 w-44" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <Skeleton className="h-96 xl:col-span-5" />
          <Skeleton className="h-96 xl:col-span-4" />
          <Skeleton className="h-96 xl:col-span-3" />
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <Skeleton className="h-80 xl:col-span-4" />
          <Skeleton className="h-80 xl:col-span-4" />
          <Skeleton className="h-80 xl:col-span-4" />
        </div>
      </div>
    </div>
  )
}
