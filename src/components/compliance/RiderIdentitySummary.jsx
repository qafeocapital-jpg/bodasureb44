import { User, Phone, MapPin, Users } from 'lucide-react';

export default function RiderIdentitySummary({ user, vehicle, kycDocs, group }) {
  const selfiDoc = kycDocs?.find(d => d.document_type === 'selfie' && d.file_url);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
        Your Rider Profile
      </p>

      <div className="flex items-start gap-4 mb-5">
        {/* Rider Photo */}
        {selfiDoc?.file_url ? (
          <img
            src={selfiDoc.file_url}
            alt={user?.full_name}
            className="w-16 h-16 rounded-full object-cover bg-muted flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-heading font-bold mb-3">{user?.full_name}</h2>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-medium w-20">ID:</span>
              <span className="font-mono">{user?.national_id}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-medium w-20">Phone:</span>
              <span>{user?.phone}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">{vehicle?.county_id || 'N/A'}</span>
            </div>

            {group && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">{group.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plate Chip */}
      {vehicle?.plate_number && (
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-3 text-center border-2 border-amber-300">
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest">
            License Plate
          </p>
          <p className="text-2xl font-mono font-bold text-amber-900 mt-1">{vehicle.plate_number}</p>
        </div>
      )}
    </div>
  );
}