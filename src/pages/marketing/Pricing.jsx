import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import CTASection from '@/components/marketing/CTASection';
import ReamazeDemoForm from '@/components/marketing/ReamazeDemoForm';

const VALUE_ITEMS = [
  { title: 'Field registration', body: 'We find and enrol the rider, their owner and their motorcycle — boots on the ground.' },
  { title: 'Stage & route mapping', body: 'The rider is mapped to where they actually operate in your county.' },
  { title: 'Identity verification', body: "Every rider's identity is verified, so your register is real, not guesswork." },
  { title: 'SACCO allocation', body: 'We connect the rider to their SACCO, welfare or self-help group.' },
  { title: 'Digital permit lifecycle', body: 'Issuance, renewal, suspension and revocation — managed end to end.' },
  { title: 'Compliance monitoring', body: 'Continuous tracking and self-enforcement support, not a one-off check.' },
  { title: 'Revenue collection', body: 'Digital fee collection straight to your county account, reconciled automatically.' },
  { title: 'County portal & reporting', body: 'Live dashboards and audit-ready reports for every county team.' },
  { title: 'Ongoing support & updates', body: 'Training, support and continuous platform improvements, always included.' },
];

const MODEL_INCLUDED = [
  'Registration, mapping & ID verification',
  'SACCO allocation & digital permits',
  'Revenue collection, reconciled to the shilling',
  'Compliance, self-enforcement & the county portal',
  'Training, support & updates — always included',
];

const WHY_CARDS = [
  { emoji: '🛡️', title: 'Your set fee stays your set fee', body: "The county decides what it charges riders, and that amount is protected. We don't shrink it, compete with it, or take a percentage of your revenue — your fee comes in whole." },
  { emoji: '📊', title: 'Predictable & budgetable', body: 'Our cost is structured to be simple to forecast and easy to put before your finance committee. No surprises, no fluctuating cut of your collections.' },
  { emoji: '🤝', title: 'Our incentives match yours', body: "We're rewarded for registering riders and keeping them genuinely active and compliant — the very same outcome the county wants. We succeed only when your sector is healthy." },
];

const RISK_ITEMS = [
  { emoji: '🎯', title: 'You pay for real, active riders', body: 'Our model is tied to genuinely active, registered riders — not to targets, projections, or inactive entries. Value first, then cost.' },
  { emoji: '🚀', title: 'We carry the registration effort', body: 'The field drives, the onboarding, the mapping and verification — BodaSure mobilises and runs them. The county provides the mandate; we do the legwork.' },
  { emoji: '📈', title: 'Start with a pilot', body: 'Begin with a defined set of stages, see the revenue and compliance results, then scale county-wide on proof — not on a leap of faith.' },
  { emoji: '📑', title: 'Clear, protective agreements', body: "Transparent terms with data-ownership and continuity protections written for the county's security from day one." },
];

const PROCESSOR_ITEMS = [
  'Takes a percentage of every transaction',
  "Doesn't register or verify anyone",
  "Can't issue or enforce a permit",
  'Leaves the real work to your county',
  'Earns more as your collections grow',
];

const BODASURE_ITEMS = [
  'One predictable, tailored cost — no revenue cut',
  'Registers, maps & ID-verifies every rider',
  'Issues & enforces digital permits',
  'Does the operational work for you',
  "Your county's set fee stays protected",
];

const FAQS = [
  { q: 'Do you take a percentage of our revenue?', a: "No — we don't operate on revenue share. The county sets its own fees, and your fee is protected: we don't compete with it or scale a cut up as your collections grow. Our cost for running the managed system is structured separately and laid out in full in your proposal." },
  { q: "How is BodaSure's cost structured?", a: "It's a transparent, predictable cost tied to the managed service we deliver — not a slice of your revenue. Because every county's fee structure and rider numbers differ, we model the exact arrangement for your county and present it clearly in a custom proposal, so your finance team sees precisely how it works." },
  { q: 'What does the managed service cover?', a: 'Everything: field registration, stage mapping, identity verification, SACCO allocation, the full digital permit lifecycle, compliance monitoring and self-enforcement support, digital revenue collection, the county portal with live reporting, and ongoing training, support and platform updates. There are no separate module fees.' },
  { q: 'Where does the community dividend come in?', a: 'Part of the structure returns value to riders and their SACCOs as a community dividend — the mechanism that drives voluntary compliance and self-enforcement. We walk your team through exactly how this is arranged in the proposal.' },
  { q: 'Are there transaction fees on top?', a: 'Payments are settled through a CBK-licensed payments partner, and any standard settlement costs are set out clearly in your proposal. There are no hidden charges.' },
  { q: 'Can we start small, and how do we get exact figures?', a: "Yes — most counties begin with a pilot across a defined set of stages, confirm the results, then scale county-wide on proven outcomes. Request a proposal and we'll model the complete commercial terms around your county's riders, stages and fee structure." },
];

const Eyebrow = ({ children }) => (
  <span className="text-xs font-bold text-primary tracking-wider uppercase">{children}</span>
);

