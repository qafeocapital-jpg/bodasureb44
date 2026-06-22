import { useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, User, QrCode } from 'lucide-react';
import { formatDate } from '@/lib/format';

export default function OfficerModeOverlay({
  open,
  onClose,
  user,
  vehicle,
  permit,
  group,
  kycDocs,
  tier,
}) {
  const verifyUrl = useMemo(() => {
    if (!user?.id) return '';
    return `${window.location.origin}/verify/${user.id}`;
  }, [user?.id]);

  if (!open) return null;

  // Officer mode only accessible to enforcement officers
  const isOfficer = user?.role?.includes('officer') || user?.role?.includes('admin');
  if (!isOfficer) return null;

  const selfiDoc = kycDocs?.find(d => d.document_type === 'selfie' && d.file_url);
  const isCompliant = tier === 'Fully Verified' || tier === 'Road-Ready';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              BodaSure
            </p>
            <p className="text-sm font-bold text-foreground">Official Compliance Check</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rider Photo */}
        <div className="flex justify-center mb-6">
          {selfiDoc?.file_url ? (
            <img
              src={selfiDoc.file_url}
              alt={user?.full_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-primary"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary">
              <User className="w-16 h-16 text-primary" />
            </div>
          )}
        </div>

        {/* Rider Info */}
        <div className="text-center mb-6 space-y-2">
          <h2 className="text-2xl font-heading font-bold">{user?.full_name}</h2>
          <p className="text-sm text-muted-foreground">ID: {user?.national_id}</p>
        </div>

        {/* Plate Chip */}
        {vehicle?.plate_number && (
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-3 text-center border-2 border-amber-300 mb-6">
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest">
              License Plate
            </p>
            <p className="text-3xl font-mono font-bold text-amber-900 mt-2">
              {vehicle.plate_number}
            </p>
          </div>
        )}

        {/* SACCO & Permit Info */}
        <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-2 text-sm">
          {group?.name && (
            <>
              <p className="text-xs text-muted-foreground font-semibold">GROUP</p>
              <p className="font-semibold">{group.name}</p>
            </>
          )}
          {permit && permit.end_date ? (
            <>
              <p className="text-xs text-muted-foreground font-semibold mt-3">PERMIT VALID UNTIL</p>
              <p className="font-semibold">{formatDate(permit.end_date)}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No active permit</p>
          )}
        </div>

        {/* Compliance Status */}
        <div
          className={`rounded-xl p-4 mb-6 flex items-center justify-center gap-2 ${
            isCompliant
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {isCompliant ? (
            <>
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-lg font-bold">COMPLIANT</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6" />
              <span className="text-lg font-bold">NOT COMPLIANT</span>
            </>
          )}
        </div>

        {/* Verification Link */}
        {verifyUrl && (
          <div className="flex justify-center mb-6 bg-muted/50 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2 text-center">
              <QrCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Scan to Verify</p>
                <p className="text-xs text-primary font-mono break-all">{verifyUrl}</p>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-muted text-foreground rounded-xl py-3 font-semibold text-sm hover:bg-accent transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}