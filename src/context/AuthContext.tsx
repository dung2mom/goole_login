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

    // 1. Initial check for existing session
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

    // 2. Real-time auth subscription
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

    // 3. Listen for postMessage from popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        supabase.auth.getSession().then(({ data: { session: postSession } }) => {
          if (postSession?.user && mounted) {
            setUser(postSession.user);
            setSession(postSession);
            upsertUserInDatabase(postSession.user);
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Google OAuth Login via Popup window (bypasses Google's x-frame-options: DENY in iframes)
  const signInWithGoogle = useCallback(async () => {
    try {
      // Avoid redirecting to localhost:3000 which causes ERR_CONNECTION_REFUSED in the browser.
      // Use the provided AI Studio Cloud Run URL.
      const redirectUrl =
        typeof window !== 'undefined' && window.location.origin.includes('asia-northeast1.run.app')
          ? `${window.location.origin}/`
          : 'https://ais-dev-3idiba3bv6zsqbvyv6ttpa-271096324703.asia-northeast1.run.app/';

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

      // Open the OAuth URL in a standalone popup window so it does not get blocked by Google iframe restriction
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

      // Monitor session change while popup is active
      const pollTimer = window.setInterval(async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            window.clearInterval(pollTimer);
            setUser(sessionData.session.user);
            setSession(sessionData.session);
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
          }
        } catch (_) {}
      }, 1000);

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

/**
 * Custom hook for accessing authentication state and methods anywhere in the project.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
