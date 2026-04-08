import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/RiskBadge";
import { AlertTriangle, HelpCircle, Hospital, Phone, RefreshCw, ChevronDown, ChevronUp, Lightbulb, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  condition: string;
  risk_level: string;
  reasoning: string;
  recommended_action: string;
  explanation: {
    key_triggers: string[];
    history_influence: string;
    reasoning_logic: string;
  };
}

interface DiagnosisResultProps {
  result: AnalysisResult;
  onReset: () => void;
}

export function DiagnosisResult({ result, onReset }: DiagnosisResultProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const isCritical = result.risk_level === "critical" || result.risk_level === "high";

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Main result card */}
      <Card className={cn(
        "shadow-elevated overflow-hidden",
        isCritical && "border-critical/30 bg-critical/5"
      )}>
        {isCritical && (
          <div className="bg-critical px-4 py-2 flex items-center gap-2 text-critical-foreground text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Emergency Alert — Seek immediate medical attention
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-display text-xl">{result.condition}</CardTitle>
            <RiskBadge level={result.risk_level} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Assessment</p>
            <p className="text-foreground">{result.reasoning}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/50 border border-secondary">
            <p className="text-sm font-semibold text-secondary-foreground mb-1 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Recommended Action
            </p>
            <p className="text-foreground">{result.recommended_action}</p>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setShowExplanation(!showExplanation)}
          className="gap-2"
        >
          <HelpCircle className="h-4 w-4" />
          Why this?
          {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        {isCritical && (
          <Button variant="emergency" className="gap-2">
            <Phone className="h-4 w-4" /> Emergency Help
          </Button>
        )}
        <Button variant="outline" className="gap-2">
          <Hospital className="h-4 w-4" /> Should I go to hospital?
        </Button>
        <Button variant="ghost" onClick={onReset} className="gap-2 ml-auto">
          <RefreshCw className="h-4 w-4" /> New Analysis
        </Button>
      </div>

      {/* Explanation panel */}
      {showExplanation && result.explanation && (
        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" /> AI Explanation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Key Triggers</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {result.explanation.key_triggers?.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">History Influence</p>
              <p>{result.explanation.history_influence}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Reasoning Logic</p>
              <p>{result.explanation.reasoning_logic}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
