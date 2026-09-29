import * as React from "react";
import { Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  message: string;
  /** Primary way out of the empty state, e.g. "Añadir movimiento". */
  action?: { label: string; onClick: () => void };
  className?: string;
};

/** Empty list placeholder that doubles as a starting point, not a dead end. */
export function EmptyState({ icon: Icon, message, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {action && (
        <Button onClick={action.onClick} className="h-11 md:h-9">
          <Plus className="mr-1 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}
