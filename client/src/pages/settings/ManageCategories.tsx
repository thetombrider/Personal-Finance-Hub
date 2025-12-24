import { useFinance, Category } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#3b82f6"),
  budget: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function ManageCategories() {
  const { categories, addCategory, updateCategory, deleteCategory, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#3b82f6",
      budget: "",
    },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    const submitData = {
      ...data,
      budget: data.budget && data.budget.trim() !== "" ? data.budget : null,
    };
    if (data.type === "income") {
      submitData.budget = null;
    }
    if (editingId) {
      await updateCategory(editingId, submitData);
    } else {
      await addCategory(submitData);
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
      budget: category.budget || "",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const CategoryList = ({ items, title }: { items: Category[], title: string }) => (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-lg text-muted-foreground">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((category) => (
          <Card key={category.id} className="group hover:shadow-sm transition-all" data-testid={`card-category-${category.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
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
              </div>
              {category.budget !== null && category.budget !== undefined && category.budget !== "" && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Budget: {formatCurrency(parseFloat(category.budget))}
                </div>
              )}
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
            <h1 className="text-3xl font-heading font-bold text-foreground">Gestione Categorie</h1>
            <p className="text-muted-foreground">Aggiungi, modifica o elimina le categorie</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if(!open) {
              setEditingId(null);
              form.reset({ name: "", type: "expense", color: "#3b82f6", budget: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-category">
                <Plus size={16} /> Aggiungi Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifica Categoria" : "Nuova Categoria"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="es. Alimentari" {...field} data-testid="input-name" />
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
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Entrata</SelectItem>
                              <SelectItem value="expense">Uscita</SelectItem>
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
                  </div>
                  {form.watch("type") === "expense" && (
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Mensile (opzionale)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="es. 500.00" 
                              {...field} 
                              data-testid="input-budget" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-category">{editingId ? "Salva Modifiche" : "Crea Categoria"}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <CategoryList items={incomeCategories} title="Entrate" />
        <CategoryList items={expenseCategories} title="Uscite" />
      </div>
    </Layout>
  );
}
