"use client";

import { Eye, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useDiscreteMode } from "@/contexts/discrete-mode";
import { useTheme } from "@/contexts/theme";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SettingsRow, SettingsSection } from "./settings-section";

/** Look-and-feel preferences: the theme is kept per device, hidden amounts per user. */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { discrete, toggle } = useDiscreteMode();

  return (
    <SettingsSection title="Apariencia">
      <div className="divide-y divide-border/60">
        <SettingsRow icon={<Palette className="h-[18px] w-[18px] text-muted-foreground" />} title="Tema" description="Se guarda en este dispositivo.">
          <SegmentedControl
            aria-label="Tema"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Oscuro", icon: Moon },
              { value: "system", label: "Sistema", icon: Monitor },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          icon={<Eye className="h-[18px] w-[18px] text-muted-foreground" />}
          title={<span id="discrete-mode-label">Ocultar importes</span>}
          description="Tapa las cifras, por si alguien mira la pantalla."
          control={<ToggleSwitch enabled={discrete} onToggle={toggle} aria-labelledby="discrete-mode-label" />}
        />
      </div>
    </SettingsSection>
  );
}
