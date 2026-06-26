import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function AudienceCards({ cards }) {
  return (
    <div className="grid sm:grid-cols-3 gap-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Link
            key={i}
            to={card.link}
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-200 flex flex-col"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
              <Icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{card.description}</p>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
              Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}