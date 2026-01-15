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

import { Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, Download } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
}).refine((data) => {
    if (data.password && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function Settings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [renewingInstitutionId, setRenewingInstitutionId] = useState<string | null>(null);

    const { data: authConfig } = useQuery<{ oidcEnabled: boolean }>({
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
                title: "Settings updated",
                description: "Your credentials have been updated successfully.",
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
                title: "Error",
                description: error.message || "An error occurred during update.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your access credentials and personal data.
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>
                                    Manage your personal information.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Your first name" />
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
                                                <FormLabel>Last Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Your last name" />
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
                                                <Input {...field} type="email" placeholder="your@email.com" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Credentials</CardTitle>
                                <CardDescription>
                                    Update your username and password.
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
                                                <FormLabel>New Password (optional)</FormLabel>
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
                                                <FormLabel>Confirm Password</FormLabel>
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
                                        Manage access via external provider (e.g. Replit).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {user?.oidcId ? (
                                        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <div className="flex-1">
                                                <p className="font-medium">Account Linked</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Your account is successfully linked to the SSO provider.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                                                <div className="flex-1">
                                                    <p className="font-medium text-yellow-700">No account linked</p>
                                                    <p className="text-sm text-yellow-600/80">
                                                        Link your account to log in without a password.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => window.location.href = "/api/auth/oidc"}
                                            >
                                                Link SSO Account
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Data Management</CardTitle>
                                <CardDescription>
                                    Export your data or permanently delete your account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-background">
                                    <div>
                                        <h4 className="font-medium">Export Data</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Download an Excel file with all your personal data.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.open("/api/export-data", "_blank")}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Excel
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-destructive/5 border-destructive/20">
                                    <div>
                                        <h4 className="font-medium text-destructive">Delete Account</h4>
                                        <p className="text-sm text-destructive/80">
                                            This action is irreversible. All your data will be lost.
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" variant="destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. It will permanently delete your
                                                    account and remove all your data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    onClick={async () => {
                                                        try {
                                                            await apiRequest("DELETE", "/api/user");
                                                            window.location.href = "/auth";
                                                        } catch (error) {
                                                            toast({
                                                                variant: "destructive",
                                                                title: "Error",
                                                                description: "An error occurred while deleting the account.",
                                                            });
                                                        }
                                                    }}
                                                >
                                                    Delete Permanently
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading} size="lg">
                                {isLoading ? "Saving..." : "Save All Changes"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </Layout>
    );
}
