import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Plus, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

const COMMON_SYMPTOMS = [
  "Headache", "Fever", "Cough", "Fatigue", "Nausea",
  "Dizziness", "Chest pain", "Back pain", "Sore throat", "Shortness of breath",
];

interface SymptomInputProps {
  onSubmit: (symptoms: string[], description: string) => void;
  loading: boolean;
}

export function SymptomInput({ onSubmit, loading }: SymptomInputProps) {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [description, setDescription] = useState("");

  const addSymptom = (s: string) => {
    if (!symptoms.includes(s)) setSymptoms([...symptoms, s]);
  };

  const removeSymptom = (s: string) => {
    setSymptoms(symptoms.filter((x) => x !== s));
  };

  const addCustom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom("");
    }
  };

  const handleSubmit = () => {
    if (symptoms.length === 0) return;
    onSubmit(symptoms, description);
  };

  return (
    <Card className="shadow-elevated animate-slide-up">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display">What are you experiencing?</CardTitle>
            <CardDescription>Select or type your symptoms — MedTwin AI will analyze them intelligently.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Quick symptoms */}
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Common symptoms</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((s) => (
              <Badge
                key={s}
                variant={symptoms.includes(s) ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => (symptoms.includes(s) ? removeSymptom(s) : addSymptom(s))}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Custom symptom */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom symptom..."
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
          <Button variant="outline" size="icon" onClick={addCustom}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected symptoms */}
        {symptoms.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Selected symptoms</p>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((s) => (
                <Badge key={s} variant="default" className="gap-1">
                  {s}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeSymptom(s)} />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <Textarea
          placeholder="Describe how you're feeling in more detail (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={symptoms.length === 0 || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin" /> Analyzing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> Analyze with MedTwin AI
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
