import { useFinance, Account, AccountType } from "@/context/FinanceContext";
import SettingsLayout from "@/components/SettingsLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Wallet, CreditCard, PiggyBank, Banknote, Building2 } from "lucide-react";
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
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function ManageAccounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, formatCurrency, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "checking",
      startingBalance: 0,
      currency: "EUR",
      color: "#3b82f6",
    },
  });

  const onSubmit = async (data: AccountFormValues) => {
    const formattedData = {
      ...data,
      startingBalance: data.startingBalance.toString(),
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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      await deleteAccount(id);
    }
  };

  const getIcon = (type: AccountType) => {
    switch(type) {
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
      <SettingsLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Gestione Conti</h1>
            <p className="text-muted-foreground">Aggiungi, modifica o elimina i tuoi conti</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if(!open) {
              setEditingId(null);
              form.reset({
                name: "",
                type: "checking",
                startingBalance: 0,
                currency: "EUR",
                color: "#3b82f6",
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
                          <FormLabel>Saldo Iniziale</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-starting-balance" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = getIcon(account.type);
            const isNegative = account.balance < 0;
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
                
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div 
                      className={cn("p-3 rounded-xl", "text-white shadow-md")}
                      style={{ backgroundColor: account.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-account-name-${account.id}`}>{account.name}</CardTitle>
                      <CardDescription className="capitalize">{account.type}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className={cn(
                      "text-2xl font-bold font-heading",
                      isNegative ? "text-destructive" : "text-foreground"
                    )} data-testid={`text-balance-${account.id}`}>
                      {formatCurrency(account.balance)}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-starting-balance-${account.id}`}>
                      Saldo iniziale: {formatCurrency(parseFloat(account.startingBalance))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SettingsLayout>
  );
}
