import { useState } from 'react';
import SignalBadge from '@/components/admin/flags/SignalBadge';

const DOC_TYPE_LABELS = {
  id_front: 'ID (Front)',
  id_back: 'ID (Back)',
  selfie: 'Selfie',
  logbook: 'Logbook',
  owner_id: 'Owner ID',
  bike_front: 'Bike (Front)',
  bike_left: 'Bike (Left)',
  bike_rear: 'Bike (Rear)',
  bike_right: 'Bike (Right)',
};

const STATUS_COLORS = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
};

export default function KycDocCard({ doc, localStatus, isHighlighted, onImageClick, onDecision, acting }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const status = localStatus || doc.status;

  return (
    <div
      className={`bg-card border rounded-xl p-3 space-y-2 ${
        isHighlighted ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      <button
        onClick={onImageClick}
        className="block w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
      >
        {doc.file_url ? (
          <img src={doc.file_url} alt={doc.document_type} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </button>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
        <SignalBadge color={STATUS_COLORS[status] || 'grey'}>{status}</SignalBadge>
      </div>
      {status === 'pending' && !showReject && (
        <div className="flex gap-1">
          <button
            onClick={() => onDecision(doc, 'approved')}
            disabled={acting}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-green-600 text-green-700 font-medium hover:bg-green-50 disabled:opacity-50"
          >
            {acting ? '...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={acting}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-red-500 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
      {status === 'pending' && showReject && (
        <div className="space-y-1.5">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (min 10 chars)..."
            rows={2}
            autoFocus
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-1">
            <button
              onClick={() => onDecision(doc, 'rejected', reason)}
              disabled={acting || reason.trim().length < 10}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-red-500 text-white font-medium disabled:opacity-50"
            >
              {acting ? '...' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setReason('');
              }}
              className="text-xs px-2 py-1.5 rounded-lg border border-border text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}