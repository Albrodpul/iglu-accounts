"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { toLocalISODate } from "@/lib/dates";
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
  Repeat,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  Database,
} from "lucide-react";
import { exportAccountData } from "@/actions/export";
import { useIsOffline } from "@/hooks/use-browser-state";
import { OPEN_ADD_MOVEMENT_EVENT } from "@/lib/add-movement";
import { useDiscreteMode } from "@/contexts/discrete-mode";
import { useTheme } from "@/contexts/theme";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { MovementDialog } from "@/components/expenses/movement-dialog";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { GlobalSearch } from "@/components/expenses/global-search";
import type { Category } from "@/types";

const navItemsLeft = [
  { href: "/dashboard", label: "Inicio", icon: House },
  { href: "/expenses", label: "Diario", icon: List },
];

const navItemsRight = [
  { href: "/summary", label: "Resumen", icon: BarChart3 },
  { href: "/recurring", label: "Movimientos fijos", icon: Repeat },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

const menuRowClass =
  "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[15px] font-semibold transition-colors hover:bg-muted/50";
const menuIconClass = "h-[18px] w-[18px] shrink-0 text-muted-foreground";
const menuGroupLabelClass = "px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";


type Props = {
  accountName?: string;
  showAccountSwitcher?: boolean;
  categories?: Category[];
  hasInvestments?: boolean;
};

type NavIcon = React.ComponentType<{ className?: string }>;

const bottomNavItemClass =
  "flex min-h-[50px] flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-semibold transition-all";

function BottomNavContent({ label, icon: Icon, isActive }: { label: string; icon: NavIcon; isActive: boolean }) {
  return (
    <>
      <span
        className={cn(
          // The coloured pill behind the icon is the shared sliding indicator.
          "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300",
          isActive ? "text-primary-foreground" : "text-current"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.6]")} />
      </span>
      {label}
    </>
  );
}

function NavItem({ href, label, icon, isActive }: { href: string; label: string; icon: NavIcon; isActive: boolean }) {
  return (
    <Link href={href} className={cn(bottomNavItemClass, isActive ? "text-foreground" : "text-muted-foreground")}>
      <BottomNavContent label={label} icon={icon} isActive={isActive} />
    </Link>
  );
}

function NavActionItem({
  label,
  icon,
  onClick,
  isActive = false,
}: {
  label: string;
  icon: NavIcon;
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(bottomNavItemClass, "cursor-pointer", isActive ? "text-foreground" : "text-muted-foreground")}
    >
      <BottomNavContent label={label} icon={icon} isActive={isActive} />
    </button>
  );
}

export function Navbar({ accountName, showAccountSwitcher = true, categories = [], hasInvestments = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(() => pathname.startsWith("/import"));
  const [isSigningOut, startSigningOutTransition] = useTransition();
  const { discrete, toggle: toggleDiscrete } = useDiscreteMode();
  const { theme, setTheme } = useTheme();
  const offline = useIsOffline();

  // PWA shortcut (?add=1) opens the add dialog. State is adjusted during render
  // (once per arrival of the param); the effect only strips it from the URL.
  const addRequested = searchParams.get("add") === "1";
  const [handledAddRequest, setHandledAddRequest] = useState(false);
  if (addRequested !== handledAddRequest) {
    setHandledAddRequest(addRequested);
    if (addRequested) setAddOpen(true);
  }
  useEffect(() => {
    if (addRequested) router.replace(pathname, { scroll: false });
  }, [addRequested, pathname, router]);

  // Empty states anywhere can ask for the add dialog (see lib/add-movement).
  useEffect(() => {
    const open = () => setAddOpen(true);
    window.addEventListener(OPEN_ADD_MOVEMENT_EVENT, open);
    return () => window.removeEventListener(OPEN_ADD_MOVEMENT_EVENT, open);
  }, []);

  // Landing on /import expands the "Copia de seguridad" group.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (pathname.startsWith("/import")) setDataOpen(true);
  }

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


  async function handleExport() {
    setExporting(true);
    setExportError(null);
    const result = await exportAccountData();
    setExporting(false);
    if (result.error) {
      setExportError(result.error);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iglu-backup-${toLocalISODate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMoreOpen(false);
  }

  const navItemsLeftFinal = hasInvestments
    ? [...navItemsLeft, { href: "/investments", label: "Inversiones", icon: TrendingUp }]
    : navItemsLeft;
  const allNavItemsFinal = [...navItemsLeftFinal, ...navItemsRight];
  // With investments, "Inversiones" earns the bottom-bar slot and "Resumen"
  // moves into the "Más" sheet; without it, "Resumen" keeps the slot.
  const mobileRightItems = hasInvestments
    ? [{ href: "/investments", label: "Inversiones", icon: TrendingUp }]
    : [{ href: "/summary", label: "Resumen", icon: BarChart3 }];
  const moreSheetRoutes = [
    "/settings",
    "/recurring",
    "/import",
    ...(hasInvestments ? ["/summary"] : []),
  ];

  // Column (of 5; the FAB owns column 2) holding the active bottom-nav item.
  const leftActive = navItemsLeft.findIndex((item) => pathname.startsWith(item.href));
  const activeColumn =
    leftActive >= 0
      ? leftActive
      : mobileRightItems.some((item) => pathname.startsWith(item.href))
        ? 3
        : moreSheetRoutes.some((route) => pathname.startsWith(route))
          ? 4
          : null;
  // Remember the last column so the pill fades in place instead of sliding from 0.
  const [indicatorColumn, setIndicatorColumn] = useState(activeColumn ?? 0);
  if (activeColumn !== null && activeColumn !== indicatorColumn) setIndicatorColumn(activeColumn);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border/70 bg-sidebar md:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-sidebar-border/50 px-5 py-[18px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/20 p-1.5">
            <Image src="/iglu.svg" alt="Iglú" width={26} height={26} className="drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-tight text-sidebar-foreground leading-tight">
              Iglú Management
            </h1>
            <p className="text-[11px] text-sidebar-foreground/65">Gastos personales</p>
          </div>
        </div>

        {/* Account switcher */}
        {showAccountSwitcher && (
          <div className="border-b border-sidebar-border/50 px-4 py-3">
            <Link href="/select-account" className="group flex items-center justify-between rounded-md px-1">
              <span className="truncate text-[13px] font-semibold text-sidebar-foreground/80">{accountName || "Seleccionar cuenta"}</span>
              <ArrowLeftRight className="h-3 w-3 text-sidebar-foreground/35 transition-colors group-hover:text-sidebar-foreground/80" />
            </Link>
          </div>
        )}

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
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

          {/* Datos collapsible */}
          <button
            type="button"
            onClick={() => setDataOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-all duration-200",
              pathname.startsWith("/import")
                ? "bg-sidebar-primary/22 text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(126,200,240,0.28)]"
                : "text-sidebar-foreground/82 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground"
            )}
          >
            <Database className={cn("h-4 w-4", pathname.startsWith("/import") && "stroke-[2.4]")} />
            Copia de seguridad
            <ChevronRight className={cn("ml-auto h-3.5 w-3.5 transition-transform duration-200", dataOpen && "rotate-90")} />
          </button>
          {dataOpen && (
            <div className="ml-3 space-y-0.5 border-l border-sidebar-border/50 pl-3">
              <Link
                href="/import"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-semibold transition-all",
                  pathname.startsWith("/import")
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground"
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                Importar
              </Link>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[14px] font-semibold text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent/65 hover:text-sidebar-foreground disabled:opacity-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exportando…" : "Exportar"}
              </button>
              {exportError && <p className="px-3 text-[11px] text-rose-400">{exportError}</p>}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="border-t border-sidebar-border/60 px-3 py-3 space-y-0.5">
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

      {/* Desktop header */}
      <header className="desktop-header fixed top-0 left-64 right-0 z-30 hidden h-14 items-center justify-end border-b border-border/50 bg-card/95 backdrop-blur-sm px-6 md:flex gap-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          Buscar
          <kbd className="ml-0.5 rounded border border-border bg-background px-1 py-px text-[10px] font-mono leading-none">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={toggleDiscrete}
          className="flex items-center justify-center rounded-md border border-border/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground cursor-pointer"
          aria-label={discrete ? "Mostrar importes" : "Ocultar importes"}
        >
          {discrete ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <div className="flex items-center rounded-md border border-border/50 bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`rounded p-1.5 transition-colors cursor-pointer ${theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Tema claro"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`rounded p-1.5 transition-colors cursor-pointer ${theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Tema oscuro"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`rounded p-1.5 transition-colors cursor-pointer ${theme === "system" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Tema del sistema"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

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
        </div>
      </header>

      {/* Offline banner */}
      {offline && (
        <div className="offline-banner fixed top-[49px] left-0 right-0 z-50 bg-amber-500 px-3 py-1 text-center text-xs font-semibold text-white md:left-64 md:top-14">
          Sin conexión — datos en caché
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        className="mobile-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.12)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative grid grid-cols-5 px-2 pt-0.5">
          {/* One pill shared by all items: it slides to the active column. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-2 top-2 flex w-[calc((100%-1rem)/5)] justify-center transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              activeColumn === null && "opacity-0"
            )}
            style={{ transform: `translateX(${indicatorColumn * 100}%)` }}
          >
            <span className="h-9 w-9 rounded-full bg-primary shadow-sm" />
          </div>
          {navItemsLeft.map((item) => (
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
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
            <NavItem key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}

          <NavActionItem
            label="Más"
            icon={Ellipsis}
            onClick={() => setMoreOpen(true)}
            isActive={moreSheetRoutes.some((route) => pathname.startsWith(route))}
          />
        </div>
      </nav>

      {/* Mobile menu: everything that isn't in the bottom bar, in one place. */}
      <Dialog open={moreOpen} onOpenChange={(open) => { setMoreOpen(open); if (!open) setExportError(null); }}>
        <DialogContent variant="menu" showCloseButton={false} className="md:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Menú</DialogTitle>
            <DialogDescription>Otras pantallas, copia de seguridad y preferencias</DialogDescription>
          </DialogHeader>
          <DialogBody className="px-3 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {hasInvestments && (
              <Link href="/summary" onClick={() => setMoreOpen(false)} className={menuRowClass}>
                <BarChart3 className={menuIconClass} />
                <span className="flex-1">Resumen</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
            <Link href="/recurring" onClick={() => setMoreOpen(false)} className={menuRowClass}>
              <Repeat className={menuIconClass} />
              <span className="flex-1">Movimientos fijos</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/settings" onClick={() => setMoreOpen(false)} className={menuRowClass}>
              <Settings className={menuIconClass} />
              <span className="flex-1">Ajustes</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <p className={menuGroupLabelClass}>Copia de seguridad</p>
            <Link href="/import" onClick={() => setMoreOpen(false)} className={menuRowClass}>
              <Upload className={menuIconClass} />
              <span className="flex-1">Importar</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <button type="button" onClick={handleExport} disabled={exporting} className={cn(menuRowClass, "disabled:opacity-60")}>
              <Download className={menuIconClass} />
              {exporting ? "Exportando..." : "Exportar"}
            </button>
            {exportError && <p className="px-3 text-xs text-expense">{exportError}</p>}

            <p className={menuGroupLabelClass}>Preferencias</p>
            <div className={cn(menuRowClass, "cursor-default hover:bg-transparent")}>
              {discrete ? <EyeOff className={menuIconClass} /> : <Eye className={menuIconClass} />}
              <span id="menu-discrete-label" className="flex-1">Ocultar importes</span>
              <ToggleSwitch enabled={discrete} onToggle={toggleDiscrete} aria-labelledby="menu-discrete-label" />
            </div>
            <div className={cn(menuRowClass, "cursor-default hover:bg-transparent")}>
              <Sun className={menuIconClass} />
              <span className="flex-1">Tema</span>
              <div role="group" aria-label="Tema" className="flex items-center gap-1 rounded-lg bg-muted/70 p-1">
                {(
                  [
                    ["light", "Claro", Sun],
                    ["dark", "Oscuro", Moon],
                    ["system", "Sistema", Monitor],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-label={label}
                    aria-pressed={theme === value}
                    className={cn(
                      "flex h-9 w-10 cursor-pointer items-center justify-center rounded-md transition-colors",
                      theme === value ? "bg-card text-foreground shadow-sm dark:bg-white/10" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 border-t border-border/60 pt-2">
              <button type="button" onClick={() => { setMoreOpen(false); setHelpOpen(true); }} className={menuRowClass}>
                <CircleHelp className={menuIconClass} />
                Ayuda
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  startSigningOutTransition(async () => { await signOut(); });
                }}
                disabled={isSigningOut}
                className={cn(menuRowClass, "text-expense disabled:opacity-70")}
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader variant="bar">
            <DialogTitle>Ayuda</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="md:hidden">
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Gestos en las listas</p>
              <ul className="space-y-2 text-sm">
                <li>Toca un movimiento para editarlo.</li>
                <li>Deslízalo a la izquierda para borrarlo (se puede deshacer).</li>
                <li>Deslízalo a la derecha para duplicarlo.</li>
                <li>Arrastra una hoja hacia abajo para cerrarla.</li>
              </ul>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-muted-foreground mb-2">Atajos de teclado</p>
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
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Global search dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile add dialog */}
      <MovementDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        hasInvestments={hasInvestments}
        onSuccess={() => setAddOpen(false)}
      />
    </>
  );
}
