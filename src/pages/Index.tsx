import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { SymptomInput } from "@/components/SymptomInput";
import { FollowUpQuestions } from "@/components/FollowUpQuestions";
import { DiagnosisResult } from "@/components/DiagnosisResult";
import { useHealthSession } from "@/hooks/useHealthSession";
import { AuthPage } from "@/pages/AuthPage";
import { Brain, Sparkles, Activity } from "lucide-react";

const AnalyzingState = () => (
  <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-soft">
      <Brain className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-display text-lg font-semibold mb-2">MedTwin AI is thinking...</h3>
    <p className="text-muted-foreground text-sm text-center max-w-md">
      Analyzing your symptoms, medical history, reports, and follow-up answers to provide a personalized diagnosis.
    </p>
    <div className="flex gap-1 mt-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: `${i * 200}ms` }} />
      ))}
    </div>
  </div>
);

export default function Index() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Activity className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium uppercase tracking-widest text-primary">AI-Powered Health Analysis</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Your Personal Health Assistant
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            MedTwin AI understands you — not just your symptoms. It asks, thinks, and decides like a doctor.
          </p>
        </div>
        <SymptomAnalysisFlow />
      </div>
    </AppLayout>
  );
}

function SymptomAnalysisFlow() {
  const { stage, questions, result, loading, submitSymptoms, submitAnswers, simulateDecision, generateClinicalReport, reset } = useHealthSession();

  return (
    <>
      {stage === "input" && <SymptomInput onSubmit={submitSymptoms} loading={loading} />}
      {stage === "answering" && <FollowUpQuestions questions={questions} onSubmit={submitAnswers} loading={loading} />}
      {stage === "analyzing" && <AnalyzingState />}
      {stage === "complete" && result && (
        <DiagnosisResult
          result={result}
          onReset={reset}
          onSimulateDecision={simulateDecision}
          onGenerateReport={generateClinicalReport}
        />
      )}
    </>
  );
}
