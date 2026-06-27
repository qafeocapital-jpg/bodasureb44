import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus, Eye, Download } from 'lucide-react';
import CTASection from '@/components/marketing/CTASection';
import ReamazeDemoForm from '@/components/marketing/ReamazeDemoForm';
import CountyBriefModal from '@/components/marketing/CountyBriefModal';

const BRIEF_URL = '/assets/BodaSure-County-Brief.pdf';

const BAND_STATS = [
  { value: '~66%', label: 'average share of OSR targets counties actually collect' },
  { value: 'KES 660B', label: 'moved by the sector each year, mostly in cash' },
  { value: '2.5M+', label: 'riders to register, map and license' },
  { value: 'ICRMS 2025', label: 'digital revenue mandate now in force for all 47 counties' },
];

const BENEFIT_CARDS = [
  { num: '01', title: 'A complete, verified register', body: 'Every rider, owner, motorcycle, and stage mapped into one database — searchable, exportable, and always current. You finally know exactly who operates in your county, and where.' },
  { num: '02', title: 'Verifiable digital permits', body: 'Issue permits digitally and revoke them instantly. Any official can verify a rider\'s status on the spot. Compliant riders carry proof on their phone; non-compliant ones can\'t hide.' },
  { num: '03', title: 'Revenue that doesn\'t leak', body: 'Daily fees, permit fees, and stage charges are paid digitally, straight into county accounts through a CBK-licensed payments partner. No cash at the stage means no theft and no reconciliation gaps.' },
  { num: '04', title: 'Real-time compliance & enforcement', body: 'A live dashboard for finance, enforcement, and administration teams. See collections as they happen, flag non-compliance, and let stage officials and SACCOs support enforcement on the ground.' },
  { num: '05', title: 'The community on your side', body: 'Because BodaSure works with SACCOs and riders — not against them — compliance stops feeling like punishment. A community dividend means riders share in the upside, driving voluntary registration.' },
  { num: '06', title: 'Reconciled to the shilling', body: 'Every payment is logged the moment it\'s made, settled to the right account, and reconciled automatically. Your finance team gets clean, audit-ready reports instead of chasing collectors.' },
];

const PORTAL_CHECKLIST = [
  'Role-based access for Administration, Finance, Enforcement and Stage Officials',
  'Live revenue dashboard with downloadable, audit-ready reports',
  'Rider, owner, bike and stage registry with full map view',
  'Digital permit issuance, renewal, suspension and revocation',
  'Compliance flags and a clear enforcement workflow',
  'Settlement reports reconciled automatically, to the shilling',
  'Mobile-first, so no stage is left out',
  'Full audit trail on every permit, payment and action',
];

const CYCLE_STEPS = [
  { num: '1', title: 'Riders register & comply', body: 'Riders join, get verified, and pay their fees digitally — because compliance is now easy and worth it.' },
  { num: '2', title: 'The county collects in full', body: 'Revenue reaches county accounts cleanly, with no cash leaking at the stage.' },
  { num: '3', title: 'Value returns to the community', body: 'A community dividend flows back to riders and their SACCOs, funding welfare and shared benefits.' },
  { num: '4', title: 'Riders self-enforce', body: 'Because they share in the upside, riders and their officials keep each other compliant — enforcement from within, not from above.' },
];

const PROCESSOR_ITEMS = [
  'Moves a transaction from A to B',
  'Has no idea who the rider really is',
  'Leaves registration, mapping & verification to you',
  'Can\'t issue or enforce a permit',
  'Stops at the transaction',
];

const BODASURE_ITEMS = [
  'Registers, maps & ID-verifies every rider',
  'Allocates riders to their stage & SACCO',
  'Issues, renews & revokes digital permits',
  'Tracks compliance and powers self-enforcement',
  'Then handles the payment — as one step in the system',
];

const TRUST_ITEMS = [
  { emoji: '📋', title: 'ICRMS 2025-aligned', body: 'Purpose-built for the boda boda piece of your integrated revenue mandate, mobile-first and ready for every stage.' },
  { emoji: '🏦', title: 'CBK-licensed custody', body: 'Funds are custodied and settled by a CBK-licensed payments partner — money flows straight to county accounts.' },
  { emoji: '🔐', title: 'Permission-scoped & auditable', body: 'Every role sees only what it should, and every action leaves a full audit trail your auditors can rely on.' },
  { emoji: '📑', title: 'Strong continuity', body: 'Long-term service agreements with clear continuity and data-ownership protections for the county.' },
];

const Eyebrow = ({ children, dark }) => (
  <span className={`text-xs font-bold tracking-wider uppercase ${dark ? 'text-primary' : 'text-primary'}`}>{children}</span>
);

