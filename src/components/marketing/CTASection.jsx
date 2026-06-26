import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CTASection({ title, subtitle, ctaText, ctaLink, children }) {
  return (
    <section className="bg-gradient-to-br from-foreground via-foreground to-primary/15 py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-background tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 text-lg text-background/70 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        {children ? (
          <div className="mt-8">{children}</div>
        ) : ctaText && ctaLink ? (
          <div className="mt-8">
            <Link
              to={ctaLink}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              {ctaText} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}