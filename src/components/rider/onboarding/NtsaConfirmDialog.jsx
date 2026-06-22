import { useState, useEffect } from 'react';
import { formatPlate } from '@/lib/plate';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldAlert } from 'lucide-react';

/**
 * NTSA confirmation dialog shown before saving a plate number.
 * Requires the user to tick a checkbox before the confirm button is enabled.
 */
export default function NtsaConfirmDialog({ open, plate, onConfirm, onCancel, confirmLabel = 'Confirm & Register' }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) setConfirmed(false);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <AlertDialogTitle>Confirm Your Number Plate</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You have entered{' '}
            <strong className="text-foreground font-bold">{formatPlate(plate)}</strong>{' '}
            as the registered number plate of your motorcycle. This number plate will be verified with the National Transport and Safety Authority (NTSA). Please ensure this is the correct and official number plate of the bike you ride or own. Entering an incorrect plate may delay or reject your registration.
          </p>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={confirmed} onCheckedChange={setConfirmed} className="mt-0.5" />
            <span className="text-sm">I confirm this is the correct and official number plate of the bike I ride or own.</span>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm()}
            disabled={!confirmed}
            className={!confirmed ? 'opacity-50 pointer-events-none' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}