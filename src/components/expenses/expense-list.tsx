"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteExpense, deleteExpenses, setExpensesCategory } from "@/actions/expenses";
import { formatDayHeader } from "@/lib/format";
import { toLocalISODate } from "@/lib/dates";
import { splitRecurringNotes } from "@/lib/recurring";
import { dismissGestureHint, gestureHintVisible, subscribeGestureHint } from "@/lib/gesture-hint";
import { useMediaQuery } from "@/hooks/use-browser-state";
import { Amount } from "@/components/ui/amount";
import { useUndoableDelete } from "@/hooks/use-undoable-delete";
import { MovementDialog } from "./movement-dialog";
import { CategoryTile } from "./category-picker";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { isReservedCategoryName } from "@/lib/reserved-categories";
import { SwipeRow } from "@/components/ui/swipe-row";
import { EmptyState } from "@/components/ui/empty-state";
import { openAddMovement } from "@/lib/add-movement";
import { Pencil, Trash2, ArrowUp, ArrowUpDown, Copy, ReceiptText, CalendarClock, ChevronDown, Hand, Repeat, StickyNote, X, Check, CheckCheck, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, ExpenseWithCategory } from "@/types";

/**
 * Undo-delete key: both legs of a transfer share their pair id, so deleting
 * one hides the other too (the server deletes the pair together).
 */
function deleteKey(expense: ExpenseWithCategory): string {
  return expense.transfer_pair_id ? `pair:${expense.transfer_pair_id}` : expense.id;
}

/** Scrolled far enough that getting back to the start of the list is a chore. */
const FAR_DOWN = 1200;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

type Props = {
  expenses: ExpenseWithCategory[];
  categories: Category[];
  sortable?: boolean;
  externalSortAsc?: boolean;
  showYear?: boolean;
  hasInvestments?: boolean;
  debtCategoryId?: string | null;
  transferCategoryId?: string | null;
  onMutated?: () => void;
  /** Pin each day header (date + day total) under the app header while scrolling. */
  stickyDayHeaders?: boolean;
  /** Tuck movements dated after today into a collapsed "Próximos" section. */
  collapseFuture?: boolean;
  /** Teach the row gestures on touch devices (self-retiring tip + nudge). */
  gestureHint?: boolean;
  /** Floating shortcut back to the start of the list (today) after a long scroll. */
  backToStart?: boolean;
  /**
   * Selection mode, owned by the parent so its filters can start it too. Passing
   * `onSelectingChange` is what makes the list selectable (long press on touch).
   */
  selecting?: boolean;
  onSelectingChange?: (selecting: boolean) => void;
};

const plural = (count: number) => `${count} ${count === 1 ? "movimiento" : "movimientos"}`;

const barButtonClass =
  "flex h-12 min-w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent md:h-9 md:flex-row md:gap-1.5 md:px-3 md:text-xs";

