import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useConfirm } from "@/components/ui/confirm-dialog";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Harness({ onConfirm, onResult }: { onConfirm?: () => Promise<unknown>; onResult: (ok: boolean) => void }) {
  const { confirm, ConfirmDialog } = useConfirm();
  return (
    <>
      <button
        onClick={async () =>
          onResult(await confirm({ title: "Eliminar", description: "¿Seguro?", confirmLabel: "Eliminar", onConfirm }))
        }
      >
        abrir
      </button>
      {ConfirmDialog}
    </>
  );
}

describe("useConfirm", () => {
  it("resolves false on cancel", async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);

    await userEvent.click(screen.getByText("abrir"));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("keeps the dialog open with a spinner while onConfirm runs", async () => {
    const work = deferred();
    const onConfirm = vi.fn(() => work.promise);
    const onResult = vi.fn();
    render(<Harness onConfirm={onConfirm} onResult={onResult} />);

    await userEvent.click(screen.getByText("abrir"));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Procesando...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(onResult).not.toHaveBeenCalled();

    work.resolve();

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
