import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "student" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  profile: { name: string; register_number: string; email: string; avatar_url: string | null } | null;
  signUp: (registerNumber: string, password: string) => Promise<{ error: any }>;
  signIn: (registerNumber: string, password: string, isAdmin?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function regToEmail(reg: string) {
  return `${reg.toLowerCase()}@student.elitecontest.app`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const fetchingRef = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // Prevent duplicate fetches for the same user
    if (fetchingRef.current || lastFetchedUserId.current === userId) return;
    fetchingRef.current = true;
    try {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("name, register_number, email, avatar_url").eq("user_id", userId).maybeSingle(),
      ]);
      if (roleData) setRole(roleData.role as UserRole);
      if (profileData) setProfile(profileData);
      lastFetchedUserId.current = userId;
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setRole(null);
        setProfile(null);
        lastFetchedUserId.current = null;
        setLoading(false);
        return;
      }

      // Use setTimeout to avoid blocking the auth callback
      // and prevent Supabase client deadlocks
      if (newSession.user.id !== lastFetchedUserId.current) {
        setTimeout(() => {
          if (mounted) {
            fetchUserData(newSession.user.id).then(() => {
              if (mounted) setLoading(false);
            });
          }
        }, 0);
      } else {
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchUserData(initialSession.user.id).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signUp = async (registerNumber: string, password: string) => {
    const regUpper = registerNumber.toUpperCase();
    const { data: allowed } = await supabase
      .from("allowed_students")
      .select("name, register_number")
      .eq("register_number", regUpper)
      .maybeSingle();

    if (!allowed) {
      return { error: { message: "Register number not found in the allowed student list." } };
    }

    const email = regToEmail(regUpper);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: allowed.name, register_number: regUpper },
      },
    });
    return { error };
  };

  const signIn = async (registerNumber: string, password: string, isAdmin = false) => {
    // Reset cached user so role is fetched fresh on login
    lastFetchedUserId.current = null;
    
    const email = isAdmin
      ? `${registerNumber.toLowerCase()}@teacher.elitecontest.app`
      : regToEmail(registerNumber.toUpperCase());
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    lastFetchedUserId.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
