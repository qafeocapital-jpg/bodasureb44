export default function FeatureGrid({ features, columns = 3 }) {
  const colClass = columns === 2 ? 'lg:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`grid ${colClass} gap-6`}>
      {features.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-base mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        );
      })}
    </div>
  );
}