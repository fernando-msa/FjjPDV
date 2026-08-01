"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Barcode,
  Banknote,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  HardDriveUpload,
  LogIn,
  LogOut,
  ScanLine,
  ShoppingCart,
  Signal,
  Sparkles,
  Store,
  WalletCards,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { demoMetrics, demoProducts, paymentLabels } from "@/lib/mock-data";
import type { AppRole, AuthSessionState, CartItem, CashMovement, CashSession, PaymentMethod, PendingSyncJob, PdvSnapshot, Product, Sale } from "@/lib/types";
import { loadSnapshot, saveSnapshot, upsertMovements, upsertProducts, upsertQueue, upsertSales } from "@/lib/local-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type SyncState = {
  online: boolean;
  lastSyncAt?: string;
  pendingJobs: number;
};

type LoginFormState = {
  email: string;
  password: string;
  fullName: string;
};

type AuthMode = "login" | "signup";

const DEMO_AUTH_STORAGE_KEY = "fjj-pdv-demo-auth";

const defaultSession: CashSession = {
  id: "session-001",
  openedAt: new Date().toISOString(),
  openingBalance: 250,
  totalCashSales: 0,
  movements: [
    {
      id: "movement-opening",
      type: "opening",
      amount: 250,
      note: "Abertura do caixa",
      createdAt: new Date().toISOString()
    }
  ],
  status: "open"
};

const seedMovements: CashMovement[] = defaultSession.movements;
const seedSales: Sale[] = [];
const seedQueue: PendingSyncJob[] = [];

