import { scoreVerdict } from "@/lib/research";

export function ScoreGauge({ score, size = 180 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  // Draw over 270deg arc.
  const arcFraction = 0.75;
  const dash = circumference * arcFraction;
  const progress = (clamped / 100) * dash;
  const verdict = scoreVerdict(clamped);
  const color =
    verdict.tone === "high"
      ? "hsl(var(--accent))"
      : verdict.tone === "mid"
        ? "hsl(43 60% 55%)"
        : "hsl(25 65% 55%)";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="gauge-score"
    >
      <svg width={size} height={size} className="rotate-[135deg]">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-foreground" data-testid="text-score-value">
          {Math.round(clamped)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">מתוך 100</span>
        <span className="mt-1 text-sm font-bold gold-text">{verdict.label}</span>
      </div>
    </div>
  );
}
