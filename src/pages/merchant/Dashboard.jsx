import { FileText, ShieldCheck, TrendingUp } from 'lucide-react';

export default function MerchantDashboard() {
  const kpis = [
    { label: 'Products', value: 0, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Policies', value: 0, icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Policies Sold', value: 0, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">Merchant Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your insurance products and policies</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color} mb-3`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-heading font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}