import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES, formatDateTime } from '@/lib/format';
import { Loader2 } from 'lucide-react';

export default function TransactionDetailPanel({ txn }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setLoading(true);
      try {
        let userId = null;
        let wallet = null;

        // 1. Try Wallet.get — wallet_id might be a wallet UUID
        try {
          wallet = await base44.entities.Wallet.get(txn.wallet_id);
          if (wallet?.user_id) userId = wallet.user_id;
        } catch {}

        // 2. If no user_id from wallet, wallet_id might BE the user_id directly
        if (!userId) {
          try {
            const directUser = await base44.entities.User.get(txn.wallet_id);
            if (directUser?.id) userId = directUser.id;
          } catch {}
        }

        // 3. Fetch full user details
        let user = null;
        if (userId) {
          try { user = await base44.entities.User.get(userId); } catch {}
        }

        // 4. Fetch SACCO via GroupMember → Group
        let sacco = null;
        if (userId) {
          try {
            const memberships = await base44.entities.GroupMember.filter({ user_id: userId, status: 'approved' });
            for (const m of memberships) {
              try {
                const group = await base44.entities.Group.get(m.group_id);
                if (group?.type === 'sacco') { sacco = group; break; }
              } catch {}
            }
          } catch {}
        }

        // 5. Fetch County
        let county = null;
        if (user?.county_id) {
          try { county = await base44.entities.County.get(user.county_id); } catch {}
        }

        if (!cancelled) {
          setDetails({ user, wallet, sacco, county });
        }
      } catch (e) {
        console.error('Failed to resolve transaction details:', e);
      }
      if (!cancelled) setLoading(false);
    }
    resolve();
    return () => { cancelled = true; };
  }, [txn.id, txn.wallet_id]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { user, wallet, sacco, county } = details || {};

  const fields = [
    { label: 'Rider Name', value: user?.full_name || '—' },
    { label: 'Phone', value: user?.phone || '—' },
    { label: 'County', value: county?.name || '—' },
    { label: 'SACCO', value: sacco?.name || '—' },
    { label: 'Wallet ID', value: txn.wallet_id || '—', mono: true },
    { label: 'Wallet Type', value: wallet?.entity_type ? (wallet.entity_type === 'business' ? 'Business' : 'Personal') : '—' },
    { label: 'SasaPay Fee', value: txn.sasapay_fee_kes != null ? formatKES(Math.round(txn.sasapay_fee_kes * 100)) : '—' },
    { label: 'BodaSure Fee', value: txn.bodasure_fee_kes != null ? formatKES(Math.round(txn.bodasure_fee_kes * 100)) : '—' },
    { label: 'Total Fee', value: txn.total_fee_kes != null ? formatKES(Math.round(txn.total_fee_kes * 100)) : '—' },
    { label: 'Counterparty Phone', value: txn.counterparty_phone || '—' },
    { label: 'Description', value: txn.description || '—' },
    { label: 'Completed At', value: txn.completed_at ? formatDateTime(txn.completed_at) : '—' },
  ];

  if (txn.failure_reason) {
    fields.push({ label: 'Failure Reason', value: txn.failure_reason });
  }

  const metaEntries = txn.metadata
    ? Object.entries(txn.metadata).filter(([, v]) => v != null)
    : [];

  return (
    <div className="px-4 pb-4 pt-3 bg-orange-50/30 border-t border-border/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {fields.map((f, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className={`text-sm font-medium break-all ${f.mono ? 'font-mono' : ''}`}>{f.value}</span>
          </div>
        ))}
      </div>
      {metaEntries.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Metadata</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {metaEntries.map(([k, v], i) => (
              <div key={i} className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-sm font-medium break-all">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}