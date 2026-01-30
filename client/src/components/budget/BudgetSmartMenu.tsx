import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sparkles, MoreHorizontal, ArrowRight, ChevronsRight, Calculator } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { useBudgetSuggestion } from "@/hooks/useBudgetSuggestion";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetSmartMenuProps {
    categoryId: number;
    monthIndex: number; // 0-11
    currentValue: number;
    onApply: (amount: number) => void;
    onExtendNext: () => void;
    onExtendYear: () => void;
}

export function BudgetSmartMenu({
    categoryId,
    monthIndex,
    currentValue,
    onApply,
    onExtendNext,
    onExtendYear
}: BudgetSmartMenuProps) {
    const { formatCurrency } = useFinance();
    const { suggestion, hasData } = useBudgetSuggestion(categoryId);
    const [isOpen, setIsOpen] = useState(false);

    const hasSuggestion = hasData && suggestion !== null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-primary/20 ${isOpen ? 'opacity-100 bg-primary/20' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={-1}
                >
                    {hasSuggestion ? (
                        <Sparkles className="h-3 w-3 text-primary" />
                    ) : (
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <div className="flex flex-col">
                    <div className="px-4 py-3 bg-muted/20 border-b">
                        <h4 className="font-semibold text-sm">Budget Tools</h4>
                    </div>

                    <div className="p-2 space-y-1">
                        {hasSuggestion && (
                            <div className="mb-2 pb-2 border-b border-border/50">
                                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    Suggestion
                                </div>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-between h-auto py-2 px-2 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                        if (suggestion) onApply(suggestion);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-3 w-3" />
                                        <span className="text-sm">3-Month Avg</span>
                                    </div>
                                    <span className="font-mono font-bold">{formatCurrency(suggestion || 0)}</span>
                                </Button>
                            </div>
                        )}

                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Actions
                        </div>

                        {/* Extend Next */}
                        <Button
                            variant="ghost"
                            className="w-full justify-between h-8 px-2 text-sm"
                            onClick={() => {
                                onExtendNext();
                                setIsOpen(false);
                            }}
                            disabled={monthIndex >= 11}
                        >
                            <div className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3" />
                                <span>Extend to Next Month</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">⌘→</span>
                        </Button>

                        {/* Extend Year */}
                        <Button
                            variant="ghost"
                            className="w-full justify-between h-8 px-2 text-sm"
                            onClick={() => {
                                onExtendYear();
                                setIsOpen(false);
                            }}
                            disabled={monthIndex >= 11}
                        >
                            <div className="flex items-center gap-2">
                                <ChevronsRight className="h-3 w-3" />
                                <span>Fill Rest of Year</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">⌘⇧→</span>
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
