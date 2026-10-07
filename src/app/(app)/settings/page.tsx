import { getAccounts, hasInvestmentsEnabled, notificationsEnabled, getUserDisplayName } from "@/actions/accounts";
import { getUserPasskeys } from "@/actions/passkeys";
import { ModulesSettings } from "@/components/settings/modules-settings";
import { PasskeysSettings } from "@/components/settings/passkeys-settings";
import { AccountsSettings } from "@/components/settings/accounts-settings";
import { DisplayNameSettings } from "@/components/settings/display-name-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { BackupSettings } from "@/components/settings/backup-settings";
import { SessionSettings } from "@/components/settings/session-settings";

export default async function SettingsPage() {
  const [hasInvestments, hasNotifications, passkeys, accounts, displayName] = await Promise.all([
    hasInvestmentsEnabled(),
    notificationsEnabled(),
    getUserPasskeys(),
    getAccounts(),
    getUserDisplayName(),
  ]);

  return (
    // A reading-width column: settings are label + control, and a wide row
    // would leave each control far from the text it belongs to.
    <div className="max-w-2xl space-y-4 md:space-y-5">
      <h1 className="mb-2 text-2xl font-bold md:mb-3 md:text-3xl">Ajustes</h1>
      <DisplayNameSettings currentName={displayName} />
      <AccountsSettings accounts={accounts} />
      <ModulesSettings hasInvestments={hasInvestments} hasNotifications={hasNotifications} />
      <AppearanceSettings />
      <PasskeysSettings passkeys={passkeys} />
      <BackupSettings />
      <SessionSettings />
    </div>
  );
}
