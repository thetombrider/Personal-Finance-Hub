import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ImportMode, Mapping, TradeMapping } from "./types";
import { getAccountFromRow, getCategoryFromRow, getTransactionFromRow, cleanHeader, parseNumeric, parseDate } from "./utils";
import type { Account, Category } from "@shared/schema";
import type { CsvRow, ReferenceCsvData } from "@/types/imports";

interface FileReviewProps {
    importMode: ImportMode;
    csvData: CsvRow[];
    referenceCsvData: ReferenceCsvData | null;
    mapping: Mapping;
    tradeMapping: TradeMapping;
    accounts: Account[];
    categories: Category[];
    useDualAmountColumns: boolean;
    selectedAccount: number | null;
    onBack: () => void;
    onImport: () => void;
}

export default function FileReview({
    importMode,
    csvData,
    referenceCsvData,
    mapping,
    tradeMapping,
    accounts,
    categories,
    useDualAmountColumns,
    selectedAccount,
    onBack,
    onImport
}: FileReviewProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview {importMode} import</h3>
                <p className="text-sm text-muted-foreground">Showing first 5 rows</p>
            </div>
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            {importMode === 'accounts' && <><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Balance</TableHead></>}
                            {importMode === 'categories' && <><TableHead>Name</TableHead><TableHead>Type</TableHead></>}
                            {importMode === 'transactions' && <><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Account</TableHead><TableHead>Category</TableHead></>}
                            {importMode === 'trades' && <><TableHead>Date</TableHead><TableHead>Ticker</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Quantity</TableHead><TableHead>Price</TableHead><TableHead>Account</TableHead></>}

                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(() => {
                            // Build holding map from REFERENCE file if available (once)
                            const holdingInfoMap = new Map<string, { ticker: string; name: string }>();
                            if (importMode === 'trades' && referenceCsvData) {
                                const headers = referenceCsvData.headers;
                                const tickerField = headers.find(h => cleanHeader(h) === 'ticker' || cleanHeader(h) === 'symbol');
                                const idField = headers.find(h => cleanHeader(h) === 'id' || cleanHeader(h) === 'holdingid');
                                const nameField = headers.find(h => cleanHeader(h) === 'name') || tickerField;

                                if (tickerField && idField) {
                                    referenceCsvData.data.forEach(r => {
                                        holdingInfoMap.set(r[idField]?.toString(), {
                                            ticker: r[tickerField]?.toString().toUpperCase(),
                                            name: r[nameField || tickerField]?.toString()
                                        });
                                    });
                                }
                            }

                            return csvData.slice(0, 5).map((row, i) => {
                                if (importMode === 'accounts') {
                                    const acc = getAccountFromRow(row, mapping);
                                    return <TableRow key={i}><TableCell>{acc.name}</TableCell><TableCell className="capitalize">{acc.type}</TableCell><TableCell>{acc.startingBalance}</TableCell></TableRow>;
                                }
                                if (importMode === 'categories') {
                                    const cat = getCategoryFromRow(row, mapping);
                                    return <TableRow key={i}><TableCell>{cat.name}</TableCell><TableCell className="capitalize">{cat.type}</TableCell></TableRow>;
                                } if (importMode === 'transactions') {
                                    const tx = getTransactionFromRow(row, mapping, accounts, categories, useDualAmountColumns, selectedAccount);
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    const category = categories.find(c => c.id === tx.categoryId);

                                    return (
                                        <TableRow key={i} className={(!tx._hasValidAccount || !tx._hasValidCategory) ? "bg-destructive/5" : ""}>
                                            <TableCell className="text-xs">{tx.date.split('T')[0]}</TableCell>
                                            <TableCell className="max-w-[150px] truncate">{tx.description}</TableCell>
                                            <TableCell className={tx.type === 'income' ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                {tx.type === 'income' ? '+' : '-'}{tx.amount}
                                            </TableCell>
                                            <TableCell>
                                                {account ? <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{account.name}</span> : <span className="text-xs text-destructive font-medium">Not found</span>}
                                            </TableCell>
                                            <TableCell>
                                                {category ? <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground">{category.name}</span> : <span className="text-xs text-destructive font-medium">Not found</span>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }
                                if (importMode === 'trades') {
                                    let ticker = (row[tradeMapping.ticker] || "").toString().toUpperCase().trim();
                                    let name = tradeMapping.name ? row[tradeMapping.name] || ticker : ticker;

                                    const holdingIdLower = (row[tradeMapping.ticker] || "").toString();

                                    // Attempt to resolve if it looks like an ID (numeric) OR if we simply have a map and want to try lookup
                                    if (holdingInfoMap.has(holdingIdLower)) {
                                        const info = holdingInfoMap.get(holdingIdLower)!;
                                        ticker = info.ticker;
                                        name = info.name;
                                    }

                                    const rawType = (row[tradeMapping.type] || "").toString().toLowerCase().trim();
                                    let type: "buy" | "sell" = "buy";
                                    if (rawType.match(/^(sell|vend|s$|v$|-|uscita|debit)/i)) type = "sell";
                                    const quantity = Math.abs(parseNumeric(row[tradeMapping.quantity]));
                                    const pricePerUnit = Math.abs(parseNumeric(row[tradeMapping.pricePerUnit]));

                                    let accountName = "-";
                                    if (tradeMapping.account && row[tradeMapping.account]) {
                                        const rawAcc = row[tradeMapping.account].toString().trim();
                                        const accLower = rawAcc.toLowerCase();
                                        let matched = accounts.find(a => a.name.toLowerCase() === accLower);
                                        if (!matched) {
                                            const numId = parseInt(rawAcc);
                                            if (!isNaN(numId)) matched = accounts.find(a => a.id === numId);
                                        }
                                        if (matched) accountName = matched.name;
                                    }

                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="text-xs">{parseDate(row[tradeMapping.date]).split('T')[0]}</TableCell>
                                            <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{ticker}</span></TableCell>
                                            <TableCell className="max-w-[150px] truncate">{name}</TableCell>
                                            <TableCell className="capitalize">{type}</TableCell>
                                            <TableCell>{quantity}</TableCell>
                                            <TableCell>{pricePerUnit}</TableCell>
                                            <TableCell className="text-xs">{accountName}</TableCell>
                                        </TableRow>
                                    );
                                }

                                return null;
                            });
                        })()}
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={onImport}>Import All Data</Button>
            </div>
        </div>
    );
}
