export default function StepFlow({ steps }) {
  return (
    <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={i} className="relative">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="hidden sm:block absolute top-8 left-[calc(50%+2.5rem)] right-[-2rem] h-0.5 bg-border" />
            )}
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg shadow-primary/20 z-10">
                <Icon className="w-7 h-7" />
              </div>
              <div className="text-xs font-bold text-primary mb-1">Step {i + 1}</div>
              <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}