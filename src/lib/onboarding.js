import { User, Bike, MapPin, Flag, Users } from 'lucide-react';

export const ONBOARDING_PHASES = [
  { id: 0, name: 'Personal Profile', short: 'Profile', icon: User },
  { id: 1, name: 'Register Bike', short: 'Bike', icon: Bike },
  { id: 2, name: 'Map Bike to County', short: 'Map Bike', icon: MapPin },
  { id: 3, name: 'Join Stage', short: 'Stage', icon: Flag },
  { id: 4, name: 'Join SACCO', short: 'SACCO', icon: Users },
];

/**
 * Pure phase-detection function.
 * @returns 0–4 (first incomplete phase) or 5 (all complete)
 */
export function getOnboardingPhase(user, vehicles, groupMembers) {
  if (!user?.full_name || !user?.phone || !user?.national_id || !user?.county_id) return 0;
  if (!vehicles || vehicles.length === 0) return 1;
  const sorted = [...vehicles].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const latestBike = sorted[0];
  if (!latestBike?.sub_county_id || !latestBike?.ward_id || !latestBike?.stage_id) return 2;
  if (!user?.stage_id) return 3;
  if (user?.onboarding_complete) return 5;
  if (!groupMembers || groupMembers.length === 0) return 4;
  return 5;
}