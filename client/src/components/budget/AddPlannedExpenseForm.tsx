
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Category, type PlannedExpense } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AddPlannedExpenseFormProps {
    onSuccess: () => void;
    categories: Category[];
    year: number;
    initialData?: PlannedExpense;
}

export function AddPlannedExpenseForm({ onSuccess, categories, year, initialData }: AddPlannedExpenseFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState(initialData?.name || "");
    const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
    const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId?.toString() || "");
    // Default to first month of current year if adding new, or use existing date
    const defaultDate = initialData ? new Date(initialData.date).toISOString().split('T')[0] : `${year}-01-01`;
    const [date, setDate] = useState(defaultDate);

    const isEditing = !!initialData;

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const url = isEditing
                ? `/api/budget/planned/${initialData.id}`
                : '/api/budget/planned';
            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errorData = await res.json();
                console.error("Server validation error:", errorData);
                throw new Error(JSON.stringify(errorData.error) || 'Failed to save planned expense');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', year] });
            toast({ title: isEditing ? "Spesa aggiornata" : "Spesa pianificata aggiunta" });
            onSuccess();
        },
        onError: (error) => {
            console.error("Mutation error:", error);
            toast({ title: "Errore", description: error.message || "Impossibile salvare la spesa.", variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        if (!name || !amount || !categoryId || !date) {
            toast({ title: "Errore", description: "Compila tutti i campi obbligatori.", variant: "destructive" });
            return;
        }

        mutation.mutate({
            name,
            amount: amount.toString(), // Send as string for decimal type
            categoryId: parseInt(categoryId),
            date: new Date(date).toISOString(),
            notes: "" // Optional
        });
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Nome Spesa</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Cena fuori" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Importo (€)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        min={`${year}-01-01`}
                        max={`${year}-12-31`}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                    {cat.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salva Modifiche" : "Aggiungi"}
            </Button>
        </div>
    );
}
