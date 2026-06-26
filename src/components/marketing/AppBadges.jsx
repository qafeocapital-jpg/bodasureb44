import { Smartphone, Download } from 'lucide-react';

export default function AppBadges() {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <div className="flex items-center gap-3 bg-foreground text-background rounded-xl px-5 py-3">
        <Download className="w-6 h-6" />
        <div className="text-left">
          <p className="text-[9px] uppercase tracking-wider text-background/60">Download on the</p>
          <p className="text-sm font-bold">App Store</p>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-foreground text-background rounded-xl px-5 py-3">
        <Smartphone className="w-6 h-6" />
        <div className="text-left">
          <p className="text-[9px] uppercase tracking-wider text-background/60">Get it on</p>
          <p className="text-sm font-bold">Google Play</p>
        </div>
      </div>
    </div>
  );
}