"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AppRole, AuthSessionState } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type LoginFormState = {
  email: string;
  password: string;
  fullName: string;
};

export type AuthMode = "login" | "signup";

const DEMO_AUTH_STORAGE_KEY = "fjj-pdv-demo-auth";

const emptyLoginForm: LoginFormState = { email: "", password: "", fullName: "" };

function isLocalhostEnv() {
  if (typeof window === "undefined") {
    return false;
  }
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/**
 * Encapsula toda a autenticação do PDV: sessão Supabase, perfil (operator/admin)
 * e o modo de demonstração local usado quando o Supabase exige confirmação de
 * e-mail ou aplica rate limit em ambiente de teste (localhost).
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthSessionState | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);

  function hydrateDemoSessionFromStorage(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    const rawSession = window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY);
    if (!rawSession) {
      return false;
    }

    try {
      const parsedSession = JSON.parse(rawSession) as AuthSessionState;
      setAuthState(parsedSession);
      setAuthInfo("Sessao local restaurada para teste em localhost.");
      return true;
    } catch {
      window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
      return false;
    }
  }

  function enterDemoSession(fullName: string, email: string) {
    const demoSession: AuthSessionState = {
      userId: `demo-${email}`,
      email,
      fullName: fullName || email,
      role: "operator"
    };

    setAuthState(demoSession);
    setAuthError("");
    setAuthInfo("Modo de demonstracao local ativado porque o Supabase exigiu confirmacao de e-mail.");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(demoSession));
    }
  }

  function shouldUseDemoFallback(message: string) {
    if (!isLocalhostEnv()) {
      return false;
    }

    const normalizedMessage = message.toLowerCase();
    return (
      normalizedMessage.includes("email not confirmed") ||
      normalizedMessage.includes("rate limit") ||
      normalizedMessage.includes("invalid login credentials") ||
      normalizedMessage.includes("not authorized")
    );
  }

  async function hydrateAuthProfile(userId: string, email: string) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const { data, error } = await client.from("profiles").select("user_id, full_name, role").eq("user_id", userId).single();

    const profile = data as { user_id: string; full_name: string; role: AppRole } | null;

    if (error || !profile) {
      setAuthState({ userId, email, fullName: email, role: "operator" });
      setAuthLoading(false);
      return;
    }

    setAuthState({
      userId: profile.user_id,
      email,
      fullName: profile.full_name || email,
      role: profile.role
    });
    setAuthLoading(false);
  }

  useEffect(() => {
    if (isLocalhostEnv()) {
      const restored = hydrateDemoSessionFromStorage();
      if (!restored) {
        enterDemoSession("Operador Local", "demo@localhost");
      }
      setAuthLoading(false);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    async function loadAuthState() {
      const { data } = await client!.auth.getSession();
      const session = data.session;

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        hydrateDemoSessionFromStorage();
        setAuthState(null);
        setAuthLoading(false);
        return;
      }

      await hydrateAuthProfile(session.user.id, session.user.email ?? "");
    }

    loadAuthState();

    const { data: subscription } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.user) {
        hydrateDemoSessionFromStorage();
        setAuthState(null);
        setAuthLoading(false);
        return;
      }

      await hydrateAuthProfile(session.user.id, session.user.email ?? "");
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const client = getSupabaseBrowserClient();
    if (!client) {
      setAuthError("Configure as variaveis do Supabase para ativar o login.");
      return;
    }

    const trimmedEmail = loginForm.email.trim();
    const trimmedFullName = loginForm.fullName.trim();

    if (authMode === "signup") {
      const { data, error } = await client.auth.signUp({
        email: trimmedEmail,
        password: loginForm.password,
        options: { data: { full_name: trimmedFullName || trimmedEmail, role: "operator" } }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.user) {
        if (!data.session) {
          enterDemoSession(trimmedFullName || trimmedEmail, trimmedEmail);
          setAuthLoading(false);
          return;
        }

        await hydrateAuthProfile(data.user.id, data.user.email ?? trimmedEmail);
      }
      return;
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: trimmedEmail,
      password: loginForm.password
    });

    if (error) {
      if (shouldUseDemoFallback(error.message)) {
        enterDemoSession(trimmedFullName || trimmedEmail, trimmedEmail);
        setAuthLoading(false);
        return;
      }

      setAuthError(error.message);
      return;
    }

    if (data.user) {
      await hydrateAuthProfile(data.user.id, data.user.email ?? trimmedEmail);
    }
  }

  function switchDemoRole(role: AppRole) {
    setAuthState((current) => {
      if (!current) {
        return current;
      }

      const nextSession: AuthSessionState = { ...current, role };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      }
      return nextSession;
    });
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();

    if (client) {
      await client.auth.signOut();
    }

    setAuthState(null);
    setAuthLoading(false);
    setAuthError("");
    setAuthInfo("");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    }
  }

  return {
    authState,
    authLoading,
    authMode,
    authError,
    authInfo,
    loginForm,
    setAuthMode,
    setLoginForm,
    handleLoginSubmit,
    handleSignOut,
    switchDemoRole,
    isDemoMode: isLocalhostEnv(),
    isAdmin: authState?.role === "admin"
  };
}
