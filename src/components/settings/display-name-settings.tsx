"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";

export function DisplayNameSettings({ currentName }: { currentName: string | null }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Nombre actualizado");
        setEditing(false);
      }
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Tu nombre</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Se usa para saludarte al iniciar sesión.
      </p>
      {editing ? (
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="h-9 text-sm"
            disabled={isPending}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40 cursor-pointer w-full"
        >
          <span className="flex-1 text-left truncate">
            {currentName || "Sin configurar"}
          </span>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
