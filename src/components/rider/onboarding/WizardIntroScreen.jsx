import { X, ArrowRight } from 'lucide-react';

const BENEFITS = [
  { emoji: '🏦', label: 'Loans', sub: 'Bike, fuel & emergency cash' },
  { emoji: '🏛️', label: 'County Recognition', sub: 'Official digital permit' },
  { emoji: '🤝', label: 'Chama Contributions', sub: 'Group savings & welfare' },
  { emoji: '🛡️', label: 'Insurance', sub: 'Accident & bike cover' },
  { emoji: '💸', label: 'Collect Fares', sub: 'Lipisha digital payments' },
  { emoji: '🌍', label: 'Full Identity', sub: 'Verifiable rider profile' },
];

export default function WizardIntroScreen({ phase, firstName, onBegin, onClose }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const fillPct = (phase / 4) * 100;
  const dashOffset = circumference * (1 - phase / 4);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-600 via-orange-600 to-orange-700">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      <div className="px-6 py-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-6">
          <span className="text-orange-600 font-heading font-black text-2xl">B</span>
        </div>

        {/* Progress ring */}
        <div className="relative w-32 h-32 mb-6">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r={radius} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-heading font-black text-white">{Math.round(fillPct)}%</span>
            <span className="text-[10px] uppercase tracking-wide text-white/70">Setup</span>
          </div>
        </div>

        <h1 className="font-heading font-extrabold text-2xl text-white leading-tight mb-2">
          Welcome, {firstName} —<br />let's get you official.
        </h1>
        <p className="text-sm text-white/80 max-w-xs mb-6">
          Complete your setup to unlock loans, county recognition, Chama savings, insurance, bike & fuel loans, and fare collection.
        </p>

        {/* Benefit chips */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs mb-8">
          {BENEFITS.map(b => (
            <div key={b.label} className="bg-white/10 rounded-xl p-2.5 text-left">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base">{b.emoji}</span>
                <span className="text-xs font-semibold text-white">{b.label}</span>
              </div>
              <p className="text-[10px] text-white/60 leading-tight">{b.sub}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full max-w-xs flex flex-col items-center gap-3">
          <button
            onClick={onBegin}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-orange-600 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
          >
            Begin Setup <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-xs text-white/60 hover:text-white/80 font-medium">
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
}