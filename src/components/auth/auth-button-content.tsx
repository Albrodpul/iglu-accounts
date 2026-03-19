import { Loader2 } from "lucide-react";

type Props = {
  loading: boolean;
  loadingText: string;
  idleText: string;
  idleIcon?: React.ReactNode;
};

export function AuthButtonContent({ loading, loadingText, idleText, idleIcon }: Props) {
  if (loading) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {loadingText}
      </>
    );
  }

  return (
    <>
      {idleIcon}
      {idleText}
    </>
  );
}
