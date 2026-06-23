import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Search, Loader2 } from 'lucide-react';
import UserProfileDrawer from '@/components/admin/UserProfileDrawer';

export default function CustomerAccountsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
                <td className="px-4 py-3 font-mono text-xs text-primary hover:underline">
                  {row.wallet.sasapay_account_number || row.wallet.account_number || '—'}
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
      />
    </>
  );
}