import { useFinance, Transaction } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, Check, AlertCircle, FileSpreadsheet, Settings2 } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parse, isValid, format } from "date-fns";
import { Switch } from "@/components/ui/switch";

type Step = 'upload' | 'map' | 'preview';

interface Mapping {
  date: string;
  amount: string; // Used for single column amount
  incomeAmount?: string; // Used for separate income column
  expenseAmount?: string; // Used for separate expense column
  description: string;
  type?: string;
  account?: string; // Column for account name
  category?: string; // Column for category name
}

export default function ImportTransactions() {
  const { accounts, categories, addTransactions, formatCurrency } = useFinance();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [useDualAmountColumns, setUseDualAmountColumns] = useState(false);

  const [mapping, setMapping] = useState<Mapping>({
    date: "",
    amount: "",
    description: "",
    type: "none",
    account: "none",
    category: "none",
    incomeAmount: "",
    expenseAmount: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          setHeaders(results.meta.fields || []);
          setStep('map');
          
          // Auto-guess mapping
          const fields = results.meta.fields || [];
          const guessMapping = { ...mapping };
          let foundIncome = false;
          let foundExpense = false;
          
          fields.forEach(field => {
            const lower = field.toLowerCase();
            if (lower.includes('date') || lower.includes('data')) guessMapping.date = field;
            
            if (lower.includes('description') || lower.includes('descrizione') || lower.includes('memo')) guessMapping.description = field;
            if (lower.includes('type') || lower.includes('tipo')) guessMapping.type = field;
            if (lower.includes('account') || lower.includes('conto')) guessMapping.account = field;
            if (lower.includes('category') || lower.includes('categoria')) guessMapping.category = field;

            // Try to detect separate columns
            if (lower.includes('entrata') || lower.includes('income') || lower.includes('credit')) {
              guessMapping.incomeAmount = field;
              foundIncome = true;
            }
            if (lower.includes('uscita') || lower.includes('expense') || lower.includes('debit')) {
              guessMapping.expenseAmount = field;
              foundExpense = true;
            }
            
            // Fallback/Standard single amount
            if (lower.includes('amount') || lower.includes('importo') || lower.includes('value')) {
               if (!guessMapping.amount) guessMapping.amount = field;
            }
          });
          
          if (foundIncome && foundExpense) {
            setUseDualAmountColumns(true);
          }
          
          setMapping(guessMapping);
        }
      });
    }
  };

  const parseAmount = (value: string) => {
    if (!value) return 0;
    let str = value.toString();
    
    // First: extract only digits, comma, period, and minus sign
    // This removes ALL special characters including non-breaking spaces, currency symbols, etc.
    str = str.replace(/[^0-9,.-]/g, '');
    
    if (!str) return 0;
    
    // European format: 1.234,56 (period=thousand, comma=decimal)
    // US format: 1,234.56 (comma=thousand, period=decimal)
    
    // Check if this looks like European format (has comma followed by 1-2 digits at end)
    if (/,\d{1,2}$/.test(str)) {
      // European format: remove thousand separator (.) then convert decimal comma to period
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (/\.\d{1,2}$/.test(str) && str.includes(',')) {
      // US format: remove thousand separator (,)
      str = str.replace(/,/g, '');
    } else if (str.includes(',') && !str.includes('.')) {
      // Only comma, treat as decimal separator
      str = str.replace(',', '.');
    }
    
    return parseFloat(str) || 0;
  };

  const parseDate = (value: string) => {
    if (!value) return new Date().toISOString();
    
    // Clean the value
    const cleanValue = value.trim();
    
    // First, try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (European format)
    const parts = cleanValue.split(/[-/.]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;
      
      // If third part is 4 digits (year), assume DD/MM/YYYY
      if (third && third.length === 4) {
        const d = parseInt(first);
        const m = parseInt(second);
        const y = parseInt(third);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          const parsed = new Date(y, m - 1, d, 12, 0, 0); // Use noon to avoid timezone issues
          if (isValid(parsed)) return parsed.toISOString();
        }
      }
      
      // If third part is 2 digits (short year like "25" for 2025), assume DD/MM/YY
      if (third && third.length === 2) {
        const d = parseInt(first);
        const m = parseInt(second);
        let y = parseInt(third);
        // Convert 2-digit year: 00-99 -> 2000-2099
        y = y + 2000;
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          const parsed = new Date(y, m - 1, d, 12, 0, 0);
          if (isValid(parsed)) return parsed.toISOString();
        }
      }
      
      // If first part is 4 digits (year), assume YYYY-MM-DD
      if (first && first.length === 4) {
        const y = parseInt(first);
        const m = parseInt(second);
        const d = parseInt(third);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          const parsed = new Date(y, m - 1, d, 12, 0, 0);
          if (isValid(parsed)) return parsed.toISOString();
        }
      }
    }
    
    // Try standard ISO format as fallback
    const date = new Date(cleanValue);
    if (isValid(date) && date.getFullYear() >= 2000) return date.toISOString();
    
    return new Date().toISOString(); // Ultimate fallback
  };

  const getTransactionFromRow = (row: any) => {
      let amount = 0;
      let type: "income" | "expense" = "expense";

      if (useDualAmountColumns && mapping.incomeAmount && mapping.expenseAmount) {
        const inc = parseAmount(row[mapping.incomeAmount]);
        const exp = parseAmount(row[mapping.expenseAmount]);
        
        if (inc > 0) {
          amount = inc;
          type = "income";
        } else if (exp > 0) {
          amount = exp;
          type = "expense";
        }
      } else {
        amount = parseAmount(row[mapping.amount]);
        
        // Try to infer type if mapped
        if (mapping.type && mapping.type !== 'none' && row[mapping.type]) {
          const typeVal = row[mapping.type].toLowerCase();
          if (typeVal.includes('income') || typeVal.includes('credit') || typeVal.includes('entrata')) {
            type = "income";
          }
        } else {
          // Infer from amount sign
          if (amount < 0) {
             type = "expense";
             amount = Math.abs(amount);
          } else {
             type = "income";
          }
        }
      }

      // Account Resolution
      let accountId: number | null = selectedAccount || null;
      if (mapping.account && mapping.account !== 'none') {
        const rawAccountName = row[mapping.account];
        if (rawAccountName && rawAccountName.trim()) {
          const accountName = rawAccountName.toLowerCase().trim();
          const matchedAccount = accounts.find(a => a.name.toLowerCase() === accountName);
          if (matchedAccount) {
            accountId = matchedAccount.id;
          }
          // If account column has a value but no match found, keep accountId as null
          // This will cause the transaction to be filtered out
        }
        // If account column is mapped but value is empty, accountId stays null (skip transaction)
      } else if (!accountId && accounts.length > 0) {
        // No account column mapped and no selectedAccount - use first account as fallback
        accountId = accounts[0].id;
      }

      // Category Resolution
      let categoryId = categories[0]?.id ?? 0; // Fallback
      if (mapping.category && mapping.category !== 'none' && row[mapping.category]) {
        const catName = row[mapping.category].toLowerCase();
        // Find category with matching name AND correct type
        const matchedCategory = categories.find(c => c.name.toLowerCase() === catName && c.type === type);
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        } else {
            // If exact type match fails, try just name match
            const nameMatch = categories.find(c => c.name.toLowerCase() === catName);
            if (nameMatch) categoryId = nameMatch.id;
            else {
                // If no match, pick default for type
                const defaultForType = categories.find(c => c.type === type);
                if (defaultForType) categoryId = defaultForType.id;
            }
        }
      } else {
         // No category mapped, pick default for type
         const defaultForType = categories.find(c => c.type === type);
         if (defaultForType) categoryId = defaultForType.id;
      }

      return {
        date: parseDate(row[mapping.date]),
        amount: Math.abs(amount).toString(),
        description: row[mapping.description] || "Imported Transaction",
        accountId: accountId || 0,
        categoryId,
        type,
        _hasValidAccount: accountId !== null
      };
  };

  const getPreviewData = () => {
    return csvData.slice(0, 5).map(row => {
      const tx = getTransactionFromRow(row);
      const accountName = accounts.find(a => a.id === tx.accountId)?.name || "Unknown";
      const categoryName = categories.find(c => c.id === tx.categoryId)?.name || "Unknown";
      
      return {
        ...tx,
        accountName,
        categoryName
      };
    });
  };

  const getValidTransactionCount = () => {
    return csvData
      .map(row => getTransactionFromRow(row))
      .filter(t => t._hasValidAccount && parseFloat(t.amount) > 0).length;
  };

  const handleImport = async () => {
    // If no specific account column is mapped, require a selected account
    if ((!mapping.account || mapping.account === 'none') && !selectedAccount) return;

    const transactions = csvData.map(row => getTransactionFromRow(row));
    
    // Filter out invalid transactions (e.g. no account found or empty account column)
    const validTransactions = transactions.filter(t => t._hasValidAccount && parseFloat(t.amount) > 0);

    // Remove internal flag before sending to API
    const transactionsToSave = validTransactions.map(({ _hasValidAccount, ...tx }) => tx);
    await addTransactions(transactionsToSave);
    setLocation('/transactions');
  };

  const canPreview = () => {
    const basicFields = mapping.date && mapping.description;
    const amountFields = useDualAmountColumns ? (mapping.incomeAmount && mapping.expenseAmount) : mapping.amount;
    const accountField = (mapping.account && mapping.account !== 'none') || selectedAccount;
    
    return basicFields && amountFields && accountField;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Import Transactions</h1>
          <p className="text-muted-foreground">Upload your bank statement CSV to import transactions</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className={cn("flex items-center gap-2", step === 'upload' ? "text-primary" : "text-muted-foreground")}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step === 'upload' ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>1</div>
            Upload
          </div>
          <div className="h-px w-8 bg-border" />
          <div className={cn("flex items-center gap-2", step === 'map' ? "text-primary" : "text-muted-foreground")}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step === 'map' ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>2</div>
            Map Columns
          </div>
          <div className="h-px w-8 bg-border" />
          <div className={cn("flex items-center gap-2", step === 'preview' ? "text-primary" : "text-muted-foreground")}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step === 'preview' ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>3</div>
            Preview
          </div>
        </div>

        <Card>
          <CardContent className="p-8">
            {step === 'upload' && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Click to upload CSV</h3>
                  <p className="text-sm text-muted-foreground mt-1">or drag and drop file here</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {step === 'map' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-border">
                   <div className="flex items-center gap-2">
                      <Settings2 size={18} className="text-primary" />
                      <span className="font-medium">CSV Configuration</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <Switch checked={useDualAmountColumns} onCheckedChange={setUseDualAmountColumns} id="dual-mode" />
                      <Label htmlFor="dual-mode" className="cursor-pointer">Separate Income/Expense Columns</Label>
                   </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                     <div className="space-y-2">
                      <Label>Default Account (Fallback)</Label>
                      <Select value={selectedAccount?.toString()} onValueChange={(v) => setSelectedAccount(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Used if "Account Column" is not mapped or empty.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Column</Label>
                      <Select value={mapping.date} onValueChange={(v) => setMapping({...mapping, date: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.filter(h => h && h.trim()).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Description Column</Label>
                      <Select value={mapping.description} onValueChange={(v) => setMapping({...mapping, description: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.filter(h => h && h.trim()).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                     <div className="space-y-2">
                      <Label>Account Column (Optional)</Label>
                      <Select value={mapping.account} onValueChange={(v) => setMapping({...mapping, account: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column (if exists)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {headers.filter(h => h && h.trim()).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {useDualAmountColumns ? (
                      <>
                        <div className="space-y-2">
                          <Label>Income Amount Column</Label>
                          <Select value={mapping.incomeAmount} onValueChange={(v) => setMapping({...mapping, incomeAmount: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select income column" />
                            </SelectTrigger>
                            <SelectContent>
                              {headers.filter(h => h && h.trim()).map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Expense Amount Column</Label>
                          <Select value={mapping.expenseAmount} onValueChange={(v) => setMapping({...mapping, expenseAmount: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select expense column" />
                            </SelectTrigger>
                            <SelectContent>
                              {headers.filter(h => h && h.trim()).map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                       <div className="space-y-2">
                        <Label>Amount Column</Label>
                        <Select value={mapping.amount} onValueChange={(v) => setMapping({...mapping, amount: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.filter(h => h && h.trim()).map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!useDualAmountColumns && (
                      <div className="space-y-2">
                        <Label>Type Column (Optional)</Label>
                        <Select value={mapping.type} onValueChange={(v) => setMapping({...mapping, type: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select column (if exists)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- None (Infer from amount) --</SelectItem>
                            {headers.filter(h => h && h.trim()).map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Category Column (Optional)</Label>
                      <Select value={mapping.category} onValueChange={(v) => setMapping({...mapping, category: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column (if exists)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None --</SelectItem>
                          {headers.filter(h => h && h.trim()).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>Cancel</Button>
                  <Button 
                    onClick={() => setStep('preview')} 
                    disabled={!canPreview()}
                  >
                    Preview Import <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-6">
                <div className="bg-muted/30 rounded-lg p-4 border border-border overflow-x-auto">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <FileSpreadsheet size={18} />
                    Previewing first 5 rows
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPreviewData().map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap">{format(new Date(row.date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(row.amount))}</TableCell>
                          <TableCell>
                             <span className={cn("px-2 py-1 rounded-full text-xs font-medium", row.type === 'income' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                               {row.type}
                             </span>
                          </TableCell>
                          <TableCell>{row.accountName}</TableCell>
                          <TableCell>{row.categoryName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    Please verify the data above matches your expectations. 
                    Importing will create {getValidTransactionCount()} transactions.
                    {csvData.length !== getValidTransactionCount() && (
                      <span className="text-muted-foreground ml-1">
                        ({csvData.length - getValidTransactionCount()} empty/invalid rows will be skipped)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                   <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
                   <Button onClick={handleImport} className="gap-2">
                     <Check size={16} /> Confirm Import
                   </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
