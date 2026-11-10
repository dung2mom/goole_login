import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  syncUserToDatabase: (targetUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Helper to get safe redirect origin (never localhost)
 */
function getSafeRedirectOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-dev-3idiba3bv6zsqbvyv6ttpa-271096324703.asia-northeast1.run.app';
  }
  let origin = window.location.origin;
  if (!origin || origin.includes('localhost') || origin === 'null') {
    origin = 'https://ais-dev-3idiba3bv6zsqbvyv6ttpa-271096324703.asia-northeast1.run.app';
  }
  return origin;
}

/**
 * Automatically saves/syncs the authenticated user to the public.users database table.
 * Adheres to AGENTS.md database conventions.
 */
async function upsertUserInDatabase(user: User): Promise<void> {
  try {
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Learner';

    const avatarUrl = user.user_metadata?.avatar_url || null;
    const provider = user.app_metadata?.provider || 'google';

    const { error } = await supabase.from('users').upsert(
      {
        id: user.id,
        email: user.email,
        full_name: fullName,
        avatar_url: avatarUrl,
        provider: provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Sync to public.users table (info/table setup required):', error.message);
    }
  } catch (err) {
    console.warn('Error during user database sync:', err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session and listen for auth state updates
  useEffect(() => {
    let mounted = true;

    // 1. Check for URL tokens when returning from top-level full-page redirect (detectSessionInUrl)
    const detectSessionInUrl = async () => {
      if (typeof window === 'undefined') return;

      const hasHash = window.location.hash.includes('access_token');
      const hasCode = window.location.search.includes('code');

      if (hasHash || hasCode) {
        console.log('[DEBUG] Main: detectSessionInUrl - detected auth parameters in URL');
        if (hasHash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('[DEBUG] Main: attempting setSession from URL hash...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[DEBUG] Main: setSession result error from detectSessionInUrl:', error);
            } else if (data?.session?.user && mounted) {
              console.log('[DEBUG] Main: setSession result success from detectSessionInUrl, user:', data.session.user.email);
              setSession(data.session);
              setUser(data.session.user);
              upsertUserInDatabase(data.session.user);
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        }
      }
    };

    detectSessionInUrl();

    // 2. Initial check for existing Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          upsertUserInDatabase(currentSession.user);
        }
      })
      .catch((err) => {
        console.warn('Failed to retrieve auth session:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 3. Real-time auth subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      if (currentSession?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        await upsertUserInDatabase(currentSession.user);
      }
    });

    // 4. Message listener for popup window (Requirement 2.a, 2.b)
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin strictly
      if (event.origin !== window.location.origin) {
        return;
      }

      // Check message type
      if (event.data?.type === 'SUPABASE_AUTH') {
        console.log('[DEBUG] Main: message received from popup:', event.data);
        const { access_token, refresh_token } = event.data;

        if (access_token && refresh_token) {
          try {
            console.log('[DEBUG] Main: executing setSession with received tokens...');
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              console.error('[DEBUG] Main: setSession result error:', error);
            } else {
              console.log('[DEBUG] Main: setSession result success, user:', data.session?.user?.email);
              if (data.session?.user && mounted) {
                setUser(data.session.user);
                setSession(data.session);
                await upsertUserInDatabase(data.session.user);
              }
            }
          } catch (setErr) {
            console.error('[DEBUG] Main: setSession exception:', setErr);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 5. Cleanup listener on unmount (Requirement 2.c)
    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Google OAuth Login handler (handles both iframe/popup and direct/top-level redirect)
  const signInWithGoogle = useCallback(async () => {
    try {
      const isTopLevel = typeof window !== 'undefined' && window.self === window.top;
      const origin = getSafeRedirectOrigin();
      const redirectUrl = `${origin}/`;

      // Requirement 4: If opened directly in a new tab/window (not in iframe), use full-page redirect
      if (isTopLevel) {
        console.log('[DEBUG] Main: running in top-level window (window.self === window.top). Using full-page redirect flow to:', redirectUrl);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) throw error;
        return { error: null };
      }

      // If in iframe (AI Studio preview): use popup flow with skipBrowserRedirect: true
      console.log('[DEBUG] Main: running inside iframe. Initiating popup OAuth with redirectUrl:', redirectUrl);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('OAuth URL not returned by Supabase');

      const width = 500;
      const height = 650;
      const left =
        typeof window !== 'undefined'
          ? Math.max(0, window.screenX + (window.outerWidth - width) / 2)
          : 100;
      const top =
        typeof window !== 'undefined'
          ? Math.max(0, window.screenY + (window.outerHeight - height) / 2)
          : 100;

      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      // If browser blocked the popup, fall back to opening in a new tab
      if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
        window.open(data.url, '_blank');
      }

      // Requirement 2.d: Secondary fallback - monitor if popup was closed, then call getSession()
      const pollTimer = window.setInterval(async () => {
        try {
          if (authWindow && authWindow.closed) {
            window.clearInterval(pollTimer);
            console.log('[DEBUG] Main: popup closed detected (popup.closed). Checking getSession()...');
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              console.log('[DEBUG] Main: setSession result recovered after popup close, user:', sessionData.session.user.email);
              setUser(sessionData.session.user);
              setSession(sessionData.session);
              await upsertUserInDatabase(sessionData.session.user);
            }
          }
        } catch (_) {}
      }, 500);

      window.setTimeout(() => {
        window.clearInterval(pollTimer);
      }, 180000);

      return { error: null };
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      return { error: err as Error };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (err: any) {
      console.error('Sign-out error:', err);
      return { error: err as Error };
    }
  }, []);

  // Manual sync helper if needed
  const syncUserToDatabase = useCallback(async (targetUser: User) => {
    await upsertUserInDatabase(targetUser);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
    syncUserToDatabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
