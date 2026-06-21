import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatKES } from '@/lib/format';
import { Coins, Percent, Banknote, Scale, Plus, Pencil } from 'lucide-react';

export default function AdminMoney() {
  const [tab, setTab] = useState('fees');
  const [feeRules, setFeeRules] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ name: '', product_type: 'lipa_county', county_percentage: 60, sacco_percentage: 20, platform_percentage: 20 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        base44.entities.FeeRule.filter({ is_active: true }),
        base44.entities.Settlement.filter({}, '-created_date', 20),
      ]);
      setFeeRules(r); setSettlements(s);
    } catch (e) {}
    setLoading(false);
  }

  const pctSum = (Number(ruleForm.county_percentage) || 0) + (Number(ruleForm.sacco_percentage) || 0) + (Number(ruleForm.platform_percentage) || 0);
  const isValid = pctSum === 100 && ruleForm.name.trim();

  function openCreateModal() {
    setEditingRule(null);
    setRuleForm({ name: '', product_type: 'lipa_county', county_percentage: 60, sacco_percentage: 20, platform_percentage: 20 });
    setShowRuleModal(true);
  }

  function openEditModal(rule) {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name || '',
      product_type: rule.product_type || 'lipa_county',
      county_percentage: rule.county_percentage ?? 60,
      sacco_percentage: rule.sacco_percentage ?? 20,
      platform_percentage: rule.platform_percentage ?? 20,
    });
    setShowRuleModal(true);
  }

  async function saveRule() {
    if (!isValid) return;
    setSaving(true);
    try {
      const payload = {
        name: ruleForm.name.trim(),
        product_type: ruleForm.product_type,
        county_percentage: Number(ruleForm.county_percentage),
        sacco_percentage: Number(ruleForm.sacco_percentage),
        platform_percentage: Number(ruleForm.platform_percentage),
        is_active: true,
        version: editingRule?.version || 1,
      };
      if (editingRule) {
        await base44.entities.FeeRule.update(editingRule.id, payload);
      } else {
        await base44.entities.FeeRule.create(payload);
      }
      setShowRuleModal(false);
      load();
    } catch (e) {}
    setSaving(false);
  }

  const tabs = [
    { id: 'fees', label: 'Fee Rules', icon: Percent },
    { id: 'settlements', label: 'Settlements', icon: Banknote },
    { id: 'disputes', label: 'Disputes', icon: Scale },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Money Configuration</h1>
      <p className="text-sm text-muted-foreground mb-5">Configure fees, settlements, and disputes</p>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-accent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === 'fees' ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openCreateModal} className="flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Create Rule
            </button>
          </div>

          {feeRules.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Percent className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">No fee rules configured</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first fee rule to define how revenue is split between County, SACCO, and Platform.</p>
              <button onClick={openCreateModal} className="inline-flex items-center gap-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">
                <Plus className="w-4 h-4" /> Create Rule
              </button>
            </div>
          ) : (
            feeRules.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-orange-600" />
                    <p className="font-heading font-bold text-sm">{r.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 capitalize">{r.product_type.replace(/_/g, ' ')}</span>
                    <button onClick={() => openEditModal(r)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-accent rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{r.county_percentage}%</p>
                    <p className="text-[10px] text-muted-foreground">County</p>
                  </div>
                  <div className="bg-accent rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-600">{r.sacco_percentage}%</p>
                    <p className="text-[10px] text-muted-foreground">SACCO</p>
                  </div>
                  <div className="bg-accent rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-orange-600">{r.platform_percentage}%</p>
                    <p className="text-[10px] text-muted-foreground">Platform</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'settlements' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3 capitalize">{s.entity_type}</td>
                  <td className="px-4 py-3 font-semibold">{formatKES(s.amount_cents)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.status === 'processed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {settlements.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No settlements</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Scale className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No payment disputes</p>
        </div>
      )}

      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRuleModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-heading font-bold text-lg mb-4">{editingRule ? 'Edit Fee Rule' : 'Create Fee Rule'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rule Name</label>
                <input type="text" value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lipa County Default" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Product Type</label>
                <select value={ruleForm.product_type} onChange={e => setRuleForm(f => ({ ...f, product_type: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm">
                  <option value="lipa_county">Lipa County</option>
                  <option value="lipisha">Lipisha</option>
                  <option value="lipa_owner">Lipa Owner</option>
                  <option value="penalty">Penalty</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">County %</label>
                  <input type="number" value={ruleForm.county_percentage} onChange={e => setRuleForm(f => ({ ...f, county_percentage: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-center" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SACCO %</label>
                  <input type="number" value={ruleForm.sacco_percentage} onChange={e => setRuleForm(f => ({ ...f, sacco_percentage: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-center" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Platform %</label>
                  <input type="number" value={ruleForm.platform_percentage} onChange={e => setRuleForm(f => ({ ...f, platform_percentage: e.target.value }))} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-center" />
                </div>
              </div>
              <div className={`text-center rounded-lg py-2 text-sm font-bold ${pctSum === 100 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                Total: {pctSum}% {pctSum === 100 ? '✓' : '(must equal 100)'}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowRuleModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
                <button onClick={saveRule} disabled={!isValid || saving} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}