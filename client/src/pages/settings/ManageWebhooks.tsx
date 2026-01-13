import { useState } from "react";
import Layout from "@/components/Layout";
import { TallyGuideDialog } from "@/components/settings/TallyGuideDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Plus, Trash2, Edit2, ScrollText, Copy, Check, Eye, EyeOff, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type Webhook = {
    id: string;
    name: string;
    type: string;
    active: boolean;
    lastUsedAt: string | null;
    createdAt: string;
    secret?: string | null;
};

type WebhookLog = {
    id: number;
    status: string;
    processingTimeMs: number;
    createdAt: string;
    errorMessage?: string;
    requestBody?: any;
    responseBody?: any;
};

const webhookSchema = z.object({
    name: z.string().min(2, "Il nome è obbligatorio"),
    type: z.enum(["tally"]),
    active: z.boolean().default(true),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

function LogDetailsDialog({ log, open, onOpenChange }: { log: WebhookLog | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!log) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Dettagli Log #{log.id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-1">Data</h4>
                            <p className="text-sm">{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Stato</h4>
                            <Badge variant={log.status === "success" ? "secondary" : "destructive"} className={log.status === "success" ? "bg-green-100 text-green-800" : ""}>
                                {log.status}
                            </Badge>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Durata</h4>
                            <p className="text-sm">{log.processingTimeMs}ms</p>
                        </div>
                    </div>

                    {log.errorMessage && (
                        <div>
                            <h4 className="font-semibold mb-1">Errore</h4>
                            <pre className="bg-destructive/10 text-destructive p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                                {log.errorMessage}
                            </pre>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold mb-1">Request Body</h4>
                        <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
                            {log.requestBody ? JSON.stringify(log.requestBody, null, 2) : "Nessun dato"}
                        </pre>
                    </div>

                    {log.responseBody && (
                        <div>
                            <h4 className="font-semibold mb-1">Response Body</h4>
                            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
                                {JSON.stringify(log.responseBody, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function WebhookLogsDialog({ webhookId, webhookName, open, onOpenChange }: { webhookId: string | null, webhookName: string, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
    const { data: logs = [] } = useQuery<WebhookLog[]>({
        queryKey: [`/api/webhooks/${webhookId}/logs`],
        enabled: !!webhookId && open,
    });

    // Auto-refresh logs every 5 seconds while open
    useQuery(
        {
            queryKey: [`/api/webhooks/${webhookId}/logs`],
            queryFn: async () => {
                if (!webhookId) return [];
                const res = await fetch(`/api/webhooks/${webhookId}/logs`);
                return res.json();
            },
            enabled: !!webhookId && open,
            refetchInterval: 5000,
        }
    );

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Log Webhook: {webhookName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Stato</TableHead>
                                    <TableHead>Durata</TableHead>
                                    <TableHead>Dettagli</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">Nessun log trovato</TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}</TableCell>
                                            <TableCell>
                                                <Badge variant={log.status === "success" ? "secondary" : "destructive"} className={log.status === "success" ? "bg-green-100 text-green-800" : ""}>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{log.processingTimeMs}ms</TableCell>
                                            <TableCell
                                                className="max-w-[300px] truncate text-xs font-mono cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => setSelectedLog(log)}
                                                title="Clicca per vedere i dettagli"
                                            >
                                                {log.errorMessage || JSON.stringify(log.requestBody)?.substring(0, 50) + "..."}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <LogDetailsDialog
                log={selectedLog}
                open={!!selectedLog}
                onOpenChange={(open) => !open && setSelectedLog(null)}
            />
        </>
    );
}



export default function ManageWebhooks() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: webhooks = [], isLoading } = useQuery<Webhook[]>({
        queryKey: ["/api/webhooks"],
    });

    const form = useForm<WebhookFormValues>({
        resolver: zodResolver(webhookSchema),
        defaultValues: {
            name: "",
            type: "tally",
            active: true,
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: WebhookFormValues) => apiRequest("POST", "/api/webhooks", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
            setIsDialogOpen(false);
            form.reset();
            toast({ title: "Webhook creato", description: "Il webhook è stato creato con successo." });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<WebhookFormValues> }) =>
            apiRequest("PATCH", `/api/webhooks/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
            setIsDialogOpen(false);
            setEditingWebhook(null);
            form.reset();
            toast({ title: "Webhook aggiornato" });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiRequest("DELETE", `/api/webhooks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
            toast({ title: "Webhook eliminato" });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        }
    });

    const onSubmit = (data: WebhookFormValues) => {
        if (editingWebhook) {
            updateMutation.mutate({ id: editingWebhook.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (webhook: Webhook) => {
        setEditingWebhook(webhook);
        form.reset({
            name: webhook.name,
            type: webhook.type as "tally",
            active: webhook.active,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Sei sicuro di voler eliminare questo webhook? I log associati verranno eliminati.")) {
            deleteMutation.mutate(id);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiato negli appunti" });
    };

    const toggleSecret = (id: string) => {
        setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getWebhookUrl = (id: string) => {
        return `${window.location.protocol}//${window.location.host}/api/webhooks/${id}`;
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-foreground">Gestione Webhook</h1>
                        <p className="text-muted-foreground">Collega servizi esterni come Tally.so per importare transazioni automaticamente.</p>
                    </div>
                    <Button onClick={() => { setEditingWebhook(null); form.reset(); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Nuovo Webhook
                    </Button>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingWebhook(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingWebhook ? "Modifica Webhook" : "Nuovo Webhook"}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl>
                                                <Input placeholder="es. Tally Spese" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo Integrazione</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editingWebhook}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleziona tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="tally">Tally.so Form</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Attualmente supportiamo solo moduli Tally.so
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="active"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Attivo</FormLabel>
                                                <FormDescription>
                                                    Abilita o disabilita questo webhook
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit">{editingWebhook ? "Salva" : "Crea"}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                <Card>
                    <CardHeader>
                        <CardTitle>I Tuoi Webhook</CardTitle>
                        <CardDescription>
                            Configura gli URL nel servizio esterno per iniziare a ricevere dati.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>URL Endpoint</TableHead>
                                    <TableHead>Segreto (Firma)</TableHead>
                                    <TableHead>Stato</TableHead>
                                    <TableHead>Ultimo Utilizzo</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {webhooks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Nessun webhook configurato. Creane uno per iniziare.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    webhooks.map((webhook) => (
                                        <TableRow key={webhook.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {webhook.type === 'tally' && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">TALLY</span>}
                                                    {webhook.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 max-w-[250px]">
                                                    <code className="bg-slate-100 px-1 py-0.5 rounded text-xs truncate flex-1 block">
                                                        .../api/webhooks/{webhook.id}
                                                    </code>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(getWebhookUrl(webhook.id))}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {webhook.secret ? (showSecret[webhook.id] ? webhook.secret : "••••••••") : "Nessuno"}
                                                    </span>
                                                    {webhook.secret && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSecret(webhook.id)}>
                                                            {showSecret[webhook.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={webhook.active ? "secondary" : "outline"} className={webhook.active ? "bg-green-100 text-green-800" : "text-slate-500"}>
                                                    {webhook.active ? "Attivo" : "Inattivo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {webhook.lastUsedAt ? format(new Date(webhook.lastUsedAt), "dd/MM/yyyy HH:mm") : "Mai"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {webhook.type === 'tally' && (
                                                        <Button variant="ghost" size="icon" onClick={() => setIsGuideOpen(true)} title="Guida Configurazione">
                                                            <HelpCircle className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => setViewingLogsId(webhook.id)} title="Logs">
                                                        <ScrollText className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(webhook)} title="Modifica">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(webhook.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Elimina">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <WebhookLogsDialog
                webhookId={viewingLogsId}
                webhookName={webhooks.find(w => w.id === viewingLogsId)?.name || ""}
                open={!!viewingLogsId}
                onOpenChange={(open) => !open && setViewingLogsId(null)}
            />

            <TallyGuideDialog
                open={isGuideOpen}
                onOpenChange={setIsGuideOpen}
            />
        </Layout>
    );
}
