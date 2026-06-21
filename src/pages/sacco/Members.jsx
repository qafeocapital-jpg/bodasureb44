import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Users, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { formatPhoneDisplay } from '@/lib/phone';

export default function SaccoMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        if (user.county_id) {
          const allUsers = await base44.entities.User.filter({ county_id: user.county_id, role: 'rider' });
          setMembers(allUsers);
        } else {
          const allUsers = await base44.entities.User.filter({ role: 'rider' });
          setMembers(allUsers);
        }
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold mb-1">Members</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage SACCO members</p>
      <div className="flex justify-end mb-3">
        <button className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t border-border hover:bg-accent/50">
                <td className="px-4 py-3 font-medium">{m.full_name || 'Unknown'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.phone ? formatPhoneDisplay(m.phone) : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(m.created_date)}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs text-blue-600 font-semibold hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No members yet</p>}
      </div>
    </div>
  );
}