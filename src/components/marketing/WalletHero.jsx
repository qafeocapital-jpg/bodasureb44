import { Link } from 'react-router-dom';
import { ArrowRight, Check, Wallet, PlayCircle } from 'lucide-react';

const RIDER_PHOTO = 'https://media.base44.com/images/public/6a383cbbcd6dd93f84de66de/cfcd034cf_generated_image.png';

export default function WalletHero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left column — text + CTAs */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-accent border border-primary/20 rounded-full px-3 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-semibold text-accent-foreground tracking-wide">THE DIGITAL WALLET FOR BODA BODA OPERATORS &amp; SACCOs</span>
            </div>

            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-[3.5rem] text-foreground leading-[1.08] tracking-tight">
              The digital wallet for{' '}
              <span className="text-primary">boda boda operators.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Collect fares from your passengers, pay your county, and carry your
              digital permit — all in one simple app built for Kenya's boda boda
              riders and their SACCOs.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
              >
                Get Your Free Wallet <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-accent transition-colors"
              >
                <PlayCircle className="w-4 h-4" /> See How It Works
              </Link>
            </div>

            {/* Micro-copy */}
            <div className="mt-4">
              <span className="flex items-center gap-1.5 text-sm text-success font-medium">
                <Check className="w-4 h-4" /> Get started in 2 minutes
              </span>
            </div>
          </div>

          {/* Right column — rider photo with floating badge */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={RIDER_PHOTO}
                  alt="Kenyan boda boda rider with passenger on a motorbike"
                  className="w-full h-auto block object-cover aspect-[4/3]"
                  loading="eager"
                />
              </div>

              {/* Floating Active Wallets badge */}
              <div className="absolute bottom-4 left-4 bg-card border border-border rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">Active Wallets</p>
                  <p className="font-heading font-extrabold text-lg text-foreground leading-tight">10,000+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}