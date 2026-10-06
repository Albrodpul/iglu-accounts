"use client";

import { useState } from "react";
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
 */
export function AccountSwitcher({ open, onOpenChange, accounts, currentAccountId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  async function handleSelect(accountId: string) {
    if (switchingTo) return;
    if (accountId === currentAccountId) {
      onOpenChange(false);
      return;
    }
    setSwitchingTo(accountId);
    try {
      const result = await switchAccount(accountId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      // Same screen, without its query: filters such as `?category=` hold ids
      // of the account being left.
      router.replace(pathname);
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error(SAVE_FAILED_MESSAGE);
    } finally {
      setSwitchingTo(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!switchingTo) onOpenChange(next); }}>
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
                disabled={switchingTo !== null}
                onClick={() => handleSelect(account.id)}
                className={cn(
                  "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 text-left transition-colors disabled:cursor-default",
                  current ? "border-primary/40 bg-primary/10" : "border-border/70 hover:bg-muted/50",
                  switchingTo !== null && switchingTo !== account.id && "opacity-50"
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{account.name}</span>
                {switchingTo === account.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  current && <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Cuenta actual" />
                )}
              </button>
            );
          })}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
