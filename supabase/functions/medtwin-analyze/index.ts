import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stage, symptoms, description, questions, answers, profile, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const profileContext = profile
      ? `Patient profile: Age: ${profile.age || "unknown"}, Blood type: ${profile.blood_type || "unknown"}, Allergies: ${(profile.allergies || []).join(", ") || "none"}, Chronic conditions: ${(profile.chronic_conditions || []).join(", ") || "none"}.`
      : "";

    const historyContext = history && history.length > 0
      ? `Recent health history: ${history.map((h: any) => `${h.symptoms?.join(", ")} → ${h.condition} (${h.risk_level}) on ${h.created_at}`).join("; ")}.`
      : "No prior health history.";

    let systemPrompt = "";
    let userPrompt = "";

    if (stage === "questions") {
      systemPrompt = `You are MedTwin AI, an intelligent medical health assistant that behaves like an adaptive AI doctor.
You NEVER give an immediate diagnosis. You ALWAYS ask 2-4 intelligent follow-up questions first.

Your questions must:
- Adapt based on the symptom type and severity
- Consider medical history relevance
- Ask about environmental factors (weather, stress, hydration, sleep, diet) when relevant
- Probe severity, duration, and associated symptoms

You must respond with a JSON object containing a "questions" array. Each question has:
- "id": number (1-4)
- "question": string
- "options": string[] (optional, 2-4 common answer choices)

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.`;

      userPrompt = `${profileContext}
${historyContext}

Current symptoms: ${symptoms.join(", ")}
Additional description: ${description || "None provided"}

Generate 2-4 intelligent follow-up questions.`;
    } else if (stage === "diagnosis") {
      systemPrompt = `You are MedTwin AI, an intelligent medical health assistant providing personalized diagnoses.
You must combine ALL available context: symptoms, follow-up answers, patient profile, and medical history.

Your diagnosis must be:
- Personalized (reference specific patient data when relevant)
- Explainable (explain why you reached this conclusion)
- Safety-first (err on the side of caution)

If the patient reported similar symptoms recently, MENTION IT.

Respond with a JSON object:
{
  "diagnosis": {
    "condition": "Most likely condition name",
    "risk_level": "low" | "moderate" | "high" | "critical",
    "reasoning": "Detailed personalized reasoning",
    "recommended_action": "Clear actionable recommendation",
    "explanation": {
      "key_triggers": ["list", "of", "key", "symptom", "triggers"],
      "history_influence": "How patient history influenced this diagnosis",
      "reasoning_logic": "Step-by-step reasoning logic"
    }
  }
}

IMPORTANT: Respond ONLY with valid JSON. No markdown.
IMPORTANT: You are NOT a replacement for a real doctor. Always recommend consulting a healthcare professional for serious concerns.`;

      const answersFormatted = questions && answers
        ? questions.map((q: any) => `Q: ${q.question} → A: ${answers[q.id] || "Not answered"}`).join("\n")
        : "No follow-up answers provided.";

      userPrompt = `${profileContext}
${historyContext}

Current symptoms: ${symptoms.join(", ")}
Additional description: ${description || "None provided"}

Follow-up Q&A:
${answersFormatted}

Provide your personalized diagnosis.`;
    } else {
      throw new Error("Invalid stage: must be 'questions' or 'diagnosis'");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Clean markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
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
