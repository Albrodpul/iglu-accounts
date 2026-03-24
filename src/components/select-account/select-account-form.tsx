"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type Account = {
  id: string;
  name: string;
};

type Props = {
  accounts: Account[];
  action: (formData: FormData) => void;
};

type AccountOptionButtonProps = {
  account: Account;
  selectedAccountId: string | null;
  optimisticPending: boolean;
  onSelect: (accountId: string) => void;
};

function AccountOptionButton({ account, selectedAccountId, optimisticPending, onSelect }: AccountOptionButtonProps) {
  const { pending } = useFormStatus();
  const isSubmitting = pending || optimisticPending;
  const isSelected = selectedAccountId === account.id;

  return (
    <button
      type="submit"
      name="account_id"
      value={account.id}
      onClick={() => onSelect(account.id)}
      aria-busy={isSubmitting && isSelected}
      disabled={isSubmitting}
      className="w-full rounded-lg border border-border/80 bg-card px-5 py-4 text-left text-base font-medium transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-75"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="truncate">{account.name}</span>
        {isSubmitting && isSelected && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Entrando...
          </span>
        )}
      </span>
    </button>
  );
}

export function SelectAccountForm({ accounts, action }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [optimisticPending, setOptimisticPending] = useState(false);

  return (
    <form
      action={action}
      className="space-y-2"
      onSubmitCapture={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as
          | HTMLButtonElement
          | null;
        const accountId = submitter?.value;

        if (accountId) {
          setSelectedAccountId(accountId);
        }

        setOptimisticPending(true);
      }}
    >
      {accounts.map((account) => (
        <AccountOptionButton
          key={account.id}
          account={account}
          selectedAccountId={selectedAccountId}
          optimisticPending={optimisticPending}
          onSelect={setSelectedAccountId}
        />
      ))}
    </form>
  );
}
