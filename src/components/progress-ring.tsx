import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  thickness?: number;
  caption?: string;
  sublabel?: string;
  tone?: "brand" | "info" | "warning";
  className?: string;
}

const TONE_STROKE: Record<NonNullable<ProgressRingProps["tone"]>, string> = {
  brand: "var(--brand)",
  info: "var(--info)",
  warning: "var(--honey-500)",
};

/**
 * Circular goal-progress ring (DS core/ProgressRing). Track is sand-200;
 * the fill animates with the DS slow ease. Caption is always mono.
 */
export function ProgressRing({
  value,
  size = 132,
  thickness = 12,
  caption,
  sublabel,
  tone = "brand",
  className,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={caption ? `${caption}${sublabel ? ` ${sublabel}` : ""}` : `${Math.round(pct)}%`}
    >
      <svg width={size} height={size} className="block -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--sand-200)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{
            transition:
              "stroke-dashoffset var(--dur-slow) var(--ease-out)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {caption && (
          <span
            className="font-mono font-semibold text-text-strong tracking-tight"
            style={{ fontSize: size * 0.2 }}
          >
            {caption}
          </span>
        )}
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
