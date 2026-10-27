import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setDiscreteMode: vi.fn() }));
vi.mock("@/actions/accounts", () => ({ setDiscreteMode: mocks.setDiscreteMode }));

import { DiscreteModeProvider, useDiscreteMode } from "@/contexts/discrete-mode";
import { Amount, usePrivacy } from "@/components/ui/amount";

function Figures() {
  const { money, secret, discrete } = usePrivacy();
  const { toggle } = useDiscreteMode();
  return (
    <>
      <p data-testid="amount">
        <Amount value={-1234.5} />
      </p>
      <p data-testid="gain">
        <Amount value={150} prefix="+" suffix=" (+10,0 %)" />
      </p>
      <p data-testid="tooltip">{money(1650)}</p>
      <p data-testid="units">{secret("140")} participaciones</p>
      <button type="button" onClick={toggle}>
        {discrete ? "Mostrar" : "Ocultar"}
      </button>
    </>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("Hiding amounts", () => {
  it("takes the figures out of the page, not just blurs them", () => {
    render(
      <DiscreteModeProvider initialDiscrete>
        <Figures />
      </DiscreteModeProvider>,
    );

    expect(screen.getByTestId("amount")).toHaveTextContent("-••• €");
    expect(screen.getByTestId("amount")).not.toHaveTextContent("1234");
    expect(screen.getByLabelText("Importe oculto", { selector: "[data-testid=amount] span" })).toBeInTheDocument();
    // The sign and a percentage stay: they say how it goes, not how much there is.
    expect(screen.getByTestId("gain")).toHaveTextContent("+••• € (+10,0 %)");
    expect(screen.getByTestId("tooltip")).toHaveTextContent("••• €");
    expect(screen.getByTestId("units")).toHaveTextContent("••• participaciones");
  });

  it("shows them again with the toggle, and undoes the switch if it can't be saved", async () => {
    mocks.setDiscreteMode.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("offline"));
    render(
      <DiscreteModeProvider initialDiscrete>
        <Figures />
      </DiscreteModeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Mostrar" }));
    expect(screen.getByTestId("amount")).toHaveTextContent("-1.234,50 €");

    await userEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    // The save failed: back to showing, as the server still has it.
    expect(await screen.findByRole("button", { name: "Ocultar" })).toBeInTheDocument();
    expect(screen.getByTestId("amount")).toHaveTextContent("-1.234,50 €");
  });
});
