import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  /** Main action of the section, shown next to its title. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** One block of the settings page: every section shares this title, spacing and surface. */
export function SettingsSection({ title, description, action, className, children }: Props) {
  return (
    <section className={cn("surface-card p-5 md:p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** A labelled row inside a section: text on the left, its control on the right. */
export function SettingsRow({
  icon,
  title,
  description,
  control,
  children,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
  /** Extra content under the row (status, secondary actions). */
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children && <div className={cn("mt-2", icon && "pl-12")}>{children}</div>}
    </div>
  );
}
