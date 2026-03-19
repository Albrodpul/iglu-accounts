import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  browserSupportsWebAuthnAutofill: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("@/actions/auth", () => ({
  signIn: mocks.signIn,
}));

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthnAutofill: mocks.browserSupportsWebAuthnAutofill,
  startAuthentication: mocks.startAuthentication,
}));

import LoginPage from "@/app/(auth)/login/page";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "PublicKeyCredential", {
    value: function PublicKeyCredential() {},
    writable: true,
  });

  mocks.browserSupportsWebAuthnAutofill.mockResolvedValue(false);
  mocks.signIn.mockResolvedValue(undefined);
  mocks.startAuthentication.mockResolvedValue({ id: "assertion" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("login page", () => {
  it("shows loader and disables form while email login is in progress", async () => {
    const pending = deferred<{ error?: string } | undefined>();
    mocks.signIn.mockReturnValueOnce(pending.promise);

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText("Email"), "demo@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secret");

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Entrando...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Procesando acceso...");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Contraseña")).toBeDisabled();

    pending.resolve({ error: "Credenciales inválidas" });

    await waitFor(() => {
      expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument();
    });
  });

  it("shows passkey loader and error when verification fails", async () => {
    const verifyPending = deferred<{ ok: boolean; json: () => Promise<{ error?: string }> }>();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ options: { challenge: "abc" } }),
        })
        .mockReturnValueOnce(verifyPending.promise),
    );

    render(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar con huella" }));

    expect(await screen.findByText("Verificando huella...")).toBeInTheDocument();

    verifyPending.resolve({
      ok: false,
      json: async () => ({ error: "No se pudo verificar" }),
    });

    await waitFor(() => {
      expect(screen.getByText("No se pudo verificar")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Entrar con huella" })).toBeEnabled();
  });
});
