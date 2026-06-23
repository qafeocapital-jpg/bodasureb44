const FILL_COLORS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export default function ConfidenceBar({ value, color = 'green' }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${FILL_COLORS[color] || FILL_COLORS.green}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}