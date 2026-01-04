
import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Category } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface BaselineTableProps {
    categories: Category[];
    budgetData: Record<number, Record<number, { baseline: number }>>;
    onUpdateBaseline: (categoryId: number, month: number, amount: number) => Promise<void>;
}

export function BaselineTable({ categories, budgetData, onUpdateBaseline }: BaselineTableProps) {
    const months = [
        "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
        "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];

    // Local state to handle inputs before blur
    // Map key: "catId-month" -> value
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [updating, setUpdating] = useState<string | null>(null);

    const getKey = (catId: number, month: number) => `${catId}-${month}`;

    const getValue = (catId: number, month: number) => {
        const key = getKey(catId, month);
        if (key in inputs) return inputs[key];
        const val = budgetData[catId]?.[month]?.baseline;
        return val !== undefined && val !== 0 ? val.toString() : "";
    };

    const handleChange = (catId: number, month: number, value: string) => {
        setInputs((prev) => ({ ...prev, [getKey(catId, month)]: value }));
    };

    const handleBlur = async (catId: number, month: number) => {
        const key = getKey(catId, month);
        const valueStr = inputs[key];

        // If undefined, it means user didn't touch it, so no update needed
        if (valueStr === undefined) return;

        const currentSavedValue = budgetData[catId]?.[month]?.baseline || 0;
        const newValue = valueStr === "" ? 0 : parseFloat(valueStr);

        // If invalid number or same value, revert/ignore
        if (isNaN(newValue)) {
            setInputs(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
            return;
        }

        if (newValue === currentSavedValue) {
            setInputs(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
            return;
        }

        setUpdating(key);
        try {
            await onUpdateBaseline(catId, month, newValue);
        } finally {
            setUpdating(null);
            // Clear local state so it reflects props again
            setInputs(prev => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, catId: number, month: number) => {
        if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Baseline Mensili</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Imposta il budget base per ogni categoria. Premi invio o clicca fuori per salvare.
                </p>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Categoria</TableHead>
                                {months.map((month) => (
                                    <TableHead key={month} className="text-right min-w-[80px]">
                                        {month}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full min-w-[12px]"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="truncate">{category.name}</span>
                                        </div>
                                    </TableCell>
                                    {months.map((_, index) => {
                                        const month = index + 1;
                                        const key = getKey(category.id, month);
                                        const isUpdating = updating === key;

                                        return (
                                            <TableCell key={index} className="p-1">
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="50"
                                                        className={`text-right h-8 px-2 border-transparent hover:border-input focus:border-primary ${getValue(category.id, month) === "" ? "placeholder:text-muted-foreground/30" : ""
                                                            }`}
                                                        placeholder="0"
                                                        value={getValue(category.id, month)}
                                                        onChange={(e) => handleChange(category.id, month, e.target.value)}
                                                        onBlur={() => handleBlur(category.id, month)}
                                                        onKeyDown={(e) => handleKeyDown(e, category.id, month)}
                                                        disabled={isUpdating}
                                                    />
                                                    {isUpdating && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
