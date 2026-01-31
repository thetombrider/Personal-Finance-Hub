import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatForDisplay } from "@/lib/dateFormatters";

interface RecurringSuggestion {
    name: string;
    amount: number;
    interval: 'monthly' | 'weekly' | 'yearly';
    confidence: number;
    occurrences: number;
    lastDate: string;
    firstDate: string;
    description: string;
    categoryId: number;
    accountId: number;
}

interface RecurringSuggestionsProps {
    onAdd: (suggestion: RecurringSuggestion) => void;
}

export function RecurringSuggestions({ onAdd }: RecurringSuggestionsProps) {
    const { data: suggestions, isLoading } = useQuery<RecurringSuggestion[]>({
        queryKey: ['/api/budget/recurring/suggestions'],
        queryFn: async () => {
            const res = await fetch('/api/budget/recurring/suggestions');
            if (!res.ok) throw new Error('Failed to fetch suggestions');
            return res.json();
        }
    });

    if (isLoading) return null;
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Suggested Recurring Transactions</CardTitle>
                </div>
                <CardDescription>
                    We detected these potential recurring transactions from your history.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Estimated Amount</TableHead>
                                <TableHead>Detected Interval</TableHead>
                                <TableHead>Confidence</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suggestions.map((suggestion, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">
                                        {suggestion.name}
                                    </TableCell>
                                    <TableCell>
                                        ~{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(suggestion.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">
                                            {suggestion.interval}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground text-sm">
                                            {suggestion.occurrences} transactions found
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8"
                                            onClick={() => onAdd(suggestion)}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
