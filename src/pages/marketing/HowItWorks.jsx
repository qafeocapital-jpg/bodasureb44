import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Check } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import CTASection from '@/components/marketing/CTASection';
import ReamazeDemoForm from '@/components/marketing/ReamazeDemoForm';

const ROLES = [
  { emoji: '🏛️', title: 'County', body: 'Registers riders, issues digital permits, enforces compliance, and collects revenue — all in one dashboard.' },
  { emoji: '🏢', title: 'SACCO', body: 'Manages verified membership, collects digital contributions, runs welfare funds, and earns from new income streams.' },
  { emoji: '🏍️', title: 'Owner', body: 'Tracks every bike in their fleet, gets paid automatically, and monitors compliance across all their motorcycles.' },
  { emoji: '🧑', title: 'Rider', body: 'Collects fares, pays county fees and owners, gets insured, builds a transaction record, and accesses loans — all from one app.' },
];

const FLOW_STEPS = [
  { num: '01', who: 'County', title: 'County onboards riders', body: 'The county registers riders into the system, verifying their identity, bike, and stage. Each rider is mapped to a ward, SACCO, and stage — creating a single trusted record that every role can rely on.', tags: ['Identity verification', 'Stage mapping', 'Digital record'] },
  { num: '02', who: 'SACCO', title: 'SACCO organises members', body: 'Riders join their SACCO or welfare group on BodaSure. The group gets a verified member register, digital contributions, and tools to manage welfare funds — no more paper registers or WhatsApp-only groups.', tags: ['Verified membership', 'Digital contributions', 'Welfare funds'] },
  { num: '03', who: 'Rider', title: 'Rider operates legally', body: 'With identity and bike verified, the rider pays their county permit fee and receives a digital permit. They collect fares through their wallet, pay their bike owner, and build a transaction history — every shilling recorded.', tags: ['Digital permit', 'Fare collection', 'Owner payments'] },
  { num: '04', who: 'Owner', title: 'Owner gets paid automatically', body: 'Bike owners see every motorcycle, every rider, and every payment in real time. The Lipa Owner feature settles the agreed cut from the rider\'s wallet automatically — no cash, no IOUs, no end-of-day disputes.', tags: ['Fleet visibility', 'Automatic settlement', 'Compliance tracking'] },
  { num: '05', who: 'County', title: 'County enforces & collects', body: 'Officers verify any rider\'s permit with a tap. Compliance is visible in real time, enforcement is data-driven, and revenue flows directly to the right county account — settled and reconciled automatically.', tags: ['Instant verification', 'Real-time compliance', 'Automated revenue'] },
  { num: '06', who: 'Rider', title: 'Rider grows financially', body: 'A verified transaction record unlocks loans, insurance, and investment products. Riders build credit, access financial services, and work toward owning their own bike — the system works for them, not against them.', tags: ['Credit score', 'Loans & insurance', 'Path to ownership'] },
];

const ARCH_CARDS = [
  { emoji: '🔐', title: 'Identity-verified', body: 'Every rider is ID-checked and mapped to a stage, ward, SACCO, and county. One record, trusted by every role — no duplicates, no ghost riders.' },
  { emoji: '🔗', title: 'Single source of truth', body: 'County, SACCO, owner, and rider all see the same data in real time. When a permit is paid, everyone knows. When a fare is collected, it\'s recorded.' },
  { emoji: '🏛️', title: 'County-integrated', body: 'BodaSure connects directly to county revenue systems. Permits, compliance, and revenue collection are built into the platform — not bolted on.' },
  { emoji: '📱', title: 'Mobile-first & accessible', body: 'A progressive web app that works on any smartphone — so no rider is left out, wherever they operate in the county.' },
];

