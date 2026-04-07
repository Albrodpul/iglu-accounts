"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import {
  House,
  List,
  BarChart3,
  Settings,
  LogOut,
  ArrowLeftRight,
  Plus,
  TrendingUp,
  Ellipsis,
  ChevronRight,
  Eye,
  EyeOff,
  Search,
  CircleHelp,
  Menu,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useDiscreteMode } from "@/contexts/discrete-mode";
import { useTheme } from "@/contexts/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { GlobalSearch } from "@/components/expenses/global-search";
import type { Category } from "@/types";

const navItemsLeft = [
  { href: "/dashboard", label: "Inicio", icon: House },
  { href: "/expenses", label: "Diario", icon: List },
];

const navItemsRight = [
  { href: "/summary", label: "Resumen", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];


type Props = {
  accountName?: string;
  showAccountSwitcher?: boolean;
  categories?: Category[];
  hasInvestments?: boolean;
};

export function Navbar({ accountName, showAccountSwitcher = true, categories = [], hasInvestments = false }: Props) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isSigningOut, startSigningOutTransition] = useTransition();
  const { discrete, toggle: toggleDiscrete } = useDiscreteMode();
  const { theme, setTheme } = useTheme();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Ctrl+K: search (works even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // Single-key shortcuts (only when not typing)
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") { e.preventDefault(); setAddOpen(true); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItemsLeftFinal = hasInvestments
    ? [...navItemsLeft, { href: "/investments", label: "Inversiones", icon: TrendingUp }]
    : navItemsLeft;
  const allNavItemsFinal = [...navItemsLeftFinal, ...navItemsRight];
  const mobileRightItems = hasInvestments
    ? [{ href: "/summary", label: "Resumen", icon: BarChart3 }]
    : navItemsRight;

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
    const isActive = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-[50px] flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-semibold transition-all",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-all",
            isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-current"
          )}
        >
          <Icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.6]")} />
        </span>
        {label}
      </Link>
    );
  }

  function NavActionItem({
    label,
    icon: Icon,
    onClick,
    isActive = false,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    isActive?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex min-h-[50px] flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-all",
            isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-current"
          )}
        >
          <Icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.6]")} />
        </span>
        {label}
      </button>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="fixed inset-y-5 left-4 z-40 hidden w-64 flex-col rounded-md border border-sidebar-border/70 bg-sidebar/95 p-3 shadow-[0_20px_45px_-24px_rgba(10,30,55,0.9)] backdrop-blur-sm md:flex">
        <div className="rounded-xl border border-sidebar-border/60 bg-white/8 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-10 items-center justify-center rounded-xl bg-sidebar-primary/20 p-1.5">
              <Image src="/iglu.svg" alt="Iglú" width={28} height={28} className="drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-sidebar-foreground leading-tight">
                Iglú Management
              </h1>
              <p className="text-[13px] text-sidebar-foreground/88">Tus gastos personales o compartidos</p>
            </div>
          </div>
        </div>

        {showAccountSwitcher && (
          <div className="mt-3 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/55 px-4 py-3">
            <Link href="/select-account" className="group flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-sidebar-foreground/90">{accountName || "Seleccionar cuenta"}</span>
              <ArrowLeftRight className="h-3 w-3 text-sidebar-foreground/35 transition-colors group-hover:text-sidebar-foreground/80" />
            </Link>
          </div>
        )}

        <div className="mt-3 flex-1 space-y-1.5">
          {allNavItemsFinal.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary/22 text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(126,200,240,0.28)]"
                    : "text-sidebar-foreground/82 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "stroke-[2.4]")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-sidebar-border/60 pt-2 space-y-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/78 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground cursor-pointer"
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
          <button
            type="button"
            onClick={toggleDiscrete}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/78 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground cursor-pointer"
          >
            {discrete ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {discrete ? "Mostrar importes" : "Ocultar importes"}
          </button>
          <div className="flex items-center gap-1 rounded-md px-3 py-1.5">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${theme === "light" ? "bg-sidebar-primary/25 text-sidebar-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"}`}
              aria-label="Tema claro"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${theme === "dark" ? "bg-sidebar-primary/25 text-sidebar-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"}`}
              aria-label="Tema oscuro"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${theme === "system" ? "bg-sidebar-primary/25 text-sidebar-foreground" : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"}`}
              aria-label="Tema del sistema"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/78 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground cursor-pointer"
          >
            <CircleHelp className="h-4 w-4" />
            Ayuda
          </button>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/78 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="mobile-header fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border/50 bg-card/95 backdrop-blur-sm px-4 py-2.5 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/12">
            <Image src="/iglu.svg" alt="Iglú" width={22} height={22} className="block" />
          </div>
          <span className="text-sm font-bold tracking-tight leading-none mt-1">Iglú</span>
        </Link>
        <div className="flex items-center gap-3">
          {showAccountSwitcher && (
            <Link
              href="/select-account"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <ArrowLeftRight className="h-3 w-3" />
              <span className="max-w-[100px] truncate">{accountName || "Cuenta"}</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center rounded-lg border border-border/60 p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
            aria-label="Buscar"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setHeaderMenuOpen(true)}
            className="flex items-center justify-center rounded-lg border border-border/60 p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
            aria-label="Menú"
          >
            <Menu className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Offline banner */}
      {offline && (
        <div className="fixed top-[49px] left-0 right-0 z-50 bg-amber-500 px-3 py-1 text-center text-xs font-semibold text-white md:top-0">
          Sin conexión — datos en caché
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        className="mobile-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.12)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative grid grid-cols-5 px-2 pt-0.5">
          {navItemsLeft.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          <div className="flex items-center justify-center">
            <button
              onClick={() => setAddOpen(true)}
              className="-mt-9 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_34px_-14px_rgba(32,87,75,0.9)] cursor-pointer"
              aria-label="Nuevo movimiento"
            >
              <Plus className="h-[23px] w-[23px] stroke-[2.5]" />
            </button>
          </div>

          {mobileRightItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {hasInvestments && (
            <NavActionItem
              label="Más"
              icon={Ellipsis}
              onClick={() => setMoreOpen(true)}
              isActive={pathname.startsWith("/settings") || pathname.startsWith("/investments")}
            />
          )}
        </div>
      </nav>

      {/* Mobile more sheet */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          showCloseButton={false}
          className="bottom-0 top-auto max-w-none translate-x-0 translate-y-0 left-0 right-0 w-full rounded-t-lg rounded-b-none border border-border bg-card p-0 md:hidden"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <DialogHeader className="px-5 pb-1 pt-4">
            <DialogTitle>Más opciones</DialogTitle>
            <DialogDescription>
              Accesos rápidos para módulos secundarios.
            </DialogDescription>
          </DialogHeader>
          <div className="px-3 pb-4">
            <Link
              href="/investments"
              onClick={() => setMoreOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <TrendingUp className="h-[18px] w-[18px] text-muted-foreground" />
                Inversiones
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Settings className="h-[18px] w-[18px] text-muted-foreground" />
                Ajustes
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile header menu */}
      <Dialog open={headerMenuOpen} onOpenChange={setHeaderMenuOpen}>
        <DialogContent
          showCloseButton={false}
          className="bottom-0 top-auto max-w-none translate-x-0 translate-y-0 left-0 right-0 w-full rounded-t-lg rounded-b-none border border-border bg-card p-0 md:hidden"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          <DialogHeader className="sr-only">
            <DialogTitle>Menú</DialogTitle>
            <DialogDescription>Opciones de la aplicación</DialogDescription>
          </DialogHeader>
          <div className="px-3 pb-4 pt-1 space-y-0.5">
            <button
              type="button"
              onClick={() => { toggleDiscrete(); setHeaderMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors hover:bg-muted/50"
            >
              {discrete ? <EyeOff className="h-[18px] w-[18px] text-muted-foreground" /> : <Eye className="h-[18px] w-[18px] text-muted-foreground" />}
              {discrete ? "Mostrar importes" : "Ocultar importes"}
            </button>
            <div className="flex items-center gap-1 px-3 py-2">
              <span className="text-sm font-semibold mr-auto">Tema</span>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`rounded-md p-2 transition-colors cursor-pointer ${theme === "light" ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`rounded-md p-2 transition-colors cursor-pointer ${theme === "dark" ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`rounded-md p-2 transition-colors cursor-pointer ${theme === "system" ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setHeaderMenuOpen(false); setHelpOpen(true); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors hover:bg-muted/50"
            >
              <CircleHelp className="h-[18px] w-[18px] text-muted-foreground" />
              Ayuda
            </button>
            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(false);
                startSigningOutTransition(async () => { await signOut(); });
              }}
              disabled={isSigningOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-rose-500 transition-colors hover:bg-muted/50 disabled:opacity-70"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Cerrar sesión
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Ayuda</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Atajos de teclado</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Buscar movimientos</span>
                  <div className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl</kbd>
                    <span className="text-xs text-muted-foreground">+</span>
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">K</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nuevo movimiento</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">N</kbd>
                </div>
              </div>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs text-muted-foreground">
                Iglú Management · Gestión de gastos personales
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global search dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-card p-0 sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader className="border-b border-border/70 bg-muted/45 px-5 py-4">
            <DialogTitle>Nuevo movimiento</DialogTitle>
            <DialogDescription>
              Registra un gasto o ingreso en pocos segundos.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <ExpenseForm
              categories={categories}
              onSuccess={() => setAddOpen(false)}
              hasInvestments={hasInvestments}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
