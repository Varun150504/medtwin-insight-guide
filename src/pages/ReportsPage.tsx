import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Upload } from "lucide-react";
import { format } from "date-fns";

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [user]);

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Medical Reports
        </h1>
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Loading...</p>
        ) : reports.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No medical reports yet.</p>
              <p className="text-xs mt-1">Report upload feature coming soon — your AI twin will learn from them.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="shadow-card">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{report.report_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
