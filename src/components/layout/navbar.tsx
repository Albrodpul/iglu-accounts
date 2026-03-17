"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  BarChart3,
  Settings,
  LogOut,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expenses/expense-form";
import type { Category } from "@/types";

const navItemsLeft = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/expenses", label: "Gastos", icon: List },
];

const navItemsRight = [
  { href: "/summary", label: "Resumen", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

const allNavItems = [...navItemsLeft, ...navItemsRight];

type Props = {
  accountName?: string;
  showAccountSwitcher?: boolean;
  categories?: Category[];
};

export function Navbar({ accountName, showAccountSwitcher = true, categories = [] }: Props) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
    const isActive = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold transition-all",
          isActive ? "bg-accent text-primary" : "text-muted-foreground"
        )}
      >
        <Icon className={cn("h-4.5 w-4.5", isActive && "stroke-[2.5]")} />
        {label}
      </Link>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="fixed inset-y-5 left-4 z-40 hidden w-64 flex-col rounded-xl border border-sidebar-border/70 bg-sidebar/95 p-3 shadow-[0_20px_45px_-24px_rgba(2,18,16,0.9)] backdrop-blur-sm md:flex">
        <div className="rounded-lg border border-sidebar-border/60 bg-white/8 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary/20">
              <span className="text-base">🛖</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-sidebar-foreground leading-tight">
                Iglú Management
              </h1>
              <p className="text-[13px] text-sidebar-foreground/88">Tus gastos personales o compartidos</p>
            </div>
          </div>
        </div>

        {accountName && showAccountSwitcher && (
          <div className="mt-3 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/55 px-4 py-3">
            <Link href="/select-account" className="group flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-sidebar-foreground/90">{accountName}</span>
              <ArrowLeftRight className="h-3 w-3 text-sidebar-foreground/35 transition-colors group-hover:text-sidebar-foreground/80" />
            </Link>
          </div>
        )}

        <div className="mt-3 flex-1 space-y-1.5">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary/22 text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(103,232,197,0.28)]"
                    : "text-sidebar-foreground/82 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "stroke-[2.4]")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-sidebar-border/60 pt-2">
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

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {/* Left items */}
          {navItemsLeft.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Center FAB */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setAddOpen(true)}
              className="relative -mt-5 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-card bg-primary text-primary-foreground cursor-pointer"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Right items */}
          {navItemsRight.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </nav>

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
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
