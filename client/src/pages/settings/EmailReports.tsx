import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getErrorMessage } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError } from "@/lib/toastHelpers";
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

      showSuccess(toast, "Report sent!", `Weekly report sent to ${email}`);
    } catch (error) {
      showError(toast, "Error", getErrorMessage(error));
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
      showError(toast, "Error", "Unable to load preview");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Email Reports</h1>
          <p className="text-muted-foreground">Manage automatic email reports</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5" />
              <h3 className="text-lg font-medium">Weekly Report</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive a summary of your weekly expenses every Sunday morning
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/30">
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
          </div>
        </div>

        {showPreview && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Report Preview</h3>
            <div
              className="border rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
