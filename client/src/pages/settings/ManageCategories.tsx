import { useFinance, Category } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Check, X, Circle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#3b82f6"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function ManageCategories() {
  const { categories, addCategory, updateCategory, deleteCategory, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormValues>({
    name: "",
    type: "expense",
    color: "#3b82f6",
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#3b82f6",
    },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    await addCategory(data);
    setIsDialogOpen(false);
    form.reset();
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      type: category.type,
      color: category.color,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = async (id: number) => {
    try {
      // Basic validation
      if (!editForm.name || editForm.name.length < 2) {
        // Ideally should show error, for now just relying on not saving
        return;
      }
      await updateCategory(id, editForm);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update category", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await deleteCategory(id);
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

  // Sort categories by name naturally? Or type? Let's group by type or just list all.
  // User asked for "one row x category", implying a unified list.
  // I will sort by Type then Name for clarity.
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Category Management</h1>
            <p className="text-muted-foreground">Add, edit or delete categories</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
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
                <DialogTitle>New Category</DialogTitle>
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
                    <Button type="submit" data-testid="button-submit-category">Create Category</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Categories</CardTitle>
            <CardDescription>Manage your expense and income categories.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCategories.map((category) => {
                  const isEditing = editingId === category.id;

                  return (
                    <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="h-8"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editForm.type}
                            onValueChange={(val: "income" | "expense") => setEditForm({ ...editForm, type: val })}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={category.type === 'income' ? 'default' : 'secondary'} className={category.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                            {category.type === 'income' ? 'Income' : 'Expense'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={editForm.color}
                              onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                              className="w-12 h-8 p-1"
                            />
                            <span className="text-xs text-muted-foreground">{editForm.color}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span className="font-mono text-xs">{category.color}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => saveEditing(category.id)}>
                              <Check size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={cancelEditing}>
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(category)} data-testid={`button-edit-${category.id}`}>
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(category.id)} data-testid={`button-delete-${category.id}`}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
