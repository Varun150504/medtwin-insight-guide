import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const riskConfig = {
  low: { label: "Low Risk", className: "bg-success/10 text-success border-success/20", color: "bg-success", score: 25 },
  moderate: { label: "Moderate Risk", className: "bg-warning/10 text-warning border-warning/20", color: "bg-warning", score: 50 },
  high: { label: "High Risk", className: "bg-risk-high/10 text-risk-high border-risk-high/20", color: "bg-risk-high", score: 75 },
  critical: { label: "Critical", className: "bg-critical/10 text-critical border-critical/20 animate-pulse-soft", color: "bg-critical", score: 100 },
};

export function RiskBadge({ level }: { level: string }) {
  const config = riskConfig[level as keyof typeof riskConfig] ?? riskConfig.low;
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border", config.className)}>
      {config.label}
    </span>
  );
}

export function RiskScoreBar({ level, score }: { level: string; score?: number }) {
  const config = riskConfig[level as keyof typeof riskConfig] ?? riskConfig.low;
  const displayScore = score ?? config.score;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Risk Score</span>
        <span className={cn("text-xs font-bold", config.className.split(" ").find(c => c.startsWith("text-")))}>{displayScore}/100</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", config.color)}
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </div>
  );
}
