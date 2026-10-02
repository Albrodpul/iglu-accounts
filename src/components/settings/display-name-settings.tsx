"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import { SettingsSection } from "./settings-section";

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
    <SettingsSection title="Perfil" description="Tu nombre se usa para saludarte al iniciar sesión.">
      {editing ? (
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            className="h-11 md:h-10"
            disabled={isPending}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <Button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            aria-label="Guardar nombre"
            className="h-11 shrink-0 md:h-10"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-[15px] font-medium transition-colors hover:bg-muted/40 md:h-10"
        >
          <span className="flex-1 text-left truncate">
            {currentName || "Sin configurar"}
          </span>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </SettingsSection>
  );
}
