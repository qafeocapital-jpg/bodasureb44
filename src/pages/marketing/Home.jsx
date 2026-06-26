import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, QrCode, ClipboardCheck, Wallet, Users, Shield, Building2, Bike, UserCheck, UserPlus } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import StatStrip from '@/components/marketing/StatStrip';
import AudienceCards from '@/components/marketing/AudienceCards';
import StepFlow from '@/components/marketing/StepFlow';
import FeatureGrid from '@/components/marketing/FeatureGrid';

const AUDIENCE_CARDS = [
  { icon: Building2, title: 'For Counties', description: 'Complete visibility and control over BodaBoda operations — from registration to revenue collection.', link: '/counties' },
  { icon: Users, title: 'For SACCOs', description: 'Manage members, collect contributions, and grow revenues — all from one platform.', link: '/saccos' },
  { icon: Bike, title: 'For Riders', description: 'Operate legally, get paid faster, and access financial services built for BodaBoda riders.', link: '/riders' },
];

const STEPS = [
  { icon: UserPlus, title: 'Register', description: 'Sign up as a rider, SACCO, or county. Create your profile in minutes — no paperwork to start.' },
  { icon: ShieldCheck, title: 'Verify', description: 'AI-powered identity verification, bike plate recognition, and compliance checks. All digital.' },
  { icon: Bike, title: 'Operate', description: 'Collect fares, pay permits, send money, and access financial services — all from your phone.' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'ID Verification', description: 'AI-powered ID + selfie verification via IDAnalyzer. Know exactly who every rider is.' },
  { icon: QrCode, title: 'Digital Permits', description: 'Tamper-proof digital permits with QR codes. Scannable by enforcement officers in the field.' },
  { icon: ClipboardCheck, title: 'Compliance Tracking', description: 'Real-time compliance scores per rider, per stage, per ward. See who is compliant at a glance.' },
  { icon: Wallet, title: 'Digital Wallet', description: 'Collect fares, send money, pay bills, and pay county fees — all from the BodaSure Wallet.' },
  { icon: Users, title: 'SACCO Management', description: 'Digital membership registers, contribution collection, and group wallets with full audit trails.' },
  { icon: Shield, title: 'Insurance', description: 'Affordable motorbike insurance — annual and daily cover from trusted partners, in minutes.' },
];

export default function MarketingHome() {
  useEffect(() => { document.title = 'BodaSure — Digitizing the BodaBoda Economy'; }, []);

  return (
    <>
      <Hero
        title="Digitizing the BodaBoda Economy"
        subtitle="Kenya's first all-in-one platform connecting County Governments, SACCOs, and BodaBoda riders for registration, compliance, and financial services."
        primaryCta={{ text: 'Get Started', to: '/register' }}
        secondaryCta={{ text: 'Login', to: '/login' }}
      />

      <StatStrip
        stats={[
          { value: '2M+', label: 'BodaBoda Riders' },
          { value: 'KES 660B', label: 'Annual Economy' },
          { value: '47', label: 'Counties' },
          { value: '1,200+', label: 'Lives Lost Yearly' },
        ]}
      />

      {/* Audience selector */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">One Platform. Three Audiences.</h2>
            <p className="mt-4 text-lg text-muted-foreground">BodaSure serves the entire BodaBoda ecosystem — from county governments to the rider on the street.</p>
          </div>
          <AudienceCards cards={AUDIENCE_CARDS} />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">How BodaSure Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">From sign-up to operation in three simple steps.</p>
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
    </>
  );
}