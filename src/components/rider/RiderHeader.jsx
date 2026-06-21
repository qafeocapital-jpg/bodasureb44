import { Bell } from 'lucide-react';

export default function RiderHeader() {
  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] z-50 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-extrabold text-lg">B</span>
          </div>
          <h1 className="font-heading font-bold text-lg tracking-tight">
            <span className="text-foreground">Boda</span>
            <span className="text-primary">Sure</span>
          </h1>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>
    </header>
  );
}