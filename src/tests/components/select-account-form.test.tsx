import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectAccountForm } from "@/components/select-account/select-account-form";

describe("select account form", () => {
  it("shows loading only for clicked account and blocks the rest", async () => {
    const action = vi.fn();

    render(
      <SelectAccountForm
        accounts={[
          { id: "acc-1", name: "Cuenta A" },
          { id: "acc-2", name: "Cuenta B" },
        ]}
        action={action}
      />,
    );

    const firstButton = screen.getByRole("button", { name: /Cuenta A/i });
    const secondButton = screen.getByRole("button", { name: /Cuenta B/i });

    await userEvent.click(firstButton);

    expect(screen.getAllByText("Entrando...")).toHaveLength(1);
    expect(firstButton).toHaveAttribute("aria-busy", "true");
    expect(secondButton).toHaveAttribute("aria-busy", "false");
    expect(firstButton).toBeDisabled();
    expect(secondButton).toBeDisabled();

    await userEvent.click(secondButton);

    expect(screen.getAllByText("Entrando...")).toHaveLength(1);
    expect(firstButton).toHaveAttribute("aria-busy", "true");
    expect(secondButton).toHaveAttribute("aria-busy", "false");
  });
});
