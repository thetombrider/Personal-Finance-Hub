import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export function TallyGuideDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tally.so Configuration Guide</DialogTitle>
                    <DialogDescription>
                        Set the field names (Label) in your Tally form exactly as shown below.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md text-sm text-slate-700">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span>Field names (Label) are case-insensitive.</span>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Campo</TableHead>
                                    <TableHead>Label (accepted names)</TableHead>
                                    <TableHead>Format / Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Data</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">date</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">DD/MM/YYYY or YYYY-MM-DD</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Description</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <code className="bg-slate-100 px-1 rounded text-xs w-fit">description</code>
                                            <code className="bg-slate-100 px-1 rounded text-xs w-fit">subject</code>
                                            <code className="bg-slate-100 px-1 rounded text-xs w-fit">description</code>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Text field</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Account</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">account</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Dropdown. Must exactly match the name of an existing account.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Category</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">category</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Dropdown. Must exactly match the name of an existing category.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Income Amount</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">income_amount</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        Supporta formato EU (1.234,56) e US (1234.56).
                                        Use if you want separate fields for income/expense.
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Expense Amount</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">expense_amount</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">As above.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Direction</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">direction</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        Dropdown/Radio. If the value is <span className="font-semibold">"income"</span>, the transaction will be positive.
                                        Useful if you want to use a single amount field.
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Configuration Examples</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="bg-slate-50/50">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm">Method 1: Separate Amount Fields</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                                    Use conditional fields on Tally. If the user selects "Expense", show "Expense Amount". If they select "Income", show "Income Amount".
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50/50">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm">Method 2: Direction Field</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                                    Use a Dropdown "Direction" with options "Income" and "Expense". Use a single field "Income Amount" (or Expense Amount, it doesn't matter) for the value.
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
