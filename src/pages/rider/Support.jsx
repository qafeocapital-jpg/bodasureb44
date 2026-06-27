import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Headphones, Phone, Mail, MessageCircle, ChevronDown, ShieldCheck, Wallet, Bike, Gavel } from 'lucide-react';

const faqs = [
  {
    q: 'How do I activate my wallet?',
    a: 'Go to Wallet → Activate Wallet. You\'ll need to verify your phone number via OTP, set a 4-digit PIN, and complete KYC verification. Once approved, your wallet will be active and ready to use.',
  },
  {
    q: 'How do I collect fares from passengers?',
    a: 'Tap "Collect Fare" on your home screen or go to Lipisha. Enter the passenger\'s phone number and the fare amount. They\'ll receive an M-Pesa STK push to complete the payment.',
  },
  {
    q: 'What are the wallet transaction limits?',
    a: 'Tier 0 (no KYC): KES 3,000 daily limit. Tier 1 (ID uploaded): KES 30,000 daily. Tier 2 (KYC approved): KES 100,000 daily. Upgrade your KYC to increase limits.',
  },
  {
    q: 'How do I pay for my county operating permit?',
    a: 'Go to "Pay License" on your home screen. Select your bike and billing cycle (weekly, monthly, quarterly, or yearly). The fee is deducted from your wallet and a permit is generated instantly.',
  },
  {
    q: 'What if I forget my wallet PIN?',
    a: 'Contact BodaSure support via the phone number below. After identity verification, your PIN will be reset and you\'ll be prompted to set a new one on your next wallet transaction.',
  },
  {
    q: 'How do I file a dispute for a transaction?',
    a: 'Go to Disputes → File New, or open the transaction in your wallet and tap "Report a Problem". Select the category, describe the issue, and our team will review it within 48 hours.',
  },
  {
    q: 'How do I register my bike?',
    a: 'Go to My Bikes → Register Bike. Enter the plate number, make, model, and upload the logbook and bike photos. Your county enforcement team will review and approve it.',
  },
  {
    q: 'What happens if I don\'t pay my penalties?',
    a: 'Unpaid penalties may result in your operating permit being suspended. Pay penalties promptly from the Compliance page using your wallet balance.',
  },
];

const contactOptions = [
  { icon: Phone, label: 'Call Us', value: '0701 200 500', desc: 'Mon–Sat 7am–8pm', color: 'bg-green-50 text-green-600' },
  { icon: Mail, label: 'Email', value: 'help@bodasure.com', desc: 'Response within 24 hours', color: 'bg-blue-50 text-blue-600' },
  { icon: MessageCircle, label: 'WhatsApp', value: '+254 701 200 500', desc: 'Chat with support', color: 'bg-emerald-50 text-emerald-600' },
];

const quickLinks = [
  { icon: Wallet, label: 'Wallet Help', path: '/app/wallet' },
  { icon: Bike, label: 'Bike Registration', path: '/app/bikes/register' },
  { icon: ShieldCheck, label: 'Compliance', path: '/app/compliance' },
  { icon: Gavel, label: 'File a Dispute', path: '/app/disputes' },
];

export default function Support() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Help & Support</h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-orange-600 text-primary-foreground rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <p className="font-heading font-bold text-lg">How can we help?</p>
            <p className="text-xs text-orange-100">We're here to support you 24/7</p>
          </div>
        </div>
      </div>

      {/* Contact Options */}
      <h2 className="text-sm font-heading font-bold mb-3">Contact Us</h2>
      <div className="space-y-2 mb-6">
        {contactOptions.map((c, i) => (
          <a
            key={i}
            href={c.icon === Phone ? `tel:${c.value.replace(/\s/g, '')}` : c.icon === Mail ? `mailto:${c.value}` : `https://wa.me/${c.value.replace(/[^\d]/g, '')}`}
            target={c.icon === MessageCircle ? '_blank' : undefined}
            rel={c.icon === MessageCircle ? 'noopener noreferrer' : undefined}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <span className="text-sm font-semibold text-primary">{c.value}</span>
          </a>
        ))}
      </div>

      {/* Quick Links */}
      <h2 className="text-sm font-heading font-bold mb-3">Quick Help</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickLinks.map((link, i) => (
          <button
            key={i}
            onClick={() => navigate(link.path)}
            className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl py-4 hover:bg-accent transition-colors"
          >
            <link.icon className="w-6 h-6 text-primary" />
            <span className="text-xs font-medium text-center">{link.label}</span>
          </button>
        ))}
      </div>

      {/* FAQ */}
      <h2 className="text-sm font-heading font-bold mb-3">Frequently Asked Questions</h2>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-medium">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
            </button>
            {expandedFaq === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">BodaSure · Mint Mobitech · Support available 7 days a week</p>
    </div>
  );
}