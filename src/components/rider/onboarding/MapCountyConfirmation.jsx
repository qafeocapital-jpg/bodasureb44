import { Check, ChevronRight, User, Bike, MapPin, Flag } from 'lucide-react';

export default function MapCountyConfirmation({ user, vehicle, county, subCounty, ward, stage, onContinue, onBack }) {
  const summarySections = [
    {
      icon: User,
      title: 'Profile',
      items: [
        { label: 'Name', value: user?.full_name },
        { label: 'Phone', value: user?.phone },
        { label: 'National ID', value: user?.national_id },
        { label: 'County', value: county?.name },
      ],
    },
    {
      icon: Bike,
      title: 'Bike',
      items: [
        { label: 'Plate', value: vehicle?.plate_number },
        { label: 'Make', value: vehicle?.make },
        { label: 'Color', value: vehicle?.color },
        { label: 'Year', value: vehicle?.year ? String(vehicle.year) : '—' },
        { label: 'Role', value: vehicle?.is_owner_rider ? 'Owner & Rider' : 'Rider only' },
      ],
    },
    {
      icon: MapPin,
      title: 'County Mapping',
      items: [
        { label: 'County', value: county?.name },
        { label: 'Sub-County', value: subCounty?.name },
        { label: 'Ward', value: ward?.name },
      ],
    },
    {
      icon: Flag,
      title: 'Stage',
      items: [
        { label: 'Stage', value: stage?.name },
      ],
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-success" strokeWidth={3} />
        </div>
        <h2 className="font-heading font-bold text-lg">Mapping Saved!</h2>
        <p className="text-xs text-muted-foreground mt-1">Review your details below before continuing</p>
      </div>

      {summarySections.map(section => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-accent border-b border-border">
              <Icon className="w-4 h-4 text-primary" />
              <p className="text-sm font-heading font-bold">{section.title}</p>
            </div>
            <div className="divide-y divide-border">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-right">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="px-5 py-3 rounded-xl border border-border text-sm font-semibold">
          Back
        </button>
        <button
          onClick={onContinue}
          className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}