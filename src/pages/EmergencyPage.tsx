import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/pages/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Phone, MapPin, AlertTriangle, Plus, Trash2, Users, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EmergencyContact {
  id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
}

export default function EmergencyPage() {
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [sosTriggered, setSosTriggered] = useState(false);

  const fetchContacts = () => {
    if (!user) return;
    supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setContacts((data as EmergencyContact[]) || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const addContact = async () => {
    if (!user || !newName.trim() || !newPhone.trim()) return;
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user.id,
      name: newName.trim(),
      phone_number: newPhone.trim(),
      relationship: newRelation.trim() || null,
    });
    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success("Emergency contact added");
      setNewName("");
      setNewPhone("");
      setNewRelation("");
      setShowAdd(false);
      fetchContacts();
    }
  };

  const deleteContact = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    toast.success("Contact removed");
    fetchContacts();
  };

  const handleSOS = () => {
    setSosTriggered(true);

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          toast.success(
            `🚨 SOS Alert Simulated!\n\nLocation: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\nContacts notified: ${contacts.length}\nCondition: Emergency`,
            { duration: 8000 }
          );
        },
        () => {
          toast.success(
            `🚨 SOS Alert Simulated!\n\nLocation: Unable to determine\nContacts notified: ${contacts.length}\nCondition: Emergency`,
            { duration: 8000 }
          );
        }
      );
    } else {
      toast.success(`🚨 SOS Alert Simulated! ${contacts.length} contacts would be notified.`, { duration: 5000 });
    }
  };

  if (authLoading) return null;
  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-critical" /> Emergency & SOS
        </h1>

        {/* SOS Card */}
        <Card className="border-critical/30 bg-critical/5 shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-critical flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Emergency SOS
            </CardTitle>
            <CardDescription>
              Triggers an alert to your emergency contacts with your condition and location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="emergency" size="lg" className="w-full text-lg py-6" onClick={handleSOS}>
              <Phone className="h-5 w-5 mr-2" /> ACTIVATE SOS
            </Button>
            {sosTriggered && (
              <div className="p-3 rounded-lg bg-critical/10 border border-critical/20 animate-fade-in text-sm space-y-1">
                <p className="font-semibold text-critical flex items-center gap-2">
                  <Send className="h-4 w-4" /> SOS Alert Sent (Simulated)
                </p>
                <p className="text-muted-foreground">
                  {contacts.length > 0
                    ? `${contacts.length} emergency contact(s) would be notified: ${contacts.map(c => c.name).join(", ")}`
                    : "No emergency contacts configured. Add contacts below."}
                </p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location sharing simulated
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Emergency Contacts
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No emergency contacts yet. Add contacts to enable SOS alerts.
              </p>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.phone_number}
                      {contact.relationship && ` · ${contact.relationship}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${contact.phone_number}`} className="text-primary">
                      <Phone className="h-4 w-4" />
                    </a>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteContact(contact.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Emergency Numbers */}
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

        {/* Add Contact Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add Emergency Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <Input placeholder="Relationship (optional)" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} />
              <Button variant="hero" className="w-full" onClick={addContact} disabled={!newName.trim() || !newPhone.trim()}>
                Save Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
