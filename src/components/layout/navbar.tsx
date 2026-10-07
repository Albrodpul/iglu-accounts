"use client";

import { useState, useEffect, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
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
  Repeat,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
} from "lucide-react";
import { useBackupExport } from "@/hooks/use-backup-export";
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
import { AccountSwitcher } from "@/components/layout/account-switcher";
import type { Category } from "@/types";

const navItemsLeft = [
  { href: "/dashboard", label: "Inicio", icon: House },
  { href: "/expenses", label: "Diario", icon: List },
];

/** Desktop sidebar, second group: set up once, visited now and then. */
const sidebarManageItems = [
  { href: "/recurring", label: "Movimientos fijos", icon: Repeat },
  // The backup import is reached from Ajustes, so it keeps that entry lit.
  { href: "/settings", label: "Ajustes", icon: Settings, alsoActiveOn: "/import" },
];

const sidebarIconButtonClass =
  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/65 hover:text-sidebar-foreground";

const headerIconButtonClass =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground";

/** Past this scroll (px) the page's own title is off screen. */
const TITLE_SCROLLED = 72;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const menuRowClass =
  "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[15px] font-semibold transition-colors hover:bg-muted/50";
const menuIconClass = "h-[18px] w-[18px] shrink-0 text-muted-foreground";
const menuGroupLabelClass = "px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";


type Props = {
  accountName?: string;
  /** Accounts the user can switch between; the switcher only shows with more than one. */
  accounts?: { id: string; name: string }[];
  currentAccountId?: string | null;
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

function SidebarLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: NavIcon; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        isActive
          ? "bg-sidebar-primary/20 text-sidebar-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive && "stroke-[2.4]")} />
      {label}
    </Link>
  );
}

/** Initial of the account on a tinted square: the sidebar's "who is this" anchor. */
function AccountBadge({ name }: { name?: string }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sm font-bold uppercase text-sidebar-foreground"
    >
      {name?.trim().charAt(0) || "·"}
    </span>
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

export function Navbar({ accountName, accounts = [], currentAccountId = null, categories = [], hasInvestments = false }: Props) {
  const showAccountSwitcher = accounts.length > 1;
  const [accountsOpen, setAccountsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { exporting, error: exportError, exportBackup, clearError: clearExportError } = useBackupExport();
  const [helpOpen, setHelpOpen] = useState(false);
  const titleScrolledAway = useSyncExternalStore(subscribeScroll, () => window.scrollY > TITLE_SCROLLED, () => false);
  const [isSigningOut, startSigningOutTransition] = useTransition();
  const { discrete, toggle: toggleDiscrete } = useDiscreteMode();
  const { theme, resolved: resolvedTheme, setTheme } = useTheme();
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
    if (await exportBackup()) setMoreOpen(false);
  }

  const navItemsLeftFinal = hasInvestments
    ? [...navItemsLeft, { href: "/investments", label: "Inversiones", icon: TrendingUp }]
    : navItemsLeft;
  const sidebarMainItems = [...navItemsLeftFinal, { href: "/summary", label: "Resumen", icon: BarChart3 }];
  const sectionTitle = pathname.startsWith("/import")
    ? "Importar copia"
    : [...sidebarMainItems, ...sidebarManageItems].find((item) => pathname.startsWith(item.href))?.label;
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
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-sidebar-border/70 bg-sidebar md:flex">
        <Link href="/dashboard" className="flex h-14 shrink-0 items-center gap-2.5 px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 p-1">
            <Image src="/iglu.svg" alt="" width={24} height={24} className="drop-shadow-sm" />
          </span>
          <span className="text-[15px] font-extrabold leading-tight tracking-tight text-sidebar-foreground">Iglú Management</span>
        </Link>

        <div className="px-3 pb-1 pt-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4 stroke-[2.6]" />
            Nuevo movimiento
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {sidebarMainItems.map((item) => (
            <SidebarLink key={item.href} {...item} isActive={pathname.startsWith(item.href)} />
          ))}

          <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">Gestión</p>
          {sidebarManageItems.map(({ alsoActiveOn, ...item }) => (
            <SidebarLink
              key={item.href}
              {...item}
              isActive={pathname.startsWith(item.href) || Boolean(alsoActiveOn && pathname.startsWith(alsoActiveOn))}
            />
          ))}
        </div>

        {/* Whose data this is, and the ways out of it. */}
        <div className="flex items-center gap-0.5 border-t border-sidebar-border/60 p-2">
          {showAccountSwitcher ? (
            <button
              type="button"
              onClick={() => setAccountsOpen(true)}
              aria-label={`Cambiar de cuenta (actual: ${accountName ?? "ninguna"})`}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent/65"
            >
              <AccountBadge name={accountName} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">{accountName || "Seleccionar cuenta"}</span>
                <span className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60">
                  <ArrowLeftRight className="h-3 w-3" />
                  Cambiar
                </span>
              </span>
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 p-1.5">
              <AccountBadge name={accountName} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-sidebar-foreground">{accountName || "Mi cuenta"}</span>
            </div>
          )}
          <button type="button" onClick={() => setHelpOpen(true)} aria-label="Ayuda" title="Ayuda" className={sidebarIconButtonClass}>
            <CircleHelp className="h-4 w-4" />
          </button>
          <form action={signOut}>
            <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className={sidebarIconButtonClass}>
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </nav>

      {/* Desktop header */}
      <header className="desktop-header fixed top-0 left-56 right-0 z-30 hidden h-14 items-center gap-2 border-b border-border/50 bg-card/95 px-6 backdrop-blur-sm md:flex">
        {/* Looks like the field it opens: search is the one thing typed here. */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-64 cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground lg:w-80"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Buscar concepto o importe</span>
        </button>
        {/* Once the page's own title has scrolled away, the bar says where you are. */}
        {sectionTitle && (
          <p
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-sm font-bold transition-[opacity,transform] duration-200 xl:block",
              titleScrolledAway ? "opacity-100" : "translate-y-1 opacity-0"
            )}
          >
            {sectionTitle}
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDiscrete}
            className={headerIconButtonClass}
            aria-label={discrete ? "Mostrar importes" : "Ocultar importes"}
            title={discrete ? "Mostrar importes" : "Ocultar importes"}
          >
            {discrete ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {/* One switch here; "follow the system" lives in Ajustes > Apariencia. */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={headerIconButtonClass}
            aria-label={resolvedTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            title={resolvedTheme === "dark" ? "Tema claro" : "Tema oscuro"}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
            <button
              type="button"
              onClick={() => setAccountsOpen(true)}
              aria-label={`Cambiar de cuenta (actual: ${accountName ?? "ninguna"})`}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <ArrowLeftRight className="h-3 w-3" />
              <span className="max-w-[100px] truncate">{accountName || "Cuenta"}</span>
            </button>
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
        <div className="offline-banner fixed top-[49px] left-0 right-0 z-50 bg-amber-500 px-3 py-1 text-center text-xs font-semibold text-white md:left-56 md:top-14">
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
      <Dialog open={moreOpen} onOpenChange={(open) => { setMoreOpen(open); if (!open) clearExportError(); }}>
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
                Iglú Management · Gastos y finanzas del hogar
              </p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Global search dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} categories={categories} hasInvestments={hasInvestments} />

      <AccountSwitcher
        open={accountsOpen}
        onOpenChange={setAccountsOpen}
        accounts={accounts}
        currentAccountId={currentAccountId}
      />

      {/* Add dialog: the bottom-bar button on phones, the sidebar one on desktop. */}
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
