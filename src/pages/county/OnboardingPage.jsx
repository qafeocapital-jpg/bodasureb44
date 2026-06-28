import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatDateTime } from '@/lib/format';
import { ClipboardList, UserCheck, Clock, AlertCircle, ChevronRight } from 'lucide-react';

const PIPELINE_STAGES = [
  { state: 'DRAFT', label: 'Draft', color: 'bg-stone-100 text-stone-600', icon: Clock },
  { state: 'KYC_PENDING', label: 'KYC Pending', color: 'bg-amber-50 text-amber-600', icon: AlertCircle },
  { state: 'KYC_REVIEW', label: 'KYC Review', color: 'bg-amber-50 text-amber-600', icon: AlertCircle },
  { state: 'BASIC_ACTIVE', label: 'Basic Active', color: 'bg-orange-50 text-[#ff5a1f]', icon: UserCheck },
  { state: 'VERIFIED', label: 'Verified', color: 'bg-green-50 text-green-600', icon: UserCheck },
];

export default function CountyOnboarding() {
  const { user } = useAuth();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [riders, setRiders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [kycDocs, setKycDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(null);

  useEffect(() => { load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const [r, v, k] = await Promise.all([
        base44.entities.User.filter(countyId ? { county_id: countyId, staff_type: 'none' } : { staff_type: 'none' }, '-created_date', 200),
        base44.entities.Vehicle.filter(countyId ? { county_id: countyId } : {}),
        base44.entities.KycDocument.filter({ status: 'pending' }),
      ]);
      setRiders(r); setVehicles(v); setKycDocs(k);
    } catch (e) { console.error('Onboarding load error:', e); }
    setLoading(false);
  }

  const ridersByState = PIPELINE_STAGES.map(stage => ({
    ...stage,
    riders: riders.filter(r => r.account_state === stage.state),
  }));

  const stalled = riders.filter(r =>
    r.account_state === 'KYC_PENDING' &&
    (Date.now() - new Date(r.updated_date || r.created_date).getTime()) > 3 * 24 * 60 * 60 * 1000
  );

  const vehicleMap = new Map(vehicles.map(v => [v.rider_id, v]));
  const kycByUser = new Set(kycDocs.map(k => k.user_id));

  const displayList = selectedStage
    ? ridersByState.find(s => s.state === selectedStage)?.riders || []
    : riders;

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-6 h-6 text-[#ff5a1f]" />
        <h1 className="text-2xl font-heading font-bold">Onboarding Queue</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Track riders progressing through the onboarding pipeline</p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : (
        <>
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {ridersByState.map(stage => {
              const Icon = stage.icon;
              return (
                <button
                  key={stage.state}
                  onClick={() => setSelectedStage(selectedStage === stage.state ? null : stage.state)}
                  className={`text-left bg-card border rounded-xl p-4 transition-all ${selectedStage === stage.state ? 'border-[#ff5a1f] ring-2 ring-[#ff5a1f]/20' : 'border-border hover:border-[#ff5a1f]/30'}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${stage.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-heading font-bold">{stage.riders.length}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                </button>
              );
            })}
          </div>

          {/* Stalled Alert */}
          {stalled.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{stalled.length} rider(s) stalled in KYC for 3+ days</p>
                <p className="text-xs text-amber-700">Review their documents or contact support to unblock</p>
              </div>
            </div>
          )}

          {/* Rider List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">State</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Bike</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">KYC Docs</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map(r => {
                  const bike = vehicleMap.get(r.id);
                  const stage = PIPELINE_STAGES.find(s => s.state === r.account_state);
                  const hasPendingKyc = kycByUser.has(r.id);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-accent/50">
                      <td className="px-4 py-3 font-medium">{r.full_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.phone || r.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${stage?.color || 'bg-muted text-muted-foreground'}`}>
                          {stage?.label || r.account_state || 'DRAFT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{bike?.plate_number || 'No bike'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {hasPendingKyc ? (
                          <span className="text-xs font-semibold bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">Pending Review</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(r.created_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {displayList.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No riders in this stage</p>}
          </div>

          {selectedStage && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <button onClick={() => setSelectedStage(null)} className="text-[#ff5a1f] font-semibold hover:underline">Show all</button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Filtered by: {PIPELINE_STAGES.find(s => s.state === selectedStage)?.label}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}