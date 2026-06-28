import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize2, X, BadgeCheck, Calendar, Bike } from 'lucide-react';
import { formatKES, formatDate } from '@/lib/format';

/**
 * PermitCard — displays the rider's active permit with a scannable QR code.
 *
 * Props:
 *   - permit: The active Permit record (or null)
 *   - vehicle: The vehicle record (for plate number)
 *   - onPayLicense: () => void (CTA when no active permit)
 */
export default function PermitCard({ permit, vehicle, onPayLicense }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!permit) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 text-center">
        <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
          <BadgeCheck className="w-7 h-7 text-warning" />
        </div>
        <p className="text-sm font-semibold mb-1">No Active Permit</p>
        <p className="text-xs text-muted-foreground mb-4">
          Pay your county licence to get a digital permit with a scannable QR code.
        </p>
        <button
          onClick={onPayLicense}
          className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Pay Licence
        </button>
      </div>
    );
  }

  const isProvisional = permit.permit_type === 'provisional';
  const daysRemaining = Math.max(0, Math.floor((new Date(permit.end_date) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${isProvisional ? 'bg-amber-50 text-amber-700' : 'bg-success/10 text-success'}`}>
                {isProvisional ? 'Provisional' : 'Full'}
              </span>
              <span className="text-[10px] font-medium text-success">Active</span>
            </div>
            <p className="text-sm font-bold capitalize">{permit.billing_cycle} Permit</p>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="p-2 rounded-lg hover:bg-accent"
            title="Show Full Screen"
          >
            <Maximize2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-xl border-2 border-border">
            <QRCodeSVG
              value={permit.qr_code_data || `BODASURE-${permit.id}`}
              size={140}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {vehicle?.plate_number && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Bike className="w-3.5 h-3.5" /> Plate
              </span>
              <span className="font-mono font-semibold">{vehicle.plate_number}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Valid Until
            </span>
            <span className="font-semibold">{formatDate(permit.end_date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Days Remaining</span>
            <span className={`font-bold ${daysRemaining <= 3 ? 'text-destructive' : 'text-success'}`}>
              {daysRemaining} days
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-semibold">{formatKES(permit.amount_paid_cents)}</span>
          </div>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-muted"
          >
            <X className="w-6 h-6 text-foreground" />
          </button>

          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`text-xs font-semibold rounded-full px-3 py-1 ${isProvisional ? 'bg-amber-50 text-amber-700' : 'bg-success/10 text-success'}`}>
                {isProvisional ? 'Provisional Permit' : 'Full Permit'}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground">BodaSure Digital Permit</p>
            {vehicle?.plate_number && (
              <p className="text-2xl font-mono font-bold text-foreground mt-2">{vehicle.plate_number}</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border-4 border-primary shadow-xl">
            <QRCodeSVG
              value={permit.qr_code_data || `BODASURE-${permit.id}`}
              size={280}
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Valid until {formatDate(permit.end_date)} · {daysRemaining} days remaining
          </p>
          <p className="text-xs text-muted-foreground mt-1">Tap anywhere to close</p>
        </div>
      )}
    </>
  );
}