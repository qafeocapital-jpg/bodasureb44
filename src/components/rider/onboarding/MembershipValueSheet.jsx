import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import { Coins, TrendingUp, Shield, ArrowRight } from 'lucide-react';

export default function MembershipValueSheet({ group, onContinue, onClose }) {
  const isIndependent = group?.is_system_group || group?.type === 'independent';
  const open = !!group;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[512px] max-h-[85vh] overflow-y-auto pb-24">
        {isIndependent ? (
          <>
            <DrawerHeader>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <DrawerTitle className="text-center">Going it alone?</DrawerTitle>
              <DrawerDescription className="text-center">
                As an independent operator, you manage everything yourself — but you'll miss out on group benefits.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 space-y-2">
              <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
                <Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800">
                  You won't receive a share of permit revenue that the county distributes to registered groups — this can add up significantly over time.
                </p>
              </div>
              <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
                <Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800">
                  If there's a SACCO or welfare group in your area, consider joining to access shared savings, emergency support, and revenue distributions.
                </p>
              </div>
            </div>
            <DrawerFooter className="pb-6">
              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm"
              >
                Got it, Continue <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground py-2">
                Cancel
              </button>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerHeader>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                <Coins className="w-6 h-6 text-success" />
              </div>
              <DrawerTitle className="text-center">Your SACCO earns from every permit you pay</DrawerTitle>
              <DrawerDescription className="text-center">
                Being a member of a registered group means you benefit from county revenue sharing.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 space-y-2">
              <div className="flex items-start gap-2 bg-success/5 rounded-xl p-3">
                <TrendingUp className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  A significant share of every permit fee you pay is distributed back to your registered group — this can amount to millions of Kenya Shillings annually for active SACCOs.
                </p>
              </div>
              <div className="flex items-start gap-2 bg-success/5 rounded-xl p-3">
                <Coins className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  Your SACCO receives and manages these funds on your behalf — supporting welfare, savings, and group investments.
                </p>
              </div>
              <div className="flex items-start gap-2 bg-success/5 rounded-xl p-3">
                <Shield className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">
                  Registered members also gain access to collective bargaining, emergency support, and stronger representation with the county.
                </p>
              </div>
            </div>
            <DrawerFooter className="pb-6">
              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-1 bg-success text-success-foreground rounded-xl py-3 font-semibold text-sm"
              >
                Got it, Continue <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground py-2">
                Cancel
              </button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}