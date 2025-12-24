import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Eye, CheckCircle2, Loader2 } from "lucide-react";

export default function EmailReports() {
  const { toast } = useToast();
  const [email, setEmail] = useState("tommasominuto@gmail.com");
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const sendReport = async () => {
    setIsSending(true);
    try {
      const response = await fetch("/api/reports/weekly/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Errore nell'invio");
      }
      
      toast({
        title: "Report inviato!",
        description: `Il report settimanale è stato inviato a ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const loadPreview = async () => {
    try {
      const response = await fetch("/api/reports/weekly/preview");
      const html = await response.text();
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare l'anteprima",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Report Email</h1>
            <p className="text-muted-foreground">Gestisci i report automatici via email</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Report Settimanale
              </CardTitle>
              <CardDescription>
                Ricevi ogni domenica mattina un riepilogo delle tue spese settimanali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Report automatico attivo - invio ogni domenica alle 9:00</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Indirizzo Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@esempio.com"
                  data-testid="input-report-email"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={sendReport} 
                  disabled={isSending || !email}
                  data-testid="button-send-report"
                >
                  {isSending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Invio in corso...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Invia Report Ora</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={loadPreview}
                  data-testid="button-preview-report"
                >
                  <Eye className="h-4 w-4 mr-2" /> Anteprima
                </Button>
              </div>
            </CardContent>
          </Card>

          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Anteprima Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </CardContent>
            </Card>
          )}
        </div>
    </Layout>
  );
}
