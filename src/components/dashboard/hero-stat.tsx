import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  /** Makes the stat a link to where that figure is detailed. */
  href?: string;
  /** Share of the headline figure this stat accounts for, as a percentage (e.g. 20 for 20 %). */
  share?: number;
};

/** A secondary figure on a hero card: small round icon, quiet label, the amount. */
export function HeroStat({ icon: Icon, label, value, href, share }: Props) {
  const content = (
    <>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12">
        <Icon className="h-4 w-4 text-white/90" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-tight text-white/75">{label}</span>
        <span className="block text-sm font-semibold leading-snug tabular-nums text-white md:text-base">
          <Amount value={value} />
          {share !== undefined && (
            <span className="ml-1.5 text-xs font-medium text-white/70">{formatPercent(share, { decimals: 0 })}</span>
          )}
        </span>
      </span>
    </>
  );
  const className = "flex items-center gap-2.5";
  return href ? (
    <Link href={href} className={cn(className, "-m-1 rounded-xl p-1 transition-colors hover:bg-white/10")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
