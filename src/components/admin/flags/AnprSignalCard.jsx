import { Loader2, RotateCw } from 'lucide-react';
import SignalBadge from '@/components/admin/flags/SignalBadge';
import ConfidenceBar from '@/components/admin/flags/ConfidenceBar';

export default function AnprSignalCard({ result, loading, registeredPlate, onRecheck }) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Checking plate recognition…</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Plate recognition unavailable</span>
        <button onClick={onRecheck} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          <RotateCw className="w-3 h-3" /> Re-check
        </button>
      </div>
    );
  }

  const score = result.score || 0;
  const scoreColor = score >= 0.85 ? 'green' : score >= 0.70 ? 'amber' : 'red';
  const scoreLabel = score >= 0.85 ? 'High Confidence' : score >= 0.70 ? 'Medium' : 'Low Confidence';
  const matchColor = result.match ? 'green' : 'red';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold">ANPR Signal (Plate Recognizer)</h4>
        <button onClick={onRecheck} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
          <RotateCw className="w-3 h-3" /> Re-check
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Detected:</span>
        <span className="text-xs font-mono font-bold">{result.detectedPlate || '—'}</span>
        <SignalBadge color={matchColor}>{result.match ? '✅ Match' : '❌ Mismatch'}</SignalBadge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Registered:</span>
        <span className="text-xs font-mono">{registeredPlate}</span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold">{(score * 100).toFixed(0)}%</span>
            <SignalBadge color={scoreColor}>{scoreLabel}</SignalBadge>
          </div>
        </div>
        <ConfidenceBar value={score} color={scoreColor} />
      </div>
      {!result.match && result.reason && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">{result.reason}</p>
      )}
    </div>
  );
}