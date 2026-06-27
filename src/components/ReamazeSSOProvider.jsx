import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Injects Reamaze SSO user data when a user is logged in,
 * so the Reamaze chat widget identifies them automatically.
 * Renders nothing — the widget itself is loaded globally via index.html.
 */
export default function ReamazeSSOProvider() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Clear any previously set user so the widget runs in anonymous mode
      if (window._support) {
        window._support['user'] = {};
      }
      return;
    }

    let cancelled = false;

    async function identifyUser() {
      try {
        const res = await base44.functions.invoke('getReamazeAuthkey', {});
        if (cancelled || !res.data?.authkey) return;

        const ssoUser = {
          id: res.data.user.id,
          email: res.data.user.email,
          name: res.data.user.name,
          phone: res.data.user.phone,
          authkey: res.data.authkey,
        };

        window._support = window._support || { ui: {}, user: {} };
        window._support['user'] = ssoUser;

        // If the widget is already loaded, update it dynamically
        if (typeof window.reamaze === 'function') {
          window.reamaze('setUser', ssoUser);
        }
      } catch (err) {
        console.error('Reamaze SSO failed:', err);
      }
    }

    identifyUser();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  return null;
}