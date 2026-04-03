import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Business {
  id: string;
  business_name: string;
  industry: string;
  support_email: string;
  support_phone: string;
  website_url: string;
}

type AuthContextType = {
  user: any;
  business: Business | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  business: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- AUTH SESSION ---------------- */
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;

      setUser(currentUser);
      setLoading(false); // 🔥 Only auth controls loading
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false); // 🔥 Never depend on business fetch
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ---------------- BUSINESS FETCH ---------------- */
  useEffect(() => {
    if (!user) {
      setBusiness(null);
      return;
    }

    const loadBusiness = async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data && data.length > 0) {
        setBusiness(data[0]);
      } else {
        setBusiness(null);
      }
    };

    loadBusiness();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, business, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}