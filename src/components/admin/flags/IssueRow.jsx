import { useState } from 'react';
import { Check, X, Loader2, ChevronRight, Link2, Pencil } from 'lucide-react';
import { timeAgo } from '@/lib/format';

const FLAG_TYPE_LABELS = {
  kyc_pending: 'KYC Pending',
  kyc_rejected: 'KYC Rejected',
  vehicle_pending: 'Vehicle Pending',
  vehicle_rejected: 'Vehicle Rejected',
  vehicle_needs_review: 'Vehicle Review',
  unlinked: 'Wallet Unlinked',
  wallet_needs_review: 'Wallet Review',
  location_flagged: 'Stage Location',
  duplicate: 'Duplicate Stage',
  plate: 'Invalid Plate',
};

const COMPLEX_TYPES = new Set([
  'kyc_rejected',
  'vehicle_rejected',
  'vehicle_needs_review',
  'wallet_needs_review',
  'location_flagged',
  'duplicate',
]);

export default function IssueRow({ issue, isResolved, onAction, onOpenDrawer, onOpenUserDrawer }) {
  const [showRejectField, setShowRejectField] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editingPlate, setEditingPlate] = useState(false);
  const [plateValue, setPlateValue] = useState(issue.entityName);
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isComplex = COMPLEX_TYPES.has(issue.type);
  const isError = issue.severity === 'error';
  const borderColor = isError ? 'border-l-red-500' : 'border-l-amber-500';
  const chipColor = isError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';

  async function handleActionWithLoading(action, params) {
    setActionLoading(true);
    const result = await onAction(action, params);
    setActionLoading(false);
    return result;
  }

  async function handleLinkSasapay() {
    setLinking(true);
    setLinkResult(null);
    const result = await onAction('linkSasapay', { issue });
    setLinking(false);
    setLinkResult(result ? 'success' : 'error');
  }

  return (
    <div
      className={`bg-card border border-border border-l-4 ${borderColor} rounded-xl p-4 flex items-start gap-3 ${
        isResolved ? 'opacity-40' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${chipColor}`}>
            {FLAG_TYPE_LABELS[issue.type] || issue.type}
          </span>
          <span className={`text-sm font-semibold ${isResolved ? 'line-through' : ''}`}>
            {editingPlate ? (
              <input
                type="text"
                value={plateValue}
                onChange={(e) => setPlateValue(e.target.value.toUpperCase())}
                className="px-2 py-0.5 rounded border border-input bg-background text-sm font-mono w-32"
                autoFocus
              />
            ) : (
              issue.entityName
            )}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{issue.description}</p>
        <div className="flex items-center gap-2 mt-1">
          {issue.riderId && issue.riderName !== '—' ? (
            <button
              onClick={() => onOpenUserDrawer(issue)}
              className="text-xs text-primary font-medium hover:underline"
            >
              {issue.riderName}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">{issue.riderName || '—'}</span>
          )}
          {issue.createdAt && (
            <span className="text-[10px] text-muted-foreground">· {timeAgo(issue.createdAt)}</span>
          )}
        </div>
      </div>

      {!isResolved && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* KYC Pending — inline Approve + Reject */}
          {issue.type === 'kyc_pending' && !showRejectField && (
            <>
              <button
                onClick={() => handleActionWithLoading('approveKyc', { issue })}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50"
              >
                {actionLoading ? '...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectField(true)}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => onOpenDrawer(issue)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted flex items-center gap-0.5"
              >
                Review <ChevronRight className="w-3 h-3" />
              </button>
              </>
          )}
          {issue.type === 'kyc_pending' && showRejectField && (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason..."
                autoFocus
                className="text-xs px-2 py-1 rounded border border-input bg-background w-40"
              />
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    handleActionWithLoading('rejectKyc', {
                      issue,
                      rejectionReason: rejectReason,
                    })
                  }
                  disabled={actionLoading || !rejectReason.trim()}
                  className="text-xs px-2 py-1 rounded bg-red-500 text-white font-medium disabled:opacity-50"
                >
                  {actionLoading ? '...' : 'Confirm'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectField(false);
                    setRejectReason('');
                  }}
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Vehicle Pending — inline Approve + Reject */}
          {issue.type === 'vehicle_pending' && (
            <>
              <button
                onClick={() => handleActionWithLoading('approveVehicle', { issue })}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50"
              >
                {actionLoading ? '...' : 'Approve'}
              </button>
              <button
                onClick={() => handleActionWithLoading('rejectVehicle', { issue })}
                disabled={actionLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading ? '...' : 'Reject'}
              </button>
              <button
                onClick={() => onOpenDrawer(issue)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted flex items-center gap-0.5"
              >
                Review <ChevronRight className="w-3 h-3" />
              </button>
            </>
          )}

          {/* Wallet Unlinked — inline Link SasaPay */}
          {issue.type === 'unlinked' && (
            <>
              {linking && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {linkResult === 'success' && <Check className="w-4 h-4 text-green-600" />}
              {linkResult === 'error' && <X className="w-4 h-4 text-red-500" />}
              {linkResult !== 'success' && (
                <button
                  onClick={handleLinkSasapay}
                  disabled={linking}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" /> {linking ? 'Linking...' : 'Link SasaPay'}
                </button>
              )}
            </>
          )}

          {/* Plate Invalid — inline Edit + Flag for Rider */}
          {issue.type === 'plate' && (
            <>
              {editingPlate ? (
                <>
                  <button
                    onClick={() =>
                      handleActionWithLoading('editPlate', {
                        issue,
                        newPlate: plateValue.toUpperCase(),
                      })
                    }
                    disabled={actionLoading || !plateValue.trim()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
                  >
                    {actionLoading ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPlate(false);
                      setPlateValue(issue.entityName);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingPlate(true)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleActionWithLoading('flagVehicleForRider', { issue })}
                    disabled={actionLoading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-amber-500 text-amber-600 font-medium hover:bg-amber-50 disabled:opacity-50"
                  >
                    {actionLoading ? '...' : 'Flag for Rider'}
                  </button>
                </>
              )}
            </>
          )}

          {/* Complex types — Review button */}
          {isComplex && (
            <button
              onClick={() => onOpenDrawer(issue)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted flex items-center gap-0.5"
            >
              Review <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}