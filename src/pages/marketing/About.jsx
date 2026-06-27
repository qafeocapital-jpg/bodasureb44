import { useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import CTASection from '@/components/marketing/CTASection';
import ReamazeDemoForm from '@/components/marketing/ReamazeDemoForm';

const PILLARS = [
  { emoji: '🤝', title: 'Dignify', body: 'We treat every rider as a professional, a breadwinner, a neighbour — not a line item in a compliance spreadsheet. Dignity is the starting point, not an afterthought.' },
  { emoji: '🛡️', title: 'Protect', body: 'We build the rails that protect riders from harassment, counties from revenue leakage, and SACCOs from the chaos of paper records and WhatsApp-only groups.' },
  { emoji: '📈', title: 'Empower', body: 'We open doors — to credit, to insurance, to investment, to ownership — by turning every ride into a verified transaction record that the formal economy can trust.' },
];

const BELIEFS = [
  { num: '01', title: 'Cash is not king', body: 'Cash is friction. It gets lost, stolen, disputed, and unrecorded. Digital money is faster, safer, and fairer — for riders, owners, counties, and SACCOs alike.' },
  { num: '02', title: 'Identity is the foundation', body: 'You cannot govern what you cannot identify. Every rider, every bike, every owner — verified once, trusted everywhere.' },
  { num: '03', title: 'Technology should meet people where they are', body: 'That means the phones riders already own, in the languages they speak, working on any smartphone wherever they are. No one gets left out.' },
  { num: '04', title: 'Trust compounds', body: 'Every verified transaction strengthens the system. Every paid permit builds credibility. Every reconciled shilling earns the next one.' },
];

const CREDIBILITY = [
  { emoji: '🏗️', title: 'Proven builders', body: 'We\'ve built and scaled fintech, payments, and identity systems for African markets. We know the rails, the regulators, and the realities.' },
  { emoji: '⚖️', title: 'Regulated-fintech experience', body: 'We work within CBK-licensed payment infrastructure and KYC frameworks. Compliance isn\'t a checkbox — it\'s the architecture.' },
  { emoji: '🇰🇪', title: 'Built for the Kenyan market', body: 'BodaSure is built in Kenya, for Kenya. We understand boda boda economics, county governance, and the SACCO model — because we live it.' },
  { emoji: '🤝', title: 'Partner-led', body: 'We don\'t replace counties, SACCOs, or owners. We connect them. BodaSure is the shared infrastructure they all trust.' },
];

const PRINCIPLES = [
  'We start with identity. Everything else — payments, permits, credit — depends on knowing who is who.',
  'We build for the rider first. If the rider wins, every other role wins.',
  'We make compliance a feature, not a threat. When compliance is easy, people comply.',
  'We settle to the right account, every time. No ambiguity, no manual reconciliation, no leakage.',
  'We design for inclusion. If it doesn\'t work on any smartphone, wherever riders are, it isn\'t finished.',
  'We earn trust through transparency. Every transaction is visible, auditable, and explained.',
];

const COMPANY = [
  { label: 'Company', value: 'Mint Mobitech Ltd.' },
  { label: 'Product', value: 'BodaSure' },
  { label: 'Headquarters', value: 'Nairobi, Kenya' },
  { label: 'Focus', value: 'BodaBoda sector digitisation & fintech' },
  { label: 'Contact', value: 'help@bodasure.com' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function About() {
  useEffect(() => { document.title = 'About BodaSure — The Operating System for Kenya\'s Boda Boda Economy'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <Hero
        badge="About BodaSure"
        title={<>We're building the operating system for Kenya's <em className="text-primary not-italic">boda boda</em> economy.</>}
        subtitle="BodaSure is the digital infrastructure connecting county governments, SACCOs, bike owners, and riders into one trusted system — where identity is verified, compliance is built-in, and every payment flows to the right account."
        primaryCta={{ text: 'See how it works', to: '/how-it-works' }}
        secondaryCta={{ text: 'For Counties', to: '/counties' }}
      />

      {/* Section 2 — Mission dark band */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow>Our mission</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background">
              To dignify, protect, and empower every boda boda rider in Kenya.
            </h2>
            <p className="text-lg text-background/70 leading-relaxed">
              Kenya's boda boda sector moves millions of people and generates billions of shillings every single day — yet it runs on cash, paper, and informal trust. Riders face harassment and exclusion. Counties lose revenue they can't track. SACCOs drown in manual records. Bike owners can't verify what they're owed. BodaSure exists to fix all of it — one verified identity, one shared record, one settled payment at a time.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {PILLARS.map((p, i) => (
              <div key={i} className="bg-background/5 border border-background/10 rounded-2xl p-7 hover:border-primary/30 transition-colors">
                <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center text-2xl mb-5">{p.emoji}</div>
                <h3 className="font-heading font-bold text-lg text-primary mb-2">{p.title}</h3>
                <p className="text-sm text-background/60 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Story */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>Why we exist</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6">
            The boda boda economy deserves better than cash and paper.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            BodaSure was born from a simple observation: Kenya's boda boda sector is one of the largest informal economies in the country — yet it operates entirely without digital infrastructure. Riders can't access credit because they have no transaction history. Counties can't enforce compliance because they can't identify riders. SACCOs can't collect contributions because everything runs on paper. Owners can't verify what they're owed because it's all in someone's pocket.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            We saw a sector that touches every county, every town, every household — and yet has no system. So we built one.
          </p>

          {/* Pull-quote */}
          <div className="border-l-4 border-primary bg-accent rounded-r-2xl p-6 lg:p-8 mb-8">
            <p className="font-heading font-bold text-xl lg:text-2xl leading-snug text-foreground">
              "We're not building a payments app. We're building the operating system for an entire economy — the rails that every role can trust."
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            BodaSure connects the county revenue officer, the SACCO treasurer, the bike owner, and the rider on the street into a single trusted record. Identity is verified once. Compliance is built in. Payments settle to the right account automatically. And every transaction — every fare, every permit fee, every owner payment — becomes a data point that strengthens the whole system.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Today, BodaSure is on a mission to digitise the boda boda economy across all 47 counties — one rider, one SACCO, one county at a time.
          </p>
        </div>
      </section>

      {/* Section 4 — Beliefs */}
      <section className="py-20 lg:py-28 bg-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>What we believe</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Four convictions that shape every decision.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {BELIEFS.map((b, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-heading font-extrabold text-2xl text-primary/40">{b.num}</span>
                  <h3 className="font-heading font-bold text-lg">{b.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Credibility band */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>Why us</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              The team to build it.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              We've built fintech rails, identity systems, and compliance infrastructure for African markets. Now we're applying everything we've learned to the boda boda economy.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIBILITY.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 text-center hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4 mx-auto">{c.emoji}</div>
                <h3 className="font-heading font-bold text-base mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — How we work */}
      <section className="py-20 lg:py-28 bg-accent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>How we work</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Six principles that guide every line of code.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 — The Company dark card */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-foreground text-background rounded-3xl overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-8 lg:p-12">
                <Eyebrow>The company</Eyebrow>
                <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background">
                  Built by Mint Mobitech.
                </h2>
                <p className="text-lg text-background/70 leading-relaxed">
                  BodaSure is a product of Mint Mobitech Ltd., a Nairobi-based technology company building digital infrastructure for Africa's informal economies. We're builders, operators, and problem-solvers who believe the boda boda sector deserves world-class technology — not makeshift tools.
                </p>
              </div>
              <div className="bg-background/5 border-t lg:border-t-0 lg:border-l border-background/10 p-8 lg:p-12">
                <dl className="space-y-4">
                  {COMPANY.map((row, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b border-background/10 last:border-0 pb-4 last:pb-0">
                      <dt className="text-xs font-bold uppercase tracking-wider text-background/40 sm:w-40 shrink-0">{row.label}</dt>
                      <dd className="text-sm font-medium text-background/90">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 — Closing CTA */}
      <CTASection
        title="Help us dignify, protect, and empower the people who move Kenya."
        subtitle="Request a demo and see how BodaSure connects your county, your SACCO, your owners, and your riders — into one trusted system."
      >
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Request a Demo <ArrowRight className="w-4 h-4" />
          </a>
          <a href="mailto:help@bodasure.com" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors">
            Partner with us
          </a>
        </div>
        <div id="demo">
          <ReamazeDemoForm />
        </div>
      </CTASection>
    </>
  );
}