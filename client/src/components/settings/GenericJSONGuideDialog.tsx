import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Code } from "lucide-react";

export function GenericJSONGuideDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Guida Integrazione Generic JSON</DialogTitle>
                    <DialogDescription>
                        Configura la tua richiesta HTTP POST con il seguente payload JSON.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md text-sm text-slate-700">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span>Invia una richiesta <strong>POST</strong> con header <code>Content-Type: application/json</code></span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Struttura JSON Richiesta</h4>
                            <pre className="bg-slate-950 text-slate-50 p-4 rounded-md text-sm overflow-x-auto font-mono">
                                {`{
  "date": "YYYY-MM-DD",     // Opzionale (default: oggi)
  "amount": 123.45,         // Richiesto (numero)
  "type": "income",         // Richiesto ("income" o "expense")
  "description": "...",     // Richiesto (stringa)
  "account": "...",         // Richiesto (nome esatto conto)
  "category": "..."         // Richiesto (nome esatto categoria)
}`}
                            </pre>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Campo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Note / Formato</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">date</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Formato ISO: YYYY-MM-DD. Se omesso, viene usata la data odierna.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">amount</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">number</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Valore numerico positivo. Usare il punto come separatore decimale.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">type</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Valori accettati: <span className="font-mono text-xs">"income"</span> (entrata) o <span className="font-mono text-xs">"expense"</span> (uscita).</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">description</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Descrizione della transazione.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">account</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Deve corrispondere esattamente al nome di un tuo conto esistente.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">category</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">string</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Deve corrispondere esattamente al nome di una tua categoria esistente.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Example cURL</h4>
                        <Card className="bg-slate-950 text-slate-50 border-slate-800">
                            <CardContent className="p-4 font-mono text-xs overflow-x-auto">
                                {`curl -X POST https://tuo-dominio.com/api/webhooks/{webhook_id} \\
  -H "Content-Type: application/json" \\
  -d '{
    "date": "${new Date().toISOString().split('T')[0]}",
    "amount": 42.50,
    "type": "expense",
    "description": "Acquisto Online",
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
