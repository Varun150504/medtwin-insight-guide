import { cn } from "@/lib/utils";

const riskConfig = {
  low: { label: "Low Risk", className: "bg-success/10 text-success border-success/20" },
  moderate: { label: "Moderate Risk", className: "bg-warning/10 text-warning border-warning/20" },
  high: { label: "High Risk", className: "bg-risk-high/10 text-risk-high border-risk-high/20" },
  critical: { label: "Critical", className: "bg-critical/10 text-critical border-critical/20 animate-pulse-soft" },
};

export function RiskBadge({ level }: { level: string }) {
  const config = riskConfig[level as keyof typeof riskConfig] ?? riskConfig.low;
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border", config.className)}>
      {config.label}
    </span>
  );
}
