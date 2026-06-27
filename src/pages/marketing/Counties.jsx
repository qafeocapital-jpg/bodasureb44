import { useEffect } from 'react';
import { ArrowRight, ArrowDown, Check, X } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import StatStrip from '@/components/marketing/StatStrip';
import CTASection from '@/components/marketing/CTASection';
import DemoRequestForm from '@/components/marketing/DemoRequestForm';

const DARK_STATS = [
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
  'Mobile-first and USSD-ready, so no stage is left out',
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
  { emoji: '📋', title: 'ICRMS 2025-aligned', body: 'Purpose-built for the boda boda piece of your integrated revenue mandate, mobile-first and USSD-ready.' },
  { emoji: '🏦', title: 'CBK-licensed custody', body: 'Funds are custodied and settled by a CBK-licensed payments partner — money flows straight to county accounts.' },
  { emoji: '🔐', title: 'Permission-scoped & auditable', body: 'Every role sees only what it should, and every action leaves a full audit trail your auditors can rely on.' },
  { emoji: '📑', title: 'Strong continuity', body: 'Long-term service agreements with clear continuity and data-ownership protections for the county.' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function Counties() {
  useEffect(() => { document.title = 'BodaSure for Counties — Digital BodaBoda Management'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <Hero
        title="Turn the boda boda sector into reliable revenue."
        subtitle="BodaSure gives your county a complete, digital operating system for the sector — registration, permits, enforcement, and revenue collection, all in one place and reconciled to the shilling."
        primaryCta={{ text: 'Request a Demo', to: '#demo' }}
      />

      {/* Section 2 — Problem Statement */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Eyebrow>THE PROBLEM WE SOLVE</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6">
              Cash at the stage. Records in a book. Revenue that never reaches the county.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Across Kenya, counties collect only around two-thirds of their own-source revenue targets — and the boda boda sector is one of the leakiest streams of all. Cash changes hands at the stage. Genuine riders get harassed while unregistered ones slip through. Under the ICRMS Regulations 2025, every county is now required to run an integrated digital revenue system. BodaSure is purpose-built for the boda boda piece of that mandate.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 — Dark Stat Strip */}
      <StatStrip dark stats={DARK_STATS} />

      {/* Section 4 — Numbered Benefit Cards */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>WHAT YOUR COUNTY GETS</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Everything you need to formalise the sector — in one platform.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFIT_CARDS.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="font-heading font-extrabold text-3xl text-primary mb-3">{card.num}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — County Portal Checklist */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Eyebrow>THE COUNTY PORTAL</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4">Built for how a county finance office actually works.</h2>
            <p className="text-lg text-muted-foreground">Role-based access for every team, a live view of collections, and full control over permits and enforcement — all in your browser, on any device.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PORTAL_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl px-5 py-4">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Self-Enforcing Cycle */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>THE SELF-ENFORCING CYCLE</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4">Compliance that pays riders to keep it working.</h2>
            <p className="text-lg text-muted-foreground">The reason cash-based collection fails is that no one at the stage has a reason to protect it. BodaSure changes the incentive: a share of value flows back to riders and their groups as a community dividend — so the people on the ground become the ones who keep the system honest.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CYCLE_STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-extrabold text-lg mb-4 shadow-lg shadow-primary/20">
                  {step.num}
                </div>
                <h3 className="font-heading font-bold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                {i < CYCLE_STEPS.length - 1 && (
                  <>
                    <ArrowRight className="hidden lg:block w-6 h-6 text-primary/40 mt-4" />
                    <ArrowDown className="lg:hidden w-6 h-6 text-primary/40 mt-4" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 — Comparison */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>WE ARE NOT A PAYMENT PROCESSOR</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4">A processor moves money. BodaSure runs the whole system.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Payments are one feature — not the product. BodaSure does the heavy lifting that makes revenue possible in the first place: finding and registering every rider, mapping them to stages and SACCOs, verifying their identity, issuing and policing digital permits, and keeping the whole register clean and compliant. The county gets an operating system for the sector, with payments built in — not a payment gateway with a dashboard bolted on.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="bg-card border border-border rounded-2xl p-7">
              <h3 className="font-heading font-bold text-lg mb-5 text-muted-foreground">A payment processor</h3>
              <ul className="space-y-3">
                {PROCESSOR_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right column */}
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-7 shadow-lg shadow-primary/5">
              <h3 className="font-heading font-bold text-lg mb-5 text-primary">BodaSure</h3>
              <ul className="space-y-3">
                {BODASURE_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 — Government-Grade Trust */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>GOVERNMENT-GRADE TRUST</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Serious infrastructure, built for the public sector.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {TRUST_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 9 — CTA / Demo Form */}
      <CTASection
        title="Let's map your county's boda boda economy."
        subtitle="Schedule a live demo with our team. We'll walk you through registration, compliance, and revenue collection — tailored to your county."
      >
        <div id="demo">
          <DemoRequestForm />
        </div>
      </CTASection>
    </>
  );
}