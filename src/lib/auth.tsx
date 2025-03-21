import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signOut: () => Promise<void>;
  failedAttempts: number;
  setFailedAttempts: (attempts: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        // Clear any stored auth data
        await supabase.auth.signOut();
        localStorage.removeItem('supabase.auth.token');
      }
      setLoading(false);
    });

    // Reset failed attempts after lockout duration
    const resetTimer = setTimeout(() => {
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        setFailedAttempts(0);
      }
    }, LOCKOUT_DURATION);

    return () => {
      subscription.unsubscribe();
      clearTimeout(resetTimer);
    };
  }, [failedAttempts]);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    try {
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        return {
          error: new Error(`Too many failed attempts. Please try again in ${LOCKOUT_DURATION / 60000} minutes.`),
          success: false,
        };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: rememberMe,
        },
      });

      if (error) {
        setFailedAttempts(prev => prev + 1);
        return {
          error,
          success: false,
        };
      }

      setFailedAttempts(0);
      return {
        error: null,
        success: true,
      };
    } catch (error) {
      setFailedAttempts(prev => prev + 1);
      return {
        error: error as Error,
        success: false,
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setFailedAttempts(0);
    // Clear any stored auth data
    localStorage.removeItem('supabase.auth.token');
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signOut,
    failedAttempts,
    setFailedAttempts,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}