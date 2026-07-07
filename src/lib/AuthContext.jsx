import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const lastInvalidatedAt = useRef(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          // No token at all — redirect to login
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
          setAuthError({
            type: 'auth_required',
            message: 'Authentication required'
          });
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      if (!currentUser || !currentUser.id) {
        // me() returned null/undefined — token is stale or session is broken
        throw { status: 401, message: 'No valid user session' };
      }
      setUser(currentUser);
      lastInvalidatedAt.current = currentUser?.session_invalidated_at || null;
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setUser(null);
      
      // If user auth fails (expired token, null user, etc.), require auth
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      lastInvalidatedAt.current = currentUser?.session_invalidated_at || null;
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const checkSessionInvalidation = async () => {
    try {
      const freshUser = await base44.auth.me();
      const freshTimestamp = freshUser?.session_invalidated_at;
      if (freshTimestamp && freshTimestamp !== lastInvalidatedAt.current) {
        lastInvalidatedAt.current = freshTimestamp;
        setUser(freshUser);
      }
    } catch (e) {
      // Silent — don't disrupt navigation
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    // Clear tokens locally first, then redirect to marketing homepage.
    // We do NOT call base44.auth.logout() here because it hard-reloads to /login.
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
    } catch (_) {}
    window.location.href = '/';
  };

  const navigateToLogin = () => {
    const pathname = window.location.pathname;
    // Guard: if already on an auth page, do NOT redirect again — prevents re-entry loop
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password')
    ) {
      return;
    }
    // Pass a clean fixed destination — never the current URL (which may contain login/from_url)
    base44.auth.redirectToLogin('/app');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      refreshUser,
      checkSessionInvalidation,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};