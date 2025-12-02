import { useFinance, Account, AccountType } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, formatCurrency } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const onSubmit = (data: AccountFormValues) => {
    if (editingId) {
      updateAccount(editingId, data);
    } else {
      addAccount(data);
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
      startingBalance: account.startingBalance,
      currency: account.currency,
      color: account.color,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      deleteAccount(id);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Accounts</h1>
            <p className="text-muted-foreground">Manage your bank accounts and wallets</p>
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
              <Button className="gap-2">
                <Plus size={16} /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Account" : "Add New Account"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Main Checking" {...field} />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                          <FormLabel>Starting Balance</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingId ? "Save Changes" : "Create Account"}</Button>
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
              <Card key={account.id} className="group relative overflow-hidden transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(account.id)}>
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
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription className="capitalize">{account.type}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className={cn(
                      "text-2xl font-bold font-heading",
                      isNegative ? "text-destructive" : "text-foreground"
                    )}>
                      {formatCurrency(account.balance)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Starting: {formatCurrency(account.startingBalance)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
