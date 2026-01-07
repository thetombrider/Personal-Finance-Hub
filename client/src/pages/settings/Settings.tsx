import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { BankLinkModal } from "@/components/bank-link-modal";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const formSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email("Email non valida").optional().or(z.literal("")),
    username: z.string().min(3, "Lo username deve essere di almeno 3 caratteri"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
}).refine((data) => {
    if (data.password && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
});

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [renewingInstitutionId, setRenewingInstitutionId] = useState<string | null>(null);

    const { data: connections = [], refetch: refetchConnections } = useQuery<any[]>({
        queryKey: ["/api/gocardless/connections"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            email: user?.email || "",
            username: user?.username || "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const updateData: any = {};
            if (values.username !== user?.username) {
                updateData.username = values.username;
            }
            if (values.firstName !== user?.firstName) {
                updateData.firstName = values.firstName;
            }
            if (values.lastName !== user?.lastName) {
                updateData.lastName = values.lastName;
            }
            if (values.email !== user?.email) {
                updateData.email = values.email || null;
            }
            if (values.password) {
                updateData.password = values.password;
            }

            if (Object.keys(updateData).length === 0) {
                setIsLoading(false);
                return;
            }

            await apiRequest("PUT", "/api/user", updateData);
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

            toast({
                title: "Impostazioni aggiornate",
                description: "Le tue credenziali sono state aggiornate con successo.",
            });

            form.reset({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                username: values.username,
                password: "",
                confirmPassword: "",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Errore",
                description: error.message || "Si è verificato un errore durante l'aggiornamento.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function onDeleteConnection(id: number) {
        if (!confirm("Sei sicuro di voler rimuovere questa connessione bancaria?")) return;
        try {
            await apiRequest("DELETE", `/api/gocardless/connections/${id}`);
            await refetchConnections();
            toast({
                title: "Connessione rimossa",
                description: "La connessione bancaria è stata eliminata.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile rimuovere la connessione.",
            });
        }
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Impostazioni Utente</h1>
                    <p className="text-muted-foreground">
                        Gestisci le tue credenziali di accesso e i tuoi dati personali.
                    </p>
                </div>

                <Card className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle>Connessioni Bancarie</CardTitle>
                            <CardDescription>
                                Gestisci le connessioni ai tuoi istituti bancari (GoCardless).
                                Le connessioni durano 90 giorni.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuova Connessione
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {connections.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                Nessuna connessione attiva.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Istituto</TableHead>
                                        <TableHead>Stato</TableHead>
                                        <TableHead>Scadenza</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {connections.map((conn) => {
                                        const created = new Date(conn.createdAt);
                                        const expires = addDays(created, 90);
                                        const expiredISO = isPast(expires); // Expired by date
                                        const daysLeft = Math.ceil((expires.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                                        // Determine display status
                                        // LN = Linked (Active)
                                        // INIT = Initialized (Pending/Incomplete)
                                        // CR = Created (Waiting for user)
                                        // EX = Expired (GoCardless status)
                                        // RJ = Rejected
                                        // UA = User Aborted

                                        let statusConfig: {
                                            variant: "default" | "secondary" | "destructive" | "outline";
                                            label: string;
                                            className: string;
                                        } = {
                                            variant: "secondary",
                                            label: "Sconosciuto",
                                            className: ""
                                        };

                                        // Status Logic
                                        if (conn.status === "LN") {
                                            if (expiredISO) {
                                                statusConfig = {
                                                    variant: "destructive",
                                                    label: "Scaduta",
                                                    className: "flex w-fit items-center gap-1"
                                                };
                                            } else {
                                                statusConfig = {
                                                    variant: "secondary",
                                                    label: "Attiva",
                                                    className: "bg-green-100 text-green-800 hover:bg-green-100 flex w-fit items-center gap-1"
                                                };
                                            }
                                        } else if (conn.status === "INIT" || conn.status === "CR") {
                                            const isStale = new Date().getTime() - created.getTime() > 24 * 60 * 60 * 1000;
                                            if (isStale) {
                                                statusConfig = {
                                                    variant: "secondary",
                                                    label: "Timeout",
                                                    className: "bg-orange-100 text-orange-800 hover:bg-orange-100 flex w-fit items-center gap-1"
                                                };
                                            } else {
                                                statusConfig = {
                                                    variant: "outline",
                                                    label: "In Attesa",
                                                    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex w-fit items-center gap-1 border-yellow-200"
                                                };
                                            }
                                        } else if (conn.status === "EX") {
                                            statusConfig = {
                                                variant: "destructive",
                                                label: "Scaduta (GC)",
                                                className: "flex w-fit items-center gap-1"
                                            };
                                        } else {
                                            // RJ, UA, SU, or unknown
                                            statusConfig = {
                                                variant: "secondary",
                                                label: "Fallita",
                                                className: "bg-red-100 text-red-800 hover:bg-red-100 flex w-fit items-center gap-1"
                                            };
                                        }

                                        return (
                                            <TableRow key={conn.id}>
                                                <TableCell className="font-medium">
                                                    {conn.institutionId}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={statusConfig.variant}
                                                        className={statusConfig.className}
                                                    >
                                                        {statusConfig.label === "Attiva" && <CheckCircle2 className="h-3 w-3" />}
                                                        {(statusConfig.label === "Scaduta" || statusConfig.label === "Fallita" || statusConfig.label.includes("Scaduta")) && <AlertCircle className="h-3 w-3" />}
                                                        {statusConfig.label === "In Attesa" && <RefreshCw className="h-3 w-3 animate-spin duration-3000" />}
                                                        {statusConfig.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{conn.status === "LN" ? format(expires, "dd/MM/yyyy") : "-"}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {conn.status === "LN"
                                                                ? (expiredISO ? "Scaduta" : `${daysLeft} giorni rimanenti`)
                                                                : (conn.status === "INIT" ? "In attesa di conferma" : "Non attiva")
                                                            }
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {(expiredISO || conn.status !== "LN") && (
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setRenewingInstitutionId(conn.institutionId);
                                                                    setIsBankModalOpen(true);
                                                                }}
                                                                title="Rinnova"
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => onDeleteConnection(conn.id)}
                                                            title="Elimina"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dati Personali</CardTitle>
                                <CardDescription>
                                    Gestisci le tue informazioni personali.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Il tuo nome" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cognome</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Il tuo cognome" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="email" placeholder="latua@email.com" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Credenziali</CardTitle>
                                <CardDescription>
                                    Aggiorna il tuo nome utente e la password.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nuova Password (opzionale)</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Conferma Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading} size="lg">
                                {isLoading ? "Salvataggio..." : "Salva Tutte le Modifiche"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
            <BankLinkModal
                isOpen={isBankModalOpen}
                onClose={() => {
                    setIsBankModalOpen(false);
                    setRenewingInstitutionId(null);
                    refetchConnections();
                }}
                initialInstitutionId={renewingInstitutionId} // Pass the ID
            />
        </Layout>
    );
}
