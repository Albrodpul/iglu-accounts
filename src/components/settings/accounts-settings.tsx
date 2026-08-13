"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Wallet, Loader2 } from "lucide-react";
import { SwipeRow } from "@/components/ui/swipe-row";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  createAccount,
  renameAccount,
  deleteAccount,
  getAccountDataCounts,
} from "@/actions/accounts";
import type { Account } from "@/types";

type Props = {
  accounts: Account[];
};

export function AccountsSettings({ accounts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditingAccount(null);
    setName("");
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setName(account.name);
    setFormOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      if (editingAccount) {
        const result = await renameAccount(editingAccount.id, trimmed);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Cuenta renombrada");
      } else {
        const result = await createAccount(trimmed);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Cuenta creada");
      }
      setFormOpen(false);
      router.refresh();
    });
  }

  async function handleDelete(account: Account) {
    const counts = await getAccountDataCounts(account.id);
    const total =
      counts.expenses + counts.recurring + counts.categories + counts.investments;

    const parts: string[] = [];
    if (counts.expenses > 0) parts.push(`${counts.expenses} gasto(s)`);
    if (counts.recurring > 0) parts.push(`${counts.recurring} mov. fijo(s)`);
    if (counts.categories > 0) parts.push(`${counts.categories} categoría(s)`);
    if (counts.investments > 0) parts.push(`${counts.investments} fondo(s)`);

    const description =
      total > 0
        ? `Esta cuenta tiene ${parts.join(", ")}. Al eliminarla se borrarán todos estos datos permanentemente.`
        : "¿Seguro que quieres eliminar esta cuenta? Esta acción no se puede deshacer.";

    await confirm({
      title: `Eliminar "${account.name}"`,
      description,
      confirmLabel: "Eliminar cuenta",
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteAccount(account.id);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Cuenta eliminada");
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">Cuentas</p>
          <p className="text-sm text-muted-foreground">
            Gestiona las cuentas del hogar. Cada cuenta tiene sus propios gastos,
            categorías e inversiones.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <Plus className="size-4" />
          Añadir
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay cuentas creadas.</p>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <SwipeRow
              key={account.id}
              disabled={isPending}
              onTap={() => openEdit(account)}
              onDelete={() => handleDelete(account)}
              className="flex items-center justify-between rounded-md border border-border/80 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Creada:{" "}
                    {new Date(account.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </div>
              <div className="hidden gap-1 md:flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); openEdit(account); }}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(account); }}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </SwipeRow>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent variant="sheet" className="sm:max-w-sm">
          <DialogHeader variant="bar">
            <DialogTitle>
              {editingAccount ? "Renombrar cuenta" : "Nueva cuenta"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              <Input
                autoFocus
                placeholder="Nombre de la cuenta"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/70 bg-card px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row md:pb-4">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full md:h-10 md:flex-1"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-12 w-full md:h-10 md:flex-1"
                disabled={isPending || !name.trim()}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending
                  ? "Guardando..."
                  : editingAccount ? "Guardar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
}
