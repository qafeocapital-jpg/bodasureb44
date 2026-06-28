import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, User, Bike, Loader2, BadgeCheck, AlertCircle } from 'lucide-react';

export default function CountyGlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const countyId = user?.scope_entity_id || user?.county_id;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ riders: [], vehicles: [] });
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults({ riders: [], vehicles: [] });
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setShowDropdown(true);
      try {
        const userFilter = countyId
          ? { county_id: countyId, staff_type: 'none' }
          : { staff_type: 'none' };
        const vehicleFilter = countyId ? { county_id: countyId } : {};

        const [riders, vehicles, permits] = await Promise.all([
          base44.entities.User.filter(userFilter, '-created_date', 50),
          base44.entities.Vehicle.filter(vehicleFilter, '-created_date', 50),
          base44.entities.Permit.filter(countyId ? { county_id: countyId } : {}, '-created_date', 100),
        ]);

        const q = query.toLowerCase();
        const matchedRiders = riders
          .filter(r =>
            r.full_name?.toLowerCase().includes(q) ||
            r.phone?.includes(query.trim()) ||
            r.email?.toLowerCase().includes(q)
          )
          .slice(0, 5);

        const now = new Date();
        const activePermitVehicleIds = new Set(
          permits.filter(p => p.status === 'active' && (!p.end_date || new Date(p.end_date) > now)).map(p => p.vehicle_id)
        );

        const matchedVehicles = vehicles
          .filter(v => v.plate_number?.toLowerCase().includes(q))
          .slice(0, 5)
          .map(v => ({
            ...v,
            hasActivePermit: activePermitVehicleIds.has(v.id),
            riderName: riders.find(r => r.id === v.rider_id)?.full_name || 'Unknown',
          }));

        setResults({ riders: matchedRiders, vehicles: matchedVehicles });
      } catch (e) {
        console.error('Search error:', e);
      }
      setLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, countyId]);

  function handleRiderClick(riderId) {
    setShowDropdown(false);
    setQuery('');
    navigate(`/county/registrations?rider=${riderId}`);
  }

  function handleVehicleClick(vehicleId) {
    setShowDropdown(false);
    setQuery('');
    navigate(`/county/registrations?vehicle=${vehicleId}`);
  }

  const hasResults = results.riders.length > 0 || results.vehicles.length > 0;

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
        placeholder="Search riders, plates..."
        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-input bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a1f]/30 focus:border-[#ff5a1f]/50"
      />
      {showDropdown && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : !hasResults ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
            </div>
          ) : (
            <div className="py-1">
              {results.riders.length > 0 && (
                <>
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Riders</p>
                  {results.riders.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleRiderClick(r.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[#ff5a1f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.phone || r.email}</p>
                      </div>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${
                        r.account_state === 'VERIFIED' ? 'bg-green-50 text-green-600'
                        : r.account_state === 'BASIC_ACTIVE' ? 'bg-orange-50 text-[#ff5a1f]'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.account_state || 'DRAFT'}
                      </span>
                    </button>
                  ))}
                </>
              )}
              {results.vehicles.length > 0 && (
                <>
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Vehicles</p>
                  {results.vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleVehicleClick(v.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        v.hasActivePermit ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        {v.hasActivePermit
                          ? <BadgeCheck className="w-4 h-4 text-green-600" />
                          : <AlertCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{v.plate_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{v.riderName}{v.make ? ` · ${v.make}` : ''}</p>
                      </div>
                      <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${
                        v.hasActivePermit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {v.hasActivePermit ? 'Compliant' : 'No Permit'}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}