import { Link } from 'react-router-dom';
import { ArrowRight, Users, Wallet, FileText, Check } from 'lucide-react';

const SACCO_BENEFITS = [
  {
    icon: Users,
    title: 'Digital member registers',
    description: 'Track every member, their bike, and their contributions \u2014 no more paper ledgers.',
  },
  {
    icon: Wallet,
    title: 'Collect contributions digitally',
    description: 'Members pay directly into the SACCO wallet. Every shilling tracked and reconciled.',
  },
  {
    icon: FileText,
    title: 'Full audit trails',
    description: 'Every transaction recorded. Transparency your members and regulators can trust.',
  },
];

export default function SaccoSplitPanel() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left \u2014 visual / stat panel */}
          <div className="order-2 lg:order-1">
            <div className="bg-foreground text-background rounded-3xl p-8 lg:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-background/60 uppercase tracking-wide">SACCO Dashboard</p>
                  <p className="font-heading font-bold text-base">Live overview</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-background/5 rounded-2xl p-4">
                  <p className="font-heading font-extrabold text-2xl text-primary">248</p>
                  <p className="text-xs text-background/60 mt-1">Active members</p>
                </div>
                <div className="bg-background/5 rounded-2xl p-4">
                  <p className="font-heading font-extrabold text-2xl text-primary">KES 1.2M</p>
                  <p className="text-xs text-background/60 mt-1">Collected this month</p>
                </div>
              </div>
              <div className="space-y-3">
                {['Monthly contributions \u2014 248 paid', 'Welfare fund \u2014 KES 84,500', 'Group loan repayments \u2014 12 active'].map((item) => (
                  <div key={item} className="flex items-center gap-3 bg-background/5 rounded-xl px-4 py-3">
                    <Check className="w-4 h-4 text-success flex-shrink-0" strokeWidth={3} />
                    <span className="text-sm text-background/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right \u2014 copy */}
          <div className="order-1 lg:order-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">FOR SACCOs &amp; GROUPS</span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Run your SACCO like a real business
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Digital registers, automatic contribution collection, group wallets,
              and full audit trails — everything a SACCO or chama needs to operate
              transparently and grow.
            </p>
            <div className="mt-8 space-y-5">
              {SACCO_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                to="/saccos"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                Explore for SACCOs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}