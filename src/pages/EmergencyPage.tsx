import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Phone, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function EmergencyPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <AuthPage />;

  const handleSOS = () => {
    toast.info("SOS alert simulated — in production this would contact emergency services and your emergency contacts with your location.");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-critical" /> Emergency & SOS
        </h1>

        <Card className="border-critical/30 bg-critical/5 shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-critical flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Emergency SOS
            </CardTitle>
            <CardDescription>
              Tap the button below to simulate sending an emergency alert with your location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="emergency" size="lg" className="w-full text-lg py-6" onClick={handleSOS}>
              <Phone className="h-5 w-5 mr-2" /> ACTIVATE SOS
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Location sharing will be simulated
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Emergency Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Emergency Services", number: "911" },
              { name: "Poison Control", number: "1-800-222-1222" },
              { name: "Suicide & Crisis Lifeline", number: "988" },
            ].map((contact) => (
              <div key={contact.number} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="font-medium text-sm">{contact.name}</span>
                <a href={`tel:${contact.number}`} className="text-primary font-semibold text-sm">{contact.number}</a>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
