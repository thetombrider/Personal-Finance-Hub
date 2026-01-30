import { useState } from "react";
import { useFinance, Category } from "@/context/FinanceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tags, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError } from "@/lib/toastHelpers";
import { cn } from "@/lib/utils";

interface ProposedCategory {
    id: string; // Stable ID for React keys
    name: string;
    type: "income" | "expense" | "transfer";
    color: string;
}

const defaultCategories: ProposedCategory[] = [
    // Income
    { id: "inc-1", name: "Salary", type: "income", color: "#22c55e" },
    { id: "inc-2", name: "Freelance", type: "income", color: "#10b981" },
    { id: "inc-3", name: "Investments", type: "income", color: "#14b8a6" },
    { id: "inc-4", name: "Other Income", type: "income", color: "#059669" },
    // Expenses
    { id: "exp-1", name: "Housing", type: "expense", color: "#ef4444" },
    { id: "exp-2", name: "Utilities", type: "expense", color: "#f97316" },
    { id: "exp-3", name: "Groceries", type: "expense", color: "#eab308" },
    { id: "exp-4", name: "Transportation", type: "expense", color: "#84cc16" },
    { id: "exp-5", name: "Dining Out", type: "expense", color: "#f59e0b" },
    { id: "exp-6", name: "Entertainment", type: "expense", color: "#8b5cf6" },
    { id: "exp-7", name: "Shopping", type: "expense", color: "#ec4899" },
    { id: "exp-8", name: "Healthcare", type: "expense", color: "#06b6d4" },
    { id: "exp-9", name: "Subscriptions", type: "expense", color: "#6366f1" },
    // Transfer
    { id: "trf-1", name: "Transfer", type: "transfer", color: "#64748b" },
];

interface CategoryListProps {
    items: ProposedCategory[];
    title: string;
    bgColor: string;
    onUpdate: (id: string, newName: string) => void;
    onRemove: (id: string) => void;
}

const CategoryList = ({ items, title, bgColor, onUpdate, onRemove }: CategoryListProps) => (
    <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <div className="space-y-1.5">
            {items.map((cat) => (
                <div
                    key={cat.id}
                    className={cn("flex items-center gap-2 p-2 rounded-md", bgColor)}
                >
                    <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                    />
                    <Input
                        value={cat.name}
                        onChange={(e) => onUpdate(cat.id, e.target.value)}
                        className="h-7 text-sm bg-transparent border-0 p-0 focus-visible:ring-0"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(cat.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}
        </div>
    </div>
);

export function SetupCategoriesStep() {
    const { categories, addCategory } = useFinance();
    const { toast } = useToast();

    const [proposedCategories, setProposedCategories] = useState<ProposedCategory[]>(defaultCategories);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [created, setCreated] = useState(false);

    const incomeCategories = proposedCategories.filter(c => c.type === "income");
    const expenseCategories = proposedCategories.filter(c => c.type === "expense");
    const transferCategories = proposedCategories.filter(c => c.type === "transfer");

    const removeCategory = (id: string) => {
        setProposedCategories(prev => prev.filter(c => c.id !== id));
    };

    const updateCategoryName = (id: string, newName: string) => {
        setProposedCategories(prev =>
            prev.map(c => c.id === id ? { ...c, name: newName } : c)
        );
    };

    const handleCreateAll = async () => {
        // Filter out categories that already exist
        const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
        const toCreate = proposedCategories.filter(c => !existingNames.has(c.name.toLowerCase()));

        if (toCreate.length === 0) {
            showSuccess(toast, "All categories already exist");
            setCreated(true);
            return;
        }

        setIsSubmitting(true);
        try {
            for (const cat of toCreate) {
                await addCategory({
                    name: cat.name,
                    type: cat.type,
                    color: cat.color,
                });
            }
            setCreated(true);
            showSuccess(toast, "Categories created!", `${toCreate.length} categories have been added.`);
        } catch (error) {
            showError(toast, "Error creating categories");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasExistingCategories = categories.length > 0;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Tags className="h-5 w-5 text-primary" />
                    Set Up Your Categories
                </h2>
                <p className="text-muted-foreground">
                    Here's a suggested set of categories to get you started. Edit names, remove ones you don't need, or keep them all.
                </p>
            </div>

            {created ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700">Categories Created!</h3>
                    <p className="text-green-600/90 mt-2 font-medium">You're ready to start tracking.</p>
                    <p className="text-sm text-muted-foreground mt-4">
                        Click Next to complete setup.
                    </p>
                </div>
            ) : hasExistingCategories && proposedCategories.length === 0 ? (
                <div className="bg-muted/50 border rounded-xl p-6 text-center">
                    <p className="text-muted-foreground">
                        You already have {categories.length} categories set up.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Click Next to continue.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 max-h-[350px] overflow-y-auto pr-2 -mr-2">
                        <div className="space-y-4">
                            <CategoryList
                                items={incomeCategories}
                                title="Income"
                                bgColor="bg-green-500/10"
                                onUpdate={updateCategoryName}
                                onRemove={removeCategory}
                            />
                        </div>
                        <div className="space-y-4">
                            <CategoryList
                                items={expenseCategories}
                                title="Expense"
                                bgColor="bg-red-500/10"
                                onUpdate={updateCategoryName}
                                onRemove={removeCategory}
                            />
                            <CategoryList
                                items={transferCategories}
                                title="Transfer"
                                bgColor="bg-slate-500/10"
                                onUpdate={updateCategoryName}
                                onRemove={removeCategory}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleCreateAll}
                        disabled={isSubmitting || proposedCategories.length === 0}
                        className="w-full"
                        size="lg"
                    >
                        {isSubmitting ? "Creating..." : `Create ${proposedCategories.length} Categories`}
                    </Button>
                </>
            )}

            <p className="text-sm text-center text-muted-foreground">
                You can always add, edit, or delete categories in <strong>Settings → Category Management</strong>
            </p>
        </div>
    );
}
