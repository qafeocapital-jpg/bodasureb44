import { useEffect } from 'react';
import { Building2, ShieldCheck, ScanLine, QrCode, ClipboardCheck, Wallet, Users, UserCheck } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import StatStrip from '@/components/marketing/StatStrip';
import FeatureGrid from '@/components/marketing/FeatureGrid';
import CTASection from '@/components/marketing/CTASection';
import DemoRequestForm from '@/components/marketing/DemoRequestForm';

const FEATURES = [
  { icon: Building2, title: 'Digital Registration & Mapping', description: 'Register every rider and bike by county, sub-county, ward, and stage. Geo-map view of all operators at a glance.' },
  { icon: ShieldCheck, title: 'Automated Identity Verification', description: 'AI-powered ID + selfie verification via IDAnalyzer. Know exactly who is riding in your county.' },
  { icon: ScanLine, title: 'Number Plate Verification (ANPR)', description: 'Automatic number plate recognition cross-checked against NTSA. Catch unregistered or fraudulent bikes instantly.' },
  { icon: QrCode, title: 'Digital Permits & Stickers', description: 'Issue tamper-proof digital permits. Riders display QR codes on their bikes — scannable by enforcement officers in the field.' },
  { icon: ClipboardCheck, title: 'Compliance Tracking & Enforcement', description: 'Real-time compliance scores per rider, per stage, per ward. Officers see who is compliant before stopping anyone.' },
  { icon: Wallet, title: 'Revenue Collection & Settlement', description: 'All county fees collected digitally via the BodaSure Wallet. Automated daily revenue reports and settlement summaries.' },
  { icon: Users, title: 'SACCO & Stage Profiles', description: 'Full visibility into every registered SACCO, welfare group, and stage operating in your county.' },
  { icon: UserCheck, title: 'Rider & Owner Profiles', description: 'Every rider has a verified digital profile with their ID, bike, permit, insurance, and compliance history.' },
];

export default function Counties() {
  useEffect(() => { document.title = 'BodaSure for Counties — Digital BodaBoda Management'; }, []);

  return (
    <>
      <Hero
        title="One Platform. Every Rider. Every Stage. Every Ward."
        subtitle="Give your county complete visibility and control over BodaBoda operations — from registration to revenue collection."
        primaryCta={{ text: 'Request a Demo', to: '#demo' }}
      />

      {/* Features */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Complete County Toolkit</h2>
            <p className="mt-4 text-lg text-muted-foreground">Everything your county needs to digitize and govern the BodaBoda sector.</p>
          </div>
          <FeatureGrid features={FEATURES} columns={4} />
        </div>
      </section>

      <StatStrip
        dark
        stats={[
          { value: '40%', label: 'Revenue Lost to Leakage' },
          { value: '47', label: 'Counties to Digitize' },
          { value: '2M+', label: 'Riders to Register' },
          { value: '100%', label: 'Digital Audit Trail' },
        ]}
      />

      {/* Testimonial */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <blockquote className="text-2xl sm:text-3xl font-heading font-bold leading-relaxed">
            "Counties using manual cash collection lose up to 40% of potential BodaBoda revenue to leakage. BodaSure eliminates that."
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Revenue &amp; Compliance Report, 2024</p>
        </div>
      </section>

      <CTASection
        title="Ready to digitize your county's BodaBoda sector?"
        subtitle="Schedule a live demo with our team. We'll walk you through registration, compliance, and revenue collection — tailored to your county."
      >
        <div id="demo">
          <DemoRequestForm />
        </div>
      </CTASection>
    </>
  );
}