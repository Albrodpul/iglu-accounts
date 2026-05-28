"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type Account = {
  id: string;
  name: string;
  action: () => void | Promise<void>;
};

type Props = {
  accounts: Account[];
};

type AccountOptionFormProps = {
  account: Account;
  anyPending: boolean;
  onSelect: (id: string) => void;
  isSelected: boolean;
};

function SubmitButton({ name, isSelected, anyPending }: { name: string; isSelected: boolean; anyPending: boolean }) {
  const { pending } = useFormStatus();
  const showSpinner = pending || (anyPending && isSelected);
  const disabled = pending || anyPending;

  return (
    <button
      type="submit"
      aria-busy={showSpinner}
      disabled={disabled}
      className="w-full rounded-lg border border-border/80 bg-card px-5 py-4 text-left text-base font-medium transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-75"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="truncate">{name}</span>
        {showSpinner && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Entrando...
          </span>
        )}
      </span>
    </button>
  );
}

function AccountOptionForm({ account, anyPending, onSelect, isSelected }: AccountOptionFormProps) {
  return (
    <form
      action={account.action}
      onSubmitCapture={() => onSelect(account.id)}
    >
      <SubmitButton name={account.name} isSelected={isSelected} anyPending={anyPending} />
    </form>
  );
}

export function SelectAccountForm({ accounts }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <AccountOptionForm
          key={account.id}
          account={account}
          anyPending={selectedAccountId !== null}
          isSelected={selectedAccountId === account.id}
          onSelect={setSelectedAccountId}
        />
      ))}
    </div>
  );
}
