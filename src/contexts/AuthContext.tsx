/*
 * Copyright 2026 Amerigo Di Maria
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, isDemoMode, resetDemoData } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-data";
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
  session: Session | any | null;
  loading: boolean;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  resetDemoData: () => void;
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

  const setDemoUser = () => {
    setUser({
      id: DEMO_USER_ID,
      email: "recruiter.evaluator@enterprise-ai.internal",
      user_metadata: { display_name: "Lead AI Quality Engineer (Demo Evaluator)" },
      provider: "supabase",
    });
    setSession({
      provider: "supabase",
      access_token: "mock_demo_jwt_token_showcase",
      user: { id: DEMO_USER_ID, email: "recruiter.evaluator@enterprise-ai.internal" }
    });
    setLoading(false);
  };

  useEffect(() => {
    // If in Showcase/Demo mode, automatically authenticate guest session
    if (isDemoMode) {
      setDemoUser();
      return;
    }

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
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

    supabase.auth.getSession().then(({ data: { session } }: any) => {
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

  const enterDemoMode = () => {
    setDemoUser();
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (isDemoMode) {
      setDemoUser();
      return { error: null };
    }
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
    if (isDemoMode) {
      setDemoUser();
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithAzure = async () => {
    if (isDemoMode) {
      setDemoUser();
      return;
    }
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
      isDemoMode,
      enterDemoMode,
      resetDemoData,
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
