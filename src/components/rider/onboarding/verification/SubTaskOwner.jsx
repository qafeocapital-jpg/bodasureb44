import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { UserCheck, ChevronLeft, Check, AlertTriangle, Loader2, Send, ShieldCheck } from 'lucide-react';
import { normalizePhone, formatPhoneDisplay } from '@/lib/phone';

export default function SubTaskOwner({ user, vehicle, onDataChange, onBack }) {
  const navigate = useNavigate();
  const [ownerPhone, setOwnerPhone] = useState(vehicle?.owner_phone || '');
  const [ownerName, setOwnerName] = useState(vehicle?.owner_name || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const isOwnerRider = vehicle?.is_owner_rider === true;
  const isVerified = isOwnerRider || vehicle?.owner_verified === true;
  const inviteSent = vehicle?.owner_invite_sent_at;

  async function handleSendInvite() {
    const normalized = normalizePhone(ownerPhone);
    if (!normalized) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }
    if (!ownerName.trim()) {
      setError('Please enter the owner\'s name');
      return;
    }
    setSending(true);
    setError('');
    try {
      // FIX 5: Call backend function that sends SMS via Africa's Talking
      await base44.functions.invoke('sendOwnerInvite', {
        vehicleId: vehicle.id,
        ownerPhone: normalized,
        ownerName: ownerName.trim(),
      });

      await onDataChange();
    } catch (e) {
      setError(e.message || 'Failed to send invite');
    }
    setSending(false);
  }

  async function handleResendInvite() {
    setSending(true);
    setError('');
    try {
      // FIX 5: Call backend function to resend SMS
      await base44.functions.invoke('sendOwnerInvite', {
        vehicleId: vehicle.id,
        ownerPhone: vehicle.owner_phone,
        ownerName: vehicle.owner_name,
      });

      await onDataChange();
    } catch (e) {
      setError(e.message);
    }
    setSending(false);
  }

  if (isVerified) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
          <ChevronLeft className="w-4 h-4" /> Back to tasks
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm">Owner Verification</h3>
            <p className="text-[10px] text-muted-foreground">Bike ownership confirmed</p>
          </div>
        </div>
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-center">
          <Check className="w-8 h-8 mx-auto text-success mb-2" />
          <p className="text-sm font-semibold text-success">
            {isOwnerRider ? 'You are the owner of this bike' : 'Owner has verified this bike'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate('/app')} className="bg-muted text-foreground rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center gap-1.5 w-full justify-center">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm">Owner Verification</h3>
          <p className="text-[10px] text-muted-foreground">Invite the bike owner to confirm ownership</p>
        </div>
      </div>

      {/* Bike info */}
      {vehicle && (
        <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
          <span className="text-sm font-semibold">{vehicle.plate_number}</span>
          <span className="text-[10px] text-muted-foreground">{vehicle.make} · {vehicle.color}</span>
        </div>
      )}

      {/* Owner name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Owner Full Name</label>
        <input
          value={ownerName}
          onChange={e => setOwnerName(e.target.value)}
          placeholder="e.g. John Doe"
          disabled={!!inviteSent}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />
      </div>

      {/* Owner phone */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Owner Phone Number</label>
        <input
          value={ownerPhone}
          onChange={e => setOwnerPhone(e.target.value)}
          placeholder="e.g. 0712 345 678"
          disabled={!!inviteSent}
          className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />
      </div>

      {/* Pending state */}
      {inviteSent && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-semibold text-amber-700">Invite Sent</p>
          </div>
          <p className="text-[10px] text-amber-600">
            We've sent an invite to {formatPhoneDisplay(vehicle.owner_phone) || ownerPhone}. 
            The owner will see a "Verify My Bike" section when they log in.
          </p>
          <p className="text-[10px] text-amber-600 mt-1">
            This task stays pending until the owner confirms ownership.
          </p>
          <button
            onClick={handleResendInvite}
            disabled={sending}
            className="text-xs font-semibold text-amber-700 underline mt-1"
          >
            {sending ? 'Resending...' : 'Resend Invite'}
          </button>
        </div>
      )}

      {/* Send invite button */}
      {!inviteSent && (
        <button
          onClick={handleSendInvite}
          disabled={sending || !ownerPhone.trim() || !ownerName.trim()}
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Invite to Owner
        </button>
      )}

      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}