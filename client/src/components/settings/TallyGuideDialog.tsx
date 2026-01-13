import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export function TallyGuideDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Guida Configurazione Tally.so</DialogTitle>
                    <DialogDescription>
                        Imposta i nomi dei campi nel tuo form Tally esattamente come indicato qui sotto.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md text-sm text-slate-700">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span>I nomi dei campi (Label) sono case-insensitive.</span>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Campo</TableHead>
                                    <TableHead>Label (nomi accettati)</TableHead>
                                    <TableHead>Formato / Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Data</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">data</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">DD/MM/YYYY o YYYY-MM-DD</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Descrizione</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <code className="bg-slate-100 px-1 rounded text-xs w-fit">descrizione</code>
                                            <code className="bg-slate-100 px-1 rounded text-xs w-fit">causale</code>
                                            <code className="bg-slate-100 px-1 rounded text-xs w-fit">description</code>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Testo libero</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Conto</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">conto</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Dropdown. Deve corrispondere esattamente al nome di un tuo conto su Personal Finance Hub.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Categoria</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">categoria</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Dropdown. Deve corrispondere esattamente al nome di una tua categoria.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Importo Entrata</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">importo entrata</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        Supporta formato EU (1.234,56) e US (1234.56).
                                        Da usare se vuoi campi separati per entrata/uscita.
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Importo Uscita</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">importo uscita</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">Come sopra.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Direzione</TableCell>
                                    <TableCell><code className="bg-slate-100 px-1 rounded text-xs">direzione</code></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        Dropdown/Radio. Se il valore è <span className="font-semibold">"entrata"</span>, la transazione sarà positiva.
                                        Utile se usi un solo campo importo.
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Esempi di configurazione</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="bg-slate-50/50">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm">Metodo 1: Campi Importo Separati</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                                    Usa campi condizionali su Tally. Se l'utente seleziona "Spesa", mostra "Importo Uscita". Se seleziona "Guadagno", mostra "Importo Entrata".
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50/50">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-sm">Metodo 2: Campo Direzione</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                                    Usa un campo Dropdown "Direzione" con opzioni "Entrata" e "Uscita". Usa un unico campo "Importo Entrata" (o Uscita, è indifferente) per il valore.
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