export function ExpenseList({ expenses, categories, sortable = true, externalSortAsc, showYear = false, hasInvestments = false, debtCategoryId = null, transferCategoryId = null, onMutated, stickyDayHeaders = false, collapseFuture = false, gestureHint = false, backToStart = false, selecting = false, onSelectingChange }: Props) {
  const [editingExpense, setEditingExpense] = useState<ExpenseWithCategory | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<ExpenseWithCategory | null>(null);
  const [internalSortAsc, setInternalSortAsc] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const listStartRef = useRef<HTMLDivElement>(null);
  const farDown = useSyncExternalStore(subscribeScroll, () => window.scrollY > FAR_DOWN, () => false);
  const isTouch = useMediaQuery("(pointer: coarse)");
  const hintPending = useSyncExternalStore(subscribeGestureHint, gestureHintVisible, () => false);
  const showHint = gestureHint && isTouch && hintPending;
  const sortAsc = sortable ? internalSortAsc : (externalSortAsc ?? false);
  const { pendingIds, scheduleDelete } = useUndoableDelete();
  const router = useRouter();
  // Keys (see `deleteKey`) of the selected rows: both legs of a transfer go together.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const selectable = Boolean(onSelectingChange);

  // Escape leaves selection mode, unless it is busy closing a dialog on top.
  useEffect(() => {
    if (!selecting) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      setSelected(new Set());
      onSelectingChange?.(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, onSelectingChange]);

  const notifyMutated = onMutated ?? (() => router.refresh());

  // Rows deleted but still inside their undo window are hidden right away.
  const visibleExpenses = expenses.filter((e) => !pendingIds.has(deleteKey(e)));

  if (visibleExpenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        message="No hay movimientos en este periodo"
        action={{ label: "Añadir movimiento", onClick: openAddMovement }}
      />
    );
  }

  // Group by date
  const grouped = visibleExpenses.reduce(
    (acc, expense) => {
      const date = expense.expense_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(expense);
      return acc;
    },
    {} as Record<string, ExpenseWithCategory[]>
  );

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    sortAsc ? a.localeCompare(b) : b.localeCompare(a)
  );

  // Movements dated after today are ones the user entered ahead of time. They
  // only get their own section when there is something else to show first.
  const today = toLocalISODate();
  const futureDates = collapseFuture ? sortedDates.filter((d) => d > today) : [];
  const hasFutureSection = futureDates.length > 0 && futureDates.length < sortedDates.length;
  const mainDates = hasFutureSection ? sortedDates.filter((d) => d <= today) : sortedDates;
  const futureExpenses = hasFutureSection ? futureDates.flatMap((d) => grouped[d]) : [];
  const firstRowId = grouped[mainDates[0]]?.[0]?.id;

  /** Day total as shown in headers: debts and transfers aren't income or spending. */
  const netOf = (items: ExpenseWithCategory[]) =>
    items
      .filter((e) => !debtCategoryId || e.category_id !== debtCategoryId)
      .filter((e) => !transferCategoryId || e.category_id !== transferCategoryId)
      .reduce((sum, e) => sum + e.amount, 0);

  function handleDelete(expense: ExpenseWithCategory) {
    const isTransfer = !!(transferCategoryId && expense.category_id === transferCategoryId);
    scheduleDelete(deleteKey(expense), {
      // A transfer is two linked movements; the server removes both, and the
      // shared key hides both legs during the undo window.
      message: isTransfer ? "Traspaso eliminado" : "Movimiento eliminado",
      commit: () => deleteExpense(expense.id),
      onCommitted: notifyMutated,
    });
  }

  // Only rows on screen count: nothing hidden gets changed or deleted.
  const reachable = hasFutureSection && !futureOpen ? mainDates.flatMap((d) => grouped[d]) : visibleExpenses;
  const selectedRows = selecting ? reachable.filter((e) => selected.has(deleteKey(e))) : [];
  const allSelected = reachable.length > 0 && selectedRows.length === reachable.length;
  const pickableCategories = categories.filter((c) => !isReservedCategoryName(c.name));

  function exitSelection() {
    setSelected(new Set());
    setCategoryOpen(false);
    onSelectingChange?.(false);
  }

  function toggleSelected(expense: ExpenseWithCategory) {
    const key = deleteKey(expense);
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function startSelecting(expense: ExpenseWithCategory) {
    dismissGestureHint();
    setSelected(new Set([deleteKey(expense)]));
    onSelectingChange?.(true);
  }

  async function applyCategory(category: Category) {
    if (applying) return;
    setApplying(true);
    const count = selectedRows.length;
    const result = await setExpensesCategory(selectedRows.map((e) => e.id), category.id);
    setApplying(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const skipped = count - result.updated;
    const skippedNote =
      skipped > 0
        ? { description: `${plural(skipped)} sin cambios: ingresos, deudas y traspasos mantienen su categoría.` }
        : undefined;
    if (result.updated === 0) toast.error("No se ha cambiado ningún movimiento", skippedNote);
    else toast.success(`${plural(result.updated)} en ${category.name}`, skippedNote);
    exitSelection();
    if (result.updated > 0) notifyMutated();
  }

  async function deleteSelected() {
    const rows = selectedRows;
    const outcome: { result?: Awaited<ReturnType<typeof deleteExpenses>> } = {};
    const confirmed = await confirm({
      title: `Eliminar ${plural(rows.length)}`,
      description: "Se borrarán de forma definitiva. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "destructive",
      onConfirm: async () => {
        outcome.result = await deleteExpenses(rows.map((e) => e.id));
      },
    });
    const { result } = outcome;
    if (!confirmed || !result) return;
    if ("error" in result) toast.error(result.error);
    else toast.success(`${plural(result.deleted)} ${result.deleted === 1 ? "eliminado" : "eliminados"}`);
    exitSelection();
    notifyMutated();
  }

  function renderDay(date: string, dateIndex: number) {
    const dayExpenses = grouped[date];
    const dayTotal = netOf(dayExpenses);

    return (
      <div key={date}>
        {dateIndex > 0 && (
          <div className="my-1 border-t border-border/40" />
        )}
        <div
          className={cn(
            "mb-2 mt-3 flex items-center justify-between px-1",
            stickyDayHeaders &&
              // Mobile header is 53px tall; tuck 1px under its border so no content peeks through.
              "sticky top-[52px] z-10 md:top-14 -mx-1 mt-2 rounded-lg bg-card/95 px-3 py-1.5 backdrop-blur-md"
          )}
        >
          <span className="text-sm font-semibold text-muted-foreground">
            {formatDayHeader(date, showYear)}
          </span>
          <span
            className={`text-xs font-bold tabular-nums ${dayTotal >= 0 ? "text-income" : "text-expense"}`}
          >
            <Amount value={dayTotal} />
          </span>
        </div>
        <div className="space-y-1">
          {dayExpenses.map((expense) => {
            const noteParts = splitRecurringNotes(expense.notes);
            const isSelected = selecting && selected.has(deleteKey(expense));
            return (
            <SwipeRow
              key={expense.id}
              onTap={() => (selecting ? toggleSelected(expense) : setEditingExpense(expense))}
              onLongPress={selectable ? () => startSelecting(expense) : undefined}
              disabled={selecting}
              onDelete={() => {
                dismissGestureHint();
                handleDelete(expense);
              }}
              onDuplicate={() => {
                dismissGestureHint();
                setDuplicatingExpense(expense);
              }}
              peek={showHint && expense.id === firstRowId}
              className={cn(
                "group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border/70 hover:bg-muted/35 md:py-1.5",
                isSelected && "border-primary/40 bg-primary/10 hover:border-primary/40 hover:bg-primary/10"
              )}
            >
              {selecting ? (
                // Takes the icon's place, so nothing shifts when selection starts. A click
                // (or Space/Enter) bubbles to the row, which does the toggling.
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Seleccionar ${expense.concept || "movimiento"}`}
                  className={cn(
                    "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 transition-colors md:h-9 md:w-9",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
                  )}
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </button>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 md:h-9 md:w-9"
                  style={{
                    backgroundColor: (expense.category?.color || "#64748b") + "15",
                  }}
                >
                  {expense.category?.icon || "📦"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground break-words">
                  {expense.concept}
                </p>
                <p className="text-sm text-muted-foreground">
                  {expense.category?.name}
                  {noteParts.marker && (
                    <Repeat
                      role="img"
                      aria-label="Movimiento fijo"
                      className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground/70"
                    />
                  )}
                  {noteParts.text && (
                    <StickyNote
                      role="img"
                      aria-label="Tiene notas"
                      className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground/70"
                    />
                  )}
                  {hasInvestments && expense.payment_method === "cash" && (
                    <span className="ml-1.5 text-xs text-muted-foreground/70">· Efectivo</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Hover actions sit before the amount, so amounts stay in one column with the day total. */}
                <div className={cn("hidden items-center md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100", !selecting && "md:flex")}>
                  <button
                    type="button"
                    aria-label={`Editar ${expense.concept || "movimiento"}`}
                    title="Editar"
                    className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Duplicar ${expense.concept || "movimiento"}`}
                    title="Duplicar"
                    className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setDuplicatingExpense(expense); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${expense.concept || "movimiento"}`}
                    title="Eliminar"
                    className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:text-expense"
                    onClick={(e) => { e.stopPropagation(); handleDelete(expense); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span
                  className={`text-[15px] font-semibold tabular-nums ${
                    transferCategoryId && expense.category_id === transferCategoryId
                      ? "text-transfer"
                      : debtCategoryId && expense.category_id === debtCategoryId
                        ? "text-debt"
                        : expense.amount >= 0
                          ? "text-income"
                          : "text-foreground"
                  }`}
                >
                  <Amount value={expense.amount} />
                </span>
              </div>
            </SwipeRow>
            );
          })}
        </div>
      </div>
    );
  }

  function futureSection() {
    const total = netOf(futureExpenses);
    return (
      <div className={cn("rounded-xl border border-dashed border-border/80 bg-muted/30", sortAsc ? "mt-3" : "mb-3")}>
        <button
          type="button"
          aria-expanded={futureOpen}
          onClick={() => setFutureOpen((open) => !open)}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left"
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm font-semibold">
            Próximos
            <span className="ml-1.5 font-normal text-muted-foreground">
              {futureExpenses.length} {futureExpenses.length === 1 ? "movimiento" : "movimientos"}
            </span>
          </span>
          <span className={`text-xs font-bold tabular-nums ${total >= 0 ? "text-income" : "text-expense"}`}>
            <Amount value={total} />
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", futureOpen && "rotate-180")} />
        </button>
        {futureOpen && <div className="px-1 pb-1">{futureDates.map(renderDay)}</div>}
      </div>
    );
  }

  return (
    <>
      {sortable && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setInternalSortAsc(!internalSortAsc)}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {internalSortAsc ? "Más antiguo primero" : "Más reciente primero"}
          </button>
        </div>
      )}

      {showHint && (
        <div className="mb-2 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="flex-1">
            Toca un movimiento para editarlo. Deslízalo a la izquierda para borrarlo o a la derecha para duplicarlo.
            {selectable && " Mantenlo pulsado para seleccionar varios."}
          </p>
          <button
            type="button"
            onClick={dismissGestureHint}
            aria-label="Ocultar consejo"
            className="-m-1 rounded p-1 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-0">
        {hasFutureSection && !sortAsc && futureSection()}
        <div ref={listStartRef} className="scroll-mt-24">
          {mainDates.map(renderDay)}
        </div>
        {hasFutureSection && sortAsc && futureSection()}
      </div>

      {backToStart && farDown && createPortal(
        // In <body>: the panel's backdrop blur would otherwise trap `fixed` inside it.
        <button
          type="button"
          onClick={() => {
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            listStartRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          }}
          className="fixed bottom-[calc(104px+env(safe-area-inset-bottom))] right-4 z-40 flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-semibold shadow-lg md:bottom-28 md:right-8"
        >
          <ArrowUp className="h-4 w-4" />
          {/* "Hoy" when the list starts at the present (latest day is this month). */}
          {!sortAsc && mainDates[0]?.slice(0, 7) === today.slice(0, 7) ? "Hoy" : "Arriba"}
        </button>,
        document.body,
      )}

      {selecting && createPortal(
        // Covers the bottom nav on phones: while selecting, the next step is here.
        <div
          role="toolbar"
          aria-label="Acciones para los movimientos seleccionados"
          className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-1 border-t border-border bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.18)] md:inset-x-auto md:bottom-6 md:left-[calc(50%+7rem)] md:-translate-x-1/2 md:gap-2 md:rounded-2xl md:border md:px-2 md:pt-2 md:pb-2 md:shadow-xl"
        >
          <button type="button" onClick={exitSelection} aria-label="Salir de la selección" className={cn(barButtonClass, "min-w-11 md:px-2")}>
            <X className="h-5 w-5 md:h-4 md:w-4" />
          </button>
          <p aria-live="polite" className="min-w-0 flex-1 px-1 text-sm leading-tight md:flex-none md:px-2">
            <span className="block truncate font-semibold md:inline">
              {selectedRows.length} {selectedRows.length === 1 ? "seleccionado" : "seleccionados"}
            </span>
            {selectedRows.length > 0 && (
              <span className="block text-xs tabular-nums text-muted-foreground md:ml-2 md:inline">
                <Amount value={netOf(selectedRows)} />
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(reachable.map(deleteKey)))}
            className={barButtonClass}
          >
            <CheckCheck className="h-5 w-5 md:h-4 md:w-4" />
            {allSelected ? "Ninguno" : "Todos"}
          </button>
          <button type="button" disabled={selectedRows.length === 0} onClick={() => setCategoryOpen(true)} className={barButtonClass}>
            <Tag className="h-5 w-5 md:h-4 md:w-4" />
            Categoría
          </button>
          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={deleteSelected}
            className={cn(barButtonClass, "text-expense hover:text-expense")}
          >
            <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
            Eliminar
          </button>
        </div>,
        document.body,
      )}

      <Dialog open={categoryOpen} onOpenChange={(open) => { if (!applying) setCategoryOpen(open); }}>
        <DialogContent variant="sheet" className="sm:max-w-md" initialFocus={false}>
          <DialogHeader variant="bar">
            <DialogTitle>Cambiar categoría</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {applying && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
              {applying ? "Cambiando..." : `Elige la categoría para ${plural(selectedRows.length)}.`}
            </p>
            <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", applying && "pointer-events-none opacity-50")}>
              {pickableCategories.map((cat) => (
                <CategoryTile
                  key={cat.id}
                  name={cat.name}
                  icon={cat.icon || "📦"}
                  color={cat.color}
                  selected={false}
                  onClick={() => applyCategory(cat)}
                />
              ))}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}

      {editingExpense && (
        <MovementDialog
          open
          onOpenChange={() => setEditingExpense(null)}
          categories={categories}
          expense={editingExpense}
          hasInvestments={hasInvestments}
          onSuccess={() => { setEditingExpense(null); notifyMutated(); }}
          onDelete={() => {
            setEditingExpense(null);
            handleDelete(editingExpense);
          }}
          onDuplicate={() => {
            setEditingExpense(null);
            setDuplicatingExpense(editingExpense);
          }}
        />
      )}

      {duplicatingExpense && (
        <MovementDialog
          open
          onOpenChange={() => setDuplicatingExpense(null)}
          categories={categories}
          prefill={duplicatingExpense}
          hasInvestments={hasInvestments}
          onSuccess={() => { setDuplicatingExpense(null); notifyMutated(); }}
        />
      )}

    </>
  );
}
