import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/lib/format';
import { Search, Filter, CheckCircle2, Clock, AlertCircle, ChevronRight, ShieldCheck, Fingerprint } from 'lucide-react';

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

  async function load() {
    setLoading(true);
    try {
      // Fetch ALL KYC documents (not just pending) to show full compliance picture
      const docs = await base44.entities.KycDocument.filter({}, '-created_date', 200);
      
      // Group by user and get user/vehicle details
      const riderMap = new Map();
      for (const doc of docs) {
        if (!riderMap.has(doc.user_id)) {
          try {
            const [user, vehicles, wallet] = await Promise.all([
              base44.entities.User.get(doc.user_id),
              base44.entities.Vehicle.filter({ rider_id: doc.user_id }, '-created_date', 1),
              base44.entities.Wallet.filter({ user_id: doc.user_id, entity_type: 'personal' }),
            ]);
            
            riderMap.set(doc.user_id, {
              user_id: doc.user_id,
              user,
              vehicle: vehicles[0],
              wallet: wallet[0],
              docCount: 0,
              docTypes: [],
              idAnalyzerDocs: 0,
              legacyDocs: 0,
              oldestDocDate: null,
              newestDocDate: null,
              kycStatus: user?.kyc_status || 'unverified',
              docupassDecision: user?.docupass_decision || null,
            });
          } catch (e) {
            console.error('Failed to load rider data:', e);
          }
        }

        const rider = riderMap.get(doc.user_id);
        if (rider) {
          rider.docCount++;
          if (!rider.docTypes.includes(doc.document_type)) {
            rider.docTypes.push(doc.document_type);
          }
          if (doc.provider_name === 'idanalyzer_docupass') {
            rider.idAnalyzerDocs++;
          } else {
            rider.legacyDocs++;
          }
          if (!rider.oldestDocDate || new Date(doc.created_date) < new Date(rider.oldestDocDate)) {
            rider.oldestDocDate = doc.created_date;
          }
          if (!rider.newestDocDate || new Date(doc.created_date) > new Date(rider.newestDocDate)) {
            rider.newestDocDate = doc.created_date;
          }
        }
      }

      setRiders(Array.from(riderMap.values()));
    } catch (e) {
      console.error('Load error:', e);
      toast({ title: 'Error', description: 'Failed to load applications', variant: 'destructive' });
    }
    setLoading(false);
  }

  // Filter and sort riders
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      unverified: 'Unverified',
      pending: 'Pending Review',
      verified: 'Verified',
      rejected: 'Rejected',
    };
    return labels[status] || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold mb-1">KYC Compliance Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {filteredRiders.length} of {riders.length} applications
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'all', label: 'All', icon: null },
          { key: 'unverified', label: 'Unverified', icon: AlertCircle },
          { key: 'pending', label: 'Under Review', icon: Clock },
          { key: 'verified', label: 'Verified', icon: CheckCircle2 },
          { key: 'rejected', label: 'Rejected', icon: AlertCircle },
        ].map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`p-3 rounded-xl border transition-all ${
                statusFilter === s.key
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-card border-border hover:border-primary'
              }`}
            >
              {Icon && <Icon className="w-4 h-4 mb-1" />}
              <p className="text-xs font-semibold">{s.label}</p>
              <p className={`text-lg font-bold ${statusFilter === s.key ? 'text-white' : 'text-foreground'}`}>
                {statusCounts[s.key]}
              </p>
            </button>
          );
        })}
      </div>

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
            <div
              key={rider.user_id}
              onClick={() => onSelectRider(rider.user_id)}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary hover:bg-accent/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm truncate">
                      {rider.user?.id_extracted_name || rider.user?.full_name || 'Unknown Rider'}
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground">
                      {getStatusIcon(rider.kycStatus)}
                      {getStatusLabel(rider.kycStatus)}
                    </span>
                    {rider.docupassDecision && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        rider.docupassDecision === 'accept' ? 'bg-success/10 text-success'
                        : rider.docupassDecision === 'reject' ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        IDAnalyzer: {rider.docupassDecision}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground mb-2">
                    <span>{rider.user?.phone || rider.user?.email || '—'}</span>
                    {rider.user?.national_id && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="font-mono font-semibold text-foreground">ID: {rider.user.national_id}</span>
                      </>
                    )}
                    {rider.vehicle?.plate_number && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="font-mono font-semibold text-foreground">{rider.vehicle.plate_number}</span>
                      </>
                    )}
                  </div>
                  {/* Extracted data summary for verified users */}
                  {rider.user?.id_extracted_name && (
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-1">
                      {rider.user?.id_sex && <span>Gender: {rider.user.id_sex}</span>}
                      {rider.user?.id_extracted_dob && <span>DOB: {rider.user.id_extracted_dob}</span>}
                      {rider.user?.id_address && <span className="truncate max-w-[200px]">Address: {rider.user.id_address}</span>}
                    </div>
                  )}
                  {/* Face match indicator */}
                  {rider.user?.id_face_confidence != null && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <Fingerprint className="w-3 h-3" />
                      <span className={rider.user.id_face_confidence >= 0.7 ? 'text-success font-medium' : 'text-warning font-medium'}>
                        Face Match: {Math.round(rider.user.id_face_confidence * 100)}%
                      </span>
                      {rider.user?.id_face_identical != null && (
                        <span className={rider.user.id_face_identical ? 'text-success' : 'text-destructive'}>
                          ({rider.user.id_face_identical ? 'Identical' : 'Not Identical'})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    Submitted: {formatDateTime(rider.oldestDocDate)}
                    {rider.idAnalyzerDocs > 0 && (
                      <span className="ml-2 text-success">• {rider.idAnalyzerDocs} IDAnalyzer docs</span>
                    )}
                    {rider.legacyDocs > 0 && (
                      <span className="ml-2 text-amber-600">• {rider.legacyDocs} legacy docs</span>
                    )}
                  </div>
                </div>

                {/* Right: Docs and Action */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{rider.docCount}</p>
                    <p className="text-xs text-muted-foreground">documents</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>

              {/* Document Types */}
              {rider.docTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {rider.docTypes.slice(0, 4).map(type => (
                    <span key={type} className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-full">
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {rider.docTypes.length > 4 && (
                    <span className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-full">
                      +{rider.docTypes.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}