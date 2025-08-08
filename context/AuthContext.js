import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
useEffect(() => {
  const restoreSession = async () => {
    try {
      const storedSessionString = localStorage.getItem('session');
      if (storedSessionString) {
        const storedSession = JSON.parse(storedSessionString);
        if (storedSession?.access_token && storedSession?.refresh_token) {
          // Restore session into Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token,
          });
          
          if (error) {
            console.error('Error restoring session:', error);
            // Clear invalid stored session
            localStorage.removeItem('session');
          }
          // Note: Don't set user here, let onAuthStateChange handle it
        }
      }
    } catch (error) {
      console.error('Error parsing stored session:', error);
      localStorage.removeItem('session');
    }
  };

  restoreSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    
    setLoading(false);
  });

  return () => {
    subscription?.unsubscribe();
  };
}, []);

  const value = {
    user,
    loading,
    signOut: () => supabase.auth.signOut()
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}