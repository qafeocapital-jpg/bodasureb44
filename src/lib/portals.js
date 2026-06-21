export const PORTAL_ROUTES = {
  county_admin: { path: '/county/dashboard', name: 'County Portal', accent: 'emerald', color: 'bg-emerald-500' },
  sacco_admin: { path: '/sacco/dashboard', name: 'SACCO Portal', accent: 'blue', color: 'bg-blue-500' },
  merchant_admin: { path: '/merchant/dashboard', name: 'Merchant Portal', accent: 'emerald', color: 'bg-emerald-500' },
  field_agent: { path: '/agent/dashboard', name: 'Field Agent Portal', accent: 'orange', color: 'bg-orange-500' },
  stage_admin: { path: '/stage/dashboard', name: 'Stage Portal', accent: 'blue', color: 'bg-blue-500' },
  super_admin: { path: '/admin/overview', name: 'Super Admin Portal', accent: 'orange', color: 'bg-orange-500' },
};

export function getAccessiblePortals(role) {
  if (role === 'super_admin') {
    return [
      PORTAL_ROUTES.county_admin,
      PORTAL_ROUTES.sacco_admin,
      PORTAL_ROUTES.merchant_admin,
      PORTAL_ROUTES.field_agent,
      PORTAL_ROUTES.stage_admin,
      PORTAL_ROUTES.super_admin,
    ];
  }
  if (role && role !== 'rider' && PORTAL_ROUTES[role]) {
    return [PORTAL_ROUTES[role]];
  }
  return [];
}

export function hasPortalAccess(role, requiredRole) {
  if (role === 'super_admin') return true;
  return role === requiredRole;
}