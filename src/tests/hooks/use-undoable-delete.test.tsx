import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ToastOptions = {
  action: { label: string; onClick: () => void };
  onAutoClose: () => void;
  onDismiss: () => void;
};

const mocks = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), { dismiss: vi.fn(), error: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

import { useUndoableDelete } from "@/hooks/use-undoable-delete";

/** Options passed to the most recent undo toast. */
function lastToast(): ToastOptions {
  const calls = mocks.toast.mock.calls;
  return calls[calls.length - 1][1] as ToastOptions;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.toast.mockReturnValue("toast-1");
});

describe("useUndoableDelete", () => {
  it("hides the item immediately and shows an undo toast", () => {
    const { result } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("a", { message: "Movimiento eliminado", commit: vi.fn() });
    });

    expect(result.current.pendingIds.has("a")).toBe(true);
    expect(mocks.toast).toHaveBeenCalledWith("Movimiento eliminado", expect.objectContaining({ duration: 5000 }));
    expect(lastToast().action.label).toBe("Deshacer");
  });

  it("undo restores the item and never deletes", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("a", { message: "x", commit });
    });
    act(() => {
      lastToast().action.onClick();
      lastToast().onDismiss(); // sonner dismisses the toast after the action
    });

    expect(result.current.pendingIds.has("a")).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits once when the toast closes, then notifies", async () => {
    const commit = vi.fn().mockResolvedValue({ success: true });
    const onCommitted = vi.fn();
    const { result } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("a", { message: "x", commit, onCommitted });
    });
    await act(async () => {
      lastToast().onAutoClose();
      lastToast().onDismiss(); // a second close must not delete twice
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(onCommitted).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds.has("a")).toBe(true); // stays hidden until data refreshes
  });

  it("shows the item again and reports the error when the delete fails", async () => {
    const commit = vi.fn().mockResolvedValue({ error: "No autorizado" });
    const { result } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("a", { message: "x", commit });
    });
    await act(async () => {
      lastToast().onAutoClose();
    });

    expect(mocks.toast.error).toHaveBeenCalledWith("No autorizado");
    expect(result.current.pendingIds.has("a")).toBe(false);
  });

  it("flushes pending deletes when the component unmounts", async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("a", { message: "x", commit });
    });
    unmount();

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  });

  it("flushes pending deletes when the page goes to the background", async () => {
    const commit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useUndoableDelete());

    act(() => {
      result.current.scheduleDelete("a", { message: "x", commit });
    });

    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    visibility.mockRestore();

    expect(commit).toHaveBeenCalledTimes(1);
  });
});
