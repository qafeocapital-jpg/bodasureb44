import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Check } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import CTASection from '@/components/marketing/CTASection';

const SERVICES = [
  { emoji: '📱', label: 'Lipisha', title: 'Collect fares', body: 'Accept fare payments from passengers directly to your wallet — no cash, no chasing, every shilling logged.' },
  { emoji: '🏛️', label: 'Lipa County', title: 'Pay county fees', body: 'Pay your county permit fee from the app and get a digital permit instantly. No queues, no cash, no harassment.' },
  { emoji: '🎫', label: 'Karibu', title: 'Digital permit', body: 'Your permit lives on your phone. Show it to any officer with one tap — verifiable, tamper-proof, always with you.' },
  { emoji: '🏍️', label: 'Lipa Owner', title: 'Pay bike owner', body: "Riding someone else's bike? Pay the owner their daily or weekly cut directly from the app. No more disputes." },
  { emoji: '🛡️', label: 'Insurance', title: 'Get insured', body: 'Affordable motorbike insurance in minutes. Annual and daily cover options from trusted, licensed partners.' },
  { emoji: '💰', label: 'Loans', title: 'Access credit', body: 'Your transaction history builds your credit score. Access loans from partner lenders — no collateral needed.' },
  { emoji: '📈', label: 'Invest', title: 'Grow your money', body: 'Put your earnings to work. Access unit trust and savings products from our investment partners.' },
  { emoji: '🤝', label: 'Chama', title: 'Contribute together', body: 'Join or start a digital chama with fellow riders. Contribute and earn together — no paperwork, no disputes.' },
  { emoji: '🏥', label: 'Afya', title: 'Health cover', body: 'Affordable health insurance plans for riders and their families. Pay monthly straight from your wallet.' },
];

const PERMIT_CHECKLIST = [
  'Verifiable instantly by any county official',
  'Always up to date when your fees are paid',
  'Works on any smartphone',
  'Operate without interruption or shakedowns',
];

const TRUST_ITEMS = [
  { emoji: '📱', title: 'Works on your phone', body: 'No new device, no paperwork. BodaSure runs on the smartphone you already carry every day.' },
  { emoji: '🏦', title: 'Every shilling in your name', body: 'Your wallet is linked to your verified identity. Your money is yours — tracked, recorded, and protected.' },
  { emoji: '🛡️', title: 'Protection from harassment', body: 'A valid digital permit means you ride with confidence. Any officer can verify you in seconds, no shakedowns.' },
  { emoji: '🔐', title: 'Money handled safely', body: 'Funds are held in a CBK-licensed wallet system — not cash in a pocket. Every transaction is traceable and secure.' },
];

const OWNER_CHECKLIST = [
  'See every bike in your fleet and who is riding it',
  'Get paid on time, every time — automatically from rider wallets',
  'Track compliance and permit status across all your motorcycles',
  'No more cash handling, IOUs, or end-of-day disputes',
];

