import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { showError } from "@/lib/toastHelpers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDateTime } from "@/lib/dateFormatters";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ApiToken = {
    id: string;
    name: string;
    userId: string;
    lastUsedAt: string | null;
    createdAt: string;
};

const tokenSchema = z.object({
    name: z.string().min(1, "Name is required"),
});

type TokenFormValues = z.infer<typeof tokenSchema>;

export default function ManageApiTokens() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: tokens = [] } = useQuery<ApiToken[]>({
        queryKey: ["/api/api-tokens"],
    });

    const form = useForm<TokenFormValues>({
        resolver: zodResolver(tokenSchema),
        defaultValues: { name: "" },
    });

    const createMutation = useMutation({
        mutationFn: async (data: TokenFormValues) => {
            const res = await apiRequest("POST", "/api/api-tokens", data);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/api-tokens"] });
            setNewToken(data.token);
            form.reset();
        },
        onError: (err) => showError(toast, "Error", err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/api-tokens/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/api-tokens"] });
            toast({ title: "Token deleted" });
        },
        onError: (err) => showError(toast, "Error", err.message),
    });

    const onSubmit = (data: TokenFormValues) => createMutation.mutate(data);

    const copyToken = async () => {
        if (!newToken) return;
        await navigator.clipboard.writeText(newToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closeNewTokenDialog = () => {
        setNewToken(null);
        setIsDialogOpen(false);
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">API Tokens</h1>
                        <p className="text-muted-foreground">
                            Generate tokens to connect MCP clients like Claude Desktop to your account.
                        </p>
                    </div>
                    <Button onClick={() => { setIsDialogOpen(true); setNewToken(null); }} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Token
                    </Button>
                </div>

                {tokens.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Last Used</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tokens.map((token) => (
                                    <TableRow key={token.id}>
                                        <TableCell className="font-medium">{token.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {token.createdAt ? formatDateTime(token.createdAt) : "-"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {token.lastUsedAt ? formatDateTime(token.lastUsedAt) : "Never"}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteId(token.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground border rounded-md">
                        No API tokens yet. Create one to connect MCP clients.
                    </div>
                )}

                <div className="rounded-md border p-4 bg-muted/50 space-y-2">
                    <h3 className="font-semibold text-sm">Claude Desktop Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        After creating a token, add this to your Claude Desktop <code className="text-xs bg-muted px-1 py-0.5 rounded">claude_desktop_config.json</code>:
                    </p>
                    <pre className="bg-background border rounded-md p-3 text-xs overflow-x-auto font-mono">
{`{
  "mcpServers": {
    "fintrack": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer ft_your_token_here"
      }
    }
  }
}`}
                    </pre>
                </div>
            </div>

            {/* Create Token Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeNewTokenDialog(); else setIsDialogOpen(true); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{newToken ? "Token Created" : "Create API Token"}</DialogTitle>
                    </DialogHeader>

                    {newToken ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Copy this token now. You won't be able to see it again.
                            </p>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={newToken}
                                    className="font-mono text-sm"
                                />
                                <Button variant="outline" size="icon" onClick={copyToken}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <DialogFooter>
                                <Button onClick={closeNewTokenDialog}>Done</Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Token Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Claude Desktop" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Creating..." : "Create Token"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title="Delete API Token"
                description="Any clients using this token will lose access immediately."
                onConfirm={() => {
                    if (deleteId) {
                        deleteMutation.mutate(deleteId);
                        setDeleteId(null);
                    }
                }}
            />
        </Layout>
    );
}
