import { Construction } from 'lucide-react';

export default function ComingSoon({ title, description }) {
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-[#ff5a1f]" />
        </div>
        <h1 className="text-2xl font-heading font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-orange-50 text-[#ff5a1f] rounded-full px-4 py-1.5 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#ff5a1f] animate-pulse" />
          Coming Soon
        </div>
      </div>
    </div>
  );
}