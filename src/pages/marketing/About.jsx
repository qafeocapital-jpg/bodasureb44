import { useEffect } from 'react';
import { Target, Shield, Lock, Users, Lightbulb, Heart, Mail, Phone, MapPin } from 'lucide-react';
import Hero from '@/components/marketing/Hero';

const VALUES = [
  { icon: Heart, title: 'Dignity', description: 'We treat every rider as a professional deserving of respect, not a statistic to be managed.' },
  { icon: Lock, title: 'Transparency', description: 'Every transaction, every fee, every decision — visible and auditable. No hidden costs, no surprises.' },
  { icon: Shield, title: 'Security', description: 'Enterprise-grade encryption, identity verification, and compliance. Your data and money are safe.' },
  { icon: Users, title: 'Inclusion', description: 'Financial services for the unbanked and underserved. Everyone deserves access to the digital economy.' },
  { icon: Lightbulb, title: 'Innovation', description: "We build technology that solves real problems for real people — not features for features' sake." },
];

export default function About() {
  useEffect(() => { document.title = 'About BodaSure — Our Mission & Team'; }, []);

  return (
    <>
      <Hero
        title="We exist to dignify, protect, and empower."
        subtitle="We exist to dignify, protect, and empower the BodaBoda rider — and to give Kenya's counties the tools to govern the sector with dignity and data."
      />

      {/* Mission */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-heading font-extrabold text-3xl tracking-tight">Our Mission</h2>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Kenya's BodaBoda sector moves millions of people and generates billions of shillings every day — yet it runs on cash,
            paper, and trust. Riders face harassment, counties lose revenue, and SACCOs struggle with manual processes. BodaSure
            changes that. We're building the digital infrastructure to bring this entire ecosystem online — connecting counties,
            SACCOs, and riders on one trusted platform.
          </p>
        </div>
      </section>

      {/* Founding story */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading font-extrabold text-3xl tracking-tight mb-6">Our Story</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            BodaSure was born from a simple observation: the BodaBoda economy is one of Kenya's largest informal sectors, yet it
            operates entirely without digital infrastructure. Riders can't access credit. Counties can't track compliance. SACCOs
            can't collect contributions efficiently. We set out to build a platform that serves all three — a single app that
            connects the entire ecosystem, from the county revenue officer to the rider on the street.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mt-4">
            Today, BodaSure is on a mission to digitize the BodaBoda economy across all 47 counties — one rider, one SACCO,
            one county at a time.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Our Values</h2>
            <p className="mt-4 text-lg text-muted-foreground">The principles that guide everything we build.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((value, i) => {
              const Icon = value.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-base mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team placeholder */}
      <section className="bg-accent py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">Our Team</h2>
            <p className="mt-4 text-lg text-muted-foreground">Builders, operators, and changemakers passionate about Kenya's digital future.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-heading font-bold text-sm">Team Member</h3>
                <p className="text-xs text-muted-foreground mt-1">Role &amp; Title</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading font-extrabold text-3xl tracking-tight mb-8 text-center">Get in Touch</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">Email</p>
              <a href="mailto:hello@bodasure.co.ke" className="text-xs text-muted-foreground hover:text-primary">hello@bodasure.co.ke</a>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <Phone className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">Phone</p>
              <p className="text-xs text-muted-foreground">+254 700 000 000</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">Office</p>
              <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}