export function LoadingBlock({
  label = "Working…",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="panel rounded-2xl p-6" role="status" aria-live="polite">
      <p className="animate-pulse-soft text-sm font-medium text-[var(--forest-deep)]">{label}</p>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse-soft rounded-xl bg-[rgba(31,77,69,0.08)]"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ConceptSkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="panel min-h-72 animate-pulse-soft rounded-2xl bg-[rgba(31,77,69,0.06)]"
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}
