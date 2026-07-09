import { Link } from 'react-router-dom';
import { ArrowRight, Users, Wallet, FileText, Check } from 'lucide-react';

const SACCO_PHOTO = 'https://media.base44.com/images/public/6a383cbbcd6dd93f84de66de/d0ed4d7ea_generated_image.png';

const SACCO_BENEFITS = [
  {
    icon: Users,
    title: 'Digital rider registers',
    description: 'Track every rider, their bike, plate number, and contributions \u2014 no more paper ledgers at the stage.',
  },
  {
    icon: Wallet,
    title: 'Collect contributions digitally',
    description: 'Members pay daily stage fees, welfare, and loan repayments directly into the SACCO wallet. Every shilling tracked.',
  },
  {
    icon: FileText,
    title: 'Full audit trails',
    description: 'Every fare, every contribution, every disbursement recorded. Transparency your riders and regulators can trust.',
  },
];

export default function SaccoSplitPanel() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left \u2014 photo with floating dashboard card */}
          <div className="order-2 lg:order-1">
            <div className="relative w-full">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={SACCO_PHOTO}
                  alt="Kenyan boda boda riders gathered at their stage with their motorbikes"
                  className="w-full h-auto block object-cover aspect-[4/3]"
                  loading="lazy"
                />
              </div>

              {/* Floating SACCO dashboard card */}
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-foreground text-background rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-background/60 uppercase tracking-wide">SACCO Dashboard</p>
                    <p className="font-heading font-bold text-sm">Live overview</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-background/5 rounded-xl p-3">
                    <p className="font-heading font-extrabold text-xl text-primary">248</p>
                    <p className="text-xs text-background/60 mt-0.5">Active riders</p>
                  </div>
                  <div className="bg-background/5 rounded-xl p-3">
                    <p className="font-heading font-extrabold text-xl text-primary">KES 1.2M</p>
                    <p className="text-xs text-background/60 mt-0.5">Collected this month</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {['Stage fees \u2014 248 paid', 'Welfare fund \u2014 KES 84,500', 'Boda loan repayments \u2014 12 active'].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 bg-background/5 rounded-lg px-3 py-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0" strokeWidth={3} />
                      <span className="text-xs text-background/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right \u2014 copy */}
          <div className="order-1 lg:order-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">FOR BODA BODA SACCOs &amp; CHAMAS</span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight mt-3">
              Run your boda boda SACCO like a real business
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              BodaSure gives boda boda SACCOs and chamas the tools to manage riders,
              collect stage fees and contributions digitally, and unlock new income
              streams, all while giving your members the digital wallet and
              compliance tools they need to ride without interruption.
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