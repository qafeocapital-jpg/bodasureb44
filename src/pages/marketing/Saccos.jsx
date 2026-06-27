import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import CTASection from '@/components/marketing/CTASection';
import ReamazeDemoForm from '@/components/marketing/ReamazeDemoForm';

const PAIN_CARDS = [
  { emoji: '📓', title: 'The book gets messy', body: 'Paper registers go out of date, get lost, or spark disputes no one can settle.' },
  { emoji: '💸', title: 'Money is hard to track', body: 'Cash contributions pass through too many hands, and the records rarely match the float.' },
  { emoji: '🌱', title: 'Income stays on the table', body: 'Advertising, events and member services could earn — but there\'s no system to run them.' },
];

const BENEFIT_CARDS = [
  { num: '01', title: 'Membership you can trust', body: 'A live, verified register of every member — who\'s active, who\'s behind, who\'s new. No more guessing, no more disputes over the book. Officials and members see the same record.' },
  { num: '02', title: 'Digital contributions', body: 'Collect dues, welfare contributions and chama savings digitally, straight into the group\'s account. Every shilling is recorded, every member can see their own history, and the treasurer\'s job gets far easier.' },
  { num: '03', title: 'New income streams', body: 'Earn beyond dues. Run advertising across your members and stages, organise events, and offer member services — BodaSure helps you monetise what your group already does, transparently.' },
  { num: '04', title: 'Stronger standing with the county', body: 'Groups on BodaSure plug directly into the county system. That means easier registration for members, smoother compliance, and a real seat at the table in self-enforcement.' },
  { num: '05', title: 'Welfare that works', body: 'Run your welfare fund properly — track who has contributed, manage payouts for emergencies, sickness or bereavement, and show members exactly where the money goes.' },
  { num: '06', title: 'Tools that build loyalty', body: 'When members can pay, save, and access services through the group, belonging becomes worth something. Organisation drives retention — and a bigger, stronger group.' },
];

const EARN_CARDS = [
  { emoji: '📣', title: 'Advertising', body: 'Brands want to reach riders and the communities around your stages. Run advertising campaigns across your group and earn from every placement.' },
  { emoji: '🎤', title: 'Events', body: 'Organise trainings, tournaments, and group events — manage tickets, sign-ups and sponsorships digitally, and keep the proceeds organised.' },
  { emoji: '🛟', title: 'Member services', body: 'Offer welfare, savings and partner services to members through the group, and earn as the trusted channel that delivers them.' },
];

const FLOW_STEPS = [
  { num: '1', title: 'Register your group', body: 'Bring your SACCO, welfare or self-help group onto BodaSure and set up your officials and roles.' },
  { num: '2', title: 'Onboard your members', body: 'Add and verify every member into one live register, linked to their stage and the county system.' },
  { num: '3', title: 'Collect & manage digitally', body: 'Take contributions, run welfare and savings, and manage everything from one clean dashboard.' },
  { num: '4', title: 'Earn & grow', body: 'Open new income from advertising, events and services — and watch the group become stronger and more trusted.' },
];

const PORTAL_CHECKLIST = [
  'Live member registry with status, history and contribution tracking',
  'Digital collection of dues, welfare contributions and chama savings',
  'Roles for chairperson, secretary, treasurer and members',
  'Welfare fund management — contributions, payouts and balances',
  'Advertising and events income management',
  'Statements and reports for members and officials',
  'Direct link to the county register and the rider app',
  'Mobile-first, so every member is included',
];

const WHATSAPP_ITEMS = [
  'Holds conversations, not records',
  'Contributions tracked by hand, if at all',
  'Disputes come down to memory',
  'No way to earn the group income',
  'Disconnected from the county',
];

const BODASURE_ITEMS = [
  'A verified, living member register',
  'Every contribution recorded automatically',
  'One shared, trusted source of truth',
  'New income from ads, events & services',
  'Plugged directly into the county system',
];

