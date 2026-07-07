import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatKES, formatDateTime, formatDate } from '@/lib/format';
import { splitFullName } from '@/lib/nameUtils';
import { Wallet, FileText, Bike, Users, UserCircle, Inbox, ExternalLink, AlertTriangle, CheckCircle, XCircle, Link2, Loader2, Shield, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import SubmissionsTab from '@/components/admin/drawer-tabs/SubmissionsTab';
import RolesTab from '@/components/admin/drawer-tabs/RolesTab';
import SendSmsModal from '@/components/admin/comms/SendSmsModal';
import ResetKycCard from '@/components/admin/ResetKycCard';

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

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function UserProfileDrawer({ open, onOpenChange, user, wallet, snapshot, countyName, onLinked, defaultTab = 'personal', scopeEntities = {} }) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isSuper = currentUser?.roles?.includes('super_admin') || currentUser?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loaded, setLoaded] = useState({});
  const [tabData, setTabData] = useState({});
  const [linking, setLinking] = useState('idle');
  const [linkedAccount, setLinkedAccount] = useState('');
  const [linkError, setLinkError] = useState('');
  const [sendSmsOpen, setSendSmsOpen] = useState(false);

  // Reset when user changes
  useEffect(() => {
    setLoaded({});
    setTabData({});
    setActiveTab(defaultTab);
    setLinking('idle');
    setLinkedAccount('');
    setLinkError('');
  }, [user?.id]);

  async function handleLinkSasapay() {
    if (!user?.id) return;
    setLinking('searching');
    setLinkError('');
    try {
      const res = await base44.functions.invoke('adminLinkSasapayAccount', { userId: user.id });
      if (res.data?.success) {
        setLinking('success');
        setLinkedAccount(res.data.accountNumber);
        toast({ title: 'SasaPay account linked', description: `Account ${res.data.accountNumber}` });
        if (onLinked) onLinked();
      } else {
        setLinking('error');
        setLinkError(res.data?.message || res.data?.error || 'No SasaPay account found for this phone.');
      }
    } catch (e) {
      setLinking('error');
      setLinkError(e.response?.data?.error || e.message || 'Failed to search SasaPay.');
    }
  }

  // Lazy load tab data (personal tab needs no async — data comes from props)
  useEffect(() => {
    if (!open || !user) return;
    if (activeTab === 'personal') return;
    if (loaded[activeTab]) return;

    const tabKey = activeTab;
    async function loadTab() {
      try {
        let data = {};
        if (tabKey === 'wallet') {
          const txns = wallet?.id
            ? await base44.entities.Transaction.filter({ wallet_id: wallet.id }, '-created_date', 20)
            : [];
          data = { transactions: txns };
        } else if (tabKey === 'kyc') {
          const docs = await base44.entities.KycDocument.filter({ user_id: user.id });
          data = { docs };
        } else if (tabKey === 'vehicles') {
          const bikes = await base44.entities.Vehicle.filter({ rider_id: user.id }, '-created_date');
          data = { bikes };
        } else if (tabKey === 'groups') {
          const members = await base44.entities.GroupMember.filter({ user_id: user.id });
          const groupIds = [...new Set(members.map(m => m.group_id).filter(Boolean))];
          const groups = await Promise.all(
            groupIds.map(id => base44.entities.Group.get(id).catch(() => null))
          );
          const groupMap = {};
          groups.forEach(g => { if (g) groupMap[g.id] = g; });
          data = { members, groupMap };
        } else if (tabKey === 'sms') {
          const logs = await base44.entities.SmsLog.filter({ user_id: user.id }, '-created_date', 50);
          data = { smsLogs: logs };
        }
        setTabData(prev => ({ ...prev, ...data }));
        setLoaded(prev => ({ ...prev, [tabKey]: true }));
      } catch (e) {
        setLoaded(prev => ({ ...prev, [tabKey]: true }));
      }
    }
    loadTab();
  }, [open, activeTab, user, wallet, loaded]);

  if (!user) return null;

  const nameParts = splitFullName(user.full_name);
  const accountNumber = wallet?.sasapay_account_number || wallet?.account_number || '—';

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-heading font-bold">{user.full_name || 'User'}</SheetTitle>
            {isSuper && user?.phone && (
              <button
                onClick={() => setSendSmsOpen(true)}
                className="flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold hover:opacity-90"
              >
                <Send className="w-3 h-3" /> SMS
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{user.phone || 'No phone'}</span>
            <span className="font-mono">{accountNumber}</span>
            {wallet && (
              <span className="font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">Tier {wallet.tier}</span>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2">
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
              <TabsTrigger value="personal"><UserCircle className="w-3.5 h-3.5 mr-1 inline" />Personal</TabsTrigger>
              <TabsTrigger value="wallet"><Wallet className="w-3.5 h-3.5 mr-1 inline" />Wallet</TabsTrigger>
              <TabsTrigger value="kyc"><FileText className="w-3.5 h-3.5 mr-1 inline" />KYC</TabsTrigger>
              <TabsTrigger value="vehicles"><Bike className="w-3.5 h-3.5 mr-1 inline" />Bikes</TabsTrigger>
              <TabsTrigger value="groups"><Users className="w-3.5 h-3.5 mr-1 inline" />Groups</TabsTrigger>
              <TabsTrigger value="submissions"><FileText className="w-3.5 h-3.5 mr-1 inline" />Submissions</TabsTrigger>
              <TabsTrigger value="sms"><MessageSquare className="w-3.5 h-3.5 mr-1 inline" />SMS Logs</TabsTrigger>
              {isSuper && <TabsTrigger value="roles"><Shield className="w-3.5 h-3.5 mr-1 inline" />Roles</TabsTrigger>}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Personal Info */}
            <TabsContent value="personal" className="mt-0 space-y-3 data-[state=inactive]:hidden">
              <InfoRow label="First Name" value={nameParts.firstName || '—'} />
              <InfoRow label="Middle Name" value={nameParts.middleName || '—'} />
              <InfoRow label="Last Name" value={nameParts.lastName || '—'} />
              <InfoRow label="Phone" value={user.phone || '—'} />
              <InfoRow label="National ID" value={user.national_id || '—'} />
              <InfoRow label="Email" value={user.email || '—'} />
              <InfoRow label="County" value={countyName || '—'} />
              <InfoRow label="Date Joined" value={formatDate(user.created_date)} />
              <InfoRow label="Onboarding Complete" value={user.onboarding_complete ? 'Yes' : 'No'} />
              <InfoRow label="Verification Complete" value={user.verification_complete ? 'Yes' : 'No'} />
            </TabsContent>

            {/* Wallet & Transactions */}
            <TabsContent value="wallet" className="mt-0 space-y-4">
              {linking === 'searching' && (
                <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Searching SasaPay... this may take up to 30 seconds.</p>
                </div>
              )}
              {linking === 'success' && (
                <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                  <p className="text-sm font-semibold text-success">Linked to account {linkedAccount}</p>
                </div>
              )}
              {linking === 'error' && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">Could not link account</p>
                    <p className="text-xs text-destructive/80">{linkError || 'No SasaPay account found. The user must re-activate their wallet.'}</p>
                  </div>
                </div>
              )}
              {!wallet?.sasapay_account_number && linking === 'idle' && (
                <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-warning">Wallet not linked to SasaPay</p>
                    <p className="text-xs text-muted-foreground">No SasaPay account number found. Search and link an existing account.</p>
                  </div>
                  <button onClick={handleLinkSasapay} className="bg-warning text-warning-foreground rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Link Now
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-bold">{formatKES(snapshot?.balance_cents || 0)}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Wallet Tier</p>
                  <p className="text-lg font-bold">Tier {wallet?.tier || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-bold capitalize">{wallet?.status || '—'}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="text-sm font-mono break-all">{accountNumber}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Transactions</p>
                {!loaded.wallet ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
                ) : (tabData.transactions?.length || 0) > 0 ? (
                  <div className="space-y-1.5">
                    {tabData.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium capitalize">{tx.type?.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">{formatKES(tx.amount_cents)}</p>
                          <p className={`text-[10px] font-semibold ${tx.status === 'completed' ? 'text-success' : tx.status === 'failed' ? 'text-destructive' : 'text-warning'}`}>{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Inbox} message="No transactions yet" />
                )}
              </div>
            </TabsContent>

            {/* KYC Documents */}
            <TabsContent value="kyc" className="mt-0 space-y-3">
              {!loaded.kyc ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
              ) : (tabData.docs?.length || 0) > 0 ? (
                tabData.docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{DOC_TYPE_LABELS[doc.document_type] || doc.document_type}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(doc.created_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${doc.status === 'approved' ? 'text-success' : doc.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>{doc.status}</span>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-primary">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={FileText} message="No KYC documents uploaded" />
              )}

              {isSuper && (
                <ResetKycCard
                  userId={user.id}
                  onResetComplete={() => {
                    setLoaded(prev => ({ ...prev, kyc: false }));
                    setTabData(prev => ({ ...prev, docs: [] }));
                    if (onLinked) onLinked();
                  }}
                />
              )}
            </TabsContent>

            {/* Vehicles */}
            <TabsContent value="vehicles" className="mt-0 space-y-3">
              {!loaded.vehicles ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
              ) : (tabData.bikes?.length || 0) > 0 ? (
                tabData.bikes.map(bike => (
                  <div key={bike.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Bike className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{bike.plate_number}</p>
                      <p className="text-[10px] text-muted-foreground">{bike.make} {bike.model} · {bike.color}</p>
                    </div>
                    <span className={`text-xs font-semibold ${bike.status === 'approved' ? 'text-success' : bike.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>{bike.status}</span>
                  </div>
                ))
              ) : (
                <EmptyState icon={Bike} message="No vehicles registered" />
              )}
            </TabsContent>

            {/* Submissions */}
            <TabsContent value="submissions" className="mt-0">
              <SubmissionsTab user={user} />
            </TabsContent>

            {/* Roles */}
            {isSuper && (
              <TabsContent value="roles" className="mt-0">
                <RolesTab user={user} scopeEntities={scopeEntities} isSuper={isSuper} onUpdate={onLinked} />
              </TabsContent>
            )}

            {/* Groups */}
            <TabsContent value="groups" className="mt-0 space-y-3">
              {!loaded.groups ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
              ) : (tabData.members?.length || 0) > 0 ? (
                tabData.members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tabData.groupMap?.[member.group_id]?.name || 'Unknown Group'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{member.role} · Joined {formatDate(member.joined_date)}</p>
                    </div>
                    <span className={`text-xs font-semibold ${member.status === 'approved' ? 'text-success' : member.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>{member.status}</span>
                  </div>
                ))
              ) : (
                <EmptyState icon={Users} message="Not a member of any group" />
              )}
            </TabsContent>

            {/* SMS Logs */}
            <TabsContent value="sms" className="mt-0 space-y-3">
              {!loaded.sms ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
              ) : (tabData.smsLogs?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {tabData.smsLogs.map(log => (
                    <div key={log.id} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            log.status === 'sent' || log.status === 'delivered' ? 'bg-success/10 text-success' :
                            log.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                          }`}>{log.status}</span>
                          <span className="text-xs text-muted-foreground capitalize">{log.event_type}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(log.created_date)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">{log.message_body}</p>
                      {log.failure_reason && <p className="text-[10px] text-destructive mt-1">Failed: {log.failure_reason}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={MessageSquare} message="No SMS logs for this user" />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>

    {user?.phone && (
      <SendSmsModal
        open={sendSmsOpen}
        onOpenChange={setSendSmsOpen}
        userPhone={user.phone}
        userName={user.full_name || 'User'}
        onSuccess={onLinked}
      />
    )}
  </>
  );
}