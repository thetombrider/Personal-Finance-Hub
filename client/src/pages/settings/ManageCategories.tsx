import { useFinance, Category } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Check, X, Circle, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";


const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(["income", "expense", "transfer"]),
  color: z.string().default("#3b82f6"),
  excludeFromProjections: z.boolean().default(false),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function ManageCategories() {
  const { categories, addCategory, updateCategory, deleteCategory, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormValues>({
    name: "",
    type: "expense",
    color: "#3b82f6",
    excludeFromProjections: false,
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#3b82f6",
      excludeFromProjections: false,
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
      excludeFromProjections: category.excludeFromProjections ?? false,
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

  const handleDelete = async () => {
    if (categoryToDelete !== null) {
      await deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
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
              form.reset({ name: "", type: "expense", color: "#3b82f6", excludeFromProjections: false });
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
                              <SelectItem value="transfer">Transfer</SelectItem>
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

                  {form.watch("type") === "expense" && (
                    <FormField
                      control={form.control}
                      name="excludeFromProjections"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0 py-2 border-t pt-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>È un investimento</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Spese che convertono contanti in asset (azioni, ETF, oro).
                              Non riducono il patrimonio nelle proiezioni.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-category">Create Category</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Investment</TableHead>
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
                          onValueChange={(val: "income" | "expense" | "transfer") => setEditForm({ ...editForm, type: val })}
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={category.type === 'income' ? 'default' : 'secondary'} className={category.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : category.type === 'transfer' ? 'bg-slate-500 hover:bg-slate-600' : ''}>
                          {category.type === 'income' ? 'Income' : category.type === 'expense' ? 'Expense' : 'Transfer'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.type === 'expense' ? (
                        isEditing ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={editForm.excludeFromProjections}
                              onCheckedChange={(checked) => setEditForm({ ...editForm, excludeFromProjections: checked === true })}
                            />
                            <span className="text-xs text-muted-foreground">Inv.</span>
                          </div>
                        ) : (
                          category.excludeFromProjections && (
                            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                              <TrendingUp size={12} />
                              Inv.
                            </Badge>
                          )
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCategoryToDelete(category.id)} data-testid={`button-delete-${category.id}`}>
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
        </div>
      </div>

      <ConfirmDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category?"
        confirmText="Delete"
        variant="destructive"
      />
    </Layout>
  );
}
