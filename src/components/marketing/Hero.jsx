import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Hero({ title, subtitle, primaryCta, secondaryCta, badge, children }) {
  const isHash = (to) => typeof to === 'string' && to.startsWith('#');

  const CtaButton = ({ cta, primary }) => {
    const className = primary
      ? 'inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20'
      : 'inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors';
    const content = (
      <>
        {cta.text} {primary && <ArrowRight className="w-4 h-4" />}
      </>
    );
    return isHash(cta.to)
      ? <a href={cta.to} className={className}>{content}</a>
      : <Link to={cta.to} className={className}>{content}</Link>;
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-primary/15">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-background/10 border border-background/20 rounded-full px-3 py-1 mb-6">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-background/80">{badge || "Kenya's BodaBoda Fintech Platform"}</span>
          </div>

          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-background leading-[1.1] tracking-tight">
            {title}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-background/70 leading-relaxed max-w-2xl">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {primaryCta && <CtaButton cta={primaryCta} primary />}
            {secondaryCta && <CtaButton cta={secondaryCta} primary={false} />}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}