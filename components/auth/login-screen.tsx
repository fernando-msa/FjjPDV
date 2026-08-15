"use client";

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { useAuth } from "@/lib/hooks/use-auth";

export function LoginScreen({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const { authMode, setAuthMode, loginForm, setLoginForm, authError, authInfo, handleLoginSubmit } = auth;

  return (
    <main className="pdv-grid flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle>Acesso ao PDV</CardTitle>
          <CardDescription>Entre com sua conta para operar o caixa. Novos usuarios entram como operador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex gap-2">
            <Button variant={authMode === "login" ? "default" : "outline"} className="flex-1" onClick={() => setAuthMode("login")}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
            <Button variant={authMode === "signup" ? "default" : "outline"} className="flex-1" onClick={() => setAuthMode("signup")}>
              <LogIn className="h-4 w-4" />
              Criar conta
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            {authMode === "signup" ? (
              <label className="space-y-2 text-sm">
                <span className="font-medium text-white">Nome completo</span>
                <Input value={loginForm.fullName} onChange={(event) => setLoginForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Operador 01" />
              </label>
            ) : null}

            <label className="space-y-2 text-sm">
              <span className="font-medium text-white">Email</span>
              <Input type="email" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} placeholder="operador@empresa.com" />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-white">Senha</span>
              <Input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} placeholder="********" />
            </label>

            {authError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{authError}</p> : null}
            {authInfo ? <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{authInfo}</p> : null}

            <Button className="w-full" type="submit">
              <LogIn className="h-4 w-4" />
              {authMode === "login" ? "Entrar" : "Criar usuario"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            O papel admin controla areas administrativas. Para promover um usuario, atualize a tabela profiles no Supabase.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
