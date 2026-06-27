import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Check, X } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import CTASection from '@/components/marketing/CTASection';
import DemoRequestForm from '@/components/marketing/DemoRequestForm';

const PAIN_CARDS = [
  { emoji: '📓', title: 'The book gets messy', body: 'A paper register rots in the rain, lives in one person\'s bag, and is never up to date. When the secretary leaves, the records leave with them.' },
  { emoji: '💸', title: 'Money is hard to track', body: 'Contributions arrive as cash or M-Pesa screenshots. Someone has to collect, count, bank, and reconcile — and too often, the numbers simply don\'t add up.' },
  { emoji: '🌱', title: 'Income stays on the table', body: 'Your group has members, a stage, a name, and trust. But none of that turns into income. The group runs on goodwill, not revenue.' },
];

const BENEFIT_CARDS = [
  { num: '01', title: 'Membership you can trust', body: 'A verified, digital member register — every rider ID-checked, every membership recorded. You always know who\'s in, who\'s paid up, and who\'s active.' },
  { num: '02', title: 'Digital contributions', body: 'Members pay their monthly contributions straight from their BodaSure Wallet. No cash at the stage, no chasing, no reconciliation headaches — every payment is logged and settled automatically.' },
  { num: '03', title: 'New income streams', body: 'Turn your group\'s presence into revenue: advertising, event hosting, and member services. BodaSure gives your SACCO the tools to earn, not just collect.' },
  { num: '04', title: 'Stronger standing with the county', body: 'Because BodaSure connects your SACCO directly to the county system, your members are always compliance-ready. A well-run group gets recognised — and gets priority.' },
  { num: '05', title: 'Welfare that works', body: 'Run digital welfare and emergency funds within your group. Members contribute and claim without paperwork, and every shilling is tracked and accounted for.' },
  { num: '06', title: 'Tools that build loyalty', body: 'Members stay because the group delivers real value — digital records, welfare support, and a share in new income. BodaSure helps your group mean something.' },
];

const EARN_CARDS = [
  { emoji: '📣', title: 'Advertising', body: 'Your group\'s riders carry visibility every day. Advertisers can reach them — and their passengers — through your stage, and your SACCO earns from every placement.' },
  { emoji: '🎤', title: 'Events', body: 'Organise, ticket, and host rider events, safety drives, and community days through BodaSure. Your group earns from ticketing and participation, all handled digitally.' },
  { emoji: '🛟', title: 'Member services', body: 'Offer your members insurance, savings, and loan products through BodaSure partners. Your SACCO earns a commission on every service a member takes up.' },
];

const FLOW_STEPS = [
  { num: '1', title: 'Register your group', body: 'An official registers your SACCO or welfare group on BodaSure. Verification is quick, and your group is live in minutes.' },
  { num: '2', title: 'Onboard your members', body: 'Invite riders to join your group. Each member is ID-verified and mapped to their stage and ward — your register builds itself.' },
  { num: '3', title: 'Collect & manage digitally', body: 'Contributions, fees, and welfare payments flow through BodaSure Wallets. You see every shilling in real time, with full audit trails.' },
  { num: '4', title: 'Earn & grow', body: 'Turn on income streams, build welfare funds, and strengthen your group\'s standing with the county. Your group grows in value, not just in size.' },
];

const PORTAL_CHECKLIST = [
  'Role-based access for chairpersons, treasurers, and secretaries',
  'Live contributions dashboard with downloadable, audit-ready reports',
  'Verified member register with full stage and ward mapping',
  'Group wallet with transparent settlement and disbursement',
  'Digital welfare and chama fund management',
  'Bulk SMS announcements and compliance reminders',
  'Income streams: advertising, events, and member services',
  'Full audit trail on every contribution, payment, and action',
];

const WHATSAPP_ITEMS = [
  'Keeps you talking, but nothing is recorded or reconciled',
  'Money is sent to a personal number — no audit trail',
  'No way to verify who\'s actually a paid-up member',
  'Records live in one person\'s phone, not the group\'s system',
  'No income — just a chat that never stops',
];

const BODASURE_ITEMS = [
  'Every member verified, every payment recorded',
  'Contributions go straight into a group wallet — settled automatically',
  'A live register shows who\'s active, paid up, and compliant',
  'Records belong to the group, with role-based access for officials',
  'New income streams turn the group into a real organisation',
];

