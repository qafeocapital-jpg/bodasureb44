import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, QrCode, ClipboardCheck, Wallet, Users, Shield } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import AudienceCards from '@/components/marketing/AudienceCards';
import StepFlow from '@/components/marketing/StepFlow';
import FeatureGrid from '@/components/marketing/FeatureGrid';

const AUDIENCE_CARDS = [
  { title: 'For Counties', description: 'Register and map every rider. Issue verifiable digital permits. Collect revenue straight to county accounts with zero cash leakage, and track compliance in real time.', cta: 'Explore for Counties', link: '/counties' },
  { title: 'For SACCOs', description: 'Track every member, collect contributions digitally, and open new income from advertising, events, and member services. Run an organised, accountable group.', cta: 'Explore for SACCOs', link: '/saccos' },
  { title: 'For Riders', description: 'Collect fares, pay county fees, carry a permit on your phone, pay your owner, get insured, access loans, and join a chama — all in one app. Ride without interruption.', cta: 'Explore for Riders', link: '/riders' },
];

const STEPS = [
  { title: 'Register & map', description: 'Counties onboard riders, owners, bikes, and stages into one verified database — searchable, current, and complete.' },
  { title: 'License & comply', description: 'Every compliant rider gets a digital permit officials can verify on the spot. Fees are paid digitally, directly, transparently.' },
  { title: 'Organise & grow', description: 'SACCOs manage members and earn; riders unlock credit, insurance, and savings. The sector becomes formal and bankable.' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'ID Verification', description: 'AI-powered ID + selfie verification via IDAnalyzer. Know exactly who every rider is.' },
  { icon: QrCode, title: 'Digital Permits', description: 'Tamper-proof digital permits with QR codes. Scannable by enforcement officers in the field.' },
  { icon: ClipboardCheck, title: 'Compliance Tracking', description: 'Real-time compliance scores per rider, per stage, per ward. See who is compliant at a glance.' },
  { icon: Wallet, title: 'Digital Wallet', description: 'Collect fares, send money, pay bills, and pay county fees — all from the BodaSure Wallet.' },
  { icon: Users, title: 'SACCO Management', description: 'Digital membership registers, contribution collection, and group wallets with full audit trails.' },
  { icon: Shield, title: 'Insurance', description: 'Affordable motorbike insurance — annual and daily cover from trusted partners, in minutes.' },
];

const DARK_STATS = [
  { value: '2.5M+', label: 'riders depend on the sector' },
  { value: 'KES 660B', label: 'generated annually · 4.4% of GDP' },
  { value: '~66%', label: 'average share of OSR targets counties actually collect' },
  { value: '47', label: 'counties mandated to digitise under ICRMS 2025' },
];

const WHY_BODASURE = [
  { emoji: '📱', title: 'Works on the phones riders have', description: 'Mobile-first and built for the phones riders already have. Works on any smartphone, wherever they are — no rider is left out.' },
  { emoji: '🏦', title: 'Money goes where it should', description: 'Payments settle through a CBK-licensed partner straight into county and SACCO accounts. No middlemen at the stage.' },
  { emoji: '🤝', title: 'Self-enforcement, not just enforcement', description: 'Riders and their officials hold each other accountable, with the county for support — not against the rider.' },
  { emoji: '📋', title: 'One trusted record', description: 'County, SACCO, owner, and rider all see the same verified data, reconciled to the shilling.' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function MarketingHome() {
  useEffect(() => { document.title = 'BodaSure — Digitizing the BodaBoda Economy'; }, []);

  return (
    <>
      <Hero
        badge="KENYA'S BODABODA OPERATING SYSTEM"
        title={<>Digitizing the <span className="text-primary">BodaBoda</span> Economy</>}
        subtitle="BodaSure connects county governments, SACCOs, and 2.5 million riders on one platform — bringing digital permits, fair revenue collection, real protection, and financial access to Kenya's largest informal industry."
        primaryCta={{ text: 'Get Started', to: '/register' }}
        secondaryCta={{ text: 'Login', to: '/login' }}
      />

      {/* Dark stat strip */}
      <section className="bg-foreground text-background py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mb-12">
            <p className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl leading-snug">
              Kenya's boda boda sector moves <span className="text-primary">KES 660 billion a year</span> — yet most of it still runs on cash, paper, and trust. That's where the leakage, the harassment, and the lost opportunity live.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {DARK_STATS.map((stat, i) => (
              <div key={i}>
                <p className="font-heading font-extrabold text-3xl lg:text-4xl tracking-tight">{stat.value}</p>
                <p className="mt-1 text-xs lg:text-sm text-background/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience selector */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>ONE PLATFORM, THREE AUDIENCES</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">We connect the whole sector — from the county boardroom to the stage.</h2>
            <p className="mt-4 text-lg text-muted-foreground">We help counties register, map, and license every operator. We help SACCOs organise and earn. And we give riders permits, payments, protection, and credit — all working together.</p>
          </div>
          <AudienceCards cards={AUDIENCE_CARDS} />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Three steps to a formal, fair sector.</h2>
          </div>
          <StepFlow steps={STEPS} />
        </div>
      </section>

      {/* Social proof / trust */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 mb-12 opacity-60">
            {['County Government', 'NTSA', 'SACCO Federation', 'CBK Licensed', 'Data Protection Act'].map((logo, i) => (
              <span key={i} className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{logo}</span>
            ))}
          </div>
          <blockquote className="text-2xl sm:text-3xl font-heading font-bold leading-relaxed">
            "BodaSure is not just an app — it's the digital backbone for Kenya's BodaBoda economy."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— BodaSure Leadership Team</p>
        </div>
      </section>

      {/* Features overview */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Everything BodaBoda, in One Platform</h2>
            <p className="mt-4 text-lg text-muted-foreground">From identity verification to digital wallets — BodaSure covers the entire ecosystem.</p>
          </div>
          <FeatureGrid features={FEATURES} columns={3} />
          <div className="text-center mt-10">
            <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why BodaSure */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>WHY BODASURE</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Built for Kenya, not adapted to it.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {WHY_BODASURE.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}