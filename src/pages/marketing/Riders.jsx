import { useEffect } from 'react';
import { Wallet, Building2, QrCode, UserCheck, Smartphone, Shield, Banknote, TrendingUp, Users, HeartPulse } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import FeatureGrid from '@/components/marketing/FeatureGrid';
import CTASection from '@/components/marketing/CTASection';
import AppBadges from '@/components/marketing/AppBadges';
import StatStrip from '@/components/marketing/StatStrip';

const FEATURES = [
  { icon: Wallet, title: 'BodaSure Wallet', description: 'Your digital wallet for everything. Collect fare from passengers, send money, pay bills — all from your phone.' },
  { icon: Building2, title: 'Pay County Fees Digitally', description: 'Pay your county permit fee from the app. Get a digital permit instantly. No queues, no cash, no harassment.' },
  { icon: QrCode, title: 'Digital Permit & QR Code', description: 'Your permit lives on your phone. Show it to any officer with one tap. Verifiable, tamper-proof, always with you.' },
  { icon: UserCheck, title: 'Lipa Owner', description: "Riding someone else's bike? Pay the owner their daily or weekly cut directly from the app. No more disputes." },
  { icon: Smartphone, title: 'Collect Fare (Lipisha)', description: 'Accept fare payments from passengers digitally. Build a transaction history that unlocks loans and financial products.' },
  { icon: Shield, title: 'Insurance', description: 'Get affordable motorbike insurance in minutes. Annual and daily cover options from trusted partners.' },
  { icon: Banknote, title: 'Loans & Credit', description: 'Your transaction history on BodaSure builds your credit score. Access loans from our partner lenders — no collateral needed.' },
  { icon: TrendingUp, title: 'Investment Opportunities', description: 'Put your earnings to work. Access unit trust and savings products from our investment partners.' },
  { icon: Users, title: 'Chama Contributions', description: 'Join or start a digital chama with fellow riders. Contribute and earn together — no paperwork, no disputes.' },
  { icon: HeartPulse, title: 'Health Cover', description: 'Affordable health insurance plans for riders and their families. Pay monthly from your wallet.' },
];

export default function Riders() {
  useEffect(() => { document.title = 'BodaSure for Riders — Ride. Earn. Grow.' }, []);

  return (
    <>
      <Hero
        title="Ride. Earn. Grow."
        subtitle="BodaSure is your all-in-one app for operating legally, getting paid faster, and accessing financial services built for BodaBoda riders."
        primaryCta={{ text: 'Sign Up Free', to: '/register' }}
      />

      <StatStrip
        stats={[
          { value: 'Free', label: 'To Join' },
          { value: 'Instant', label: 'Digital Permits' },
          { value: 'No', label: 'Collateral Loans' },
          { value: '24/7', label: 'Wallet Access' },
        ]}
      />

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Everything You Need to Thrive</h2>
            <p className="mt-4 text-lg text-muted-foreground">From collecting fares to accessing loans — BodaSure is built for the rider's journey.</p>
          </div>
          <FeatureGrid features={FEATURES} columns={2} />
        </div>
      </section>

      <CTASection
        title="Join 2 million riders building a better future with BodaSure"
        subtitle="Download the app and sign up free. Start collecting fares, paying permits, and building your financial future today."
      >
        <AppBadges />
      </CTASection>
    </>
  );
}