import { useFinance, Account, AccountType } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Wallet, CreditCard, PiggyBank, Banknote, Building2, Landmark, Link } from "lucide-react";
import { BankLinkModal } from "@/components/bank-link-modal";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

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
  const { accounts, addAccount, updateAccount, deleteAccount, formatCurrency, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  if (isLoading) {
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
            <h1 className="text-3xl font-heading font-bold text-foreground">Gestione Conti</h1>
            <p className="text-muted-foreground">Aggiungi, modifica o elimina i tuoi conti</p>
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
                  <Plus size={16} /> Aggiungi Conto
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Modifica Conto" : "Nuovo Conto"}</DialogTitle>
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
                          <FormLabel>Nome Conto</FormLabel>
                          <FormControl>
                            <Input placeholder="es. Conto Principale" {...field} data-testid="input-name" />
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
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-type">
                                  <SelectValue placeholder="Seleziona tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="checking">Conto Corrente</SelectItem>
                                <SelectItem value="savings">Risparmio</SelectItem>
                                <SelectItem value="credit">Carta di Credito</SelectItem>
                                <SelectItem value="investment">Investimenti</SelectItem>
                                <SelectItem value="cash">Contanti</SelectItem>
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
                            <FormLabel>{watchedType === "credit" ? "Debito Iniziale" : "Saldo Iniziale"}</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-starting-balance" />
                            </FormControl>
                            {watchedType === "credit" && (
                              <p className="text-xs text-muted-foreground">Usa valori negativi per indicare il debito</p>
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
                            <FormLabel>Limite Credito (Plafond)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="es. 1500" {...field} data-testid="input-credit-limit" />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Il massimo che puoi spendere al mese con questa carta</p>
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
                          <FormLabel>Colore</FormLabel>
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
                      <Button type="submit" data-testid="button-submit-account">{editingId ? "Salva Modifiche" : "Crea Conto"}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = getIcon(account.type);
            return (
              <Card key={account.id} className="group relative overflow-hidden transition-all hover:shadow-md" data-testid={`card-account-${account.id}`}>
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)} data-testid={`button-edit-${account.id}`}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(account.id)} data-testid={`button-delete-${account.id}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>

                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn("p-3 rounded-xl", "text-white shadow-md")}
                      style={{ backgroundColor: account.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold" data-testid={`text-account-name-${account.id}`}>{account.name}</div>
                      <div className="text-sm text-muted-foreground capitalize flex items-center gap-1">
                        {account.type}
                        {(account as any).gocardlessAccountId && (
                          <Link className="h-3 w-3 text-green-500 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <BankLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />
    </Layout >
  );
}
