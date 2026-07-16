import { useEffect } from 'react';
import { Lock, ShieldCheck, Scale, ClipboardList, KeyRound, Server } from 'lucide-react';
import Hero from '@/components/marketing/Hero';
import FeatureGrid from '@/components/marketing/FeatureGrid';

const FEATURES = [
  { icon: Lock, title: 'Data Encryption', description: 'AES-256 encryption at rest and TLS 1.3 in transit. Your data is protected to banking-grade standards at every layer.' },
  { icon: ShieldCheck, title: 'Identity Verification', description: 'AI-powered ID verification with liveness checks. Every rider is verified against national ID records before activation.' },
  { icon: Scale, title: 'Regulatory Compliance', description: 'Aligned with Central Bank of Kenya (CBK) guidelines and fully compliant with the Kenya Data Protection Act 2019.' },
  { icon: ClipboardList, title: 'Audit Trails', description: 'Every action — every login, transaction, and data access — is logged immutably. Full transparency for regulators and auditors.' },
  { icon: KeyRound, title: 'Wallet Security', description: 'PIN + biometric authentication, multi-factor auth, and transaction limits. Your wallet is protected at every step.' },
  { icon: Server, title: 'Infrastructure', description: 'Cloud-hosted on enterprise-grade infrastructure with 99.9% uptime SLA, automated failover, and continuous monitoring.' },
];

export default function Security() {
  useEffect(() => { document.title = 'Security | BodaSure'; }, []);

  return (
    <>
      <Hero
        title="Enterprise-Grade Security for Kenya's Most Important Transport Sector"
        subtitle="BodaSure is built to banking-grade security standards. From data encryption to identity verification, every layer is designed to protect riders, SACCOs, and counties."
      />

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Security at Every Layer</h2>
            <p className="mt-4 text-lg text-muted-foreground">From the data center to the rider's phone — security is not a feature, it's the foundation.</p>
          </div>
          <FeatureGrid features={FEATURES} columns={3} />
        </div>
      </section>

      {/* Compliance badges */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight mb-8">Compliance &amp; Certifications</h2>
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
            {['CBK Guidelines', 'Data Protection Act 2019', 'AML/KYC Compliant', 'ISO 27001 Aligned'].map((cert, i) => (
              <div key={i} className="bg-card border border-border rounded-xl px-5 py-3">
                <span className="text-sm font-bold">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}