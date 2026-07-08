import { User, Bike, MapPin, Users } from 'lucide-react';

export const ONBOARDING_PHASES = [
  { id: 0, name: 'Complete Profile', short: 'Profile', icon: User },
  { id: 1, name: 'Register Bike', short: 'Bike', icon: Bike },
  { id: 2, name: 'Map County', short: 'County', icon: MapPin },
  { id: 3, name: 'Select Sacco', short: 'Sacco', icon: Users },
];

/**
 * Pure phase-detection function.
 * @returns 0–3 (first incomplete phase) or 4 (all complete)
 */
export function getOnboardingPhase(user, vehicles, groupMembers, wallet) {
  // Phase 0: Personal — complete if all core fields set AND wallet is Tier 1 active
  if (!user?.full_name || !user?.phone || !user?.national_id || !user?.county_id) return 0;
  if (!wallet || wallet.status !== 'active' || wallet.tier < 1) return 0;
  // Phase 1: Bike — complete if a vehicle with plate_number exists
  if (!vehicles || vehicles.length === 0 || !vehicles[0]?.plate_number) return 1;
  const sorted = [...vehicles].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const latestBike = sorted[0];
  // Phase 2: Map — complete if vehicle has ward_id
  if (!latestBike?.ward_id) return 2;
  // Phase 3: SACCO — complete if user has group memberships
  if (!groupMembers || groupMembers.length === 0) return 3;
  return 4; // all 4 onboarding phases complete
}