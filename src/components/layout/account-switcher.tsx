"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Check, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { switchAccount } from "@/actions/accounts";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SAVE_FAILED_MESSAGE } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string }[];
  currentAccountId: string | null;
};

/**
 * Switches account in place: a short sheet with the accounts, and the page you
 * were on reloads with the other account's data — no trip to a separate screen.
 * Until that data is on screen, a veil over the page says the switch is under
 * way, instead of leaving the old account's figures looking current.
 */
export function AccountSwitcher({ open, onOpenChange, accounts, currentAccountId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [switching, startSwitch] = useTransition();

  function handleSelect(account: { id: string; name: string }) {
    if (switching) return;
    if (account.id === currentAccountId) {
      onOpenChange(false);
      return;
    }
    setTarget(account);
    onOpenChange(false);
    // One transition from the click to the new data on screen: `switching`
    // stays true through the action, the navigation and the refresh.
    startSwitch(async () => {
      try {
        const result = await switchAccount(account.id);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        // Same screen, without its query: filters such as `?category=` hold ids
        // of the account being left.
        router.replace(pathname);
        router.refresh();
      } catch {
        toast.error(SAVE_FAILED_MESSAGE);
      }
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="menu" className="sm:max-w-sm">
        <DialogHeader variant="bar">
          <DialogTitle>Cambiar de cuenta</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-1.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {accounts.map((account) => {
            const current = account.id === currentAccountId;
            return (
              <button
                key={account.id}
                type="button"
                aria-current={current ? "true" : undefined}
                disabled={switching}
                onClick={() => handleSelect(account)}
                className={cn(
                  "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 text-left transition-colors disabled:cursor-default",
                  current ? "border-primary/40 bg-primary/10" : "border-border/70 hover:bg-muted/50",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{account.name}</span>
                {current && <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Cuenta actual" />}
              </button>
            );
          })}
        </DialogBody>
      </DialogContent>
    </Dialog>

    {switching && target && createPortal(
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-[15px] font-semibold">
            Cambiando a <span className="text-primary">{target.name}</span>…
          </span>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}
