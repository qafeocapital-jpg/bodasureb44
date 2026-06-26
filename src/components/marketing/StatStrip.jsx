export default function StatStrip({ stats, dark = false }) {
  const bg = dark ? 'bg-foreground text-background' : 'bg-accent text-foreground';
  return (
    <section className={`${bg} py-10 lg:py-14`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="font-heading font-extrabold text-3xl lg:text-4xl tracking-tight">
                {stat.value}
              </p>
              <p className={`mt-1 text-xs lg:text-sm ${dark ? 'text-background/60' : 'text-muted-foreground'}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}