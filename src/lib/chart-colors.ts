/**
 * Categorical colours for pie/donut slices (assets, funds). Shared so a slice
 * and its legend row always get the same colour, wherever they are rendered.
 */
export const PIE_COLORS = [
  "#f43f5e", "#38bdf8", "#facc15", "#a78bfa",
  "#34d399", "#f97316", "#818cf8", "#e879f9",
  "#4ade80", "#fb7185", "#2dd4bf", "#fbbf24",
  "#67e8f9", "#c084fc", "#fdba74", "#60a5fa",
  "#f472b6", "#d946ef", "#a3e635", "#fde68a",
];

export function pieColor(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length];
}
