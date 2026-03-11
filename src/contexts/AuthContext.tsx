import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useMsal, useAccount } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal-config";

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    avatar_url?: string;
  };
  provider: "supabase" | "azure";
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | any | null; // Can be Supabase session or MSAL session
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithAzure: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // MSAL hooks
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || {});

  useEffect(() => {
    // Check if we have an Azure session
    if (account) {
      setUser({
        id: account.localAccountId,
        email: account.username,
        user_metadata: { display_name: account.name },
        provider: "azure",
      });
      setSession({ provider: "azure", account });
      setLoading(false);
      return;
    }

    // Otherwise, check Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
          provider: "supabase",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
          provider: "supabase",
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [account]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithAzure = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login with Azure failed:", error);
    }
  };

  const signOut = async () => {
    if (user?.provider === "azure") {
      await instance.logoutPopup();
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading: loading || inProgress !== "none", 
      signUp, 
      signIn, 
      signInWithAzure,
      signOut, 
      resetPassword, 
      updatePassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
