"use client";

import { HardDriveUpload, LogOut, ShieldCheck, Store, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SyncState } from "@/lib/hooks/use-offline-store";
import type { AppRole } from "@/lib/types";

export function StatusBar({
  operatorName,
  isAdmin,
  status,
  view,
  onChangeView,
  onSignOut,
  onSyncNow,
  isDemoMode,
  onSwitchDemoRole
}: {
  operatorName: string;
  isAdmin: boolean;
  status: SyncState;
  view: "caixa" | "painel";
  onChangeView: (view: "caixa" | "painel") => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  isDemoMode?: boolean;
  onSwitchDemoRole?: (role: AppRole) => void;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 shadow-glow backdrop-blur-xl md:px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Store className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-primary/80">FjjPDV</p>
          <p className="text-sm font-medium text-white">{operatorName}</p>
        </div>

        {isAdmin ? (
          <div className="ml-2 flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Alternar visao">
            <button
              type="button"
              role="tab"
              aria-selected={view === "caixa"}
              onClick={() => onChangeView("caixa")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === "caixa" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"}`}
            >
              Caixa
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "painel"}
              onClick={() => onChangeView("painel")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === "painel" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"}`}
            >
              Painel administrativo
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.online ? "success" : "danger"}>
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${status.online ? "bg-accent" : "bg-destructive"}`} aria-hidden="true" />
          {status.online ? "Online" : "Offline"}
        </Badge>
        {status.pendingJobs > 0 ? <Badge variant="warning">{status.pendingJobs} pendente{status.pendingJobs > 1 ? "s" : ""}</Badge> : null}
        <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "Operador"}</Badge>

        {isDemoMode && onSwitchDemoRole ? (
          <div className="flex items-center gap-1 rounded-xl border border-dashed border-white/15 bg-black/20 p-1" title="Apenas em modo demo local — nao existe em producao">
            <button
              type="button"
              onClick={() => onSwitchDemoRole("operator")}
              aria-pressed={!isAdmin}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${!isAdmin ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"}`}
            >
              <User className="h-3 w-3" /> Operador
            </button>
            <button
              type="button"
              onClick={() => onSwitchDemoRole("admin")}
              aria-pressed={isAdmin}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${isAdmin ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"}`}
            >
              <ShieldCheck className="h-3 w-3" /> Admin
            </button>
          </div>
        ) : null}

        <Button variant="secondary" size="sm" onClick={onSyncNow} aria-label="Sincronizar agora com o servidor">
          <HardDriveUpload className="h-4 w-4" />
          <span className="hidden sm:inline">Sincronizar</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onSignOut} aria-label="Sair da sessao">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
