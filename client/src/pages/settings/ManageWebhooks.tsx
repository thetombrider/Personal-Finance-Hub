import { useState } from "react";
import Layout from "@/components/Layout";
import { TallyGuideDialog } from "@/components/settings/TallyGuideDialog";
import { GenericJSONGuideDialog } from "@/components/settings/GenericJSONGuideDialog";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { toastPatterns, showError } from "@/lib/toastHelpers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { formatDateTime, dateFormats } from "@/lib/dateFormatters";
import { Plus, Trash2, Edit2, ScrollText, Copy, Check, Eye, EyeOff, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
    name: z.string().min(2, "Name is required"),
    type: z.enum(["tally", "generic"]),
    active: z.boolean().default(true),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

function LogDetailsDialog({ log, open, onOpenChange }: { log: WebhookLog | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!log) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Log Details #{log.id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-1">Date</h4>
                            <p className="text-sm">{format(new Date(log.createdAt), dateFormats.dateTimeSeconds)}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Status</h4>
                            <Badge variant={log.status === "success" ? "secondary" : "destructive"} className={log.status === "success" ? "bg-green-100 text-green-800" : ""}>
                                {log.status}
                            </Badge>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">Duration</h4>
                            <p className="text-sm">{log.processingTimeMs}ms</p>
                        </div>
                    </div>

                    {log.errorMessage && (
                        <div>
                            <h4 className="font-semibold mb-1">Error</h4>
                            <pre className="bg-destructive/10 text-destructive p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                                {log.errorMessage}
                            </pre>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold mb-1">Request Body</h4>
                        <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
                            {log.requestBody ? JSON.stringify(log.requestBody, null, 2) : "No data"}
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
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">No logs found</TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.createdAt), dateFormats.dateTimeSeconds)}</TableCell>
                                            <TableCell>
                                                <Badge variant={log.status === "success" ? "secondary" : "destructive"} className={log.status === "success" ? "bg-green-100 text-green-800" : ""}>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{log.processingTimeMs}ms</TableCell>
                                            <TableCell
                                                className="max-w-[300px] truncate text-xs font-mono cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => setSelectedLog(log)}
                                                title="Click to see details"
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
    const [isGenericGuideOpen, setIsGenericGuideOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
    const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
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
            toastPatterns.created(toast, "Webhook", "Webhook created successfully.");
        },
        onError: (error: any) => {
            toastPatterns.failed(toast, "create webhook", error);
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
            toastPatterns.updated(toast, "Webhook");
        },
        onError: (error: any) => {
            toastPatterns.failed(toast, "update webhook", error);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiRequest("DELETE", `/api/webhooks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
            toastPatterns.deleted(toast, "Webhook");
        },
        onError: (error: any) => {
            toastPatterns.failed(toast, "delete webhook", error);
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

    const handleDelete = () => {
        if (webhookToDelete) {
            deleteMutation.mutate(webhookToDelete);
            setWebhookToDelete(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toastPatterns.copied(toast);
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
                        <h1 className="text-3xl font-heading font-bold text-foreground">Webhook Management</h1>
                        <p className="text-muted-foreground">Connect external services like Tally.so to automatically import transactions.</p>
                    </div>
                    <Button onClick={() => { setEditingWebhook(null); form.reset(); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> New Webhook
                    </Button>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingWebhook(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingWebhook ? "Edit Webhook" : "New Webhook"}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Tally Expenses" {...field} />
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
                                            <FormLabel>Integration Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editingWebhook}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="tally">Tally.so Form</SelectItem>
                                                    <SelectItem value="generic">Generic JSON</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                We support Tally.so forms and generic JSON payloads
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
                                                <FormLabel className="text-base">Active</FormLabel>
                                                <FormDescription>
                                                    Enable or disable this webhook
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
                                    <Button type="submit">{editingWebhook ? "Save" : "Create"}</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                <div className="rounded-md border w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Endpoint URL</TableHead>
                                <TableHead>Secret (Signature)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {webhooks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No webhooks configured. Create one to start.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                webhooks.map((webhook) => (
                                    <TableRow key={webhook.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {webhook.type === 'tally' && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">TALLY</span>}
                                                {webhook.type === 'generic' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">JSON</span>}
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
                                                    {webhook.secret ? (showSecret[webhook.id] ? webhook.secret : "••••••••") : "None"}
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
                                                {webhook.active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {webhook.lastUsedAt ? formatDateTime(new Date(webhook.lastUsedAt)) : "Never"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {webhook.type === 'tally' && (
                                                    <Button variant="ghost" size="icon" onClick={() => setIsGuideOpen(true)} title="Configuration Guide">
                                                        <HelpCircle className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                )}
                                                {webhook.type === 'generic' && (
                                                    <Button variant="ghost" size="icon" onClick={() => setIsGenericGuideOpen(true)} title="JSON Configuration Guide">
                                                        <HelpCircle className="h-4 w-4 text-emerald-500" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => setViewingLogsId(webhook.id)} title="Logs">
                                                    <ScrollText className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(webhook)} title="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setWebhookToDelete(webhook.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
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

            <GenericJSONGuideDialog
                open={isGenericGuideOpen}
                onOpenChange={setIsGenericGuideOpen}
            />

            <ConfirmDialog
                open={webhookToDelete !== null}
                onOpenChange={(open) => !open && setWebhookToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Webhook"
                description="Are you sure you want to delete this webhook? Associated logs will be deleted."
                confirmText="Delete"
                variant="destructive"
            />
        </Layout>
    );
}