const PATH_STEPS = [
  { num: '1', title: 'Ride & get paid', body: 'Start collecting fares and paying fees through your BodaSure Wallet from day one.' },
  { num: '2', title: 'Build your record', body: 'Every transaction builds a verified history — proof of income, compliance, and activity.' },
  { num: '3', title: 'Unlock services', body: 'Your record opens doors: loans, insurance, investments, and financial products built for you.' },
  { num: '4', title: 'Own your bike', body: 'Build enough credit and savings to buy your own motorcycle — from renting to owning.' },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

function PhonePermitMockup() {
  return (
    <div className="mx-auto max-w-[320px]">
      {/* Phone frame */}
      <div className="bg-foreground rounded-[2.5rem] p-3 shadow-2xl">
        <div className="bg-background rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-primary px-5 py-4 text-center">
            <p className="text-[10px] font-bold text-primary-foreground tracking-wider uppercase">BodaSure Permit</p>
          </div>
          {/* Permit body */}
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🏍️</span>
              </div>
              <p className="font-heading font-bold text-base">John Otieno</p>
              <p className="text-xs text-muted-foreground">Rider · KMG 123X</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">Stage</span>
                <span className="font-semibold">Kondele</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">County</span>
                <span className="font-semibold">Kisumu</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">Permit No.</span>
                <span className="font-semibold font-mono">KS-0042-2026</span>
              </div>
              <div className="flex justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">Valid Until</span>
                <span className="font-semibold">31 Dec 2026</span>
              </div>
            </div>
            <div className="bg-success/10 border border-success/30 rounded-xl py-2 text-center">
              <p className="text-xs font-bold text-success">✓ Compliant &amp; Active</p>
            </div>
            {/* QR placeholder */}
            <div className="flex justify-center pt-1">
              <div className="w-20 h-20 bg-foreground rounded-lg grid grid-cols-5 grid-rows-5 gap-0.5 p-2">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={Math.random() > 0.4 ? 'bg-background' : 'bg-transparent'} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Riders() {
  useEffect(() => { document.title = 'BodaSure for Riders — Ride. Earn. Grow. All in one app.' }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <Hero
        badge="For riders & bike owners"
        title="Ride. Earn. Grow. All in one app."
        subtitle="BodaSure is your all-in-one app — collect fares, pay county fees, get a digital permit, access loans, insurance, and the financial tools to go from renting a bike to owning one."
        primaryCta={{ text: 'Sign Up Free', to: '/register' }}
      />

      {/* Section 2 — Dark Promise Band */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Eyebrow>OUR PROMISE TO RIDERS</Eyebrow>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-6">
            You keep Kenya moving. Now the system works for you.
          </h2>
          <p className="text-lg text-background/70 leading-relaxed">
            For too long, the system has worked against riders — paper records that disappear, harassment at checkpoints, cash that can't be traced, and no way to prove you're legit. BodaSure changes all of that. Your records are digital, your permit is verifiable, your money is in your name, and your transaction history unlocks the loans and services that help you grow — all the way to owning your own bike.
          </p>
        </div>
      </section>

      {/* Section 3 — Services Grid */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>EVERYTHING IN ONE APP</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Nine services. One wallet. Zero hassle.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">{card.emoji}</div>
                <p className="text-xs font-bold text-primary tracking-wider uppercase mb-1">{card.label}</p>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Digital Permit Highlight */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Eyebrow>THE DIGITAL PERMIT</Eyebrow>
              <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4">No more harassment.</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Your permit lives on your phone, verifiable by any county official in seconds. When your fees are paid, you're compliant — no more shakedowns, no more lost paper, no more wasted time at checkpoints.
              </p>
              <ul className="space-y-3">
                {PERMIT_CHECKLIST.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <PhonePermitMockup />
          </div>
        </div>
      </section>

      {/* Section 5 — Trust */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>BUILT ON TRUST</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Your money, your record, your future.</h2>
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

      {/* Section 6 — Bike Owner (dark) */}
      <section className="bg-foreground text-background py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Eyebrow>FOR BIKE OWNERS</Eyebrow>
              <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3 mb-4 text-background">
                Own bikes? Run your fleet like a pro.
              </h2>
              <p className="text-lg text-background/70 leading-relaxed mb-8">
                If you own motorcycles that others ride, BodaSure gives you visibility and control you've never had before. Track every bike, every rider, and every payment — all in real time.
              </p>
              <ul className="space-y-3">
                {OWNER_CHECKLIST.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold text-background/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-background/5 border border-background/10 rounded-2xl p-8 text-center">
                <p className="font-heading font-extrabold text-4xl sm:text-5xl text-primary mb-2">On time</p>
                <p className="text-sm text-background/60">Lipa Owner payments — automatically settled to your wallet, every day.</p>
              </div>
              <div className="bg-background/5 border border-background/10 rounded-2xl p-8 text-center">
                <p className="font-heading font-extrabold text-4xl sm:text-5xl text-primary mb-2">Every bike</p>
                <p className="text-sm text-background/60">Full fleet compliance view — permits, inspections, and rider status at a glance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 — Path to Ownership */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Eyebrow>FROM RENTING TO OWNING</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Your path to ownership, in four steps.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PATH_STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-extrabold text-lg mb-4 shadow-lg shadow-primary/20">
                  {step.num}
                </div>
                <h3 className="font-heading font-bold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                {i < PATH_STEPS.length - 1 && (
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

      {/* Section 8 — Closing CTA */}
      <CTASection
        title="Join thousands of riders going digital."
        subtitle="Sign up free and start today — or ask your SACCO to onboard you and your group."
      >
        <div className="mt-8">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            Sign Up Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CTASection>
    </>
  );
}