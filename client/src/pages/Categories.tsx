import { useFinance, Category } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#3b82f6"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Categories() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory, formatCurrency, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState('12');

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
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

  const categoryMonthlyData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    const relevantCategories = categories.filter(c => 
      c.name.toLowerCase() !== 'trasferimenti'
    );
    
    relevantCategories.forEach(cat => {
      data[cat.name] = {};
      monthsList.forEach(m => {
        data[cat.name][m.key] = 0;
      });
    });

    transactions.forEach(t => {
      const category = categories.find(c => c.id === t.categoryId);
      if (!category || category.name.toLowerCase() === 'trasferimenti') return;
      if (!data[category.name]) return;
      
      const tDate = parseISO(t.date);
      const monthKey = format(tDate, 'yyyy-MM');
      
      if (data[category.name][monthKey] !== undefined) {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
          data[category.name][monthKey] += amount;
        } else {
          data[category.name][monthKey] -= amount;
        }
      }
    });

    return data;
  }, [transactions, categories, monthsList]);

  const onSubmit = async (data: CategoryFormValues) => {
    if (editingId) {
      await updateCategory(editingId, data);
    } else {
      await addCategory(data);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    form.reset({
      name: category.name,
      type: category.type,
      color: category.color,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await deleteCategory(id);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const CategoryList = ({ items, title }: { items: Category[], title: string }) => (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-lg text-muted-foreground">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((category) => (
          <Card key={category.id} className="group hover:shadow-sm transition-all" data-testid={`card-category-${category.id}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium" data-testid={`text-category-name-${category.id}`}>{category.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(category)} data-testid={`button-edit-${category.id}`}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(category.id)} data-testid={`button-delete-${category.id}`}>
                    <Trash2 size={14} />
                  </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

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
       <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground">Organize your transactions</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if(!open) {
              setEditingId(null);
              form.reset({ name: "", type: "expense", color: "#3b82f6" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-category">
                <Plus size={16} /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Category" : "Add New Category"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Groceries" {...field} data-testid="input-name" />
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
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-category">{editingId ? "Save Changes" : "Create Category"}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <CategoryList items={incomeCategories} title="Income" />
        <CategoryList items={expenseCategories} title="Expenses" />

        {/* Monthly Flow by Category Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Flusso per Categoria</CardTitle>
                <CardDescription>Riepilogo mensile entrate/uscite nette per ogni categoria</CardDescription>
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
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Categoria</TableHead>
                      {monthsList.map(m => (
                        <TableHead key={m.key} className="text-center min-w-[70px] capitalize">{m.label}</TableHead>
                      ))}
                      <TableHead className="text-center min-w-[80px] font-semibold">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(categoryMonthlyData).map(([catName, months]) => {
                      const total = Object.values(months).reduce((sum, val) => sum + val, 0);
                      if (total === 0) return null;
                      return (
                        <TableRow key={catName}>
                          <TableCell className="sticky left-0 bg-card z-10 font-medium">{catName}</TableCell>
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
                        const monthTotal = Object.values(categoryMonthlyData).reduce((sum, cat) => sum + (cat[m.key] || 0), 0);
                        return (
                          <TableCell key={m.key} className={`text-center ${monthTotal > 0 ? 'text-emerald-600' : monthTotal < 0 ? 'text-rose-600' : ''}`}>
                            {monthTotal !== 0 ? formatCurrency(monthTotal) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {formatCurrency(Object.values(categoryMonthlyData).reduce((sum, cat) => 
                          sum + Object.values(cat).reduce((s, v) => s + v, 0), 0
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
