import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { formatDateTime, formatDate } from '@/lib/format';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function StatusBadge({ status }) {
  const colors = {
    queued: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };
  const icons = {
    queued: <Clock className="w-3 h-3" />,
    processing: <Loader2 className="w-3 h-3 animate-spin" />,
    completed: <CheckCircle className="w-3 h-3" />,
    failed: <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>
      {icons[status]} {status}
    </span>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const items = await base44.entities.SmsCampaign.filter({}, '-created_date', 100);
      setCampaigns(items);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const hasActive = campaigns.some(c => c.status === 'queued' || c.status === 'processing');
    if (hasActive) {
      const interval = setInterval(load, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  function handleRowClick(campaign) {
    setSelectedCampaign(campaign);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-heading font-bold">Campaigns</h2>
        <p className="text-xs text-muted-foreground">Monitor SMS campaign status and progress</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No campaigns yet. Create one in the 'Bulk SMS' tab.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Audience</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => {
                const progress = campaign.total_recipients > 0 ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100) : 0;
                return (
                  <tr key={campaign.id} onClick={() => handleRowClick(campaign)} className="border-t border-border hover:bg-accent/50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{campaign.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{campaign.audience_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><StatusBadge status={campaign.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs font-medium">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(campaign.created_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCampaign && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b border-border pb-4">
              <DrawerTitle>{selectedCampaign.name}</DrawerTitle>
              <DrawerDescription className="mt-2 flex items-center gap-2">
                <StatusBadge status={selectedCampaign.status} />
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total Recipients</p>
                  <p className="text-lg font-bold">{selectedCampaign.total_recipients}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Sent</p>
                  <p className="text-lg font-bold text-green-600">{selectedCampaign.sent_count}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-lg font-bold text-red-600">{selectedCampaign.failed_count}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Batches</p>
                  <p className="text-lg font-bold">{selectedCampaign.batches_processed} / {selectedCampaign.batch_count}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Message</p>
                <p className="text-sm p-3 bg-card border border-border rounded-lg">{selectedCampaign.message_body}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Audience</p>
                <p className="text-sm text-muted-foreground">{selectedCampaign.audience_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Created</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(selectedCampaign.created_date)}</p>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}