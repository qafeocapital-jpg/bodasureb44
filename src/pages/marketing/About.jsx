import { useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import CTASection from '@/components/marketing/CTASection';
import ReamazeDemoForm from '@/components/marketing/ReamazeDemoForm';

const PILLARS = [
  { emoji: '🤝', title: 'Dignify', body: "An end to harassment over papers a rider can't prove. A verifiable identity, a permit that commands respect, and a record that finally counts." },
  { emoji: '🛡️', title: 'Protect', body: 'Insurance, welfare and safety within reach — so an accident or an emergency no longer means ruin for a rider and their family.' },
  { emoji: '📈', title: 'Empower', body: 'Fair credit, savings and a real path from renting to owning — turning daily hustle into lasting wealth.' },
];

const BELIEFS = [
  { num: '01', title: 'Formalisation should reward riders, not punish them', body: 'If going digital only means more fees and more enforcement, it will fail. Riders have to gain — protection, credit, a path to ownership — or the system isn\'t worth building.' },
  { num: '02', title: 'Public revenue should reach public accounts', body: 'Every shilling a rider pays in fees should arrive where it belongs, transparently. No leakage, no middlemen at the stage, no "lost" collections.' },
  { num: '03', title: 'Technology should meet people where they are', body: 'That means the phones riders already own, in the languages they speak, working on any smartphone wherever they are. No one gets left out.' },
  { num: '04', title: 'A formal sector is a bankable sector', body: 'When earnings and identities are verified, riders become creditworthy — and a creditworthy rider can build real, lasting wealth.' },
];

const CREDIBILITY = [
  { emoji: '🏗️', title: 'Proven builders', body: "A founding team with prior exits across fintech, SaaS and property — we've built and scaled real businesses before." },
  { emoji: '⚖️', title: 'Regulated-fintech experience', body: "Deep, hands-on familiarity with Kenya's financial regulators and what it takes to operate compliantly." },
  { emoji: '🇰🇪', title: 'Built for the Kenyan market', body: 'We know the boda boda economy, the SACCO landscape and the county systems — because we work in them.' },
  { emoji: '🤝', title: 'Partner-led', body: 'We build with county governments, SACCOs and licensed financial partners — not around them.' },
];

const PRINCIPLES = [
  { title: 'We do the hard, unglamorous work', body: 'Registration, mapping, verification and compliance — the parts everyone else skips.' },
  { title: 'We build with, not for', body: 'Counties, SACCOs and riders shape the product. We listen first, then build.' },
  { title: 'We keep money safe and traceable', body: 'Funds move through licensed partners, straight to the right account — never through us.' },
  { title: 'We protect people\'s data', body: 'Built around the Kenya Data Protection Act, with clear ownership and access rules.' },
  { title: 'We design for inclusion', body: "If it doesn't work on any smartphone, wherever riders are, it isn't finished." },
  { title: 'We earn trust before scale', body: 'Prove the value at one county, one stage, then grow on results.' },
];

const COMPANY = [
  { label: 'Company', value: 'Mint Mobitech Ltd' },
  { label: 'Product', value: 'BodaSure' },
  { label: 'Headquarters', value: 'Nairobi, Kenya' },
  { label: 'Focus', value: 'The boda boda economy' },
  { label: 'Contact', value: 'help@bodasure.com' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function About() {
  useEffect(() => { document.title = "About BodaSure — Building the operating system for Kenya's boda boda economy"; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <Hero
        badge="About BodaSure"
        title={<>We're building the operating system for Kenya's <em className="text-primary not-italic">boda boda</em> economy.</>}
        subtitle="A sector that moves millions of Kenyans every day deserves more than cash, paper, and informality. We exist to dignify, protect, and empower the riders who keep the country moving."
        primaryCta={{ text: 'Request a Demo', to: '#demo' }}
        secondaryCta={{ text: 'Partner with us', to: 'mailto:help@bodasure.com' }}
      />

      {/* Section 2 — Mission dark band */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow>Our mission</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background">
              We exist to dignify, protect, and empower the people who move Kenya.
            </h2>
            <p className="text-lg text-background/70 leading-relaxed">
              The boda boda industry is the backbone of Kenyan mobility and one of its largest employers. Yet it has been left to run on cash, paper and trust — and that informality strips riders of <strong className="text-background">dignity</strong>, leaves them without <strong className="text-background">protection</strong>, and locks them out of the tools that would <strong className="text-background">empower</strong> them to build a better life. We formalise the sector to change that: fairly to riders, valuably to counties, and for the good of the country.
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
            The problem isn't the riders. It's the system around them.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Across Kenya, the same story repeats at every stage. A rider works hard all day, but the fees they pay vanish into cash that never reaches the county. They're stopped again and again over paperwork they can't easily prove. And when they want a loan, insurance, or a way to finally own their bike, they're told the sector is "too informal" to lend to.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Meanwhile, counties know the boda boda sector is one of their largest potential revenue streams — and one of the hardest to collect. SACCOs and welfare groups try to organise their members with notebooks and group chats. Owners struggle to track their bikes. Everyone keeps a separate record, and none of them agree.
          </p>

          {/* Pull-quote */}
          <div className="border-l-4 border-primary bg-accent rounded-r-2xl p-6 lg:p-8 mb-8">
            <p className="font-heading font-bold text-xl lg:text-2xl leading-snug text-foreground">
              "We realised the sector didn't need another payment app. It needed an operating system — one that does the hard work of registration, mapping, verification and compliance, with payments as just one part."
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            That's what BodaSure is. We work hand in hand with county governments, SACCOs and riders to build tools that fit how the sector actually works — not how an outsider imagines it works. Built in Kenya, for Kenya, on the phones riders already carry.
          </p>
        </div>
      </section>

      {/* Section 4 — Beliefs */}
      <section className="py-20 lg:py-28 bg-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Eyebrow>What we believe</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Four convictions that shape everything we build.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {BELIEFS.map((b, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="font-heading font-bold text-sm text-primary mb-3">{b.num}</div>
                <h3 className="font-heading font-bold text-lg mb-2 leading-snug">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Credibility band */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Eyebrow>Why us</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              A team that has built regulated fintech in Kenya before.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              BodaSure isn't a first attempt. It's built by a team with a track record across regulated fintech, public-sector technology, and the Kenyan market — people who understand both the regulation and the road.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIBILITY.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">{c.emoji}</div>
                <h3 className="font-heading font-bold text-base mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — How we work */}
      <section className="py-20 lg:py-28 bg-accent border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <Eyebrow>How we work</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Principles we hold to, every day.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="flex gap-3 items-start py-4 border-b border-border">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-bold text-base mb-1">{p.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
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
                  BodaSure is a product of Mint Mobitech Ltd, a Kenyan technology company building digital infrastructure for the sectors that power everyday life. Headquartered in Nairobi, we work across the country with county governments, SACCOs and the rider communities at the heart of the boda boda economy.
                </p>
              </div>
              <div className="bg-background/5 border-t lg:border-t-0 lg:border-l border-background/10 p-8 lg:p-12">
                <dl className="space-y-0">
                  {COMPANY.map((row, i) => (
                    <div key={i} className="flex justify-between gap-4 border-b border-background/10 last:border-0 py-3.5">
                      <dt className="text-sm text-background/40">{row.label}</dt>
                      <dd className="text-sm font-semibold text-background text-right">{row.value}</dd>
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
      >
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Request a Demo <ArrowRight className="w-4 h-4" />
          </a>
          <a href="mailto:help@bodasure.com" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-foreground/20 text-foreground rounded-xl font-semibold text-sm hover:bg-foreground/5 transition-colors">
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