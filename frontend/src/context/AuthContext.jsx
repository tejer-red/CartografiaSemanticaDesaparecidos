import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import createLogger from '../utils/logger';

const logger = createLogger('AuthContext');

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

const DEV_USER = {
  id: 'dev-user-local-001',
  email: 'investigador.local@tejer.red',
  user_metadata: { name: 'Investigador Local' },
  role: 'authenticated'
};

const DEV_SESSION = {
  access_token: 'mock-dev-token',
  user: DEV_USER
};

export const AuthProvider = ({ children }) => {
  // En desarrollo o cuando no hay credenciales válidas de Supabase, omitir autenticación
  const isDev = import.meta.env.DEV || !import.meta.env.VITE_SUPABASE_URL;
  const [user, setUser] = useState(isDev ? DEV_USER : null);
  const [session, setSession] = useState(isDev ? DEV_SESSION : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDev) {
      setUser(DEV_USER);
      setSession(DEV_SESSION);
      setLoading(false);
      return;
    }

    // Fetch initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        logger.error('Error fetching session:', error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('Auth event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [isDev]);

  const signIn = async (email, password) => {
    if (isDev) {
      setUser(DEV_USER);
      setSession(DEV_SESSION);
      return { user: DEV_USER, session: DEV_SESSION };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    if (isDev) {
      setUser(DEV_USER);
      setSession(DEV_SESSION);
      return { user: DEV_USER, session: DEV_SESSION };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (isDev) {
      setUser(null);
      setSession(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getAccessToken = () => {
    return session?.access_token || null;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
