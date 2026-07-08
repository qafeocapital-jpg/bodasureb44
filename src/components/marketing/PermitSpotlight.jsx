import { Link } from 'react-router-dom';
import { ArrowRight, QrCode, ShieldCheck, Check } from 'lucide-react';

const PERMIT_FEATURES = [
  'Tamper-proof QR code',
  'Scannable by any enforcement officer',
  'Validates instantly \u2014 no paperwork',
];

export default function PermitSpotlight() {
  return (
    <section className="relative overflow-hidden bg-foreground text-background py-20 lg:py-28">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left \u2014 copy */}
          <div>
            <span className="text-xs font-bold text-primary tracking-wider uppercase">YOUR PERMIT, ON YOUR PHONE</span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-3 leading-[1.1]">
              Show your permit in seconds —{' '}
              <span className="text-primary">not paper, not stress.</span>
            </h2>
            <p className="mt-6 text-lg text-background/70 leading-relaxed">
              No more rummaging through pockets for a crumpled paper licence. Your
              digital permit lives on your phone with a scannable QR code that any
              enforcement officer can verify instantly.
            </p>
            <div className="mt-8 space-y-3">
              {PERMIT_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-background/80">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
              >
                Get Your Free Wallet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="mt-3 text-sm text-background/50">Get started in 2 minutes — it&rsquo;s free</p>
          </div>

          {/* Right \u2014 permit card mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm">
              <div className="bg-card text-foreground rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">BodaSure Permit</p>
                    <p className="font-heading font-bold text-lg mt-1">Digital Licence</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-success" />
                  </div>
                </div>
                <div className="flex items-center justify-center py-6 bg-accent rounded-2xl mb-6">
                  <QrCode className="w-32 h-32 text-foreground" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-success">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plate</span>
                    <span className="font-semibold">KMEA 221X</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid until</span>
                    <span className="font-semibold">31 Dec 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}