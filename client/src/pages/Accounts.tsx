import { useFinance, Account, AccountType } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Wallet, CreditCard, PiggyBank, Banknote, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const accountSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["checking", "savings", "credit", "investment", "cash"]),
  startingBalance: z.coerce.number(),
  currency: z.string().default("EUR"),
  color: z.string().default("#3b82f6"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function Accounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount, formatCurrency, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState('12');

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

  const monthsList = useMemo(() => {
    const months = parseInt(timeRange);
    const list = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      list.push({
        date,
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM', { locale: it })
      });
    }
    return list;
  }, [timeRange]);

  const accountMonthlyData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    accounts.forEach(acc => {
      data[acc.name] = {};
      monthsList.forEach(m => {
        data[acc.name][m.key] = 0;
      });
    });

    transactions.forEach(t => {
      const account = accounts.find(a => a.id === t.accountId);
      if (!account) return;
      
      const tDate = parseISO(t.date);
      const monthKey = format(tDate, 'yyyy-MM');
      
      if (data[account.name] && data[account.name][monthKey] !== undefined) {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
          data[account.name][monthKey] += amount;
        } else {
          data[account.name][monthKey] -= amount;
        }
      }
    });

    return data;
  }, [transactions, accounts, monthsList]);

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
              <Button className="gap-2" data-testid="button-add-account">
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
                          <Input placeholder="e.g. Main Checking" {...field} data-testid="input-name" />
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
                          <FormLabel>Starting Balance</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-starting-balance" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-account">{editingId ? "Save Changes" : "Create Account"}</Button>
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
                      Starting: {formatCurrency(parseFloat(account.startingBalance))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Monthly Flow by Account Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Flusso per Conto</CardTitle>
                <CardDescription>Riepilogo mensile entrate/uscite nette per ogni conto</CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]" data-testid="select-time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Ultimi 6 mesi</SelectItem>
                  <SelectItem value="12">Ultimi 12 mesi</SelectItem>
                  <SelectItem value="24">Ultimi 24 mesi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Conto</TableHead>
                      {monthsList.map(m => (
                        <TableHead key={m.key} className="text-center min-w-[70px] capitalize">{m.label}</TableHead>
                      ))}
                      <TableHead className="text-center min-w-[80px] font-semibold">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(accountMonthlyData).map(([accountName, months]) => {
                      const total = Object.values(months).reduce((sum, val) => sum + val, 0);
                      return (
                        <TableRow key={accountName}>
                          <TableCell className="sticky left-0 bg-card z-10 font-medium">{accountName}</TableCell>
                          {monthsList.map(m => {
                            const val = months[m.key];
                            return (
                              <TableCell key={m.key} className={`text-center text-sm ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : ''}`}>
                                {val !== 0 ? formatCurrency(val) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className={`text-center font-semibold ${total > 0 ? 'text-emerald-600' : total < 0 ? 'text-rose-600' : ''}`}>
                            {total !== 0 ? formatCurrency(total) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="sticky left-0 bg-muted/50 z-10">Totale</TableCell>
                      {monthsList.map(m => {
                        const monthTotal = Object.values(accountMonthlyData).reduce((sum, acc) => sum + (acc[m.key] || 0), 0);
                        return (
                          <TableCell key={m.key} className={`text-center ${monthTotal > 0 ? 'text-emerald-600' : monthTotal < 0 ? 'text-rose-600' : ''}`}>
                            {monthTotal !== 0 ? formatCurrency(monthTotal) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {formatCurrency(Object.values(accountMonthlyData).reduce((sum, acc) => 
                          sum + Object.values(acc).reduce((s, v) => s + v, 0), 0
                        ))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
