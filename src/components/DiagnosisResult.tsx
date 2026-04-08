import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, RiskScoreBar } from "@/components/RiskBadge";
import { AlertTriangle, HelpCircle, Hospital, Phone, RefreshCw, ChevronDown, ChevronUp, Lightbulb, Shield, TrendingUp, FileText, MapPin, Loader2, Download, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { AnalysisResult } from "@/hooks/useHealthSession";

interface DiagnosisResultProps {
  result: AnalysisResult;
  onReset: () => void;
  onSimulateDecision: () => Promise<{ decision: string; reason: string } | null>;
  onGenerateReport: () => Promise<any | null>;
}

export function DiagnosisResult({ result, onReset, onSimulateDecision, onGenerateReport }: DiagnosisResultProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [decisionModal, setDecisionModal] = useState(false);
  const [decision, setDecision] = useState<{ decision: string; reason: string } | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [clinicalReport, setClinicalReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  

  const isCritical = result.risk_level === "critical" || result.risk_level === "high";

  const handleDecision = async () => {
    setDecisionModal(true);
    setDecisionLoading(true);
    const res = await onSimulateDecision();
    setDecision(res);
    setDecisionLoading(false);
  };

  const handleReport = async () => {
    setReportModal(true);
    setReportLoading(true);
    const res = await onGenerateReport();
    setClinicalReport(res);
    setReportLoading(false);
  };

  const handleDownloadReport = () => {
    if (!clinicalReport) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Clinical Report - MedTwin AI</title><style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a;line-height:1.6}h1{font-size:22px;border-bottom:2px solid #3b82f6;padding-bottom:8px}h2{font-size:15px;color:#6b7280;margin-top:20px;margin-bottom:4px}p,li{font-size:14px}.disclaimer{font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;margin-top:24px;font-style:italic}@media print{body{margin:0}}</style></head><body><h1>🩺 Clinical Session Report</h1><p><strong>Date:</strong> ${clinicalReport.date || new Date().toLocaleDateString()}</p><h2>Patient Summary</h2><p>${clinicalReport.patient_summary}</p><h2>Presenting Symptoms</h2><ul>${(clinicalReport.presenting_symptoms || []).map((s: string) => `<li>${s}</li>`).join("")}</ul><h2>Follow-Up Assessment</h2><p>${clinicalReport.follow_up_assessment}</p><h2>Diagnosis</h2><p><strong>${clinicalReport.diagnosis}</strong></p><h2>Risk Assessment</h2><p>${clinicalReport.risk_assessment}</p><h2>Recommended Actions</h2><ul>${(clinicalReport.recommended_actions || []).map((a: string) => `<li>${a}</li>`).join("")}</ul>${clinicalReport.notes ? `<h2>Notes</h2><p>${clinicalReport.notes}</p>` : ""}<p class="disclaimer">${clinicalReport.disclaimer || "This is an AI-generated report and should not replace professional medical advice."}</p></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const copyEmergencyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast.success(`Copied ${number} to clipboard`);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Main result card */}
      <Card className={cn("shadow-elevated overflow-hidden", isCritical && "border-critical/30 bg-critical/5")}>
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
          {/* Risk Score Bar */}
          <RiskScoreBar level={result.risk_level} score={result.risk_score} />

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

          {/* Session Comparison Insight */}
          {result.session_comparison?.has_previous && (
            <div className="p-3 rounded-lg bg-info/5 border border-info/20 flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-info">What Changed?</p>
                <p className="text-sm text-foreground">{result.session_comparison.insight}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowExplanation(!showExplanation)} className="gap-2">
          <HelpCircle className="h-4 w-4" /> Why this?
          {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <Button variant="outline" onClick={handleDecision} className="gap-2">
          <Hospital className="h-4 w-4" /> Should I go to hospital?
        </Button>
        <Button variant="outline" onClick={handleReport} className="gap-2">
          <FileText className="h-4 w-4" /> Clinical Report
        </Button>
        {isCritical && (
          <>
            <a href="tel:911" className="inline-flex">
              <Button variant="emergency" className="gap-2">
                <Phone className="h-4 w-4" /> Call 911
              </Button>
            </a>
            <Button variant="outline" onClick={() => copyEmergencyNumber("911")} className="gap-2">
              <Copy className="h-4 w-4" /> Copy 911
            </Button>
            <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button variant="outline" className="gap-2 border-critical/30 text-critical hover:bg-critical/5">
                <MapPin className="h-4 w-4" /> Find Nearby Hospitals
              </Button>
            </a>
          </>
        )}
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
                {result.explanation.key_triggers?.map((t, i) => <li key={i}>{t}</li>)}
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

      {/* Removed old hospital finder - now uses direct link above */}

      {/* Decision Simulation Modal */}
      <Dialog open={decisionModal} onOpenChange={setDecisionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Hospital className="h-5 w-5 text-primary" /> Decision Simulation
            </DialogTitle>
          </DialogHeader>
          {decisionLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">AI is evaluating...</span>
            </div>
          ) : decision ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-secondary">
                <p className="font-semibold text-lg">{decision.decision}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reasoning</p>
                <p className="text-sm">{decision.reason}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Clinical Report Modal */}
      <Dialog open={reportModal} onOpenChange={setReportModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Clinical Session Report
            </DialogTitle>
          </DialogHeader>
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Generating report...</span>
            </div>
          ) : clinicalReport ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Patient Summary</p>
                <p>{clinicalReport.patient_summary}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Presenting Symptoms</p>
                <ul className="list-disc list-inside">
                  {clinicalReport.presenting_symptoms?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Follow-Up Assessment</p>
                <p>{clinicalReport.follow_up_assessment}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Diagnosis</p>
                <p className="font-semibold">{clinicalReport.diagnosis}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Risk Assessment</p>
                <p>{clinicalReport.risk_assessment}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Recommended Actions</p>
                <ul className="list-disc list-inside">
                  {clinicalReport.recommended_actions?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              {clinicalReport.notes && (
                <div>
                  <p className="font-medium text-muted-foreground">Notes</p>
                  <p>{clinicalReport.notes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground italic border-t pt-3">{clinicalReport.disclaimer}</p>
              <Button variant="hero" className="w-full gap-2 mt-2" onClick={handleDownloadReport}>
                <Download className="h-4 w-4" /> Download as PDF
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
