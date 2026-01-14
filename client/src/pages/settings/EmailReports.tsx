import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Send, Eye, CheckCircle2, Loader2 } from "lucide-react";

export default function EmailReports() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

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
        throw new Error(error.error || "Error sending report");
      }

      toast({
        title: "Report sent!",
        description: `Weekly report sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
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
        title: "Error",
        description: "Unable to load preview",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Email Reports</h1>
          <p className="text-muted-foreground">Manage automatic email reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Weekly Report
            </CardTitle>
            <CardDescription>
              Receive a summary of your weekly expenses every Sunday morning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Automatic report active - sent every Sunday at 9:00 AM</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
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
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Send Report Now</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={loadPreview}
                data-testid="button-preview-report"
              >
                <Eye className="h-4 w-4 mr-2" /> Preview
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
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
