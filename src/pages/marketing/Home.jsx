import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Wallet, ShieldCheck, QrCode, Users, Shield, Smartphone,
  Send, Receipt, MapPin, TrendingUp, CheckCircle2, BadgeCheck,
} from 'lucide-react';
import WalletHero from '@/components/marketing/WalletHero';
import PainPointGrid from '@/components/marketing/PainPointGrid';
import PermitSpotlight from '@/components/marketing/PermitSpotlight';
import SaccoSplitPanel from '@/components/marketing/SaccoSplitPanel';
import DemoRequestForm from '@/components/marketing/DemoRequestForm';

const WALLET_FEATURES = [
  {
    icon: Wallet,
    title: 'Digital Wallet',
    description: 'Collect fares, send money, pay bills, and pay county fees \u2014 all from the BodaSure Wallet powered by a CBK-licensed partner.',
  },
  {
    icon: QrCode,
    title: 'Digital Permits',
    description: 'Tamper-proof permits with QR codes. Scannable by any enforcement officer in the field \u2014 no more paper licences.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Identity',
    description: 'AI-powered ID + selfie verification. Once verified, every officer in Kenya can confirm you are legit \u2014 instantly.',
  },
  {
    icon: Users,
    title: 'SACCO Management',
    description: 'Digital membership registers, contribution collection, and group wallets with full audit trails for your SACCO.',
  },
  {
    icon: Shield,
    title: 'Insurance & Loans',
    description: 'Affordable motorbike insurance, access to loans, and chama savings \u2014 financial services built for riders.',
  },
  {
    icon: Send,
    title: 'Instant Transfers',
    description: 'Send money to any M-Pesa number or fellow rider instantly. No queues, no agents, no waiting.',
  },
  {
    icon: Receipt,
    title: 'Transaction Records',
    description: 'Every fare, every payment, every transfer \u2014 automatically tracked. Build a history lenders and banks can trust.',
  },
  {
    icon: Smartphone,
    title: 'Works on Any Phone',
    description: 'Mobile-first and built for the phones riders already have. Works on any smartphone, wherever they are.',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Register & Get Your Wallet',
    description: 'Sign up free, verify your ID, and activate your digital wallet in minutes.',
  },
  {
    num: '2',
    title: 'Register Your Bike',
    description: 'Add your bike and plate number. Upload photos and get verified. Your digital permit is issued when you pay your licence.',
  },
  {
    num: '3',
    title: 'Collect, Pay & Ride',
    description: 'Collect fares into your wallet, pay county fees instantly, show your permit to any officer, and ride without harassment.',
  },
];

const DARK_STATS = [
  { value: '2.5M+', label: 'riders in Kenya\u2019s boda boda sector' },
  { value: 'KES 660B', label: 'annual sector value' },
  { value: '4.4%', label: 'share of national GDP' },
  { value: '47', label: 'counties mandated to digitise under ICRMS 2025' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

const MicroCopy = () => (
  <p className="mt-3 text-sm text-muted-foreground">Get started in 2 minutes — it&rsquo;s free</p>
);

export default function MarketingHome() {
  useEffect(() => {
    document.title = 'BodaSure \u2014 Kenya\u2019s #1 Digital Wallet for BodaBoda Riders';
  }, []);

  return (
    <>
      {/* SECTION 1 \u2014 HERO */}
      <WalletHero />

      {/* SECTION 2 \u2014 PAIN POINTS (2\u00d72 grid) */}
      <PainPointGrid />

      {/* SECTION 3 \u2014 WALLET FEATURES (8 cards) */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>ONE APP, EVERYTHING YOU NEED</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Your BodaSure Wallet does it all
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From collecting fares to proving compliance — BodaSure is the only app a rider needs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WALLET_FEATURES.map((feature) => (
              <div key={feature.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 4 \u2014 PERMIT SPOTLIGHT (dark) */}
      <PermitSpotlight />

      {/* SECTION 5 \u2014 HOW IT WORKS */}
      <section id="how-it-works" className="bg-accent py-20 lg:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Get started in three simple steps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Set up your wallet and start riding with confidence in just a few minutes.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-extrabold text-xl mx-auto mb-4 shadow-lg shadow-primary/20">
                  {step.num}
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 6 \u2014 COUNTY NOT ONBOARDED */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary/10 to-accent border border-primary/20 rounded-3xl p-8 lg:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
              <BadgeCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight mb-3">
              Your county hasn&rsquo;t onboarded yet? No problem.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              You can register and get your digital wallet today — even if your county
              is not yet live on BodaSure. Start collecting fares digitally, join your
              SACCO, and access financial services right now. When your county goes live,
              you&rsquo;ll be ready to pay your licence and get your permit instantly.
            </p>

          </div>
        </div>
      </section>

      {/* SECTION 7 \u2014 DARK STATS */}
      <section className="bg-foreground text-background py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {DARK_STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-heading font-extrabold text-3xl lg:text-4xl tracking-tight">{stat.value}</p>
                <p className="mt-1 text-xs lg:text-sm text-background/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8 \u2014 SACCO SPLIT PANEL */}
      <SaccoSplitPanel />

      {/* SECTION 9 \u2014 AUDIENCE CARDS */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>ONE PLATFORM, EVERYONE WINS</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Built for riders, SACCOs, and counties
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, title: 'For Riders', desc: 'Collect fares, pay licences, carry a digital permit, access insurance and credit \u2014 all from your phone.', link: '/riders', cta: 'Explore for Riders' },
              { icon: Users, title: 'For SACCOs', desc: 'Track members, collect contributions digitally, manage group wallets, and open new income streams.', link: '/saccos', cta: 'Explore for SACCOs' },
              { icon: MapPin, title: 'For Counties', desc: 'Register every rider, issue digital permits, collect revenue with zero leakage, and track compliance live.', link: '/counties', cta: 'Explore for Counties' },
            ].map((card) => (
              <div key={card.title} className="bg-card border border-border rounded-2xl p-6 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{card.desc}</p>
                <Link to={card.link} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
                  {card.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10 \u2014 FINAL CTA + CALLBACK FORM */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-success/10 border border-success/20 rounded-full px-3 py-1.5 mb-6">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold text-success tracking-wide">FREE TO JOIN</span>
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight">
              Get your digital wallet today
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of riders already using BodaSure. Register free and start
              collecting fares, paying licences, and riding without harassment.
            </p>

          </div>

          {/* County/SACCO callback request */}
          <div className="mt-16 pt-12 border-t border-border">
            <div className="text-center mb-8">
              <Eyebrow>FOR COUNTIES &amp; SACCOs</Eyebrow>
              <h3 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight mt-3">
                Request a Callback
              </h3>
              <p className="mt-3 text-muted-foreground">Leave your details and our team will call you back within 48 hours.</p>
            </div>
            <DemoRequestForm />
          </div>
        </div>
      </section>
    </>
  );
}