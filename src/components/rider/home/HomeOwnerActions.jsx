// Owner actions: fleet banner, bike ownership verification, SACCO application status
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bike, ChevronRight, HelpCircle, Check, Layers } from 'lucide-react';

export default function HomeOwnerActions({ user, bikes, ownerBikes, setOwnerBikes, pendingSacco }) {
  return (
    <>
      {/* Owner Fleet Banner */}
      {bikes.some(b => b.owner_id === user?.id) && (
        <div className="px-4 pt-4">
          <Link to="/app/fleet" className="block bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Bike className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">My Fleet</p>
              <p className="text-xs text-orange-100">Manage your bikes — permits, insurance & earnings</p>
            </div>
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Owner Verify My Bike Section */}
      {ownerBikes.length > 0 && (
        <div className="px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-700">Verify Your Bike</p>
            </div>
            <p className="text-[10px] text-amber-600 mb-3">
              A rider has registered {ownerBikes.length === 1 ? 'a bike' : `${ownerBikes.length} bikes`} with you as the owner. Please confirm ownership.
            </p>
            <div className="space-y-2">
              {ownerBikes.map(bike => (
                <div key={bike.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{bike.plate_number}</p>
                    <p className="text-[10px] text-muted-foreground">{bike.make} · {bike.color}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        await base44.entities.Vehicle.update(bike.id, { owner_verified: true });
                        setOwnerBikes(prev => prev.filter(b => b.id !== bike.id));
                      }}
                      className="flex items-center gap-1 bg-success text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      <Check className="w-3 h-3" /> Confirm
                    </button>
                    <a
                      href="mailto:support@bodasure.com"
                      className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      Dispute
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending SACCO Application Banner */}
      {pendingSacco && (
        <div className="px-4 pt-4">
          <div className={`rounded-xl p-4 border ${pendingSacco.status === 'rejected' ? 'bg-destructive/5 border-destructive/20' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <Layers className={`w-5 h-5 flex-shrink-0 mt-0.5 ${pendingSacco.status === 'rejected' ? 'text-destructive' : 'text-blue-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${pendingSacco.status === 'rejected' ? 'text-destructive' : 'text-blue-900'}`}>
                  {pendingSacco.status === 'rejected' ? 'Application Rejected' : 'SACCO Application Under Review'}
                </p>
                <p className={`text-xs mt-0.5 ${pendingSacco.status === 'rejected' ? 'text-destructive/80' : 'text-blue-700'}`}>
                  {pendingSacco.status === 'rejected'
                    ? pendingSacco.description || pendingSacco.group_rejection_reason || 'Please contact support for details.'
                    : `Your registration for ${pendingSacco.name} is pending Super Admin approval.`}
                </p>
                {pendingSacco.status === 'rejected' && (
                  <Link to="/app/groups/register-sacco" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
                    Resubmit <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}