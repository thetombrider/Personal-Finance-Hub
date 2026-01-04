
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Category, type RecurringExpense, type Account } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AddRecurringExpenseFormProps {
    onSuccess: () => void;
    categories: Category[];
    accounts: Account[];
    initialData?: RecurringExpense;
}

export function AddRecurringExpenseForm({ onSuccess, categories, accounts, initialData }: AddRecurringExpenseFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState(initialData?.name || "");
    const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
    const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId?.toString() || "");
    const [accountId, setAccountId] = useState<string>(initialData?.accountId?.toString() || "");
    const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [active, setActive] = useState(initialData?.active ?? true);

    const isEditing = !!initialData;

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const url = isEditing
                ? `/api/budget/recurring/${initialData.id}`
                : '/api/budget/recurring';
            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Failed to save recurring expense');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget'] });
            toast({ title: isEditing ? "Spesa aggiornata" : "Spesa ricorrente aggiunta" });
            onSuccess();
        },
        onError: () => {
            toast({ title: "Errore", description: "Impossibile salvare la spesa ricorrente.", variant: "destructive" });
        }
    });

    const handleSubmit = () => {
        if (!name || !amount || !categoryId || !accountId || !startDate) {
            toast({ title: "Errore", description: "Compila tutti i campi obbligatori.", variant: "destructive" });
            return;
        }

        mutation.mutate({
            name,
            amount: parseFloat(amount),
            categoryId: parseInt(categoryId),
            accountId: parseInt(accountId),
            startDate: new Date(startDate).toISOString(), // Ensure ISO string
            interval: 'monthly', // Fixed for now
            dayOfMonth: new Date(startDate).getDate(), // Derive from start date
            active
        });
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Nome Spesa</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Netflix" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Importo (€)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <Label>Data Inizio</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
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

            <div className="space-y-2">
                <Label>Conto di Addebito</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona conto" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isEditing && (
                <div className="flex items-center space-x-2 pt-2">
                    <Switch id="active" checked={active} onCheckedChange={setActive} />
                    <Label htmlFor="active">Attivo</Label>
                </div>
            )}

            <Button onClick={handleSubmit} className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salva Modifiche" : "Aggiungi"}
            </Button>
        </div>
    );
}
