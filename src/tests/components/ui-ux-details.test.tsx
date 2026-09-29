import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReceiptText } from "lucide-react";
import type { Category } from "@/types";

const mocks = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(() => "t"), { dismiss: vi.fn(), error: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/actions/categories", () => ({ createCategory: vi.fn(), updateCategory: vi.fn() }));

import { CategoryPicker } from "@/components/expenses/category-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { SwipeRow } from "@/components/ui/swipe-row";
import { useUndoableDelete } from "@/hooks/use-undoable-delete";
import { OPEN_ADD_MOVEMENT_EVENT, openAddMovement } from "@/lib/add-movement";

const cat = (id: string, name: string, sort_order: number): Category => ({
  id,
  name,
  icon: "📦",
  color: "#64748b",
  sort_order,
  account_id: "a",
  created_at: "2026-01-01T00:00:00Z",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CategoryPicker", () => {
  it("lists the most used categories first, keeping manual order on ties", async () => {
    const categories = [cat("a", "Alquiler", 1), cat("b", "Bar", 2), cat("c", "Coche", 3), cat("d", "Deporte", 4)];
    render(<CategoryPicker categories={categories} usage={{ c: 9, b: 2 }} value="" onChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /Selecciona categoría/ }));
    const grid = await screen.findByRole("dialog");
    const names = within(grid)
      .getAllByRole("button")
      .map((b) => b.textContent?.replace("📦", "").trim())
      .filter((n) => ["Alquiler", "Bar", "Coche", "Deporte"].includes(n ?? ""));

    expect(names).toEqual(["Coche", "Bar", "Alquiler", "Deporte"]);
  });
});

describe("EmptyState + openAddMovement", () => {
  it("the call to action asks the navbar to open the add dialog", async () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_ADD_MOVEMENT_EVENT, listener);
    render(
      <EmptyState
        icon={ReceiptText}
        message="No hay movimientos"
        action={{ label: "Añadir movimiento", onClick: openAddMovement }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Añadir movimiento" }));

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_ADD_MOVEMENT_EVENT, listener);
  });
});

describe("undo toast placement", () => {
  it("goes to the bottom (thumb reach) on phones", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) => ({ matches: q.includes("max-width"), media: q }) as MediaQueryList,
    );
    const { result } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("x", { message: "Movimiento eliminado", commit: vi.fn() });
    });

    expect(mocks.toast).toHaveBeenLastCalledWith(
      "Movimiento eliminado",
      expect.objectContaining({ position: "bottom-center" }),
    );
  });
});

describe("SwipeRow haptics", () => {
  it("vibrates once when the swipe crosses the delete threshold", () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    render(
      <SwipeRow onDelete={() => {}}>
        <span>Fila</span>
      </SwipeRow>,
    );
    const row = screen.getByText("Fila").parentElement as HTMLElement;

    fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 180, clientY: 100 }] }); // not yet
    expect(vibrate).not.toHaveBeenCalled();
    fireEvent.touchMove(row, { touches: [{ clientX: 130, clientY: 100 }] }); // crosses
    fireEvent.touchMove(row, { touches: [{ clientX: 120, clientY: 100 }] }); // stays armed
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
