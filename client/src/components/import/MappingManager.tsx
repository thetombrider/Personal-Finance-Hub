import { Settings2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImportMode, Mapping, TradeMapping } from "./types";

interface MappingManagerProps {
    importMode: ImportMode;
    headers: string[];
    mapping: Mapping;
    setMapping: (m: Mapping) => void;
    tradeMapping: TradeMapping;
    setTradeMapping: (m: TradeMapping) => void;
    accounts: any[];
    useDualAmountColumns: boolean;
    setUseDualAmountColumns: (val: boolean) => void;
    selectedAccount: number | null;
    setSelectedAccount: (val: number | null) => void;
    onCancel: () => void;
    onPreview: () => void;
    canPreview: () => boolean;
}

export default function MappingManager({
    importMode,
    headers,
    mapping,
    setMapping,
    tradeMapping,
    setTradeMapping,
    accounts,
    useDualAmountColumns,
    setUseDualAmountColumns,
    selectedAccount,
    setSelectedAccount,
    onCancel,
    onPreview,
    canPreview
}: MappingManagerProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 bg-muted/30 p-4 rounded-lg border border-border">
                <Settings2 size={18} className="text-primary" />
                <span className="font-medium">Map Columns - {importMode.toUpperCase()}</span>
            </div>

            {importMode === 'transactions' && (
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-2 mb-6">
                    <Label className="text-primary font-semibold">Fallback / Default Account</Label>
                    <p className="text-xs text-muted-foreground">Used if the Account column is not mapped or a row's account name is not found.</p>
                    <Select value={selectedAccount?.toString() || "none"} onValueChange={v => setSelectedAccount(v === 'none' ? null : parseInt(v))}>
                        <SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Select fallback account" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Select Fallback Account --</SelectItem>
                            {accounts.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Dynamic Mapping Fields based on Mode */}
                {importMode === 'transactions' && (
                    <>
                        <div className="col-span-full flex items-center space-x-2 mb-4 bg-muted/30 p-3 rounded-md">
                            <Switch id="dual-cols" checked={useDualAmountColumns} onCheckedChange={setUseDualAmountColumns} />
                            <Label htmlFor="dual-cols" className="cursor-pointer">Use 2 columns for Amount (Income/Expense)</Label>
                        </div>

                        <div className="space-y-2"><Label>Date *</Label><Select value={mapping.date} onValueChange={v => setMapping({ ...mapping, date: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Description *</Label><Select value={mapping.description} onValueChange={v => setMapping({ ...mapping, description: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>

                        {!useDualAmountColumns ? (
                            <>
                                <div className="space-y-2"><Label>Amount *</Label><Select value={mapping.amount} onValueChange={v => setMapping({ ...mapping, amount: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Type Column (Optional)</Label><Select value={mapping.type} onValueChange={v => setMapping({ ...mapping, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Detect by Sign --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2"><Label>Income Amount *</Label><Select value={mapping.incomeAmount} onValueChange={v => setMapping({ ...mapping, incomeAmount: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-2"><Label>Expense Amount *</Label><Select value={mapping.expenseAmount} onValueChange={v => setMapping({ ...mapping, expenseAmount: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            </>
                        )}
                        <div className="space-y-2"><Label>Account Column (Optional)</Label><Select value={mapping.account} onValueChange={v => setMapping({ ...mapping, account: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Use Fallback --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Category Column (Optional)</Label><Select value={mapping.category} onValueChange={v => setMapping({ ...mapping, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Default Category --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                )}
                {importMode === 'accounts' && (
                    <>
                        <div className="space-y-2"><Label>Name *</Label><Select value={mapping.accountName} onValueChange={v => setMapping({ ...mapping, accountName: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Type *</Label><Select value={mapping.accountType} onValueChange={v => setMapping({ ...mapping, accountType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Balance</Label><Select value={mapping.accountBalance} onValueChange={v => setMapping({ ...mapping, accountBalance: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- None (0) --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Currency</Label><Select value={mapping.accountCurrency} onValueChange={v => setMapping({ ...mapping, accountCurrency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Default (EUR) --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                )}
                {importMode === 'categories' && (
                    <>
                        <div className="space-y-2"><Label>Name *</Label><Select value={mapping.categoryName} onValueChange={v => setMapping({ ...mapping, categoryName: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Type *</Label><Select value={mapping.categoryType} onValueChange={v => setMapping({ ...mapping, categoryType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Budget</Label><Select value={mapping.categoryBudget} onValueChange={v => setMapping({ ...mapping, categoryBudget: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- None (0) --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                )}
                {importMode === 'trades' && (
                    <>
                        <div className="space-y-2"><Label>Date *</Label><Select value={tradeMapping.date} onValueChange={v => setTradeMapping({ ...tradeMapping, date: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Ticker / Holding ID *</Label><Select value={tradeMapping.ticker} onValueChange={v => setTradeMapping({ ...tradeMapping, ticker: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Quantity *</Label><Select value={tradeMapping.quantity} onValueChange={v => setTradeMapping({ ...tradeMapping, quantity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Price *</Label><Select value={tradeMapping.pricePerUnit} onValueChange={v => setTradeMapping({ ...tradeMapping, pricePerUnit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Account (Optional)</Label><Select value={tradeMapping.account || "none"} onValueChange={v => setTradeMapping({ ...tradeMapping, account: v === 'none' ? undefined : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- None --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                )}

            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={onPreview} disabled={!canPreview()}>Preview <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
        </div>
    );
}
