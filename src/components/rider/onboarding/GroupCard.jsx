import { Users, Shield, Check, ChevronRight, Loader2 } from 'lucide-react';

export default function GroupCard({ group, isExpanded, onToggle, onSelect, isJoined, isMuted, isJoining }) {
  const isIndependent = group.is_system_group || group.type === 'independent';

  const iconBg = isIndependent ? 'bg-orange-50' : 'bg-blue-50';
  const iconColor = isIndependent ? 'text-orange-600' : 'text-blue-600';
  const Icon = isIndependent ? Shield : Users;
  const badgeClasses = isIndependent
    ? 'bg-orange-50 text-orange-700'
    : 'bg-blue-50 text-blue-700';
  const badgeLabel = isIndependent ? 'Independent' : 'SACCO';
  const cardBorder = isIndependent ? 'border-orange-300 border-l-4' : 'border-border';
  const subLabel = isIndependent
    ? "I'm not a Member of Any Sacco / Welfare / Self Help Group"
    : (group.constituency_hint || 'Kisumu County');

  return (
    <div className={`relative bg-card border rounded-xl overflow-hidden transition-all ${cardBorder} ${isMuted ? 'opacity-50 pointer-events-none' : ''}`}>
      {isJoined && (
        <div className="absolute top-2 right-2 z-10">
          <span className="flex items-center gap-1 text-xs text-success font-semibold bg-success/10 rounded-full px-2 py-1">
            <Check className="w-3.5 h-3.5" /> Joined
          </span>
        </div>
      )}

      <button
        onClick={onToggle}
        disabled={isMuted}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{group.name}</p>
          <p className="text-[10px] text-muted-foreground">{subLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIndependent && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3 h-3" /> {group.member_count || 0}
            </span>
          )}
          <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${badgeClasses}`}>
            {badgeLabel}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-accent/50 border-t border-border p-3 space-y-2 animate-fade-in">
          {isIndependent && (
            <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" /> Auto-approved — no review needed
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {group.description || `Bodaboda ${badgeLabel} serving riders in ${group.constituency_hint || 'Kisumu County'}`}
          </p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>Members: {group.member_count || 0}</span>
            {group.constituency_hint && <span>Constituency: {group.constituency_hint}</span>}
          </div>

          {isJoined ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-1 border border-success/30 text-success bg-success/5 rounded-xl py-2.5 text-sm font-semibold"
            >
              <Check className="w-4 h-4" /> Currently Selected
            </button>
          ) : isJoining ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold opacity-70"
            >
              <Loader2 className="w-4 h-4 animate-spin" /> Joining...
            </button>
          ) : (
            <button
              onClick={onSelect}
              className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold"
            >
              Select this Group <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}