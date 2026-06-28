import { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Loader2, Search, TrendingUp, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react';
import TransactionRow from '@/components/admin/finance/TransactionRow';

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'lipisha', label: 'Lipisha' },
  { id: 'lipa_county', label: 'Lipa County' },
  { id: 'lipa_owner', label: 'Lipa Owner' },
  { id: 'send', label: 'Send' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'penalty', label: 'Penalty' },
];

export default function Finance() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const result = await base44.entities.Transaction.list('-created_date', 50);
      setTransactions(result);
      setHasMore(result.length === 50);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  async function handleLoadMore() {
    if (!hasMore || loadingMore || transactions.length === 0) return;
    setLoadingMore(true);
    try {
      const lastDate = transactions[transactions.length - 1].created_date;
      const result = await base44.entities.Transaction.filter(
        { created_date: { $lt: lastDate } },
        '-created_date',
        50
      );
      setTransactions(prev => [...prev, ...result]);
      setHasMore(result.length === 50);
    } catch (e) {
      console.error('Load more failed:', e);
      setHasMore(false);
    }
    setLoadingMore(false);
  }

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (activeTab !== 'all' && tx.type !== activeTab) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && tx.status !== 'pending' && tx.status !== 'initiated') return false;
        if (statusFilter === 'completed' && tx.status !== 'completed') return false;
        if (statusFilter === 'failed' && tx.status !== 'failed') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const refMatch = tx.reference?.toLowerCase().includes(q);
        const phoneMatch = tx.counterparty_phone?.toLowerCase().includes(q);
        if (!refMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [transactions, activeTab, statusFilter, search]);

  const kpis = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'completed');
    const pending = transactions.filter(t => t.status === 'pending' || t.status === 'initiated');
    const failed = transactions.filter(t => t.status === 'failed');
    const totalVolume = completed.reduce((sum, t) => sum + (t.amount_cents || 0), 0);
    return { totalVolume, completedCount: completed.length, pendingCount: pending.length, failedCount: failed.length };
  }, [transactions]);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">All money flowing through BodaSure — deposits, fares, licences, transfers, and penalties</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Total Volume</p>
          </div>
          <p className="text-xl font-heading font-bold">{formatKES(kpis.totalVolume)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <p className="text-xl font-heading font-bold text-success">{kpis.completedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-warning" />
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <p className="text-xl font-heading font-bold text-warning">{kpis.pendingCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-destructive" />
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <p className="text-xl font-heading font-bold text-destructive">{kpis.failedCount}</p>
        </div>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by reference or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-card text-sm font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-card border border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No transactions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Reference</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <TransactionRow
                    key={tx.id}
                    txn={tx}
                    expanded={expandedId === tx.id}
                    onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && filtered.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 bg-card border border-border rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}