const TRUST_ITEMS = [
  { emoji: '👁️', title: 'Transparent by default', body: 'Every member can see their own contributions and history. Trust comes from visibility, not from taking someone\'s word.' },
  { emoji: '🏦', title: 'Money handled safely', body: 'Contributions move through a CBK-licensed payments partner into the group\'s account — not through anyone\'s pocket.' },
  { emoji: '🔐', title: 'Clear roles & control', body: 'Officials get the access they need; members get visibility. Every action is recorded for accountability.' },
  { emoji: '🤝', title: 'Your members, your group', body: 'BodaSure organises your group — it doesn\'t take it over. Your members, your funds, your decisions.' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function Saccos() {
  useEffect(() => { document.title = 'BodaSure for SACCOs — Run an organised group that actually earns'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-primary/15 py-20 lg:py-28">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="!max-w-[16ch]">
            <span className="inline-block text-xs font-bold text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6 tracking-wider uppercase">For SACCOs, welfare &amp; self-help groups</span>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-background leading-[1.05] tracking-tight">
              Run an organised group that actually <span className="text-primary">earns</span>.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-background/70 leading-relaxed max-w-2xl">
              BodaSure gives boda boda SACCOs, welfare groups and self-help groups the digital tools to track members, collect contributions, and unlock new income — so your group runs clean, stays accountable, and grows strong.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Register your group <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-background/30 text-background rounded-xl font-semibold text-sm hover:bg-background/10 transition-colors">
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Problem band with pain cards (dark) */}
      <section className="bg-foreground text-background py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow>Why groups choose BodaSure</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background">
              The notebook, the WhatsApp group, and the missing treasurer's cash.
            </h2>
            <p className="text-lg text-background/70 leading-relaxed">
              Most boda boda groups still run on a paper register, a WhatsApp thread, and a treasurer's word. It works — until it doesn't. Money goes unaccounted for. Members fall behind and no one can prove it. And the things your group is already doing — welfare, savings, advertising, events — never turn into real, organised income. BodaSure turns your group into a properly run organisation that members trust and want to belong to.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 mt-12">
            {PAIN_CARDS.map((card, i) => (
              <div key={i} className="bg-secondary/30 border border-background/10 rounded-2xl p-6">
                <div className="text-2xl mb-3">{card.emoji}</div>
                <h3 className="font-heading font-bold text-base mb-2 text-background">{card.title}</h3>
                <p className="text-sm text-background/60 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — What your group gets (numbered benefit cards) */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>What your group gets</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Everything your group needs to run clean and grow.
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

      {/* Section 4 — Earn streams (paper-2 background) */}
      <section className="bg-secondary border-y border-border py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>New ways to earn</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Turn what your group already does into income.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Your group has something valuable: a trusted, organised network of riders at known stages. BodaSure helps you turn that into revenue — openly and accountably, with every shilling tracked.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 mt-12">
            {EARN_CARDS.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">{card.emoji}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — How it works (horizontal flow) */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>How it works for your group</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            From a paper book to a digital organisation.
          </h2>
          <div className="flex flex-col lg:flex-row gap-3 mt-12">
            {FLOW_STEPS.map((step, i) => (
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
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-primary rotate-90 lg:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Group portal checklist */}
      <section className="bg-secondary border-y border-border py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>The group portal</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Built for officials, transparent for members.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Everything a chairperson, secretary or treasurer needs to run the group — and everything members need to trust it.
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

      {/* Section 7 — Not a group chat (dark band with contrast cards) */}
      <section className="bg-foreground text-background py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>More than a group chat</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6 text-background max-w-[24ch]">
            A WhatsApp group keeps you talking. BodaSure keeps you organised.
          </h2>
          <p className="text-lg text-background/70 leading-relaxed max-w-3xl">
            A chat thread and a notebook can hold a group together for a while — but they can't track a member's contributions, manage a welfare payout, prove who's compliant, or earn the group money. BodaSure does the real organisational work, so your officials lead a proper institution, not a messaging list.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            <div className="bg-secondary/30 text-background/60 rounded-2xl p-8">
              <h4 className="font-heading font-bold text-lg text-background/80 mb-5">A WhatsApp group &amp; a notebook</h4>
              <ul className="space-y-0">
                {WHATSAPP_ITEMS.map((item, i) => (
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

      {/* Section 8 — Trust */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Eyebrow>Trusted &amp; transparent</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 max-w-[22ch]">
            Built so members trust the group, and the group trusts the system.
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

      {/* Section 9 — Closing CTA + Demo form */}
      <CTASection
        title="Bring your group into the digital economy."
        subtitle="Register your SACCO or welfare group on BodaSure, or talk to us about how your group can start earning — not just collecting."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Register your group <ArrowRight className="w-4 h-4" />
          </a>
          <Link to="/about" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-foreground/20 text-foreground rounded-xl font-semibold text-sm hover:bg-foreground/5 transition-colors">
            Talk to us
          </Link>
        </div>
        <div id="demo" className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8">
          <h3 className="font-heading font-bold text-xl mb-4 text-center">Register your group</h3>
          <ReamazeDemoForm />
        </div>
      </CTASection>
    </>
  );
}