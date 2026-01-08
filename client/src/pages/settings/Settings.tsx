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

    const { data: authConfig } = useQuery({
        queryKey: ["/api/auth/config"],
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

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Impostazioni Utente</h1>
                    <p className="text-muted-foreground">
                        Gestisci le tue credenziali di accesso e i tuoi dati personali.
                    </p>
                </div>

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

                        {authConfig?.oidcEnabled && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Single Sign-On (SSO)</CardTitle>
                                    <CardDescription>
                                        Gestisci l'accesso tramite provider esterno (es. Replit).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {user?.oidcId ? (
                                        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <div className="flex-1">
                                                <p className="font-medium">Account Collegato</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Il tuo account è collegato correttamente al provider SSO.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                                                <div className="flex-1">
                                                    <p className="font-medium text-yellow-700">Nessun account collegato</p>
                                                    <p className="text-sm text-yellow-600/80">
                                                        Collega il tuo account per accedere senza password.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => window.location.href = "/api/auth/oidc"}
                                            >
                                                Collega Account SSO
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading} size="lg">
                                {isLoading ? "Salvataggio..." : "Salva Tutte le Modifiche"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </Layout>
    );
}
