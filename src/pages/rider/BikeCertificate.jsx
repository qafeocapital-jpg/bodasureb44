import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { ChevronLeft, QrCode, BadgeCheck, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import PageSkeleton from '@/components/rider/PageSkeleton';

export default function BikeCertificate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [bike, setBike] = useState(null);
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const b = await base44.entities.Vehicle.filter({ id: id });
        if (b.length > 0) setBike(b[0]);
        const perms = await base44.entities.Permit.filter({ vehicle_id: id, status: 'active' }, '-created_date', 5);
        setPermits(perms);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <PageSkeleton variant="hero-rows" />;

  if (!bike) return (
    <div className="p-5 text-center">
      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Bike not found</p>
    </div>
  );

  const activePermit = permits[0];
  const isCompliant = bike.status === 'approved' && activePermit;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">Certificate</h1>
      </div>

      {/* Certificate Card */}
      <div className="bg-gradient-to-br from-primary to-orange-600 rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-orange-100">BodaSure Digital Permit</p>
            <p className="font-heading font-bold text-lg">{bike.plate_number}</p>
          </div>
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
            <QrCode className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-orange-100">Make</span>
            <span className="font-semibold">{bike.make} {bike.model}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-orange-100">Color</span>
            <span className="font-semibold">{bike.color}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-orange-100">Status</span>
            <span className="font-semibold capitalize">{bike.status}</span>
          </div>
          {activePermit && (
            <>
              <div className="border-t border-white/20 pt-2 flex justify-between text-xs">
                <span className="text-orange-100">Permit Type</span>
                <span className="font-semibold capitalize">{activePermit.billing_cycle}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-orange-100">Valid From</span>
                <span className="font-semibold">{formatDate(activePermit.start_date)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-orange-100">Valid Until</span>
                <span className="font-semibold">{formatDate(activePermit.end_date)}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {isCompliant ? (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold">Compliant</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold">Not Compliant</span>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="mt-5">
        <h2 className="text-sm font-heading font-bold mb-3">Compliance Checklist</h2>
        <div className="space-y-2">
          {[
            { label: 'Bike Registered', done: true },
            { label: 'Bike Approved by County', done: bike.status === 'approved' },
            { label: 'Active Permit', done: !!activePermit },
            { label: 'Valid QR Code', done: isCompliant },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              {item.done ? <BadgeCheck className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-muted-foreground" />}
              <span className={`text-sm ${item.done ? 'font-medium' : 'text-muted-foreground'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {isCompliant && (
        <button className="w-full mt-5 flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-semibold hover:bg-accent transition-colors">
          <Download className="w-4 h-4" /> Download Certificate
        </button>
      )}
    </div>
  );
}