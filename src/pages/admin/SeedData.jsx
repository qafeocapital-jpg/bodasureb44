import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Database, Loader2, CheckCircle2, AlertCircle, MapPin, Building2, Users, Shield } from 'lucide-react';

export default function SeedData() {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSeed() {
    setSeeding(true);
    setResult(null);
    setError('');
    try {
      const res = await base44.functions.invoke('seedKisumuData', {});
      const data = res.data;

      // Invite demo users from frontend (backend functions can't use inviteUser)
      const demoUsers = [
        { email: 'county.admin@bodasure.demo', role: 'admin', label: 'County Admin', scopeRole: 'county_admin', staffType: 'county_admin' },
        { email: 'demo.rider@bodasure.demo', role: 'user', label: 'Demo Rider', scopeRole: 'rider', staffType: 'none' },
      ];
      const invitedUsers = [];

      // Get Kisumu county ID for scope assignment
      const counties = await base44.entities.County.filter({ code: '42' });
      const countyId = counties[0]?.id;

      for (const du of demoUsers) {
        const existing = await base44.entities.User.filter({ email: du.email });
        if (existing.length > 0) {
          data.results.skipped.push(`${du.label} (already exists)`);
          continue;
        }
        try {
          await base44.users.inviteUser(du.email, du.role);
          const newUsers = await base44.entities.User.filter({ email: du.email });
          if (newUsers.length > 0) {
            const updateData = { role: du.scopeRole, staff_type: du.staffType, full_name: du.label };
            if (du.scopeRole === 'county_admin' && countyId) {
              updateData.scope_entity_id = countyId;
              updateData.county_id = countyId;
            } else if (du.scopeRole === 'rider' && countyId) {
              updateData.county_id = countyId;
              updateData.profile_complete = true;
              updateData.kyc_status = 'approved';
              updateData.wallet_tier = 2;
            }
            await base44.entities.User.update(newUsers[0].id, updateData);
            invitedUsers.push(du.label);
          }
        } catch (e) {
          data.results.skipped.push(`${du.label} (invite failed: ${e.message})`);
        }
      }
      if (invitedUsers.length > 0) {
        data.results.users = invitedUsers.length;
      }

      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to seed data');
    }
    setSeeding(false);
  }

  const seedItems = [
    { icon: Building2, label: 'Kisumu County', desc: 'Code 42, status LIVE, KYC approved' },
    { icon: MapPin, label: '7 Sub-Counties', desc: 'Kisumu Central, East, West, Nyando, Muhoroni, Nyakach, Seme' },
    { icon: MapPin, label: 'Constituencies & Wards', desc: 'Full geographic hierarchy per sub-county' },
    { icon: MapPin, label: '10 Bodaboda Stages', desc: 'Kondele, Kisumu Town, Mamboleo, Migosi, etc.' },
    { icon: Building2, label: '35 Real SACCOs', desc: 'Ward-named SACCOs across 7 constituencies + Independent Operator' },
    { icon: Shield, label: 'Insurance Merchant', desc: 'APA Insurance Kisumu with 2 products' },
    { icon: Database, label: 'Fee Schedules', desc: 'Weekly KES 150, Monthly 500, Quarterly 1,200, Yearly 4,000' },
    { icon: Database, label: 'Fee Rule (60/20/20)', desc: 'County / SACCO / Platform split' },
    { icon: Users, label: 'Demo Users', desc: 'County admin + demo rider for testing' },
  ];

  return (
    <div className="p-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-heading font-bold mb-1">Seed Data</h1>
      <p className="text-sm text-muted-foreground mb-5">One-click Kisumu County pilot data setup</p>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 mb-6">
        <Database className="w-10 h-10 mb-3" />
        <h2 className="font-heading font-bold text-lg mb-1">Kisumu Pilot Launch Kit</h2>
        <p className="text-sm text-orange-100 mb-4">Seeds all geographic data, SACCOs, fee schedules, and demo users for a day-1 live demo environment. All operations are idempotent — safe to run multiple times.</p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 bg-white text-orange-600 rounded-xl px-5 py-3 font-semibold text-sm disabled:opacity-50"
        >
          {seeding ? <><Loader2 className="w-5 h-5 animate-spin" /> Seeding...</> : <><Database className="w-5 h-5" /> Seed Kisumu Data</>}
        </button>
      </div>

      {/* Seed contents */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="font-heading font-bold text-sm mb-3">What gets created:</h3>
        <div className="space-y-2">
          {seedItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <h3 className="font-heading font-bold text-sm text-success">Seed Complete</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {result.results?.county && <div><p className="text-xs text-muted-foreground">County</p><p className="font-semibold">{result.results.county}</p></div>}
            {result.results?.subCounties > 0 && <div><p className="text-xs text-muted-foreground">Sub-Counties</p><p className="font-semibold">{result.results.subCounties}</p></div>}
            {result.results?.constituencies > 0 && <div><p className="text-xs text-muted-foreground">Constituencies</p><p className="font-semibold">{result.results.constituencies}</p></div>}
            {result.results?.wards > 0 && <div><p className="text-xs text-muted-foreground">Wards</p><p className="font-semibold">{result.results.wards}</p></div>}
            {result.results?.stages > 0 && <div><p className="text-xs text-muted-foreground">Stages</p><p className="font-semibold">{result.results.stages}</p></div>}
            {result.results?.seeded_saccos !== undefined && <div><p className="text-xs text-muted-foreground">SACCOs Seeded</p><p className="font-semibold">{result.results.seeded_saccos}</p></div>}
            {result.results?.seeded_independent !== undefined && <div><p className="text-xs text-muted-foreground">Independent Op.</p><p className="font-semibold">{result.results.seeded_independent}</p></div>}
            {result.results?.deleted_old > 0 && <div><p className="text-xs text-muted-foreground">Old Deleted</p><span className="inline-flex items-center text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">{result.results.deleted_old}</span></div>}
            {result.results?.merchant > 0 && <div><p className="text-xs text-muted-foreground">Products</p><p className="font-semibold">{result.results.merchant}</p></div>}
            {result.results?.feeSchedules > 0 && <div><p className="text-xs text-muted-foreground">Fee Schedules</p><p className="font-semibold">{result.results.feeSchedules}</p></div>}
            {result.results?.feeRules > 0 && <div><p className="text-xs text-muted-foreground">Fee Rules</p><p className="font-semibold">{result.results.feeRules}</p></div>}
            {result.results?.users > 0 && <div><p className="text-xs text-muted-foreground">Demo Users</p><p className="font-semibold">{result.results.users}</p></div>}
          </div>
          {result.results?.sacco_names?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Seeded SACCOs ({result.results.sacco_names.length}):</p>
              <div className="max-h-[200px] overflow-y-auto bg-muted/50 rounded-lg p-2 space-y-0.5">
                {result.results.sacco_names.map((name, i) => (
                  <p key={i} className="text-xs font-mono text-foreground/80">{name}</p>
                ))}
              </div>
            </div>
          )}
          {result.results?.skipped?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Already existed (skipped):</p>
              <div className="flex flex-wrap gap-1">
                {result.results.skipped.map((s, i) => (
                  <span key={i} className="text-xs bg-muted rounded-full px-2 py-0.5">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="font-heading font-bold text-sm text-destructive">Seed Failed</h3>
          </div>
          <p className="text-sm text-destructive mt-2">{error}</p>
        </div>
      )}
    </div>
  );
}