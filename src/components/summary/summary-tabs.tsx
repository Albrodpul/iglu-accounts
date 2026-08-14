"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabItem = { value: string; label: string };

type Props = {
  tabs: TabItem[];
  /** The `TabsContent` panels, rendered inside the controlled `Tabs` root. */
  children: React.ReactNode;
};

/**
 * Summary view switcher. On phones the six views collapse into a single native
 * select (one tap, everything discoverable, no horizontal scroll); from `md`
 * up it renders the usual segmented tab strip.
 */
export function SummaryTabs({ tabs, children }: Props) {
  const [value, setValue] = useState(tabs[0]?.value);
  const current = tabs.find((t) => t.value === value);

  return (
    <Tabs value={value} onValueChange={(v) => setValue(v as string)}>
      {/* Mobile: dropdown */}
      <div className="relative md:hidden">
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
      <TabsList className="hidden h-auto w-full justify-start rounded-lg p-1 md:flex">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {children}
    </Tabs>
  );
}
