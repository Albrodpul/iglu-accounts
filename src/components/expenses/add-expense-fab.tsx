"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovementDialog } from "./movement-dialog";
import type { Category } from "@/types";

type Props = {
  categories: Category[];
  hasInvestments?: boolean;
};

export function AddExpenseFab({ categories, hasInvestments = false }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 z-50 hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_14px_30px_-14px_rgba(32,87,75,0.85)] md:flex"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <MovementDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        hasInvestments={hasInvestments}
        onSuccess={() => { setOpen(false); router.refresh(); }}
      />
    </>
  );
}
