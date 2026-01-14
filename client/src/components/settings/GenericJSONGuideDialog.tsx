import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Code } from "lucide-react";

export function GenericJSONGuideDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Generic JSON Integration Guide</DialogTitle>
                    <DialogDescription>
                        Configure your HTTP POST request with the following JSON payload.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md text-sm text-slate-700">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span>Send a <strong>POST</strong> request with header <code>Content-Type: application/json</code></span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">JSON Request Structure</h4>
                            <pre className="bg-slate-950 text-slate-50 p-4 rounded-md text-sm overflow-x-auto font-mono">
                                {`{
  "date": "YYYY-MM-DD",     // Optional (default: today)
  "amount": 123.45,         // Required (number)
  "type": "income",         // Required ("income" or "expense")
  "description": "...",     // Required (string)
  "account": "...",         // Required (exact account name)
  "category": "..."         // Required (exact category name)
}`}
                            </pre>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Field</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Note / Format</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">date</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">ISO format: YYYY-MM-DD. If omitted, today's date is used.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">amount</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">number</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Positive numeric value. Use a dot as the decimal separator.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">type</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Accepted values: <span className="font-mono text-xs">"income"</span> (income) or <span className="font-mono text-xs">"expense"</span> (expense).</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">description</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Transaction description.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">account</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Must exactly match the name of an existing account.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">category</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Must exactly match the name of an existing category.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Example cURL</h4>
                        <Card className="bg-slate-950 text-slate-50 border-slate-800">
                            <CardContent className="p-4 font-mono text-xs overflow-x-auto">
                                {`curl -X POST https://your-domain.com/api/webhooks/{webhook_id} \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "${new Date().toISOString().split('T')[0]}",
    "amount": 42.50,
    "type": "expense",
    "description": "Online Purchase",
    "account": "Revolut",
    "category": "Shopping"
  }'`}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