export function PdvApp() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [sales, setSales] = useState<Sale[]>(seedSales);
  const [movements, setMovements] = useState<CashMovement[]>(seedMovements);
  const [sessions, setSessions] = useState<CashSession[]>([defaultSession]);
  const [queue, setQueue] = useState<PendingSyncJob[]>(seedQueue);
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerDiscount, setCustomerDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cashReceived, setCashReceived] = useState(0);
  const [supplierNote, setSupplierNote] = useState("");
  const [supplyAmount, setSupplyAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [status, setStatus] = useState<SyncState>({ online: true, pendingJobs: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [authState, setAuthState] = useState<AuthSessionState | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "",
    password: "",
    fullName: ""
  });

  const activeSession = sessions[0] ?? defaultSession;
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return products.slice(0, 12);
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const total = Math.max(subtotal - customerDiscount, 0);
  const totalPaid = paymentMethod === "cash" ? cashReceived : total;
  const change = Math.max(totalPaid - total, 0);
  const lowStockItems = products.filter((product) => product.stock <= product.minStock).slice(0, 5);
  const recentSales = sales.slice(0, 6);
  const isCashSale = paymentMethod === "cash";
  const isAdmin = authState?.role === "admin";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocalhost = host === "localhost" || host === "127.0.0.1";

      if (isLocalhost) {
        hydrateDemoSessionFromStorage();

        if (!authState) {
          enterDemoSession("Operador Local", "demo@localhost");
          setAuthLoading(false);
        }

        return;
      }
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }

    const supabase = client;

    let mounted = true;

    async function loadAuthState() {
      const { data } = await supabase.auth.getSession();
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

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const snapshot = await loadSnapshot();
      if (!mounted) {
        return;
      }

      if (snapshot.products.length > 0) {
        setProducts(snapshot.products);
      } else {
        await upsertProducts(demoProducts);
      }

      if (snapshot.sales.length > 0) {
        setSales(snapshot.sales);
      }

      if (snapshot.movements.length > 0) {
        setMovements(snapshot.movements);
      }

      if (snapshot.sessions.length > 0) {
        setSessions(snapshot.sessions);
      }

      if (snapshot.queue.length > 0) {
        setQueue(snapshot.queue);
      }

      setStatus((current) => ({
        ...current,
        pendingJobs: snapshot.queue.length,
        online: navigator.onLine
      }));
      setHydrated(true);
    }

    loadData();

    const syncOnlineState = () => setStatus((current) => ({ ...current, online: true }));
    const syncOfflineState = () => setStatus((current) => ({ ...current, online: false }));

    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOfflineState);

    return () => {
      mounted = false;
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOfflineState);
    };
  }, []);

  useEffect(() => {
    async function persist() {
      if (!hydrated) {
        return;
      }

      const snapshot: PdvSnapshot = {
        products,
        sales,
        movements,
        sessions,
        queue
      };

      await saveSnapshot(snapshot);
    }

    persist();
  }, [hydrated, movements, products, queue, sales, sessions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!authState) {
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "F4") {
        event.preventDefault();
        finalizeSale();
      }

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSupplyMovement();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authState]);

  async function hydrateAuthProfile(userId: string, email: string) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const { data, error } = await client.from("profiles").select("user_id, full_name, role").eq("user_id", userId).single();

    const profile = data as
      | {
          user_id: string;
          full_name: string;
          role: AppRole;
        }
      | null;

    if (error || !profile) {
      setAuthState({
        userId,
        email,
        fullName: email,
        role: "operator"
      });
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

  function hydrateDemoSessionFromStorage() {
    if (typeof window === "undefined") {
      return;
    }

    const rawSession = window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY);
    if (!rawSession) {
      return;
    }

    try {
      const parsedSession = JSON.parse(rawSession) as AuthSessionState;
      setAuthState(parsedSession);
      setAuthInfo("Sessao local restaurada para teste em localhost.");
    } catch {
      window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
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
    if (typeof window === "undefined") {
      return false;
    }

    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";
    const normalizedMessage = message.toLowerCase();

    return isLocalhost && (
      normalizedMessage.includes("email not confirmed") ||
      normalizedMessage.includes("rate limit") ||
      normalizedMessage.includes("invalid login credentials") ||
      normalizedMessage.includes("not authorized")
    );
  }

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
        options: {
          data: {
            full_name: trimmedFullName || trimmedEmail,
            role: "operator"
          }
        }
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

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    await client.auth.signOut();
    setAuthState(null);
    setAuthLoading(false);
    setAuthError("");
    setAuthInfo("");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
    }
  }

  async function createSaleAndQueueSale(nextSale: Sale) {
    const nextSales = [nextSale, ...sales];
    const nextQueue = [
      {
        id: `queue-${nextSale.id}`,
        entity: "sale" as const,
        payload: nextSale,
        createdAt: nextSale.createdAt
      },
      ...queue
    ];

    setSales(nextSales);
    setQueue(nextQueue);
    setStatus((current) => ({ ...current, pendingJobs: nextQueue.length }));

    await upsertSales(nextSales);
    await upsertQueue(nextQueue);

    if (navigator.onLine) {
      await syncSaleToSupabase(nextSale);
    }
  }

  function addItem(product: Product) {
    setCart((current) => {
      const existingItem = current.find((item) => item.productId === product.id);
      if (existingItem) {
        return current.map((item) => {
          if (item.productId === product.id) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      }

      return [
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          quantity: 1,
          unitPrice: product.price
        },
        ...current
      ];
    });
  }

  function applyBarcodeSearch() {
    const product = products.find((item) => item.barcode === scanValue.trim());
    if (!product) {
      return;
    }

    addItem(product);
    setSearch(product.name);
    setScanValue("");
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  function adjustItem(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          return { ...item, quantity: Math.max(item.quantity + delta, 1) };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function resetSaleForm() {
    setCart([]);
    setCustomerDiscount(0);
    setCashReceived(0);
    setScanValue("");
    setSearch("");
    setPaymentMethod("pix");
  }

  async function finalizeSale() {
    if (cart.length === 0 || total <= 0) {
      return;
    }

    const saleId = `sale-${Date.now()}`;
    const payload: Sale = {
      id: saleId,
      number: `PDV-${String(sales.length + 1).padStart(6, "0")}`,
      total,
      subtotal,
      discount: customerDiscount,
      paymentMethod,
      paidAmount: totalPaid,
      change,
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      })),
      cashier: "Operador 01",
      cashierSessionId: activeSession.id,
      createdAt: new Date().toISOString(),
      syncStatus: navigator.onLine ? "synced" : "pending",
      syncedAt: navigator.onLine ? new Date().toISOString() : undefined
    };

    const updatedProducts = products.map((product) => {
      const soldItem = cart.find((item) => item.productId === product.id);
      if (!soldItem) {
        return product;
      }

      return {
        ...product,
        stock: Math.max(product.stock - soldItem.quantity, 0)
      };
    });

    setProducts(updatedProducts);
    setSessions((current) => [
      {
        ...activeSession,
        totalCashSales: activeSession.totalCashSales + (paymentMethod === "cash" ? total : 0),
        movements: activeSession.movements
      },
      ...current.slice(1)
    ]);
    setCart([]);
    setCustomerDiscount(0);
    setCashReceived(0);
    setSearch("");
    setScanValue("");

    await createSaleAndQueueSale(payload);
    await upsertProducts(updatedProducts);
  }

  async function handleSupplyMovement() {
    if (supplyAmount <= 0) {
      return;
    }

    const movement: CashMovement = {
      id: `movement-${Date.now()}`,
      type: "supply",
      amount: supplyAmount,
      note: supplierNote || "Suprimento manual",
      createdAt: new Date().toISOString()
    };

    const nextMovements = [movement, ...movements];
    setMovements(nextMovements);
    setSupplierNote("");
    setSupplyAmount(0);

    await upsertMovements(nextMovements);

    if (navigator.onLine) {
      await syncMovementToSupabase(movement);
    }
  }

  async function handleWithdrawalMovement() {
    if (withdrawAmount <= 0) {
      return;
    }

    const movement: CashMovement = {
      id: `movement-${Date.now()}`,
      type: "withdrawal",
      amount: withdrawAmount,
      note: "Sangria registrada no caixa",
      createdAt: new Date().toISOString()
    };

    const nextMovements = [movement, ...movements];
    setMovements(nextMovements);
    setWithdrawAmount(0);

    await upsertMovements(nextMovements);

    if (navigator.onLine) {
      await syncMovementToSupabase(movement);
    }
  }

  async function syncNow() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const pendingSales = sales.filter((sale) => sale.syncStatus !== "synced");
    for (const sale of pendingSales) {
      await syncSaleToSupabase(sale);
    }

    const pendingMovements = movements.filter((movement) => movement.type !== "opening");
    for (const movement of pendingMovements) {
      await syncMovementToSupabase(movement);
    }

    setQueue([]);
    setStatus((current) => ({ ...current, pendingJobs: 0, lastSyncAt: new Date().toISOString() }));
    await upsertQueue([]);
  }

  async function syncSaleToSupabase(sale: Sale) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const saleRecord = {
      id: sale.id,
      number: sale.number,
      total: sale.total,
      subtotal: sale.subtotal,
      discount: sale.discount,
      payment_method: sale.paymentMethod,
      paid_amount: sale.paidAmount,
      change: sale.change,
      cashier: sale.cashier,
      cashier_session_id: sale.cashierSessionId,
      created_at: sale.createdAt,
      sync_status: "synced"
    } as Record<string, unknown>;

    const { error } = await (client.from("sales") as any).upsert(saleRecord);

    if (error) {
      return;
    }

    const saleItems = sale.items.map((item) => ({
        sale_id: sale.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice
    })) as Record<string, unknown>[];

    await (client.from("sale_items") as any).upsert(saleItems);

    setSales((current) =>
      current.map((item) =>
        item.id === sale.id
          ? {
              ...item,
              syncStatus: "synced",
              syncedAt: new Date().toISOString()
            }
          : item
      )
    );
  }

  async function syncMovementToSupabase(movement: CashMovement) {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const movementRecord = {
      id: movement.id,
      movement_type: movement.type,
      amount: movement.amount,
      note: movement.note,
      created_at: movement.createdAt
    } as Record<string, unknown>;

    await (client.from("cash_movements") as any).upsert(movementRecord);
  }

  const metrics = useMemo(() => {
    const revenue = sales.reduce((accumulator: number, sale: Sale) => accumulator + sale.total, 0);
    return {
      ...demoMetrics,
      salesToday: sales.length || demoMetrics.salesToday,
      revenueToday: revenue || demoMetrics.revenueToday,
      averageTicket: sales.length > 0 ? revenue / sales.length : demoMetrics.averageTicket
    };
  }, [sales]);

  if (authLoading) {
    return (
      <main className="pdv-grid flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-sm text-muted-foreground">Carregando autenticacao...</CardContent>
        </Card>
      </main>
    );
  }

  if (!authState) {
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

              {authError ? <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{authError}</p> : null}
              {authInfo ? <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">{authInfo}</p> : null}

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

  return (
    <main className="pdv-grid min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 p-4 md:p-6 xl:p-8">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glow backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/80">FjjPDV</p>
                  <h1 className="text-2xl font-semibold md:text-3xl">Operacao de caixa com checkout rapido, estoque e sync offline-first</h1>
                </div>
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                Acesso por teclado com F2 para busca, F4 para finalizar venda e Ctrl+S para registrar suprimento. O fluxo grava tudo localmente e prepara a sincronizacao com Supabase assim que a rede voltar.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={status.online ? "success" : "warning"}>
                {status.online ? "Online" : "Offline"}
              </Badge>
              <Badge variant={status.pendingJobs > 0 ? "warning" : "success"}>
                {status.pendingJobs > 0 ? `${status.pendingJobs} pendencias` : "Fila vazia"}
              </Badge>
              <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "Operador"}</Badge>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
              <Button variant="secondary" onClick={syncNow}>
                <HardDriveUpload className="h-4 w-4" />
                Sincronizar agora
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Faturamento de hoje" value={metrics.revenueToday} icon={<CircleDollarSign className="h-5 w-5" />} suffix="BRL" accent="from-teal-500/20 to-cyan-500/10" />
          <MetricCard title="Ticket medio" value={metrics.averageTicket} icon={<Calculator className="h-5 w-5" />} suffix="BRL" accent="from-sky-500/20 to-blue-500/10" />
          <MetricCard title="Vendas no dia" value={metrics.salesToday} icon={<ShoppingCart className="h-5 w-5" />} suffix="vendas" accent="from-emerald-500/20 to-lime-500/10" />
          <MetricCard title="Caixa atual" value={activeSession.openingBalance + movements.reduce((acc, movement) => acc + (movement.type === "supply" ? movement.amount : movement.type === "withdrawal" ? -movement.amount : 0), 0)} icon={<WalletCards className="h-5 w-5" />} suffix="BRL" accent="from-amber-500/20 to-orange-500/10" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Frente de caixa</CardTitle>
                  <CardDescription>Busca instantanea por nome, SKU ou codigo de barras.</CardDescription>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative w-full md:w-[360px]">
                    <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="F2 para focar. Pesquise por produto ou categoria" />
                  </div>
                  <div className="flex gap-2">
                    <Input value={scanValue} onChange={(event) => setScanValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyBarcodeSearch()} placeholder="Simular leitor de codigo" className="md:w-56" />
                    <Button variant="outline" onClick={applyBarcodeSearch}>
                      <ScanLine className="h-4 w-4" />
                      Ler
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addItem(product)}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category} | {product.sku}</p>
                      </div>
                      <Badge variant={product.stock <= product.minStock ? "warning" : "secondary"}>{product.stock} em estoque</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Venda</span>
                      <strong className="text-lg text-primary">R$ {product.price.toFixed(2)}</strong>
                    </div>
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Carrinho
                  </div>
                  <Badge variant="outline">{cart.length} itens</Badge>
                </div>

                {cart.length === 0 ? (
                  <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                    Nenhum item adicionado. Use os atalhos ou clique em um produto.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {cart.map((item) => (
                      <div key={item.productId} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{item.name}</p>
                            <Badge variant="secondary">{item.barcode}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">R$ {item.unitPrice.toFixed(2)} por unidade</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center rounded-xl border border-white/10 bg-white/5">
                            <Button variant="ghost" size="icon" onClick={() => adjustItem(item.productId, -1)}>-</Button>
                            <span className="min-w-12 px-3 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="ghost" size="icon" onClick={() => adjustItem(item.productId, 1)}>+</Button>
                          </div>
                          <div className="min-w-28 text-right font-semibold text-primary">R$ {(item.unitPrice * item.quantity).toFixed(2)}</div>
                          <Button variant="outline" size="sm" onClick={() => removeItem(item.productId)}>Remover</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pagamento e fechamento</CardTitle>
                <CardDescription>Pix, cartao e dinheiro com calculo de troco automatico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <PaymentButton active={paymentMethod === "pix"} onClick={() => setPaymentMethod("pix")} label="Pix" icon={<Banknote className="h-4 w-4" />} />
                  <PaymentButton active={paymentMethod === "card"} onClick={() => setPaymentMethod("card")} label="Cartao" icon={<CreditCard className="h-4 w-4" />} />
                  <PaymentButton active={paymentMethod === "cash"} onClick={() => setPaymentMethod("cash")} label="Dinheiro" icon={<CircleDollarSign className="h-4 w-4" />} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Desconto" value={customerDiscount} onChange={setCustomerDiscount} />
                  <Field label="Valor recebido" value={cashReceived} onChange={setCashReceived} disabled={!isCashSale} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <SummaryLine label="Subtotal" value={subtotal} />
                  <SummaryLine label="Desconto" value={customerDiscount} />
                  <SummaryLine label="Total" value={total} strong />
                  <SummaryLine label="Recebido" value={totalPaid} />
                  <SummaryLine label="Troco" value={change} />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={finalizeSale} disabled={cart.length === 0}>
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizar venda
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={resetSaleForm}>
                    Limpar tela
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Movimentacao de caixa</CardTitle>
                <CardDescription>Abertura, suprimento, sangria e visao do saldo em tempo real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Suprimento" value={supplyAmount} onChange={setSupplyAmount} />
                  <Field label="Sangria" value={withdrawAmount} onChange={setWithdrawAmount} />
                </div>
                <Input value={supplierNote} onChange={(event) => setSupplierNote(event.target.value)} placeholder="Observacao do movimento" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" className="flex-1" onClick={handleSupplyMovement}>
                    <Download className="h-4 w-4" />
                    Registrar suprimento
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleWithdrawalMovement}>
                    <Banknote className="h-4 w-4" />
                    Registrar sangria
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <MiniStatus label="Abertura" value={format(new Date(activeSession.openedAt), "dd/MM HH:mm")} />
                  <MiniStatus label="Status do caixa" value={activeSession.status === "open" ? "Aberto" : "Fechado"} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Estoque e alertas</CardTitle>
                <CardDescription>Margem, preco de custo e ponto minimo com atualizacao automatica pos-venda.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Preco</th>
                        <th className="px-4 py-3">Custo</th>
                        <th className="px-4 py-3">Margem</th>
                        <th className="px-4 py-3">Estoque</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {products.slice(0, 8).map((product) => {
                        const margin = ((product.price - product.cost) / product.cost) * 100;
                        return (
                          <tr key={product.id} className="bg-white/0">
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.category}</div>
                            </td>
                            <td className="px-4 py-3">R$ {product.price.toFixed(2)}</td>
                            <td className="px-4 py-3">R$ {product.cost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-primary">{margin.toFixed(1)}%</td>
                            <td className="px-4 py-3">
                              <Badge variant={product.stock <= product.minStock ? "warning" : "success"}>
                                {product.stock} / {product.minStock}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Estoque e alertas</CardTitle>
                <CardDescription>Seu perfil atual permite consultar, mas nao administrar o cadastro completo de produtos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {lowStockItems.length === 0 ? <p>Nenhum item abaixo do minimo.</p> : lowStockItems.map((product) => <MiniStatus key={product.id} label={product.name} value={`Estoque ${product.stock} / minimo ${product.minStock}`} />)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Painel administrativo</CardTitle>
              <CardDescription>{isAdmin ? "Visao rapida para faturamento, ticket medio e produtos mais vendidos." : "Resumo operacional do seu caixa."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.topProducts.map((product) => (
                  <div key={product.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-medium text-white">{product.name}</p>
                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{product.quantity} unidades</span>
                      <span>R$ {product.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <WifiOff className="h-4 w-4 text-primary" />
                  Fila local e integracao
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vendas e movimentos ficam guardados no IndexedDB primeiro. Quando o Supabase estiver acessivel, o sistema tenta sincronizar a fila sem travar a operacao do caixa.
                </p>
              </div>

              {isAdmin ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Signal className="h-4 w-4 text-primary" />
                    Perfis e permissao
                  </div>
                  <p className="mt-2">Admin pode ver a plataforma completa; operador fica restrito ao checkout e ao resumo essencial.</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-white">
                  <Signal className="h-4 w-4 text-primary" />
                  Ultima sincronizacao
                </div>
                <p className="mt-2">{status.lastSyncAt ? format(new Date(status.lastSyncAt), "dd/MM/yyyy HH:mm:ss") : "Sem sincronizacao nesta sessao"}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h4 className="flex items-center gap-2 text-sm font-medium text-white">
                  <Barcode className="h-4 w-4 text-primary" />
                  Atalhos de uso rapido
                </h4>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>F2: foco na busca de produtos</li>
                  <li>F4: finalizar venda</li>
                  <li>Ctrl+S: registrar suprimento</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Ultimas vendas</CardTitle>
              <CardDescription>Historico persistido localmente com estado de sincronizacao por venda.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {recentSales.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
                    Nenhuma venda registrada ainda.
                  </div>
                ) : (
                  recentSales.map((sale) => (
                    <div key={sale.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{sale.number}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                        <Badge variant={sale.syncStatus === "synced" ? "success" : sale.syncStatus === "failed" ? "danger" : "warning"}>{sale.syncStatus}</Badge>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <SummaryLine label="Total" value={sale.total} strong />
                        <SummaryLine label="Pagamento" value={paymentLabels[sale.paymentMethod]} />
                        <SummaryLine label="Itens" value={sale.items.length} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  suffix,
  icon,
  accent
}: {
  title: string;
  value: number;
  suffix: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-br ${accent} p-5`}>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span className="rounded-full border border-white/10 bg-white/10 p-2 text-white">{icon}</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-white">{typeof value === "number" ? value.toFixed(value >= 100 ? 0 : 2) : value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/65">{suffix}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PaymentButton({
  active,
  onClick,
  label,
  icon
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-white">{label}</span>
      <Input type="number" min="0" step="0.01" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}

function SummaryLine({
  label,
  value,
  strong
}: {
  label: string;
  value: number | string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 text-sm ${strong ? "text-base font-semibold text-white" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{typeof value === "number" ? `R$ ${value.toFixed(2)}` : value}</span>
    </div>
  );
}

function MiniStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}