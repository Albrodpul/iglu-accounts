import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { cn } from "@/lib/utils";

type Props = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  /** Makes the stat a link to where that figure is detailed. */
  href?: string;
};

/** A secondary figure on a hero card: small round icon, quiet label, the amount. */
export function HeroStat({ icon: Icon, label, value, href }: Props) {
  const content = (
    <>
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12">
        <Icon className="h-4 w-4 text-white/90" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-tight text-white/75">{label}</span>
        <span className="block text-sm font-semibold leading-snug tabular-nums text-white md:text-base">
          <Amount value={value} />
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
