import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

const PHONE_SCREENSHOT = 'https://media.base44.com/images/public/6a383cbbcd6dd93f84de66de/f5878bd64_image.png';

export default function WalletHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-primary/20">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left column — text + CTA */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-background/10 border border-background/20 rounded-full px-3 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold text-background/90 tracking-wide">THE DIGITAL WALLET FOR BODA BODA OPERATORS &amp; SACCOs</span>
            </div>

            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-[3.5rem] text-background leading-[1.08] tracking-tight">
              The digital wallet for{' '}
              <span className="text-primary">boda boda operators.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-background/70 leading-relaxed">
              Collect fares from your passengers, pay your county, and carry your
              digital permit — all in one simple app built for Kenya's boda boda
              riders and their SACCOs.
            </p>

            {/* CTA */}
            <div className="mt-8">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
              >
                Get Your Free Wallet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Micro-copy */}
            <div className="mt-4">
              <span className="flex items-center gap-1.5 text-sm text-background/60">
                <Check className="w-4 h-4 text-success" /> Get started in 2 minutes — it's free
              </span>
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div
              className="relative w-[280px] sm:w-[320px] rounded-[2.5rem] border-8 border-foreground/80 shadow-2xl overflow-hidden bg-background"
              style={{ transform: 'rotate(-4deg)' }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/80 rounded-b-2xl z-10" />
              <img
                src={PHONE_SCREENSHOT}
                alt="BodaSure app — digital wallet and permit on your phone"
                className="w-full h-auto block"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}