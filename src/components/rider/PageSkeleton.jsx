export default function PageSkeleton({ variant = 'default' }) {
  if (variant === 'hero-rows') {
    return (
      <div className="p-5 animate-fade-in">
        <div className="h-36 rounded-2xl bg-muted animate-pulse mb-5" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'hero-grid') {
    return (
      <div className="p-5 animate-fade-in">
        <div className="h-36 rounded-2xl bg-muted animate-pulse mb-5" />
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-16 rounded-xl bg-muted animate-pulse mb-2" />
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-5 animate-fade-in">
      <div className="h-24 rounded-2xl bg-muted animate-pulse mb-5" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}