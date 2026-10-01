import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SwipeRow } from "@/components/ui/swipe-row";

function swipe(el: HTMLElement, dx: number, dy = 0) {
  fireEvent.touchStart(el, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchMove(el, { touches: [{ clientX: 200 + dx, clientY: 100 + dy }] });
  fireEvent.touchEnd(el);
  fireEvent.click(el); // browsers synthesize a click after the touch sequence
}

function setup() {
  const onTap = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  render(
    <SwipeRow onTap={onTap} onDelete={onDelete} onDuplicate={onDuplicate}>
      <span>Compra</span>
    </SwipeRow>,
  );
  const row = screen.getByText("Compra").parentElement as HTMLElement;
  return { row, onTap, onDelete, onDuplicate };
}

describe("SwipeRow", () => {
  it("a tap edits", () => {
    const { row, onTap, onDelete } = setup();
    fireEvent.click(row);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("a long left swipe deletes and does not also edit", () => {
    const { row, onTap, onDelete } = setup();
    swipe(row, -80);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("a long right swipe duplicates, and only that", () => {
    const { row, onTap, onDelete, onDuplicate } = setup();
    swipe(row, 80);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it("a short left swipe snaps back without deleting", () => {
    const { row, onDelete } = setup();
    swipe(row, -30);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("a mostly vertical gesture is treated as a scroll", () => {
    const { row, onDelete } = setup();
    swipe(row, -60, 120);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
