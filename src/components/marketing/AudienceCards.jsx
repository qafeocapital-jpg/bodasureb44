import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function AudienceCards({ cards }) {
  const renderTitle = (title) => {
    const parts = title.split(' ');
    if (parts.length > 1) {
      return (
        <>
          {parts.slice(0, -1).join(' ')} <span className="text-primary">{parts[parts.length - 1]}</span>
        </>
      );
    }
    return title;
  };

  return (
    <div className="grid sm:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <Link
          key={i}
          to={card.link}
          className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/30 transition-all duration-200 flex flex-col"
        >
          <h3 className="font-heading font-bold text-xl mb-3">{renderTitle(card.title)}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">{card.description}</p>
          <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
            {card.cta || 'Learn more'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
}