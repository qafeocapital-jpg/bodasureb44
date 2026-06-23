const COLORS = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  grey: 'bg-muted text-muted-foreground',
};

export default function SignalBadge({ color = 'grey', children }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${COLORS[color] || COLORS.grey}`}>
      {children}
    </span>
  );
}