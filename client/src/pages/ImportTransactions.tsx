import { useFinance, Transaction } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, CreditCard, TrendingUp, Wallet, Tag, Settings2 } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parse, isValid } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as api from "@/lib/api";
import type { InsertTrade, InsertHolding, Holding, InsertAccount, InsertCategory } from "@shared/schema";

type Step = 'upload' | 'map' | 'preview';
type ImportMode = 'transactions' | 'trades' | 'accounts' | 'categories';

interface Mapping {
  // Transactions
  date: string;
  amount: string;
  incomeAmount?: string;
  expenseAmount?: string;
  description: string;
  type?: string;
  account?: string;
  category?: string;

  // Accounts
  accountName: string;
  accountType: string;
  accountBalance?: string;
  accountCurrency?: string;

  // Categories
  categoryName: string;
  categoryType: string;
  categoryBudget?: string;
}

interface TradeMapping {
  date: string;
  ticker: string;
  name?: string;
  type: string;
  quantity: string;
  pricePerUnit: string;
  totalAmount?: string;
  fees?: string;
}

export default function ImportTransactions() {
  const { accounts, categories, addTransactions, addAccounts, addCategories } = useFinance();
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
    expenseAmount: "",
    accountName: "",
    accountType: "",
    accountBalance: "",
    accountCurrency: "",
    categoryName: "",
    categoryType: "",
    categoryBudget: ""
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

  // Helper to parse European/US numbers
  const parseNumeric = (value: string): number => {
    if (!value) return 0;
    let str = value.toString().trim();
    const isNegative = str.startsWith('-');
    str = str.replace(/[^0-9,.-]/g, '');
    if (!str) return 0;

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

  const cleanHeader = (header: string) => header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);

      const cleanMapping: Mapping = {
        date: "", amount: "", description: "", type: "none", account: "none", category: "none",
        incomeAmount: "", expenseAmount: "",
        accountName: "", accountType: "", accountBalance: "", accountCurrency: "",
        categoryName: "", categoryType: "", categoryBudget: ""
      };

      const cleanTradeMapping: TradeMapping = {
        date: "", ticker: "", name: "", type: "", quantity: "", pricePerUnit: "", totalAmount: "", fees: ""
      };

      setUseDualAmountColumns(false);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          const fields = results.meta.fields || [];
          setHeaders(fields);
          setStep('map');

          if (importMode === 'transactions') {
            const currentMapping = { ...cleanMapping };
            let foundIncome = false;
            let foundExpense = false;

            fields.forEach(field => {
              const lower = cleanHeader(field);
              if (lower.includes('date') || lower.includes('data')) currentMapping.date = field;
              if (lower.includes('description') || lower.includes('descrizione') || lower.includes('memo')) currentMapping.description = field;
              if (lower.includes('type') || lower.includes('tipo')) currentMapping.type = field;
              if (lower.includes('account') || lower.includes('conto')) currentMapping.account = field;
              if (lower.includes('category') || lower.includes('categoria')) currentMapping.category = field;

              if (lower.includes('entrata') || lower.includes('income') || lower.includes('credit')) {
                currentMapping.incomeAmount = field;
                foundIncome = true;
              }
              if (lower.includes('uscita') || lower.includes('expense') || lower.includes('debit')) {
                currentMapping.expenseAmount = field;
                foundExpense = true;
              }

              if (lower.includes('amount') || lower.includes('importo') || lower.includes('value')) {
                if (!currentMapping.amount) currentMapping.amount = field;
              }
            });

            if (foundIncome && foundExpense) setUseDualAmountColumns(true);
            setMapping(currentMapping);
          } else if (importMode === 'accounts') {
            const currentMapping = { ...cleanMapping };
            fields.forEach(field => {
              const lower = cleanHeader(field);
              if (lower.includes('name') || lower.includes('nome')) currentMapping.accountName = field;
              if (lower.includes('type') || lower.includes('tipo')) currentMapping.accountType = field;
              if (lower.includes('balance') || lower.includes('saldo') || lower.includes('starting')) currentMapping.accountBalance = field;
              if (lower.includes('currency') || lower.includes('valuta')) currentMapping.accountCurrency = field;
            });
            setMapping(currentMapping);
          } else if (importMode === 'categories') {
            const currentMapping = { ...cleanMapping };
            fields.forEach(field => {
              const lower = cleanHeader(field);
              if (lower.includes('name') || lower.includes('nome')) currentMapping.categoryName = field;
              if (lower.includes('type') || lower.includes('tipo')) currentMapping.categoryType = field;
              if (lower.includes('budget')) currentMapping.categoryBudget = field;
            });
            setMapping(currentMapping);
          } else if (importMode === 'trades') {
            const currentTradeMapping = { ...cleanTradeMapping };
            fields.forEach(field => {
              const lower = cleanHeader(field);
              if (lower.includes('date') || lower.includes('data')) currentTradeMapping.date = field;
              if (lower.includes('ticker') || lower.includes('symbol') || lower.includes('isin')) currentTradeMapping.ticker = field;
              if (lower.includes('name') || lower.includes('nome')) currentTradeMapping.name = field;
              if (lower.includes('type') || lower.includes('tipo') || lower.includes('side')) currentTradeMapping.type = field;
              if (lower.includes('quantity') || lower.includes('quant') || lower.includes('qty')) currentTradeMapping.quantity = field;
              if (lower.includes('price') || lower.includes('prezzo')) currentTradeMapping.pricePerUnit = field;
              if (lower.includes('total') || lower.includes('amount') || lower.includes('controvalore')) currentTradeMapping.totalAmount = field;
              if (lower.includes('fee') || lower.includes('commission')) currentTradeMapping.fees = field;
            });
            setTradeMapping(currentTradeMapping);
            api.fetchHoldings().then(setHoldings);
          }
        }
      });
    }
  };

  const parseDate = (value: string) => {
    if (!value) return new Date().toISOString();
    const cleanValue = value.trim();
    const parts = cleanValue.split(/[-/.]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;
      if (third && third.length === 4) { // DD/MM/YYYY
        return new Date(parseInt(third), parseInt(second) - 1, parseInt(first), 12).toISOString();
      }
      if (first && first.length === 4) { // YYYY-MM-DD
        return new Date(parseInt(first), parseInt(second) - 1, parseInt(third), 12).toISOString();
      }
    }
    const date = new Date(cleanValue);
    if (isValid(date)) return date.toISOString();
    return new Date().toISOString();
  };

  // --- Transactions Logic ---
  const getTransactionFromRow = (row: any) => {
    let amount = 0;
    let type: "income" | "expense" = "expense";

    if (useDualAmountColumns && mapping.incomeAmount && mapping.expenseAmount) {
      const inc = parseNumeric(row[mapping.incomeAmount]);
      const exp = parseNumeric(row[mapping.expenseAmount]);
      if (inc > 0) { amount = inc; type = "income"; }
      else if (exp > 0) { amount = exp; type = "expense"; }
    } else {
      amount = parseNumeric(row[mapping.amount]);
      if (mapping.type && mapping.type !== 'none' && row[mapping.type]) {
        const typeVal = row[mapping.type].toLowerCase();
        if (typeVal.includes('income') || typeVal.includes('credit') || typeVal.includes('entrata')) type = "income";
      } else {
        if (amount < 0) { type = "expense"; amount = Math.abs(amount); }
        else type = "income";
      }
    }

    let accountId: number | null = selectedAccount || null;
    if (mapping.account && mapping.account !== 'none' && row[mapping.account]) {
      const accName = row[mapping.account].trim().toLowerCase();
      const matched = accounts.find(a => a.name.toLowerCase() === accName);
      if (matched) accountId = matched.id;
    } else if (!accountId && accounts.length > 0) {
      accountId = accounts[0].id;
    }

    let categoryId = categories[0]?.id ?? 0;
    if (mapping.category && mapping.category !== 'none' && row[mapping.category]) {
      const catName = row[mapping.category].trim().toLowerCase();
      const matched = categories.find(c => c.name.toLowerCase() === catName && c.type === type);
      if (matched) categoryId = matched.id;
      else {
        const nameMatch = categories.find(c => c.name.toLowerCase() === catName);
        if (nameMatch) categoryId = nameMatch.id;
        else {
          const defaultForType = categories.find(c => c.type === type);
          if (defaultForType) categoryId = defaultForType.id;
        }
      }
    } else {
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

  // --- Accounts Logic ---
  const getAccountFromRow = (row: any): InsertAccount => {
    const name = row[mapping.accountName];
    let type: any = "checking";
    const rawType = row[mapping.accountType]?.toLowerCase() || "";
    if (rawType.includes('save') || rawType.includes('risparmio') || rawType.includes('deposito')) type = "savings";
    else if (rawType.includes('credit') || rawType.includes('credito')) type = "credit";
    else if (rawType.includes('invest')) type = "investment";
    else if (rawType.includes('cash') || rawType.includes('contanti')) type = "cash";

    const balance = mapping.accountBalance ? parseNumeric(row[mapping.accountBalance]) : 0;
    const currency = mapping.accountCurrency ? row[mapping.accountCurrency] : "EUR";

    // Generate random color
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    return {
      name,
      type,
      startingBalance: balance.toString(),
      currency,
      color,
      creditLimit: type === 'credit' ? "0" : null // Default credit limit for credit accounts
    };
  };

  // --- Categories Logic ---
  const getCategoryFromRow = (row: any): InsertCategory => {
    const name = row[mapping.categoryName];
    let type: any = "expense";
    const rawType = row[mapping.categoryType]?.toLowerCase() || "";
    if (rawType.includes('income') || rawType.includes('entrata')) type = "income";

    const budget = mapping.categoryBudget ? parseNumeric(row[mapping.categoryBudget]) : 0;
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    return {
      name,
      type,
      color,
      budget: budget > 0 ? budget.toString() : null,
      icon: null
    };
  };

  const handleImport = async () => {
    if (importMode === 'transactions') {
      const transactions = csvData.map(getTransactionFromRow).filter(t => t._hasValidAccount && parseFloat(t.amount) > 0);
      const toSave = transactions.map(({ _hasValidAccount, ...tx }) => tx);
      await addTransactions(toSave);
      setLocation('/transactions');
    } else if (importMode === 'accounts') {
      const newAccounts = csvData.map(getAccountFromRow).filter(a => a.name);
      await addAccounts(newAccounts);
      setLocation('/accounts');
    } else if (importMode === 'categories') {
      const newCategories = csvData.map(getCategoryFromRow).filter(c => c.name);
      await addCategories(newCategories);
      setLocation('/categories');
    } else if (importMode === 'trades') {
      // Trade import logic (simplified reuse of existing)
      await handleTradeImport();
    }
  };

  // Trade import functions (kept from original)
  const getTradeFromRow = (row: any) => {
    const ticker = (row[tradeMapping.ticker] || "").toString().toUpperCase().trim();
    const name = tradeMapping.name ? row[tradeMapping.name] || ticker : ticker;
    const rawType = (row[tradeMapping.type] || "").toString().toLowerCase().trim();
    let type: "buy" | "sell" = "buy";
    if (rawType.match(/sell|vendita|vend|s|v/)) type = "sell";
    const quantity = Math.abs(parseNumeric(row[tradeMapping.quantity]));
    const pricePerUnit = Math.abs(parseNumeric(row[tradeMapping.pricePerUnit]));
    let totalAmount = tradeMapping.totalAmount ? Math.abs(parseNumeric(row[tradeMapping.totalAmount])) : 0;
    if (!totalAmount && quantity && pricePerUnit) totalAmount = quantity * pricePerUnit;
    const fees = tradeMapping.fees ? Math.abs(parseNumeric(row[tradeMapping.fees])) : 0;
    return { ticker, name, type, date: parseDate(row[tradeMapping.date]), quantity: quantity.toString(), pricePerUnit: pricePerUnit.toString(), totalAmount: totalAmount.toString(), fees: fees.toString(), _isValid: !!ticker && quantity > 0 && pricePerUnit > 0 };
  };

  const handleTradeImport = async () => {
    const tradeRows = csvData.map(getTradeFromRow).filter(t => t._isValid);
    if (tradeRows.length === 0) return;
    const tickerMap = new Map<string, { name: string; trades: any[] }>();
    for (const trade of tradeRows) {
      if (!tickerMap.has(trade.ticker)) tickerMap.set(trade.ticker, { name: trade.name, trades: [] });
      tickerMap.get(trade.ticker)!.trades.push(trade);
    }
    const currentHoldings = await api.fetchHoldings();
    const holdingIdMap = new Map<string, number>();
    for (const [ticker, data] of tickerMap.entries()) {
      let holding = currentHoldings.find(h => h.ticker.toUpperCase() === ticker);
      if (!holding) {
        try {
          holding = await api.createHolding({ ticker, name: data.name, assetType: "stock", currency: "EUR" });
          currentHoldings.push(holding);
        } catch (e) { console.error(e); continue; }
      }
      holdingIdMap.set(ticker, holding.id);
    }
    const validTrades = tradeRows.filter(t => holdingIdMap.has(t.ticker)).map(t => ({
      holdingId: holdingIdMap.get(t.ticker)!,
      date: t.date,
      quantity: t.quantity,
      pricePerUnit: t.pricePerUnit,
      totalAmount: t.totalAmount,
      fees: t.fees,
      type: t.type
    }));
    await api.createTradesBulk(validTrades);
    setLocation('/portfolio');
  };

  const canPreview = () => {
    if (importMode === 'transactions') return mapping.date && mapping.description && (useDualAmountColumns ? (mapping.incomeAmount && mapping.expenseAmount) : mapping.amount);
    if (importMode === 'accounts') return mapping.accountName && mapping.accountType;
    if (importMode === 'categories') return mapping.categoryName && mapping.categoryType;
    if (importMode === 'trades') return tradeMapping.date && tradeMapping.ticker && tradeMapping.quantity && tradeMapping.pricePerUnit;
    return false;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground">Upload CSV to import transactions, accounts, categories or trades</p>
        </div>

        <Tabs value={importMode} onValueChange={(v) => { setImportMode(v as ImportMode); setStep('upload'); setFile(null); }} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions" className="gap-2"><CreditCard className="h-4 w-4" /> Transazioni</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2"><Wallet className="h-4 w-4" /> Conti</TabsTrigger>
            <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" /> Categorie</TabsTrigger>
            <TabsTrigger value="trades" className="gap-2"><TrendingUp className="h-4 w-4" /> Portfolio</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 text-sm font-medium">
          {['Upload', 'Map Columns', 'Preview'].map((s, i) => {
            const stepKey = ['upload', 'map', 'preview'][i];
            const isActive = step === stepKey;
            return (
              <div key={s} className={cn("flex items-center gap-2", isActive ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", isActive ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>{i + 1}</div>
                {s}
              </div>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-8">
            {step === 'upload' && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2"><Upload className="w-8 h-8 text-primary" /></div>
                <div><h3 className="text-lg font-semibold">Click to upload CSV</h3><p className="text-sm text-muted-foreground mt-1">or drag and drop file here</p></div>
                <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
              </div>
            )}

            {step === 'map' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 bg-muted/30 p-4 rounded-lg border border-border">
                  <Settings2 size={18} className="text-primary" />
                  <span className="font-medium">Map Columns - {importMode.toUpperCase()}</span>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Dynamic Mapping Fields based on Mode */}
                  {importMode === 'transactions' && (
                    <>
                      <div className="space-y-2"><Label>Date</Label><Select value={mapping.date} onValueChange={v => setMapping({ ...mapping, date: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Description</Label><Select value={mapping.description} onValueChange={v => setMapping({ ...mapping, description: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Amount</Label><Select value={mapping.amount} onValueChange={v => setMapping({ ...mapping, amount: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Account (Optional)</Label><Select value={mapping.account} onValueChange={v => setMapping({ ...mapping, account: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- None --</SelectItem>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                  )}
                  {importMode === 'accounts' && (
                    <>
                      <div className="space-y-2"><Label>Name *</Label><Select value={mapping.accountName} onValueChange={v => setMapping({ ...mapping, accountName: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Type *</Label><Select value={mapping.accountType} onValueChange={v => setMapping({ ...mapping, accountType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Balance</Label><Select value={mapping.accountBalance} onValueChange={v => setMapping({ ...mapping, accountBalance: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="">-- None --</SelectItem>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Currency</Label><Select value={mapping.accountCurrency} onValueChange={v => setMapping({ ...mapping, accountCurrency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="">-- None --</SelectItem>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                  )}
                  {importMode === 'categories' && (
                    <>
                      <div className="space-y-2"><Label>Name *</Label><Select value={mapping.categoryName} onValueChange={v => setMapping({ ...mapping, categoryName: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Type *</Label><Select value={mapping.categoryType} onValueChange={v => setMapping({ ...mapping, categoryType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Budget</Label><Select value={mapping.categoryBudget} onValueChange={v => setMapping({ ...mapping, categoryBudget: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="">-- None --</SelectItem>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                  )}
                  {importMode === 'trades' && (
                    <>
                      <div className="space-y-2"><Label>Date *</Label><Select value={tradeMapping.date} onValueChange={v => setTradeMapping({ ...tradeMapping, date: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Ticker *</Label><Select value={tradeMapping.ticker} onValueChange={v => setTradeMapping({ ...tradeMapping, ticker: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Quantity *</Label><Select value={tradeMapping.quantity} onValueChange={v => setTradeMapping({ ...tradeMapping, quantity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Price *</Label><Select value={tradeMapping.pricePerUnit} onValueChange={v => setTradeMapping({ ...tradeMapping, pricePerUnit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>Cancel</Button>
                  <Button onClick={() => setStep('preview')} disabled={!canPreview()}>Preview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Preview {importMode} import</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {importMode === 'accounts' && <><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Balance</TableHead></>}
                        {importMode === 'categories' && <><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Budget</TableHead></>}
                        {importMode === 'transactions' && <><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead></>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, i) => {
                        if (importMode === 'accounts') {
                          const acc = getAccountFromRow(row);
                          return <TableRow key={i}><TableCell>{acc.name}</TableCell><TableCell>{acc.type}</TableCell><TableCell>{acc.startingBalance}</TableCell></TableRow>;
                        }
                        if (importMode === 'categories') {
                          const cat = getCategoryFromRow(row);
                          return <TableRow key={i}><TableCell>{cat.name}</TableCell><TableCell>{cat.type}</TableCell><TableCell>{cat.budget}</TableCell></TableRow>;
                        }
                        if (importMode === 'transactions') {
                          const tx = getTransactionFromRow(row);
                          return <TableRow key={i}><TableCell>{tx.date}</TableCell><TableCell>{tx.description}</TableCell><TableCell>{tx.amount}</TableCell></TableRow>;
                        }
                        return null;
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
                  <Button onClick={handleImport}>Import All</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
