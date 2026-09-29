/**
 * Opens the global "Nuevo movimiento" dialog (owned by the navbar) from
 * anywhere — e.g. an empty list's call to action — without prop drilling.
 */
export const OPEN_ADD_MOVEMENT_EVENT = "iglu:open-add-movement";

export function openAddMovement(): void {
  window.dispatchEvent(new Event(OPEN_ADD_MOVEMENT_EVENT));
}
