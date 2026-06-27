export default function StepFlow({ steps }) {
  return (
    <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col">
          <div className="w-full h-1 bg-primary rounded-full mb-5" />
          <div className="text-xs font-bold text-primary mb-2 tracking-wider">STEP {String(i + 1).padStart(2, '0')}</div>
          <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
      ))}
    </div>
  );
}