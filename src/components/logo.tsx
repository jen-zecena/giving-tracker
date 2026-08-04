import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showMark?: boolean;
  /** White wordmark + translucent mark for dark (green-900) surfaces. */
  inverse?: boolean;
  className?: string;
}

const WORD_SIZE = { sm: 16, md: 19, lg: 26 } as const;
const BOX_SIZE = { sm: 28, md: 34, lg: 44 } as const;

/**
 * Typographic wordmark (DS app/Logo): no drawn brand mark exists, so the
 * mark is a green square bearing a serif "G". Never reconstruct a logo —
 * if a real asset ships later, swap it in here.
 */
export function Logo({
  size = "md",
  showMark = true,
  inverse = false,
  className,
}: LogoProps) {
  const box = BOX_SIZE[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark && (
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex items-center justify-center rounded-md text-white font-display leading-none",
            inverse ? "bg-white/15" : "bg-brand"
          )}
          style={{ width: box, height: box, fontSize: box * 0.55 }}
        >
          G
        </span>
      )}
      <span
        className={cn(
          "font-semibold tracking-tight whitespace-nowrap",
          inverse ? "text-white" : "text-text-strong"
        )}
        style={{ fontSize: WORD_SIZE[size] }}
      >
        Giving Tracker
      </span>
    </span>
  );
}
