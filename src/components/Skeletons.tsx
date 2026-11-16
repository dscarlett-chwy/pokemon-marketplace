/** Placeholders shaped like the content they stand in for, so the page doesn't jump when data lands. */

function Line({ className }: { className: string }) {
  return <div className={`skeleton h-3.5 rounded-full ${className}`} />;
}

function CardShape({ className = "" }: { className?: string }) {
  return <div className={`skeleton aspect-[245/342] w-full rounded-[4.5%/3.2%] ${className}`} />;
}

function Loading({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8, label = "Loading cards" }: { count?: number; label?: string }) {
  return (
    <Loading label={label} className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <CardShape />
          <div className="mt-5 flex justify-between gap-3">
            <Line className="w-3/5" />
            <Line className="w-10" />
          </div>
          <Line className="mt-3 w-2/5" />
        </div>
      ))}
    </Loading>
  );
}

export function ListingSkeleton() {
  return (
    <Loading label="Loading listing" className="grid gap-8 pt-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
      <CardShape className="mx-auto max-w-sm" />
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="skeleton h-11 w-3/4 rounded-xl" />
          <Line className="w-2/5" />
        </div>
        <div className="skeleton h-9 w-32 rounded-xl" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Line className="w-16" />
              <Line className="w-24" />
            </div>
          ))}
        </div>
        <div className="skeleton h-56 rounded-3xl" />
      </div>
    </Loading>
  );
}

export function RowsSkeleton({ count = 5, label = "Loading" }: { count?: number; label?: string }) {
  return (
    <Loading label={label} className="space-y-8">
      <div className="skeleton h-11 w-56 rounded-xl" />
      <div className="max-w-2xl space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-white/60 p-3">
            <div className="skeleton aspect-[245/342] w-12 rounded-[4.5%/3.2%]" />
            <div className="flex-1 space-y-3">
              <Line className="w-2/5" />
              <Line className="w-3/5" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function SearchResultsSkeleton() {
  return (
    <Loading label="Searching the catalog" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-rule bg-white p-3">
          <div className="skeleton aspect-[245/342] w-20 rounded-[4.5%/3.2%]" />
          <div className="flex-1 space-y-3 pt-1">
            <Line className="w-3/4" />
            <Line className="w-1/2" />
          </div>
        </div>
      ))}
    </Loading>
  );
}
