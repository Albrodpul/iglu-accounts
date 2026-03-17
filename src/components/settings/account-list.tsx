"use client";

import { useState } from "react";
import { createAccount, deleteAccount, setDefaultAccount } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Star } from "lucide-react";
import type { Account } from "@/types";

type Props = {
  accounts: Account[];
};

export function AccountList({ accounts }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createAccount(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setOpen(false);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (confirm("¿Eliminar esta cuenta? Los gastos asociados no se borrarán pero quedarán sin cuenta.")) {
      const result = await deleteAccount(id);
      if (result?.error) {
        alert("No se puede eliminar: " + result.error);
      }
    }
  }

  async function handleSetDefault(id: string) {
    await setDefaultAccount(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cuentas para organizar tus finanzas (casa, personal, etc.)
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva cuenta</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej: Casa, Personal, Inversiones..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icono (emoji)</Label>
                  <Input id="icon" name="icon" placeholder="Ej: 🏠" defaultValue="🏠" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue="#10b981"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No tienes cuentas creadas.</p>
          <p className="text-xs mt-1">Crea una cuenta para organizar tus gastos por contexto.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-lg"
                    style={{ backgroundColor: (acc.color || "#10b981") + "20" }}
                  >
                    {acc.icon}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{acc.name}</span>
                    {acc.is_default && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-semibold">
                        Por defecto
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!acc.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleSetDefault(acc.id)}
                      title="Marcar como cuenta por defecto"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(acc.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