export default function Counties() {
  const [briefOpen, setBriefOpen] = useState(false);
  useEffect(() => { document.title = 'BodaSure for Counties — Turn the boda boda sector into reliable revenue'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-primary/15 py-20 lg:py-28">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-bold text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6 tracking-wider uppercase">For county governments</span>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-background leading-[1.05] tracking-tight">
              Turn the boda boda sector into your most <span className="text-primary">reliable</span> revenue stream.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-background/70 leading-relaxed max-w-2xl">
              BodaSure gives your county one verified system to register every rider, issue digital permits, collect revenue without leakage, and enforce compliance — from headquarters down to every stage.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Request a Demo <ArrowRight className="w-4 h-4" />
              </a>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setBriefOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Preview Brief
                </button>
                <a
                  href={BRIEF_URL}
                  download
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Brief
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Problem band with stats (dark) */}
      <section className="bg-foreground text-background py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow dark>The problem we solve</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background">
              Cash at the stage. Records in a book. Revenue that never reaches the county.
            </h2>
            <p className="text-lg text-background/70 leading-relaxed">
              Across Kenya, counties collect only around <strong className="text-background">two-thirds of their own-source revenue targets</strong> — and the boda boda sector is one of the leakiest streams of all. Cash changes hands at the stage. Genuine riders get harassed while unregistered ones slip through. Under the <strong className="text-background">ICRMS Regulations 2025</strong>, every county is now required to run an integrated digital revenue system. BodaSure is purpose-built for the boda boda piece of that mandate.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
            {BAND_STATS.map((stat, i) => (
              <div key={i}>
                <div className="font-heading font-extrabold text-3xl lg:text-4xl text-primary">{stat.value}</div>
                <div className="text-sm text-background/50 mt-2 max-w-[20ch] leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — What your county gets (numbered benefit cards) */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>What your county gets</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Everything you need to formalise the sector — in one platform.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 mt-12">
            {BENEFIT_CARDS.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-8 flex gap-5 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 transition-all duration-200">
                <div className="flex-none w-10 h-10 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm flex items-center justify-center">
                  {card.num}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — County portal checklist */}
      <section className="bg-secondary border-y border-border py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>The county portal</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Built for how a county finance office actually works.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Role-based access for every team, a live view of collections, and full control over permits and enforcement — all in your browser, on any device.
          </p>
          <div className="grid sm:grid-cols-2 gap-x-10 mt-10">
            {PORTAL_CHECKLIST.map((item, i) => (
              <div key={i} className="flex gap-3 items-start py-4 border-b border-border">
                <div className="flex-none w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Self-enforcing cycle */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>The self-enforcing cycle</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Compliance that pays riders to keep it working.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            The reason cash-based collection fails is that no one at the stage has a reason to protect it. BodaSure changes the incentive: a share of value flows back to riders and their groups as a community dividend — so the people on the ground become the ones who keep the system honest.
          </p>
          <div className="flex flex-col lg:flex-row gap-3 mt-12">
            {CYCLE_STEPS.map((step, i) => (
              <div key={i} className="contents">
                <div className="flex-1 bg-card border border-border rounded-2xl p-6 flex gap-4 items-start">
                  <div className="flex-none w-8 h-8 rounded-full bg-primary text-primary-foreground font-heading font-bold text-sm flex items-center justify-center shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base mb-1.5 leading-snug">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </div>
                {i < CYCLE_STEPS.length - 1 && (
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-primary rotate-90 lg:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Not a payment processor (dark band with contrast cards) */}
      <section className="bg-foreground text-background py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow dark>We are not a payment processor</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background max-w-[24ch]">
            A processor moves money. BodaSure runs the whole system.
          </h2>
          <p className="text-lg text-background/70 leading-relaxed max-w-3xl">
            Payments are one feature — not the product. BodaSure does the heavy lifting that makes revenue possible in the first place: <strong className="text-background">finding and registering every rider, mapping them to stages and SACCOs, verifying their identity, issuing and policing digital permits, and keeping the whole register clean and compliant</strong>. The county gets an operating system for the sector, with payments built in — not a payment gateway with a dashboard bolted on.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            <div className="bg-secondary/30 text-background/60 rounded-2xl p-8">
              <h4 className="font-heading font-bold text-lg text-background/80 mb-5">A payment processor</h4>
              <ul className="space-y-0">
                {PROCESSOR_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm py-3 border-b border-background/10 last:border-0">
                    <Minus className="w-4 h-4 text-background/30 flex-none mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-8">
              <h4 className="font-heading font-bold text-lg text-background mb-5">BodaSure</h4>
              <ul className="space-y-0">
                {BODASURE_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm py-3 border-b border-background/15 last:border-0">
                    <Check className="w-4 h-4 text-background flex-none mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 — Government-grade trust */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>Government-grade trust</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Serious infrastructure, built for the public sector.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 mt-12 max-w-4xl">
            {TRUST_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="flex-none w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Closing CTA + Demo form */}
      <CTASection
        title="Let's map your county's boda boda economy."
        subtitle="Request a demo and we'll walk you through registration, compliance, and revenue collection — tailored to your county."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Request a Demo <ArrowRight className="w-4 h-4" />
          </a>
          <Link to="/about" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-foreground/20 text-foreground rounded-xl font-semibold text-sm hover:bg-foreground/5 transition-colors">
            Talk to our team
          </Link>
        </div>
        <div id="demo" className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8">
          <h3 className="font-heading font-bold text-xl mb-4 text-center">Request a demo</h3>
          <ReamazeDemoForm />
        </div>
      </CTASection>

      <CountyBriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
    </>
  );
}