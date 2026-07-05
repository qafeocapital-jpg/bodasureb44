import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, FlaskConical } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ResetKycCard({ userId, onResetComplete }) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      const res = await base44.functions.invoke('resetKycForTesting', { userId });
      if (res.data?.success) {
        toast({
          title: 'KYC reset complete — rider can re-verify',
          description: `${res.data.cleared_docs || 0} doc(s) cleared, ${res.data.cancelled_permits || 0} provisional permit(s) cancelled.`,
        });
        setConfirmOpen(false);
        if (onResetComplete) onResetComplete();
      } else {
        toast({ title: 'Reset failed', description: res.data?.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Reset failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setResetting(false);
  }

  return (
    <>
      <div className="mt-6 border-2 border-destructive/30 bg-destructive/5 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-destructive">Reset KYC for Testing</h4>
              <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <FlaskConical className="w-2.5 h-2.5" /> TEST ONLY
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Clears all ID verification data and restores the account to <span className="font-semibold">BASIC_ACTIVE</span> (post-wallet activation).
              The rider can then re-run the full KYC flow. The SasaPay wallet is <span className="font-semibold">not</span> recreated — its account number and
              customer ID are preserved.
            </p>
            <button
              onClick={() => setConfirmOpen(true)}
              className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Reset KYC for Testing
            </button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !resetting && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Reset KYC for Testing
            </DialogTitle>
            <DialogDescription>
              This will permanently clear the rider's verification data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs font-bold text-destructive mb-1.5">Will be cleared:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>All KYC documents (ID, selfie, bike photos)</li>
                <li>IDAnalyzer extracted data & confidence scores</li>
                <li>DocuPass session reference & decision</li>
                <li>KYC status → unverified, account_state → BASIC_ACTIVE</li>
                <li>Wallet tier → 1, verification_complete → false</li>
                <li>Active provisional permits cancelled</li>
                <li>KYC attempt counters reset to 0</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-success mb-1.5">Will be preserved:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>SasaPay account number & customer ID</li>
                <li>Wallet PIN, balance, and transactions</li>
                <li>Vehicle registrations & group memberships</li>
                <li>Phone, email, name, national ID, county</li>
                <li>User role and staff type</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={resetting}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {resetting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</> : 'Yes, Reset'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}