import { useEffect } from 'react';
import { Users, Wallet, TrendingUp, ClipboardCheck, Landmark, MessageSquare, Map, HeartHandshake } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import StatStrip from '@/components/marketing/StatStrip';
import FeatureGrid from '@/components/marketing/FeatureGrid';
import CTASection from '@/components/marketing/CTASection';

const FEATURES = [
  { icon: Users, title: 'Member Management', description: 'Digital membership register with verified rider profiles. Approve, suspend, or transfer members instantly.' },
  { icon: Wallet, title: 'Digital Contribution Collection', description: 'Members pay monthly contributions directly from their BodaSure Wallet. Zero cash handling, zero leakage.' },
  { icon: TrendingUp, title: 'SACCO Revenue Streams', description: 'Earn from member transactions: advertisements on rider profiles, event hosting, group insurance, welfare fund management, and more.' },
  { icon: ClipboardCheck, title: 'Compliance Dashboard', description: 'Know which members are compliant with county permits, insurance, and contributions at a glance.' },
  { icon: Landmark, title: 'Group Wallet & Settlements', description: 'Your SACCO has its own group wallet. Receive, hold, and disburse funds digitally with full audit trails.' },
  { icon: MessageSquare, title: 'Communication Tools', description: 'Send SMS announcements to all members instantly. Run bulk campaigns for meetings, events, or compliance reminders.' },
  { icon: Map, title: 'Stage & Ward Mapping', description: 'See exactly where your members operate. Map-based view of all stages and active riders under your SACCO.' },
  { icon: HeartHandshake, title: 'Chama & Welfare Fund Management', description: 'Run digital welfare funds and chamas within your SACCO. Members contribute and claim benefits without paperwork.' },
];

export default function Saccos() {
  useEffect(() => { document.title = 'BodaSure for SACCOs — Manage, Collect, Grow'; }, []);

  return (
    <>
      <Hero
        title="Your SACCO. Digitized. Empowered. Growing."
        subtitle="BodaSure gives SACCO officials the tools to manage members, collect contributions, and grow revenues — all from one app."
        primaryCta={{ text: 'Register Your SACCO', to: '/register' }}
      />

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Tools for Modern SACCOs</h2>
            <p className="mt-4 text-lg text-muted-foreground">Replace paper registers and cash boxes with a digital platform built for BodaBoda SACCOs.</p>
          </div>
          <FeatureGrid features={FEATURES} columns={4} />
        </div>
      </section>

      <StatStrip
        dark
        stats={[
          { value: '0', label: 'Cash Handling' },
          { value: '100%', label: 'Digital Audit Trail' },
          { value: 'Instant', label: 'Member Onboarding' },
          { value: 'Free', label: 'To Join BodaSure' },
        ]}
      />

      <CTASection
        title="Join hundreds of SACCOs already on BodaSure"
        subtitle="Register your SACCO today and start managing members, collecting contributions, and growing your revenue — all digitally."
        ctaText="Register Your SACCO"
        ctaLink="/register"
      />
    </>
  );
}