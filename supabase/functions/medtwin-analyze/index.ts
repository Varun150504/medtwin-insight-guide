import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function callAI(apiKey: string, systemPrompt: string, userPrompt: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
}

function buildContext(profile: any, history: any[], reports: any[]) {
  const profileContext = profile
    ? `Patient profile: Age: ${profile.age || "unknown"}, Blood type: ${profile.blood_type || "unknown"}, Allergies: ${(profile.allergies || []).join(", ") || "none"}, Chronic conditions: ${(profile.chronic_conditions || []).join(", ") || "none"}.`
    : "";

  const historyContext = history && history.length > 0
    ? `Recent health history: ${history.map((h: any) => `${h.symptoms?.join(", ")} → ${h.condition} (${h.risk_level}) on ${h.created_at}`).join("; ")}.`
    : "No prior health history.";

  const reportContext = reports && reports.length > 0
    ? `Medical reports on file:\n${reports.map((r: any) => {
        const sd = r.structured_data;
        if (sd) {
          return `- ${r.report_name}: Conditions: ${(sd.conditions_detected || []).join(", ") || "none"}. Key metrics: ${JSON.stringify(sd.key_metrics || {})}. Notes: ${sd.notes || "none"}`;
        }
        return `- ${r.report_name}: ${r.extracted_text?.slice(0, 200) || "No data extracted"}`;
      }).join("\n")}`
    : "No medical reports on file.";

  return { profileContext, historyContext, reportContext };
}

