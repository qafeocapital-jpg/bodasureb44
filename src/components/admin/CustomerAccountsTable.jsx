import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Search, Loader2, Link2, Info } from 'lucide-react';
import UserProfileDrawer from '@/components/admin/UserProfileDrawer';
import { useToast } from '@/components/ui/use-toast';

export default function CustomerAccountsTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [linkingWalletId, setLinkingWalletId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const wallets = await base44.entities.Wallet.filter({ entity_type: 'personal' });

      const userIds = [...new Set(wallets.map(w => w.user_id).filter(Boolean))];
      const walletIds = wallets.map(w => w.id);

      const [users, snapshots, txns, counties] = await Promise.all([
        userIds.length > 0 ? base44.entities.User.filter({ id: { $in: userIds } }) : Promise.resolve([]),
        walletIds.length > 0 ? base44.entities.WalletSnapshot.filter({ wallet_id: { $in: walletIds } }) : Promise.resolve([]),
        base44.entities.Transaction.filter({}, '-created_date', 500),
        base44.entities.County.filter({}),
      ]);

      const userMap = {};
      (users || []).forEach(u => { userMap[u.id] = u; });

      const snapshotMap = {};
      (snapshots || []).forEach(s => { snapshotMap[s.wallet_id] = s; });

      const countyMap = {};
      (counties || []).forEach(c => { countyMap[c.id] = c; });

      const txnCounts = {};
      (txns || []).forEach(t => {
        if (t.wallet_id) txnCounts[t.wallet_id] = (txnCounts[t.wallet_id] || 0) + 1;
      });

      const joined = wallets.map(w => {
        const user = userMap[w.user_id] || null;
        return {
          wallet: w,
          user,
          snapshot: snapshotMap[w.id] || null,
          county: user ? countyMap[user.county_id] : null,
          txnCount: txnCounts[w.id] || 0,
        };
      });

      setRows(joined);
    } catch (e) {
      console.error('Failed to load customer accounts:', e);
    }
    setLoading(false);
  }

  function handleRowClick(row) {
    setSelected(row);
    setDrawerOpen(true);
  }

  async function handleLinkSasapay(row) {
    if (!row.user?.id) return;
    setLinkingWalletId(row.wallet.id);
    try {
      const res = await base44.functions.invoke('adminLinkSasapayAccount', { userId: row.user.id });
      if (res.data?.success) {
        toast({ title: 'SasaPay account linked', description: `Account ${res.data.accountNumber}` });
        await load();
      } else {
        toast({ title: 'Could not link', description: res.data?.message || 'No SasaPay account found for this phone.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to search SasaPay', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setLinkingWalletId(null);
  }

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.user?.phone?.includes(q) ||
      r.wallet?.account_number?.toLowerCase().includes(q) ||
      r.wallet?.sasapay_account_number?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Showing {rows.length} BodaSure wallet{rows.length !== 1 ? 's' : ''}. SasaPay's platform may contain more records from other merchants — these are not shown here.</span>
      </div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or account..."
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm"
        />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account Number</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">County</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr
                key={row.wallet.id}
                onClick={() => handleRowClick(row)}
                className="border-t border-border hover:bg-accent/50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-primary hover:underline">
                  {row.user?.full_name || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.user?.phone || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {row.wallet.sasapay_account_number || row.wallet.account_number ? (
                    <span className="text-primary">{row.wallet.sasapay_account_number || row.wallet.account_number}</span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLinkSasapay(row); }}
                      disabled={linkingWalletId === row.wallet.id}
                      className="text-xs bg-warning text-warning-foreground rounded-lg px-2 py-1 font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      {linkingWalletId === row.wallet.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                      {linkingWalletId === row.wallet.id ? 'Searching...' : 'Link SasaPay'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${row.wallet.status === 'active' ? 'text-success' : row.wallet.status === 'pending_kyc' ? 'text-warning' : 'text-muted-foreground'}`}>
                    {row.wallet.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatKES(row.snapshot?.balance_cents || 0)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">Tier {row.wallet.tier}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.county?.name || '—'}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{row.txnCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No customer accounts found</p>
        )}
      </div>
      <UserProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        user={selected?.user}
        wallet={selected?.wallet}
        snapshot={selected?.snapshot}
        countyName={selected?.county?.name}
        onLinked={load}
      />
    </>
  );
}