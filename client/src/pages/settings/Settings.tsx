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

const formSchema = z.object({
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

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
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
                        Gestisci le tue credenziali di accesso.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Credenziali</CardTitle>
                        <CardDescription>
                            Aggiorna il tuo nome utente e la password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Salvataggio..." : "Salva Modifiche"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
