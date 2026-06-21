import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { ChevronLeft, MapPin, Users, BadgeCheck, AlertCircle, Bell } from 'lucide-react';

export default function Stage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await base44.auth.me();
        if (u?.stage_id) {
          const stages = await base44.entities.Stage.filter({ id: u.stage_id });
          if (stages.length > 0) {
            setStage(stages[0]);
            // Get riders at this stage
            const stageMembers = await base44.entities.User.filter({ stage_id: u.stage_id, staff_type: 'none' });
            setMembers(stageMembers);
          }
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-5 text-sm text-muted-foreground">Loading...</div>;

  if (!stage) {
    return (
      <div className="p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-heading font-bold">My Stage</h1>
        </div>
        <div className="bg-accent rounded-2xl p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No stage assigned yet. Complete your profile to select a stage.</p>
          <button onClick={() => navigate('/app/profile')} className="mt-4 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold">
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  const compliantCount = members.filter(m => m.profile_complete).length;

  return (
    <div className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-heading font-bold">My Stage</h1>
      </div>

      {/* Stage Info Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5" />
          <p className="font-heading font-bold text-lg">{stage.name}</p>
        </div>
        <p className="text-xs text-blue-100">Stage gathering point</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-heading font-bold">{members.length}</p>
          <p className="text-[10px] text-muted-foreground">Members</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <BadgeCheck className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-lg font-heading font-bold">{compliantCount}</p>
          <p className="text-[10px] text-muted-foreground">Compliant</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <AlertCircle className="w-5 h-5 text-warning mx-auto mb-1" />
          <p className="text-lg font-heading font-bold">{members.length - compliantCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      </div>

      {/* Notices */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-heading font-bold">Stage Notices</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">No active notices</p>
      </div>

      {/* Member Roster */}
      <h2 className="text-sm font-heading font-bold mb-3">Member Roster</h2>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No members at this stage yet</p>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{m.full_name || 'Unknown Rider'}</p>
                <p className="text-[10px] text-muted-foreground">{m.phone || 'No phone'}</p>
              </div>
              {m.profile_complete ? (
                <BadgeCheck className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}