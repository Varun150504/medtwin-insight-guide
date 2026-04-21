import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Upload, Loader2, Trash2, Brain, User, Stethoscope, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReports = () => {
    if (!user) return;
    supabase
      .from("medical_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReports(data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file (JPG/PNG)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64 for AI processing
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix to get raw base64
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("medical_reports")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("medical_reports")
        .getPublicUrl(filePath);

      // Send actual file to AI for real extraction + analysis
      const { data: aiData, error: aiError } = await supabase.functions.invoke("medtwin-analyze", {
        body: {
          stage: "report-analyze",
          fileBase64,
          fileMimeType: file.type,
          reportName: file.name,
        },
      });

      const structuredData = aiError ? null : aiData;
      const extractedText = structuredData?.extracted_text || `[Report: ${file.name}] AI extraction failed.`;

      // Save to database
      const { error: dbError } = await supabase.from("medical_reports").insert({
        user_id: user.id,
        report_name: file.name,
        report_type: file.type,
        file_url: urlData.publicUrl,
        extracted_text: extractedText,
        structured_data: structuredData as any,
      });

      if (dbError) throw dbError;

      // Add to timeline
      await supabase.from("health_timeline").insert({
        user_id: user.id,
        event_type: "report",
        title: `Report uploaded: ${file.name}`,
        description: structuredData?.notes || "Medical report processed and added to your digital twin.",
      });

      toast.success("Report uploaded and analyzed by MedTwin AI!");
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload report");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteReport = async (id: string) => {
    await supabase.from("medical_reports").delete().eq("id", id);
    toast.success("Report deleted");
    fetchReports();
  };

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Medical Reports
        </h1>

        {/* Upload card */}
        <Card className="shadow-elevated mb-6">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload Medical Report
            </CardTitle>
            <CardDescription>
              Upload PDFs or images — MedTwin AI will extract data and integrate it into your digital twin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="hero"
              size="lg"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Choose File (PDF, JPG, PNG)</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Reports list */}
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading...</p>
        ) : reports.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No medical reports yet. Upload your first report above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const sd = report.structured_data as any;
              return (
                <Card key={report.id} className="shadow-card">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="h-4 w-4 text-secondary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{report.report_name}</p>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteReport(report.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </p>
                        {sd && (
                          <div className="mt-2 space-y-1.5">
                            {sd.conditions_detected?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {sd.conditions_detected.map((c: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                                ))}
                              </div>
                            )}
                            {sd.notes && (
                              <p className="text-xs text-muted-foreground flex items-start gap-1">
                                <Brain className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                {sd.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
