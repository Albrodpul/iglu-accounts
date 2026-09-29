"use client";

import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabItem = {
  value: string;
  /** Descriptive name, used in the mobile dropdown. */
  label: string;
  /** Compact name for the desktop tab strip. Falls back to `label`. */
  short?: string;
};

type Props = {
  tabs: TabItem[];
  /** The `TabsContent` panels, rendered inside the controlled `Tabs` root. */
  children: React.ReactNode;
};

/**
 * Summary view switcher. On phones the six views collapse into a single native
 * select (one tap, everything discoverable, no horizontal scroll); from `lg`
 * up it renders the usual segmented tab strip.
 *
 * The active view lives in the URL (`?view=`) so it survives reloads and
 * back/forward, and can be linked.
 */
export function SummaryTabs({ tabs, children }: Props) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const value = tabs.some((t) => t.value === requested) ? requested! : tabs[0]?.value;
  const current = tabs.find((t) => t.value === value);

  function setValue(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    // Shallow URL update: Next syncs useSearchParams without a server
    // round-trip, so switching views doesn't refetch the page data.
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  return (
    <Tabs value={value} onValueChange={(v) => setValue(v as string)}>
      {/* Mobile: dropdown */}
      <div className="relative lg:hidden">
        <select
          aria-label="Vista del resumen"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-input bg-card pl-3 pr-10 text-sm font-medium text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tabs.map((tab) => (
            <option key={tab.value} value={tab.value}>
              {tab.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <span className="sr-only">{current?.label}</span>
      </div>

      {/* Desktop: segmented tabs */}
      <TabsList className="hidden h-auto w-full justify-start rounded-lg p-1 lg:flex">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
            {tab.short ?? tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {children}
    </Tabs>
  );
}