const MONEY_NODES = [
  { label: 'Rider pays', body: 'From their BodaSure Wallet' },
  { label: 'CBK-licensed partner', body: 'Funds held securely', highlight: true },
  { label: 'Right account', body: 'County, SACCO, or owner' },
  { label: 'Reconciled', body: 'Every shilling tracked' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function HowItWorks() {
  useEffect(() => { document.title = 'How It Works — One platform. Every role. | BodaSure'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <Hero
        badge="How it works"
        title="One platform. Every role. From the county to the stage."
        subtitle="BodaSure connects county governments, SACCOs, bike owners, and riders into a single trusted system. Identity is verified once, records are shared in real time, and every payment flows to the right account — automatically. Here's how the whole thing works."
        primaryCta={{ text: 'Request a Demo', to: '#demo' }}
        secondaryCta={{ text: 'For Counties', to: '/counties' }}
      />

      {/* Section 2 — 4 Roles, One Trusted Record */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>4 ROLES, ONE TRUSTED RECORD</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 text-background">
              Every role connected. Every record shared.
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting orange line on desktop */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-primary/30" />
            {ROLES.map((role, i) => (
              <div key={i} className="relative bg-background/5 border border-background/10 rounded-2xl p-7 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-primary/20">
                  {role.emoji}
                </div>
                <h3 className="font-heading font-bold text-lg mb-2 text-background">{role.title}</h3>
                <p className="text-sm text-background/60 leading-relaxed">{role.body}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-background/50 mt-10 max-w-2xl mx-auto">
            One verified identity. One shared record. Four roles working from the same truth — so nothing falls through the cracks.
          </p>
        </div>
      </section>

      {/* Section 3 — End-to-end flow */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Eyebrow>END-TO-END FLOW</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              From registration to ownership — six steps.
            </h2>
          </div>
          <div className="divide-y divide-border">
            {FLOW_STEPS.map((step, i) => (
              <div key={i} className="py-8 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex sm:flex-col items-start gap-3 sm:gap-0 shrink-0">
                    <div className="font-heading font-extrabold text-4xl sm:text-5xl text-primary leading-none">
                      {step.num}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase">
                        {step.who}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.body}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map((tag, ti) => (
                        <span key={ti} className="inline-flex items-center text-xs font-medium text-muted-foreground bg-accent border border-border rounded-lg px-2.5 py-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Architecture: Under the hood */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>UNDER THE HOOD</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Built to be trusted by everyone.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {ARCH_CARDS.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">{card.emoji}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Money flow strip */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>THE MONEY FLOW</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Every shilling goes to the right place.
            </h2>
          </div>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-4 lg:gap-2">
            {MONEY_NODES.map((node, i) => (
              <div key={i} className="flex flex-col lg:flex-row items-center gap-4 lg:gap-2">
                <div className={`w-full lg:w-56 rounded-2xl p-6 text-center border ${
                  node.highlight
                    ? 'bg-foreground text-background border-foreground shadow-xl'
                    : 'bg-card border-border'
                }`}>
                  <p className="font-heading font-bold text-base mb-1">{node.label}</p>
                  <p className={`text-xs ${node.highlight ? 'text-background/60' : 'text-muted-foreground'}`}>{node.body}</p>
                </div>
                {i < MONEY_NODES.length - 1 && (
                  <>
                    <ArrowRight className="hidden lg:block w-6 h-6 text-primary/50" />
                    <ArrowDown className="lg:hidden w-6 h-6 text-primary/50" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Dark reinforcement band */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Eyebrow>MORE THAN PAYMENTS</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background">
            BodaSure runs the whole system. Payments are just the last step.
          </h2>
          <p className="text-lg text-background/70 leading-relaxed">
            Identity verification, compliance tracking, permit issuance, member management, fleet visibility, revenue collection, and reconciliation — BodaSure handles all of it. By the time money moves, every record is already in place, every role is already informed, and every account is already mapped. The payment is just the last step in a system that's already done the work.
          </p>
        </div>
      </section>

      {/* Section 7 — Closing CTA + Demo form */}
      <CTASection
        title="See the whole system in action."
        subtitle="Request a demo and we'll walk you through how BodaSure connects your county, your SACCO, your owners, and your riders — end to end."
      >
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Request a Demo <ArrowRight className="w-4 h-4" />
          </a>
          <Link to="/riders" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors">
            Explore the rider app
          </Link>
        </div>
        <div id="demo">
          <ReamazeDemoForm />
        </div>
      </CTASection>
    </>
  );
}