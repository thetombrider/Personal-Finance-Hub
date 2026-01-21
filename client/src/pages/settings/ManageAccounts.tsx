import { useFinance, Account, AccountType } from "@/context/FinanceContext";
import Layout from "@/components/Layout";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Building2, PiggyBank, CreditCard, Banknote, Wallet, Link, RefreshCw, AlertCircle, CheckCircle2, MoreHorizontal, Unlink, Landmark } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BankLinkModal } from "@/components/bank-link-modal";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, isPast } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const accountSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["checking", "savings", "credit", "investment", "cash"]),
  startingBalance: z.coerce.number(),
  currency: z.string().default("EUR"),
  color: z.string().default("#3b82f6"),
  creditLimit: z.coerce.number().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function ManageAccounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, formatCurrency, isLoading: isFinanceLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [renewingInstitutionId, setRenewingInstitutionId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: connections = [], refetch: refetchConnections } = useQuery<any[]>({
    queryKey: ["/api/gocardless/connections"],
  });

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      startingBalance: 0,
      currency: "EUR",
      color: "#3b82f6",
      creditLimit: undefined,
    },
  });

  const watchedType = form.watch("type");

  const onSubmit = async (data: AccountFormValues) => {
    const formattedData = {
      ...data,
      startingBalance: data.startingBalance.toString(),
      creditLimit: data.type === "credit" && data.creditLimit ? data.creditLimit.toString() : null,
    };

    if (editingId) {
      await updateAccount(editingId, formattedData);
    } else {
      await addAccount(formattedData);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    form.reset({
      name: account.name,
      type: account.type,
      startingBalance: parseFloat(account.startingBalance),
      currency: account.currency,
      color: account.color,
      creditLimit: (account as any).creditLimit ? parseFloat((account as any).creditLimit) : undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      await deleteAccount(id);
    }
  };

  const handleUnlink = async (accountId: number) => {
    if (!confirm("Do you want to unlink this account from the bank? Transactions will no longer be imported automatically.")) return;
    try {
      await apiRequest("PATCH", `/api/accounts/${accountId}`, { gocardlessAccountId: null, bankConnectionId: null });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: "Account unlinked",
        description: "The connection with the bank has been removed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to unlink the account.",
      });
    }
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case 'checking': return Building2;
      case 'savings': return PiggyBank;
      case 'credit': return CreditCard;
      case 'cash': return Banknote;
      case 'investment': return Wallet;
      default: return Wallet;
    }
  };

  const getConnectionStatus = (account: Account) => {
    // 1. First check if account is linked via ID (new way) or gocardlessAccountId (old way, implicit)
    // Actually we need to match connection data.
    // We can match by `bankConnectionId` if present, OR iterate connections to find one that includes this account?
    // The connections API returns list of connections. Each connection usually has institutionId, status, etc.
    // It doesn't explicitly list sub-accounts in the list endpoint unless modified.
    // BUT we added bankConnectionId to account. So we can look up connection by account.bankConnectionId

    // Fallback: if we don't have bankConnectionId on account yet (legacy), we might need to rely on shared logic or just "Linked" if gocardlessAccountId is present.
    // The previous Connection UI showed status based on requisition status.
    // Let's try to find the connection that matches.

    // If account has bankConnectionId, match directly
    let connection = connections.find(c => c.id === (account as any).bankConnectionId);

    // If not found by ID (legacy data), maybe we can't easily find it without more info
    // But we know 'gocardlessAccountId' exists.
    // For now, let's rely on bankConnectionId being populated OR connection existing for user.
    // Actually, without bankConnectionId, we can't know WHICH connection corresponds to this account if there are multiple.
    // But typically user has one connection per bank.

    if (!connection && (account as any).gocardlessAccountId) {
      // Fallback: If we have gocardlessAccountId, we assume it's active unless we can prove otherwise. 
      // But we want to show expiry. This is tricky for legacy data without backfill.
      // Let's assume for this refactor we rely on `bankConnectionId`. 
      // If missing, show "Linked (Unknown Status)" or similar.
    }

    if (!connection) {
      if ((account as any).gocardlessAccountId) return { label: "Linked (Legacy)", variant: "outline" as const, color: "text-gray-500" };
      return null;
    }

    const created = new Date(connection.createdAt);
    const expires = addDays(created, 90);
    const expiredISO = isPast(expires);
    const daysLeft = Math.ceil((expires.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (connection.status === "LN") {
      if (expiredISO) {
        return {
          label: "Expired",
          variant: "destructive" as const,
          color: "bg-red-100 text-red-800",
          isExpired: true,
          days: 0,
          institutionId: connection.institutionId
        };
      }
      return {
        label: "Active",
        variant: "secondary" as const,
        color: "bg-green-100 text-green-800",
        isExpired: false,
        days: daysLeft,
        institutionId: connection.institutionId
      };
    } else if (connection.status === "INIT" || connection.status === "CR") {
      return { label: "Pending", variant: "outline" as const, color: "text-yellow-600 bg-yellow-50", institutionId: connection.institutionId };
    }

    return { label: "Error", variant: "destructive" as const, color: "text-red-600", institutionId: connection.institutionId };
  };

  if (isFinanceLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Manage Accounts</h1>
            <p className="text-muted-foreground">Monitor your accounts and bank connections in one place</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsLinkModalOpen(true)}>
              <Landmark className="mr-2 h-4 w-4" />
              Connect Bank
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                form.reset({
                  name: "",
                  type: "checking",
                  startingBalance: 0,
                  currency: "EUR",
                  color: "#3b82f6",
                  creditLimit: undefined,
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-account">
                  <Plus size={16} /> Add Manual Account
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Account" : "New Account"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {editingId && (
                      <div className="text-sm text-muted-foreground mb-4">
                        {(accounts.find(a => a.id === editingId) as any)?.gocardlessAccountId && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                            <Link className="h-4 w-4" />
                            <span>Linked to Bank (ID: {(accounts.find(a => a.id === editingId) as any)?.gocardlessAccountId})</span>
                          </div>
                        )}
                      </div>
                    )}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Main Account" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                                <SelectItem value="credit">Credit Card</SelectItem>
                                <SelectItem value="investment">Investment</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startingBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{watchedType === "credit" ? "Starting Debt" : "Starting Balance"}</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-starting-balance" />
                            </FormControl>
                            {watchedType === "credit" && (
                              <p className="text-xs text-muted-foreground">Use negative values to indicate debt</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {watchedType === "credit" && (
                      <FormField
                        control={form.control}
                        name="creditLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credit Limit</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="e.g. 1500" {...field} data-testid="input-credit-limit" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">The maximum you can spend per month with this card</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="color" className="w-12 h-9 p-1" {...field} data-testid="input-color" />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">{field.value}</div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" data-testid="button-submit-account">{editingId ? "Save Changes" : "Create Account"}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-md border w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current Balance</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Connection Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const Icon = getIcon(account.type);
                const status = getConnectionStatus(account);

                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn("p-2 rounded-lg text-white shadow-sm")}
                          style={{ backgroundColor: account.color }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span>{account.name}</span>
                          {(account as any).gocardlessAccountId && (
                            <span className="text-xs text-muted-foreground font-mono">Linked</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{account.type}</TableCell>
                    <TableCell>
                      <div className={cn(
                        "font-semibold",
                        account.balance < 0 ? "text-red-500" : "text-emerald-600"
                      )}>
                        {formatCurrency(account.balance)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(account as any).lastSynced ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {format(new Date((account as any).lastSynced), "dd MMM yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date((account as any).lastSynced), "HH:mm")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs text-center block w-10">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={status.variant} className={cn("gap-1 pointer-events-none", status.color)}>
                            {status.label === "Active" && <CheckCircle2 className="h-3 w-3" />}
                            {(status.isExpired) && <AlertCircle className="h-3 w-3" />}
                            {status.label}
                          </Badge>
                          {status.label === "Active" && status.days !== undefined && (
                            <span className="text-xs text-muted-foreground">{status.days} days remaining</span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status && (status.isExpired || (status.days !== undefined && status.days < 10) || status.label === "Linked (Legacy)") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRenewingInstitutionId(status.institutionId);
                              setIsLinkModalOpen(true);
                            }}
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 h-8"
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Renew
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(account)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        {(account as any).gocardlessAccountId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnlink(account.id)}
                            className="h-8 w-8 text-orange-400 hover:text-orange-600 hover:bg-orange-50"
                            title="Unlink Bank"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(account.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
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
        </div>
      </div>

      <BankLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setRenewingInstitutionId(null);
          refetchConnections();
        }}
        initialInstitutionId={renewingInstitutionId}
      />
    </Layout >
  );
}
