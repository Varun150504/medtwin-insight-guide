import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options?: string[];
}

interface FollowUpQuestionsProps {
  questions: Question[];
  onSubmit: (answers: Record<number, string>) => void;
  loading: boolean;
}

export function FollowUpQuestions({ questions, onSubmit, loading }: FollowUpQuestionsProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const setAnswer = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  return (
    <Card className="shadow-elevated animate-slide-up">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display">MedTwin AI needs more context</CardTitle>
            <CardDescription>Please answer these follow-up questions for a more accurate analysis.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {questions.map((q, index) => (
          <div key={q.id} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <p className="text-sm font-medium">
              <span className="text-primary mr-2">Q{index + 1}.</span>
              {q.question}
            </p>
            {q.options && q.options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <Badge
                    key={opt}
                    variant={answers[q.id] === opt ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => setAnswer(q.id, opt)}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            ) : (
              <Textarea
                placeholder="Your answer..."
                value={answers[q.id] || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={2}
              />
            )}
          </div>
        ))}

        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={() => onSubmit(answers)}
          disabled={!allAnswered || loading}
        >
          {loading ? "Analyzing..." : (
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Submit & Get Diagnosis
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
