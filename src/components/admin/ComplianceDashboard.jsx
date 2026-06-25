import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Search, CheckCircle2 } from 'lucide-react';
import ComplianceStatusCards from '@/components/admin/compliance/ComplianceStatusCards';
import ComplianceRiderCard from '@/components/admin/compliance/ComplianceRiderCard';

export default function ComplianceDashboard({ onSelectRider }) {
  const { toast } = useToast();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    load();
  }, []);

  // FIX: N+1 query — collect unique user_ids first, then fetch all rider data in parallel
  async function load() {
    setLoading(true);
    try {
      const docs = await base44.entities.KycDocument.filter({}, '-created_date', 200);

      // Group docs by user_id
      const docsByUser = new Map();
      for (const doc of docs) {
        if (!docsByUser.has(doc.user_id)) {
          docsByUser.set(doc.user_id, []);
        }
        docsByUser.get(doc.user_id).push(doc);
      }

      // Fetch all rider data in parallel (was: sequential N+1 loop)
      const userIds = [...docsByUser.keys()];
      const riderEntries = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const [user, vehicles, wallet] = await Promise.all([
              base44.entities.User.get(userId),
              base44.entities.Vehicle.filter({ rider_id: userId }, '-created_date', 1),
              base44.entities.Wallet.filter({ user_id: userId, entity_type: 'personal' }),
            ]);

            const userDocs = docsByUser.get(userId);
            const docCount = userDocs.length;
            const docTypes = [...new Set(userDocs.map(d => d.document_type))];
            const idAnalyzerDocs = userDocs.filter(d => d.provider_name === 'idanalyzer_docupass').length;
            const legacyDocs = docCount - idAnalyzerDocs;
            const docDates = userDocs.map(d => new Date(d.created_date));
            const oldestDocDate = docDates.length > 0 ? new Date(Math.min(...docDates)).toISOString() : null;
            const newestDocDate = docDates.length > 0 ? new Date(Math.max(...docDates)).toISOString() : null;

            return {
              user_id: userId,
              user,
              vehicle: vehicles[0],
              wallet: wallet[0],
              docCount,
              docTypes,
              idAnalyzerDocs,
              legacyDocs,
              oldestDocDate,
              newestDocDate,
              kycStatus: user?.kyc_status || 'unverified',
              docupassDecision: user?.docupass_decision || null,
            };
          } catch (e) {
            console.error('Failed to load rider data for', userId, e);
            return null;
          }
        })
      );

      setRiders(riderEntries.filter(Boolean));
    } catch (e) {
      console.error('Load error:', e);
      toast({ title: 'Error', description: 'Failed to load applications', variant: 'destructive' });
    }
    setLoading(false);
  }

  const filteredRiders = useMemo(() => {
    let filtered = riders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.kycStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.user?.full_name?.toLowerCase().includes(q) ||
        r.user?.phone?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.user?.national_id?.toLowerCase().includes(q) ||
        r.vehicle?.plate_number?.toLowerCase().includes(q) ||
        r.user?.id_extracted_name?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.newestDocDate) - new Date(a.newestDocDate));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.oldestDocDate) - new Date(b.oldestDocDate));
    } else if (sortBy === 'most_docs') {
      filtered.sort((a, b) => b.docCount - a.docCount);
    }

    return filtered;
  }, [riders, searchQuery, statusFilter, sortBy]);

  const statusCounts = useMemo(() => ({
    all: riders.length,
    unverified: riders.filter(r => r.kycStatus === 'unverified').length,
    pending: riders.filter(r => r.kycStatus === 'pending').length,
    verified: riders.filter(r => r.kycStatus === 'verified').length,
    rejected: riders.filter(r => r.kycStatus === 'rejected').length,
  }), [riders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold mb-1">KYC Compliance Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {filteredRiders.length} of {riders.length} applications
        </p>
      </div>

      <ComplianceStatusCards
        statusCounts={statusCounts}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, ID, or plate..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-input bg-background text-sm font-medium"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_docs">Most Documents</option>
          </select>
        </div>
      </div>

      {/* Riders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground mt-3">Loading applications...</p>
        </div>
      ) : filteredRiders.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No applications matching your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRiders.map(rider => (
            <ComplianceRiderCard key={rider.user_id} rider={rider} onSelect={onSelectRider} />
          ))}
        </div>
      )}
    </div>
  );
}