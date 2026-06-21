import { User, Phone, Shield, Crown } from 'lucide-react';

function PersonCard({ person, label, role }) {
  if (!person) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 text-center">
        <User className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">No {label} assigned</p>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {role === 'Owner' ? <Crown className="w-4 h-4 text-amber-500" /> : <User className="w-4 h-4 text-blue-500" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-heading font-bold text-base">{person.full_name || 'Unknown'}</p>
      {person.email && <p className="text-xs text-muted-foreground mt-0.5">{person.email}</p>}
      {person.phone && (
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Phone className="w-3 h-3" /> {person.phone}
        </p>
      )}
      {person.kyc_status && (
        <span className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold rounded-full px-2 py-0.5 ${
          person.kyc_status === 'approved' ? 'text-success bg-success/10' :
          person.kyc_status === 'pending' ? 'text-warning bg-warning/10' :
          'text-muted-foreground bg-muted'
        }`}>
          <Shield className="w-3 h-3" /> KYC: {person.kyc_status}
        </span>
      )}
    </div>
  );
}

export default function RiderTab({ owner, rider, vehicle }) {
  const isSamePerson = owner && rider && owner.id === rider.id;
  const isOwnerRider = vehicle.is_owner_rider || isSamePerson;

  return (
    <div className="space-y-3">
      {isOwnerRider ? (
        <PersonCard person={rider || owner} label="Owner-Rider" role="Owner" />
      ) : (
        <>
          <PersonCard person={owner} label="Owner" role="Owner" />
          <PersonCard person={rider} label="Assigned Rider" role="Rider" />
        </>
      )}
    </div>
  );
}