export default function Pricing() {
  useEffect(() => { document.title = 'BodaSure Pricing — Simple, fair, and built around every rider'; }, []);

  return (
    <>
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-primary/15 py-20 lg:py-28">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block text-xs font-bold text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-6 tracking-wider uppercase">Pricing for counties</span>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-background leading-[1.1] tracking-tight">
              An <span className="text-primary">entire</span> system behind every rider — priced for your county.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-background/70 leading-relaxed max-w-2xl">
              No revenue share. No percentage of your county's set fees. No hidden transaction cuts. Just a transparent, predictable cost for a fully managed system that registers, verifies, licenses and protects every rider in your county — tailored to your numbers in a custom proposal.
            </p>
            <div className="mt-8">
              <a href="#demo" className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Request a Demo <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — What you're actually paying for */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>What you're actually paying for</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Every registered rider is a complete, managed operation — not a transaction.</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Before we ever talk about cost, understand what sits behind a single rider on BodaSure. This is the work a county has never had a tool for — and every part of it is included in one fully managed service.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {VALUE_ITEMS.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 flex gap-3 items-start">
                <div className="flex-none w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — The Model (dark band with price card) */}
      <section className="relative overflow-hidden bg-foreground text-background py-20 lg:py-28">
        <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>The model</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-background tracking-tight mt-3 mb-4">Your county sets its fees. We make them collectable — and stay aligned with you.</h2>
            <p className="text-lg text-background/60">
              The county decides what it charges riders. BodaSure's role is to register, verify and license those riders and bring the money in cleanly. We don't take a percentage of your revenue, and we don't compete with your fees — we make them work. Exact terms are tailored to your county in a custom proposal.
            </p>
          </div>
          <div className="max-w-xl mx-auto bg-gradient-to-br from-foreground to-foreground/80 border border-background/10 rounded-3xl p-10 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/15 text-primary rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase mb-6">
              ★ Fully managed · All-inclusive
            </div>
            <h3 className="font-heading font-extrabold text-3xl text-background leading-tight mb-4">A custom proposal,<br />built for your county.</h3>
            <p className="text-sm text-background/60 max-w-md mx-auto mb-8">
              Every county is different — its rider numbers, its stages, its fee structure and its goals. So rather than a one-size price, we prepare a tailored commercial proposal for your county, with the complete terms laid out transparently.
            </p>
            <div className="h-px bg-background/10 my-8" />
            <div className="text-left space-y-3">
              {MODEL_INCLUDED.map((item, i) => (
                <div key={i} className="flex gap-3 items-start text-sm text-background/70">
                  <span className="text-primary font-bold flex-none">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <a href="#demo" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Request your custom proposal
              </a>
            </div>
          </div>
          <p className="text-center text-background/40 text-sm mt-8">
            Reach out and we'll model a proposal around <strong className="text-background/60">your county's riders, stages and fee structure</strong> — with full, transparent terms.
          </p>
        </div>
      </section>

      {/* Section 4 — Why our model works for counties */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Why our model works for counties</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Built to align with the county, not to compete with it.</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              We deliberately rejected the revenue-share model that payment companies use. Here's why our approach is better for your county.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {WHY_CARDS.map((card, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mb-4">{card.emoji}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Low risk for the county */}
      <section className="bg-accent border-y border-border py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Low risk for the county</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">Designed so the county pays for value, not promises.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            {RISK_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-4 items-start bg-card border border-border rounded-2xl p-6">
                <div className="flex-none w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-bold text-base mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Not a payment processor */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Don't compare us to a payment processor</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">A processor charges per transaction. We deliver an entire managed sector.</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              The price only makes sense once you see what's being compared. A payment processor's fee buys you a transaction. BodaSure's fee buys you a registered, verified, licensed, compliant rider — with payments included.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            <div className="bg-foreground text-background/60 rounded-2xl p-8">
              <h4 className="font-heading font-bold text-lg text-background/80 mb-1">A payment processor</h4>
              <p className="text-xs text-background/40 mb-6">charges you to move money</p>
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
              <h4 className="font-heading font-bold text-lg text-background mb-1">BodaSure</h4>
              <p className="text-xs text-background/70 mb-6">delivers a fully managed sector</p>
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

      {/* Section 7 — FAQ */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Common questions</Eyebrow>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">What counties ask us about pricing.</h2>
          </div>
          <div className="divide-y divide-border">
            {FAQS.map((faq, i) => (
              <div key={i} className="py-6">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Closing CTA + Demo form */}
      <CTASection
        title="Get a full proposal built for your county."
        subtitle="Request a demo and we'll walk you through the complete commercial model, tailored to your county."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <a href="#demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Request a Demo <ArrowRight className="w-4 h-4" />
          </a>
          <Link to="/counties" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-foreground/20 text-foreground rounded-xl font-semibold text-sm hover:bg-foreground/5 transition-colors">
            See what counties get
          </Link>
        </div>
        <div id="demo" className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8">
          <h3 className="font-heading font-bold text-xl mb-4 text-center">Request your custom proposal</h3>
          <ReamazeDemoForm />
        </div>
      </CTASection>
    </>
  );
}