const TRUST_ITEMS = [
  { emoji: '👁️', title: 'Transparent by default', body: 'Every member can see their own contributions and benefits. Every official can see the group\'s records. No secrets, no suspicion.' },
  { emoji: '🏦', title: 'Money handled safely', body: 'Funds are held in a CBK-licensed wallet system — not a personal M-Pesa. Settlements are automatic, traceable, and reconciled to the shilling.' },
  { emoji: '🔐', title: 'Clear roles & control', body: 'Chairpersons, treasurers, and secretaries each get the right level of access. Sensitive actions are logged, so no one person can act unchecked.' },
  { emoji: '🤝', title: 'Your members, your group', body: 'BodaSure doesn\'t own your group — you do. Your membership, your records, your money. We provide the system; you keep the trust.' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function Saccos() {
  useEffect(() => { document.title = 'BodaSure for SACCOs — Run an organised group that actually earns'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <Hero
        badge="For SACCOs, welfare & self-help groups"
        title="Run an organised group that actually earns."
        subtitle="BodaSure gives your SACCO or welfare group a digital home — verified membership, digital contributions, welfare funds, and new income streams, all in one platform that keeps everyone accountable."
        primaryCta={{ text: 'Register your group', to: '/register' }}
        secondaryCta={{ text: 'Talk to us', to: '#demo' }}
      />

      {/* Section 2 — Dark Problem Band */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Eyebrow>THE PROBLEM WE SOLVE</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6">
              The notebook, the WhatsApp group, and the missing treasurer's cash.
            </h2>
            <p className="text-lg text-background/70 leading-relaxed">
              Most SACCOs and welfare groups run on a paper register, a WhatsApp group, and a treasurer who collects cash. It works — until it doesn't. Records get lost, money goes missing, and the group that should be building wealth for its members barely stays afloat. BodaSure replaces all of that with one system that runs cleanly, transparently, and for everyone's benefit.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mt-14">
            {PAIN_CARDS.map((card, i) => (
              <div key={i} className="bg-background/5 border border-background/10 rounded-2xl p-7">
                <div className="text-3xl mb-4">{card.emoji}</div>
                <h3 className="font-heading font-bold text-lg mb-2 text-background">{card.title}</h3>
                <p className="text-sm text-background/60 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Numbered Benefit Cards */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>WHAT YOUR GROUP GETS</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Everything your group needs to run clean and grow.</h2>
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

      {/* Section 4 — Earn Streams */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>NEW WAYS TO EARN</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Turn what your group already does into income.</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {EARN_CARDS.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">{card.emoji}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — How It Works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>HOW IT WORKS FOR YOUR GROUP</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">From paper to digital in four steps.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FLOW_STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-extrabold text-lg mb-4 shadow-lg shadow-primary/20">
                  {step.num}
                </div>
                <h3 className="font-heading font-bold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                {i < FLOW_STEPS.length - 1 && (
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

      {/* Section 6 — SACCO Portal Checklist */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Eyebrow>THE GROUP PORTAL</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4">Built for officials, transparent for members.</h2>
            <p className="text-lg text-muted-foreground">Role-based access for every office, a live view of contributions and compliance, and full control over welfare funds and income streams — all in your browser, on any device.</p>
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

      {/* Section 7 — Dark Contrast Panel */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>MORE THAN A GROUP CHAT</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4 text-background">
              A WhatsApp group keeps you talking. BodaSure keeps you organised.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Left column — dark */}
            <div className="bg-background/5 border border-background/10 rounded-2xl p-7">
              <h3 className="font-heading font-bold text-lg mb-5 text-background/70">A WhatsApp group & a notebook</h3>
              <ul className="space-y-3">
                {WHATSAPP_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-background/40 shrink-0 mt-0.5" />
                    <span className="text-sm text-background/60">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right column — orange gradient */}
            <div className="bg-gradient-to-br from-primary to-primary/80 border border-primary rounded-2xl p-7 shadow-lg shadow-primary/20">
              <h3 className="font-heading font-bold text-lg mb-5 text-primary-foreground">BodaSure</h3>
              <ul className="space-y-3">
                {BODASURE_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary-foreground shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-primary-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 — Trust */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>TRUSTED & TRANSPARENT</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Built so members trust the group, and the group trusts the system.</h2>
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

      {/* Section 9 — Closing CTA + Demo Form */}
      <CTASection
        title="Bring your group into the digital economy."
        subtitle="Register your SACCO or welfare group on BodaSure, or talk to us about how your group can start earning — not just collecting."
      >
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
          <Link to="/register" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Register your group <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors">
            Talk to us
          </a>
        </div>
        <div id="demo">
          <DemoRequestForm />
        </div>
      </CTASection>
    </>
  );
}