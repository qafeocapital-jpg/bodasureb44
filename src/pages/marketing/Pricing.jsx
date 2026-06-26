import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Bike, Check, ArrowRight } from 'lucide-react';
import Hero from '@/components/marketing/Hero';

const TIERS = [
  {
    icon: Building2,
    name: 'Counties',
    price: 'Custom',
    priceNote: 'Contact sales for pricing',
    description: 'Full compliance and revenue platform for county governments.',
    features: [
      'Unlimited rider registration',
      'Full compliance suite (ID, ANPR, permits)',
      'Revenue collection & settlement dashboard',
      'Geo-mapping of all stages & wards',
      'Enforcement officer tools',
      'Dedicated account support',
    ],
    ctaText: 'Request a Demo',
    ctaLink: '/counties',
    highlighted: false,
  },
  {
    icon: Users,
    name: 'SACCOs',
    price: 'Free',
    priceNote: 'Revenue-share on transactions',
    description: 'Everything SACCOs need to manage members and grow revenue.',
    features: [
      'Member management & onboarding',
      'Group wallet & settlements',
      'Digital contribution collection',
      'SMS communication tools',
      'Compliance dashboard',
      'Chama & welfare fund management',
    ],
    ctaText: 'Register Your SACCO',
    ctaLink: '/register',
    highlighted: true,
  },
  {
    icon: Bike,
    name: 'Riders',
    price: 'Free',
    priceNote: 'Premium: KES 99/month',
    description: 'All essential tools for BodaBoda riders to operate and grow.',
    features: [
      'BodaSure digital wallet',
      'Digital permits & QR codes',
      'Pay county fees digitally',
      'Lipisha fare collection',
      'Motorbike insurance access',
      'Premium: Loans, investments & health cover',
    ],
    ctaText: 'Sign Up Free',
    ctaLink: '/register',
    highlighted: false,
  },
];

export default function Pricing() {
  useEffect(() => { document.title = 'Pricing | BodaSure'; }, []);

  return (
    <>
      <Hero
        title="Simple, transparent pricing"
        subtitle="BodaSure is free for riders and SACCOs. Counties get custom pricing tailored to their needs. No hidden fees, ever."
      />

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {TIERS.map((tier, i) => {
              const Icon = tier.icon;
              return (
                <div
                  key={i}
                  className={`relative bg-card border rounded-2xl p-8 flex flex-col ${
                    tier.highlighted ? 'border-primary shadow-xl shadow-primary/10 lg:scale-105' : 'border-border'
                  }`}
                >
                  {tier.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-extrabold text-xl mb-1">{tier.name}</h3>
                  <div className="mb-1">
                    <span className="font-heading font-extrabold text-4xl">{tier.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{tier.priceNote}</p>
                  <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={tier.ctaLink}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${
                      tier.highlighted
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'border border-border hover:bg-accent'
                    }`}
                  >
                    {tier.ctaText} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}