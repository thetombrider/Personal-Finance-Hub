import { useFinance, Transaction } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, Check, AlertCircle, FileSpreadsheet, Settings2, TrendingUp, CreditCard } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parse, isValid, format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as api from "@/lib/api";
import type { InsertTrade, InsertHolding, Holding } from "@shared/schema";

type Step = 'upload' | 'map' | 'preview';
type ImportMode = 'transactions' | 'trades';

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

interface TradeMapping {
  date: string;
  ticker: string;
  name?: string;
  type: string; // buy/sell column
  quantity: string;
  pricePerUnit: string;
  totalAmount?: string;
  fees?: string;
}

export default function ImportTransactions() {
  const { accounts, categories, addTransactions, formatCurrency } = useFinance();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<Step>('upload');
  const [importMode, setImportMode] = useState<ImportMode>('transactions');
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

  const [tradeMapping, setTradeMapping] = useState<TradeMapping>({
    date: "",
    ticker: "",
    name: "",
    type: "",
    quantity: "",
    pricePerUnit: "",
    totalAmount: "",
    fees: ""
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse numeric values preserving sign (for quantities, prices)
  const parseNumeric = (value: string): number => {
    if (!value) return 0;
    let str = value.toString().trim();
    
    // Preserve leading minus sign
    const isNegative = str.startsWith('-');
    str = str.replace(/[^0-9,.-]/g, '');
    if (!str) return 0;
    
    // Handle European vs US format
    if (/,\d{1,2}$/.test(str)) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (/\.\d{1,2}$/.test(str) && str.includes(',')) {
      str = str.replace(/,/g, '');
    } else if (str.includes(',') && !str.includes('.')) {
      str = str.replace(',', '.');
    }
    
    const result = parseFloat(str) || 0;
    return isNegative && result > 0 ? -result : result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      
      // Reset all mappings to clean defaults on new file upload
      const cleanMapping: Mapping = {
        date: "",
        amount: "",
        description: "",
        type: "none",
        account: "none",
        category: "none",
        incomeAmount: "",
        expenseAmount: ""
      };
      
      const cleanTradeMapping: TradeMapping = {
        date: "",
        ticker: "",
        name: "",
        type: "",
        quantity: "",
        pricePerUnit: "",
        totalAmount: "",
        fees: ""
      };
      
      setUseDualAmountColumns(false);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          setHeaders(results.meta.fields || []);
          setStep('map');
          
          // Auto-guess transaction mapping from clean state
          const fields = results.meta.fields || [];
          const guessMapping = { ...cleanMapping };
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
          
          // Auto-guess trade mapping from clean state
          const guessTradeMapping = { ...cleanTradeMapping };
          fields.forEach(field => {
            const lower = field.toLowerCase();
            if (lower.includes('date') || lower.includes('data')) guessTradeMapping.date = field;
            if (lower.includes('ticker') || lower.includes('symbol') || lower.includes('isin') || lower.includes('codice')) guessTradeMapping.ticker = field;
            if (lower.includes('name') || lower.includes('nome') || lower.includes('titolo') || lower.includes('descrizione')) guessTradeMapping.name = field;
            if (lower.includes('type') || lower.includes('tipo') || lower.includes('operazione') || lower.includes('side')) guessTradeMapping.type = field;
            if (lower.includes('quantity') || lower.includes('quantità') || lower.includes('qty') || lower.includes('shares') || lower.includes('azioni')) guessTradeMapping.quantity = field;
            if (lower.includes('price') || lower.includes('prezzo') || lower.includes('unit')) guessTradeMapping.pricePerUnit = field;
            if (lower.includes('total') || lower.includes('amount') || lower.includes('importo') || lower.includes('controvalore')) guessTradeMapping.totalAmount = field;
            if (lower.includes('fee') || lower.includes('commissione') || lower.includes('commission') || lower.includes('costo')) guessTradeMapping.fees = field;
          });
          setTradeMapping(guessTradeMapping);
          
          // Fetch existing holdings for reference
          api.fetchHoldings().then(setHoldings);
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

  // Trade import functions
  const getTradeFromRow = (row: any) => {
    const ticker = (row[tradeMapping.ticker] || "").toString().toUpperCase().trim();
    const name = tradeMapping.name ? row[tradeMapping.name] || ticker : ticker;
    
    const rawType = (row[tradeMapping.type] || "").toString().toLowerCase().trim();
    let type: "buy" | "sell" = "buy";
    // Extended buy/sell detection
    if (rawType.includes('sell') || rawType.includes('vendita') || rawType.includes('vend') || 
        rawType === 's' || rawType === 'v') {
      type = "sell";
    } else if (rawType.includes('buy') || rawType.includes('acquisto') || rawType.includes('acq') ||
               rawType === 'b' || rawType === 'a') {
      type = "buy";
    }
    
    // Use parseNumeric for quantities and prices to preserve sign
    const quantity = Math.abs(parseNumeric(row[tradeMapping.quantity]));
    const pricePerUnit = Math.abs(parseNumeric(row[tradeMapping.pricePerUnit]));
    let totalAmount = tradeMapping.totalAmount ? Math.abs(parseNumeric(row[tradeMapping.totalAmount])) : 0;
    
    if (!totalAmount && quantity && pricePerUnit) {
      totalAmount = quantity * pricePerUnit;
    }
    
    const fees = tradeMapping.fees ? Math.abs(parseNumeric(row[tradeMapping.fees])) : 0;
    
    return {
      ticker,
      name,
      type,
      date: parseDate(row[tradeMapping.date]),
      quantity: quantity.toString(),
      pricePerUnit: pricePerUnit.toString(),
      totalAmount: totalAmount.toString(),
      fees: fees.toString(),
      _isValid: !!ticker && quantity > 0 && pricePerUnit > 0
    };
  };

  const getTradePreviewData = () => {
    return csvData.slice(0, 5).map(row => getTradeFromRow(row));
  };

  const getValidTradeCount = () => {
    return csvData.map(row => getTradeFromRow(row)).filter(t => t._isValid).length;
  };

  const canPreviewTrades = () => {
    return tradeMapping.date && tradeMapping.ticker && tradeMapping.type && 
           tradeMapping.quantity && tradeMapping.pricePerUnit;
  };

  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleTradeImport = async () => {
    setImportError(null);
    setIsImporting(true);
    
    try {
      const tradeRows = csvData.map(row => getTradeFromRow(row)).filter(t => t._isValid);
      
      if (tradeRows.length === 0) {
        setImportError("Nessun trade valido trovato nel file.");
        setIsImporting(false);
        return;
      }
      
      // Group by ticker to create/find holdings
      const tickerMap = new Map<string, { name: string; trades: typeof tradeRows }>();
      
      for (const trade of tradeRows) {
        if (!tickerMap.has(trade.ticker)) {
          tickerMap.set(trade.ticker, { name: trade.name, trades: [] });
        }
        tickerMap.get(trade.ticker)!.trades.push(trade);
      }
      
      // Fetch fresh holdings list before processing
      const currentHoldings = await api.fetchHoldings();
      setHoldings(currentHoldings);
      
      // Create or find holdings for each ticker
      const holdingIdMap = new Map<string, number>();
      const failedTickers: string[] = [];
      
      for (const entry of Array.from(tickerMap.entries())) {
        const [ticker, data] = entry;
        let holding = currentHoldings.find(h => h.ticker.toUpperCase() === ticker);
        
        if (!holding) {
          try {
            holding = await api.createHolding({
              ticker,
              name: data.name,
              assetType: "stock",
              currency: "EUR"
            });
            currentHoldings.push(holding);
          } catch (err) {
            console.error(`Failed to create holding for ${ticker}:`, err);
            failedTickers.push(ticker);
            continue;
          }
        }
        
        holdingIdMap.set(ticker, holding.id);
      }
      
      if (failedTickers.length > 0) {
        setImportError(`Impossibile creare i titoli: ${failedTickers.join(', ')}. I trades associati verranno saltati.`);
      }
      
      // Filter out trades for failed holdings
      const validTradeRows = tradeRows.filter(t => holdingIdMap.has(t.ticker));
      
      if (validTradeRows.length === 0) {
        setImportError("Nessun trade può essere importato - verifica i titoli.");
        setIsImporting(false);
        return;
      }
      
      // Prepare trades for bulk insert
      const tradesToInsert: InsertTrade[] = validTradeRows.map(t => ({
        holdingId: holdingIdMap.get(t.ticker)!,
        date: t.date,
        quantity: t.quantity,
        pricePerUnit: t.pricePerUnit,
        totalAmount: t.totalAmount,
        fees: t.fees,
        type: t.type
      }));
      
      await api.createTradesBulk(tradesToInsert);
      setLocation('/portfolio');
    } catch (err) {
      console.error('Trade import error:', err);
      setImportError("Errore durante l'import. Riprova più tardi.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground">Upload CSV to import transactions or portfolio trades</p>
        </div>

        {/* Import Mode Selector */}
        <Tabs value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions" className="gap-2" data-testid="tab-import-transactions">
              <CreditCard className="h-4 w-4" />
              Transazioni
            </TabsTrigger>
            <TabsTrigger value="trades" className="gap-2" data-testid="tab-import-trades">
              <TrendingUp className="h-4 w-4" />
              Portfolio Trades
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

            {step === 'map' && importMode === 'transactions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-border">
                   <div className="flex items-center gap-2">
                      <Settings2 size={18} className="text-primary" />
                      <span className="font-medium">CSV Configuration - Transazioni</span>
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

            {step === 'map' && importMode === 'trades' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 bg-muted/30 p-4 rounded-lg border border-border">
                  <TrendingUp size={18} className="text-primary" />
                  <span className="font-medium">CSV Configuration - Portfolio Trades</span>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Date Column *</Label>
                      <Select value={tradeMapping.date} onValueChange={(v) => setTradeMapping({...tradeMapping, date: v})}>
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
                      <Label>Ticker/Symbol Column *</Label>
                      <Select value={tradeMapping.ticker} onValueChange={(v) => setTradeMapping({...tradeMapping, ticker: v})}>
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
                      <Label>Name Column (Optional)</Label>
                      <Select value={tradeMapping.name || "__none__"} onValueChange={(v) => setTradeMapping({...tradeMapping, name: v === "__none__" ? "" : v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Use Ticker --</SelectItem>
                          {headers.filter(h => h && h.trim()).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type Column (Buy/Sell) *</Label>
                      <Select value={tradeMapping.type} onValueChange={(v) => setTradeMapping({...tradeMapping, type: v})}>
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
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Quantity Column *</Label>
                      <Select value={tradeMapping.quantity} onValueChange={(v) => setTradeMapping({...tradeMapping, quantity: v})}>
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
                      <Label>Price per Unit Column *</Label>
                      <Select value={tradeMapping.pricePerUnit} onValueChange={(v) => setTradeMapping({...tradeMapping, pricePerUnit: v})}>
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
                      <Label>Total Amount Column (Optional)</Label>
                      <Select value={tradeMapping.totalAmount || "__none__"} onValueChange={(v) => setTradeMapping({...tradeMapping, totalAmount: v === "__none__" ? "" : v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Calculate from Qty × Price --</SelectItem>
                          {headers.filter(h => h && h.trim()).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Fees Column (Optional)</Label>
                      <Select value={tradeMapping.fees || "__none__"} onValueChange={(v) => setTradeMapping({...tradeMapping, fees: v === "__none__" ? "" : v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- No fees --</SelectItem>
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
                    disabled={!canPreviewTrades()}
                  >
                    Preview Import <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'preview' && importMode === 'transactions' && (
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

            {step === 'preview' && importMode === 'trades' && (
              <div className="space-y-6">
                <div className="bg-muted/30 rounded-lg p-4 border border-border overflow-x-auto">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Anteprima prime 5 righe - Trades
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantità</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead>Totale</TableHead>
                        <TableHead>Fees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getTradePreviewData().map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap">{format(new Date(row.date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="font-mono font-bold">{row.ticker}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{row.name}</TableCell>
                          <TableCell>
                             <span className={cn("px-2 py-1 rounded-full text-xs font-medium", row.type === 'buy' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                               {row.type === 'buy' ? 'Acquisto' : 'Vendita'}
                             </span>
                          </TableCell>
                          <TableCell>{parseFloat(row.quantity).toLocaleString('it-IT')}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(row.pricePerUnit))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(row.totalAmount))}</TableCell>
                          <TableCell>{parseFloat(row.fees) > 0 ? formatCurrency(parseFloat(row.fees)) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    Verifica che i dati siano corretti. 
                    Saranno importati {getValidTradeCount()} trades.
                    {csvData.length !== getValidTradeCount() && (
                      <span className="text-muted-foreground ml-1">
                        ({csvData.length - getValidTradeCount()} righe vuote/invalide saranno ignorate)
                      </span>
                    )}
                    <br />
                    <span className="text-xs">I titoli non esistenti verranno creati automaticamente.</span>
                  </div>
                </div>

                {importError && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg text-sm flex gap-2 items-start">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>{importError}</div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                   <Button variant="outline" onClick={() => setStep('map')} disabled={isImporting}>Indietro</Button>
                   <Button onClick={handleTradeImport} className="gap-2" disabled={isImporting || getValidTradeCount() === 0}>
                     {isImporting ? (
                       <>Importing...</>
                     ) : (
                       <><Check size={16} /> Conferma Import</>
                     )}
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
