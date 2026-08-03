import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showMark?: boolean;
  className?: string;
}

const WORD_SIZE = { sm: 16, md: 19, lg: 26 } as const;
const BOX_SIZE = { sm: 28, md: 34, lg: 44 } as const;

/**
 * Typographic wordmark (DS app/Logo): no drawn brand mark exists, so the
 * mark is a green square bearing a serif "G". Never reconstruct a logo —
 * if a real asset ships later, swap it in here.
 */
export function Logo({ size = "md", showMark = true, className }: LogoProps) {
  const box = BOX_SIZE[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark && (
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center rounded-md bg-brand text-white font-display leading-none"
          style={{ width: box, height: box, fontSize: box * 0.55 }}
        >
          G
        </span>
      )}
      <span
        className="font-semibold tracking-tight text-text-strong whitespace-nowrap"
        style={{ fontSize: WORD_SIZE[size] }}
      >
        Giving Tracker
      </span>
    </span>
  );
}
