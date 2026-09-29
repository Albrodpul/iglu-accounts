/**
 * Shown when a server action *throws* (offline, 5xx, timeout) instead of
 * returning `{ error }`. Validation errors come back as `{ error }` and are
 * displayed as-is.
 */
export const SAVE_FAILED_MESSAGE = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
