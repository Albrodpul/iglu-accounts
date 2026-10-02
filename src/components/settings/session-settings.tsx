import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "./settings-section";

export function SessionSettings() {
  return (
    <SettingsSection title="Sesión">
      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-11 w-full text-expense hover:text-expense md:h-10 md:w-auto">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>
    </SettingsSection>
  );
}
