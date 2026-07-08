import { ShieldCheck, Wallet, TrendingUp, MapPin } from 'lucide-react';

const PAIN_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Stopped by askaris',
    problem: 'Harassed over papers you can\u2019t find',
    solution: 'Carry a verified digital permit on your phone. Show it in seconds \u2014 ride in peace.',
  },
  {
    icon: Wallet,
    title: 'Cash that disappears',
    problem: 'No record of what you earned',
    solution: 'Every fare lands in your wallet with a record. Know exactly what you make.',
  },
  {
    icon: TrendingUp,
    title: 'Locked out of loans',
    problem: 'Too informal to borrow',
    solution: 'Build a digital transaction history that lenders trust. Access loans and credit built for riders.',
  },
  {
    icon: MapPin,
    title: 'Queueing at county offices',
    problem: 'Lost afternoons at the licence counter',
    solution: 'Pay your county permit from your phone in seconds. No queues, no paperwork.',
  },
];

export default function PainPointGrid() {
  return (
    <section className="py-16 lg:py-24 bg-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-primary tracking-wider uppercase">BUILT FOR THE RIDER&rsquo;S DAY</span>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
            You work hard for your money. BodaSure helps you keep it.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every day you face the same problems. Here&rsquo;s how your wallet fixes each one.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {PAIN_POINTS.map((pain) => (
            <div key={pain.title} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <pain.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{pain.title}</h3>
                  <p className="text-sm text-muted-foreground line-through mb-2">{pain.problem}</p>
                  <p className="text-sm text-foreground leading-relaxed">{pain.solution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}