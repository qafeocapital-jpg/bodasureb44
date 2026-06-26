import { useEffect } from 'react';

export default function LegalPage({ title, lastUpdated, intro, sections }) {
  useEffect(() => { document.title = `${title} | BodaSure`; }, [title]);

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border pb-6 mb-8">
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">{title}</h1>
          {lastUpdated && (
            <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          )}
        </div>

        {intro && (
          <p className="text-base text-muted-foreground leading-relaxed mb-8">{intro}</p>
        )}

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="font-heading font-bold text-lg mb-3">{section.heading}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {typeof section.body === 'string'
                  ? section.body.split('\n\n').map((para, j) => <p key={j}>{para}</p>)
                  : section.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}