async function parseAIResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 429) {
      return { error: "Rate limits exceeded, please try again later.", status: 429 };
    }
    if (response.status === 402) {
      return { error: "AI credits exhausted. Please add funds.", status: 402 };
    }
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    return { error: "AI gateway error", status: 500 };
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return { parsed: JSON.parse(content), status: 200 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { stage, symptoms, description, questions, answers, profile, history, reports, diagnosis } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { profileContext, historyContext, reportContext } = buildContext(profile || {}, history || [], reports || []);
    const fullContext = `${profileContext}\n${historyContext}\n${reportContext}`;

    let systemPrompt = "";
    let userPrompt = "";

    if (stage === "questions") {
      systemPrompt = `You are MedTwin AI, an intelligent medical health assistant that behaves like an adaptive AI doctor.
You NEVER give an immediate diagnosis. You ALWAYS ask 2-4 intelligent follow-up questions first.

Your questions must:
- Adapt based on the symptom type and severity
- Consider medical history and medical report data relevance
- Ask about environmental factors (weather, stress, hydration, sleep, diet) when relevant
- Probe severity, duration, and associated symptoms
- Reference medical report findings if relevant

You must respond with a JSON object containing a "questions" array. Each question has:
- "id": number (1-4)
- "question": string
- "options": string[] (optional, 2-4 common answer choices)

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.`;

      userPrompt = `${fullContext}

Current symptoms: ${symptoms.join(", ")}
Additional description: ${description || "None provided"}

Generate 2-4 intelligent follow-up questions.`;

    } else if (stage === "diagnosis") {
      systemPrompt = `You are MedTwin AI, an intelligent medical health assistant providing personalized diagnoses.
You must combine ALL available context: symptoms, follow-up answers, patient profile, medical history, AND medical reports.

Your diagnosis must be:
- Personalized (reference specific patient data and reports when relevant)
- Explainable (explain why you reached this conclusion)
- Safety-first (err on the side of caution)
- Report-aware (incorporate medical report findings)

If the patient reported similar symptoms recently, MENTION IT.
If medical reports contain relevant conditions or metrics, REFERENCE THEM.

Also include a "session_comparison" field comparing this session to the most recent past session.

Respond with a JSON object:
{
  "diagnosis": {
    "condition": "Most likely condition name",
    "risk_level": "low" | "moderate" | "high" | "critical",
    "risk_score": number (0-100),
    "reasoning": "Detailed personalized reasoning",
    "recommended_action": "Clear actionable recommendation",
    "explanation": {
      "key_triggers": ["list", "of", "key", "symptom", "triggers"],
      "history_influence": "How patient history influenced this diagnosis",
      "reasoning_logic": "Step-by-step reasoning logic"
    },
    "session_comparison": {
      "has_previous": true/false,
      "insight": "How this compares to the last session (e.g. risk increased, similar condition, new symptoms)"
    }
  }
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
IMPORTANT: You are NOT a replacement for a real doctor. Always recommend consulting a healthcare professional for serious concerns.`;

      const answersFormatted = questions && answers
        ? questions.map((q: any) => `Q: ${q.question} → A: ${answers[q.id] || "Not answered"}`).join("\n")
        : "No follow-up answers provided.";

      userPrompt = `${fullContext}

Current symptoms: ${symptoms.join(", ")}
Additional description: ${description || "None provided"}

Follow-up Q&A:
${answersFormatted}

Provide your personalized diagnosis.`;

    } else if (stage === "decision") {
      systemPrompt = `You are MedTwin AI, providing decision support for health queries.
Based on all available patient context, symptoms, diagnosis, and medical reports, answer the patient's decision question.

Respond with a JSON object:
{
  "decision": "Yes/No/It depends - clear recommendation",
  "reason": "Detailed reasoning based on all available data"
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
Be direct but thorough. Reference specific data points when possible.`;

      userPrompt = `${fullContext}

Current diagnosis: ${diagnosis?.condition || "Unknown"}
Risk level: ${diagnosis?.risk_level || "Unknown"}
Reasoning: ${diagnosis?.reasoning || "None"}

The patient asks: "Should I go to the hospital?"

Provide your decision.`;

    } else if (stage === "report-analyze") {
      systemPrompt = `You are MedTwin AI's report analysis engine.
Analyze the provided medical report text and extract structured data.

Respond with a JSON object:
{
  "conditions_detected": ["list of conditions or findings"],
  "key_metrics": {
    "blood_pressure": "value or empty string",
    "sugar_level": "value or empty string",
    "cholesterol": "value or empty string",
    "hemoglobin": "value or empty string"
  },
  "notes": "Summary of key findings and recommendations from the report"
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
Extract as much relevant medical data as possible. If a metric is not found, use empty string.`;

      userPrompt = `${fullContext}

Medical report text to analyze:
${body.reportText || "No text provided"}

Report name: ${body.reportName || "Unknown"}

Analyze this report and extract structured data.`;

    } else if (stage === "clinical-report") {
      systemPrompt = `You are MedTwin AI generating a clinical session summary report.
Create a professional, structured clinical report based on the session data.

Respond with a JSON object:
{
  "report": {
    "title": "Clinical Session Report",
    "date": "session date",
    "patient_summary": "Brief patient overview",
    "presenting_symptoms": ["list of symptoms"],
    "follow_up_assessment": "Summary of follow-up Q&A",
    "diagnosis": "Condition identified",
    "risk_assessment": "Risk level and score explanation",
    "recommended_actions": ["list of recommended actions"],
    "notes": "Additional clinical notes",
    "disclaimer": "This is an AI-generated report and should not replace professional medical advice."
  }
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.`;

      const answersFormatted = questions && answers
        ? questions.map((q: any) => `Q: ${q.question} → A: ${answers[q.id] || "Not answered"}`).join("\n")
        : "";

      userPrompt = `${fullContext}

Session data:
Symptoms: ${(symptoms || []).join(", ")}
Description: ${description || "None"}
Follow-up Q&A:
${answersFormatted}
Diagnosis: ${diagnosis?.condition || "Unknown"}
Risk level: ${diagnosis?.risk_level || "Unknown"}
Reasoning: ${diagnosis?.reasoning || "None"}
Recommended action: ${diagnosis?.recommended_action || "None"}

Generate a clinical session report.`;

    } else {
      throw new Error("Invalid stage");
    }

    const response = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);
    const result = await parseAIResponse(response);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result.parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("medtwin-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
