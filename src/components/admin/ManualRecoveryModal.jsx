import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2, ShieldAlert, Search, Play, CheckCircle2, AlertTriangle, XCircle, Webhook, Wrench } from 'lucide-react';
import WebhookDeliveriesList from '@/components/admin/WebhookDeliveriesList';

const DECISION_CONFIG = {
  accept: { label: 'Accepted', color: 'green', icon: CheckCircle2, bg: 'bg-success/10', text: 'text-success' },
  review: { label: 'Under Review', color: 'amber', icon: AlertTriangle, bg: 'bg-warning/10', text: 'text-warning' },
  reject: { label: 'Rejected', color: 'red', icon: XCircle, bg: 'bg-destructive/10', text: 'text-destructive' },
};

export default function ManualRecoveryModal({ onClose, prefillUserId }) {
  const [activeTab, setActiveTab] = useState('deliveries');
  const [transactionId, setTransactionId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function searchUsers() {
    if (userSearch.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const users = await base44.entities.User.list('-created_date', 20);
      const filtered = users.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.phone && u.phone.includes(userSearch)) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
      );
      setSearchResults(filtered);
    } catch (e) {
      setError(e.message);
    }
    setSearching(false);
  }

  async function handleReplay() {
    if (!transactionId.trim() || !selectedUser) return;
    setReplaying(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('replayDocupassWebhook', {
        transactionId: transactionId.trim(),
        userId: selectedUser.id,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setReplaying(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !replaying && onClose()} />
      <div className="relative bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-lg">Manual DocuPass Recovery</h3>
          </div>
          <button onClick={() => !replaying && onClose()} className="p-2 hover:bg-accent rounded-lg" disabled={replaying}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-border px-4">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'deliveries'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            Webhook Deliveries
          </button>
          <button
            onClick={() => setActiveTab('replay')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'replay'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Manual Replay
          </button>
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'deliveries' && <WebhookDeliveriesList />}

          {activeTab === 'replay' && (
            <>
          {/* Warning Banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary">
              This bypasses signature verification — only use for confirmed IDAnalyzer transactions.
            </p>
          </div>

          {/* Transaction ID Input */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">DocuPass Transaction ID</label>
            <input
              type="text"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              placeholder="e.g. USSVLVBT8B2ZDZXQGU6ZTL8ETN"
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm font-mono"
              disabled={replaying}
            />
          </div>

          {/* User Search */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Search Rider (by name or phone)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUsers()}
                placeholder="Type name or phone..."
                className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm"
                disabled={replaying}
              />
              <button
                onClick={searchUsers}
                disabled={searching || userSearch.trim().length < 2}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setUserSearch(`${u.full_name || 'Unknown'} (${u.phone || u.email})`); }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium">{u.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{u.phone || u.email || 'No contact'}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{u.id}</p>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="flex items-center justify-between bg-accent/50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{selectedUser.full_name || 'Unknown'}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{selectedUser.id}</p>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
                disabled={replaying}
              >
                Change
              </button>
            </div>
          )}

          {/* Replay Button */}
          <button
            onClick={handleReplay}
            disabled={replaying || !transactionId.trim() || !selectedUser}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {replaying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Replaying...</>
            ) : (
              <><Play className="w-4 h-4" /> Replay Verification</>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Result</span>
                {(() => {
                  const config = DECISION_CONFIG[result.decision] || DECISION_CONFIG.review;
                  const Icon = config.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {result.extractedName && (
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Extracted Name</p>
                    <p className="text-xs font-medium">{result.extractedName}</p>
                  </div>
                )}
                {result.nationalId && (
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">National ID</p>
                    <p className="text-xs font-medium font-mono">{result.nationalId}</p>
                  </div>
                )}
                {result.dob && (
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Date of Birth</p>
                    <p className="text-xs font-medium">{result.dob}</p>
                  </div>
                )}
                {result.sex && (
                  <div className="bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Gender</p>
                    <p className="text-xs font-medium">{result.sex}</p>
                  </div>
                )}
              </div>

              {result.faceConfidence != null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Face Match Confidence</span>
                    <span className="text-[10px] font-semibold">{Math.round(result.faceConfidence * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${result.faceConfidence >= 0.7 ? 'bg-success' : 'bg-warning'}`}
                      style={{ width: `${Math.round(result.faceConfidence * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.warnings.map((w, i) => (
                    <span key={i} className="text-[9px] bg-destructive/10 text-destructive rounded px-1.5 py-0.5">{w}</span>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                <span>Transaction: {result.transactionId}</span>
                <span>{new Date(result.processedAt).toLocaleString()}</span>
              </div>
            </div>
            )}
            </>
            )}
            </div>
            </div>
            </div>
            );
            }