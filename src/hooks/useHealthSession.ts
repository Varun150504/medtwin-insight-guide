import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FollowUpQuestion {
  id: number;
  question: string;
  options?: string[];
}

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

type SessionStage = "input" | "questioning" | "answering" | "analyzing" | "complete";

export function useHealthSession() {
  const { user } = useAuth();
  const [stage, setStage] = useState<SessionStage>("input");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const CRITICAL_SYMPTOMS = ["chest pain", "breathing difficulty", "fainting", "seizure", "severe bleeding", "unconscious"];

  const checkCritical = (symptoms: string[]): boolean => {
    const lower = symptoms.map(s => s.toLowerCase());
    return CRITICAL_SYMPTOMS.some(c => lower.some(s => s.includes(c)));
  };

  const submitSymptoms = async (symptoms: string[], description: string) => {
    if (!user) return;
    setLoading(true);

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("health_sessions")
        .insert({ user_id: user.id, symptoms, symptom_description: description, status: "questioning" })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setSessionId(session.id);

      // Check for critical symptoms (rule engine override)
      if (checkCritical(symptoms)) {
        const critResult: AnalysisResult = {
          condition: "Critical Emergency Detected",
          risk_level: "critical",
          reasoning: "Your symptoms match critical emergency patterns. Rule-based safety override activated.",
          recommended_action: "Seek immediate emergency medical attention. Call emergency services (911) immediately.",
          explanation: {
            key_triggers: symptoms.filter(s => CRITICAL_SYMPTOMS.some(c => s.toLowerCase().includes(c))),
            history_influence: "Safety rules override — critical symptoms detected",
            reasoning_logic: "Rule Engine: Critical symptom patterns always trigger highest alert regardless of other factors."
          }
        };

        await supabase.from("health_sessions").update({
          condition: critResult.condition,
          risk_level: "critical",
          reasoning: critResult.reasoning,
          recommended_action: critResult.recommended_action,
          explanation: critResult.explanation as any,
          status: "complete",
        }).eq("id", session.id);

        await supabase.from("health_timeline").insert({
          user_id: user.id,
          event_type: "alert",
          title: "🚨 Critical Emergency",
          description: critResult.reasoning,
          session_id: session.id,
        });

        setResult(critResult);
        setStage("complete");
        setLoading(false);
        return;
      }

      // Fetch profile for context
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch past sessions for context
      const { data: pastSessions } = await supabase
        .from("health_sessions")
        .select("symptoms, condition, risk_level, created_at")
        .eq("user_id", user.id)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(5);

      // Stage 1: Generate follow-up questions via AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke("medtwin-analyze", {
        body: {
          stage: "questions",
          symptoms,
          description,
          profile: profile ?? {},
          history: pastSessions ?? [],
        },
      });

      if (aiError) throw aiError;

      const generatedQuestions = aiData.questions || [];
      setQuestions(generatedQuestions);

      await supabase.from("health_sessions").update({
        followup_questions: generatedQuestions as any,
      }).eq("id", session.id);

      setStage("answering");
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze symptoms");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async (userAnswers: Record<number, string>) => {
    if (!user || !sessionId) return;
    setLoading(true);
    setAnswers(userAnswers);
    setStage("analyzing");

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const { data: pastSessions } = await supabase
        .from("health_sessions")
        .select("symptoms, condition, risk_level, created_at")
        .eq("user_id", user.id)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: session } = await supabase
        .from("health_sessions")
        .select("symptoms, symptom_description, followup_questions")
        .eq("id", sessionId)
        .single();

      // Stage 2: AI final decision
      const { data: aiData, error: aiError } = await supabase.functions.invoke("medtwin-analyze", {
        body: {
          stage: "diagnosis",
          symptoms: session?.symptoms ?? [],
          description: session?.symptom_description ?? "",
          questions: session?.followup_questions ?? [],
          answers: userAnswers,
          profile: profile ?? {},
          history: pastSessions ?? [],
        },
      });

      if (aiError) throw aiError;

      const diagnosis = aiData.diagnosis;
      setResult(diagnosis);

      await supabase.from("health_sessions").update({
        followup_answers: userAnswers as any,
        condition: diagnosis.condition,
        risk_level: diagnosis.risk_level,
        reasoning: diagnosis.reasoning,
        recommended_action: diagnosis.recommended_action,
        explanation: diagnosis.explanation as any,
        status: "complete",
      }).eq("id", sessionId);

      await supabase.from("health_timeline").insert({
        user_id: user.id,
        event_type: "diagnosis",
        title: diagnosis.condition,
        description: diagnosis.reasoning,
        session_id: sessionId,
        metadata: { risk_level: diagnosis.risk_level } as any,
      });

      setStage("complete");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete analysis");
      setStage("answering");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStage("input");
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
  };

  return {
    stage,
    questions,
    answers,
    result,
    loading,
    submitSymptoms,
    submitAnswers,
    reset,
  };
}
