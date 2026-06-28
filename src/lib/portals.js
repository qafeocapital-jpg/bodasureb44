export const PORTAL_ROUTES = {
  county_admin: { path: '/county/dashboard', name: 'County Portal', accent: 'orange', color: 'bg-orange-500' },
  sacco_admin: { path: '/sacco/dashboard', name: 'SACCO Portal', accent: 'blue', color: 'bg-blue-500' },
  merchant_admin: { path: '/merchant/dashboard', name: 'Merchant Portal', accent: 'emerald', color: 'bg-emerald-500' },
  field_agent: { path: '/agent/dashboard', name: 'Field Agent Portal', accent: 'orange', color: 'bg-orange-500' },
  stage_admin: { path: '/stage/dashboard', name: 'Stage Portal', accent: 'blue', color: 'bg-blue-500' },
  bodasure_staff: { path: '/admin/overview', name: 'Admin Portal', accent: 'indigo', color: 'bg-indigo-500' },
  super_admin: { path: '/admin/overview', name: 'Super Admin Portal', accent: 'orange', color: 'bg-orange-500' },
  rider: { path: '/app', name: 'Rider App', accent: 'orange', color: 'bg-orange-500' },
  owner: { path: '/app/fleet', name: 'My Fleet', accent: 'orange', color: 'bg-orange-500' },
};

/**
 * Derives accessible portals from a user's roles array.
 * Falls back to legacy single role string for backward compatibility.
 * @param {object} user - User entity with roles[] and/or role string
 * @param {boolean} isOwner - Whether user owns any vehicles (derived)
 */
export function getAccessiblePortals(user, isOwner = false) {
  if (!user) return [];

  // Build effective roles array from both `roles` array and legacy `role` string
  const roles = new Set(user.roles || []);
  if (user.role && user.role !== 'rider') roles.add(user.role);
  // 'rider' is always implied as the base portal
  roles.add('rider');
  // Owner is derived from vehicle ownership
  if (isOwner) roles.add('owner');

  const portals = [];
  // Always include rider portal first (it's the default)
  portals.push(PORTAL_ROUTES.rider);
  // Owner portal (if applicable)
  if (roles.has('owner')) portals.push(PORTAL_ROUTES.owner);
  // Staff portals in priority order
  const staffOrder = ['sacco_admin', 'stage_admin', 'county_admin', 'merchant_admin', 'field_agent', 'super_admin'];
  for (const r of staffOrder) {
    if (roles.has(r)) portals.push(PORTAL_ROUTES[r]);
  }
  return portals;
}

/**
 * Returns true if the user has access to the required role portal.
 * Checks both the roles array and the legacy role string.
 */
export function hasPortalAccess(user, requiredRole) {
  if (!user) return false;
  const roles = new Set(user.roles || []);
  if (user.role) roles.add(user.role);
  if (roles.has('super_admin')) return true;
  // bodasure_staff can access all staff portals
  if (roles.has('bodasure_staff') && requiredRole !== 'super_admin') {
    return ['county_admin', 'sacco_admin', 'merchant_admin', 'field_agent', 'stage_admin'].includes(requiredRole);
  }
  return roles.has(requiredRole);
}

/**
 * Returns the primary staff role for layout/routing purposes.
 */
export function getPrimaryStaffRole(user) {
  if (!user) return null;
  const roles = new Set(user.roles || []);
  if (user.role && user.role !== 'rider') roles.add(user.role);
  const priority = ['super_admin', 'county_admin', 'sacco_admin', 'merchant_admin', 'stage_admin', 'field_agent', 'bodasure_staff'];
  for (const r of priority) {
    if (roles.has(r)) return r;
  }
  return null;
}

/**
 * Returns true if user is a BodaSure Staff member (read-only admin).
 * Excludes super admins.
 */
export function isStaffRole(user) {
  if (!user) return false;
  const roles = new Set(user.roles || []);
  return roles.has('bodasure_staff') && !roles.has('super_admin');
}