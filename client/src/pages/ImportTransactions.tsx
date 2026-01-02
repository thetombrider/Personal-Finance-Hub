import { useFinance, Transaction } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, CreditCard, TrendingUp, Wallet, Tag, Settings2, BarChart3, FileSpreadsheet } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parse, isValid, format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import type { InsertTrade, InsertHolding, Holding, InsertAccount, InsertCategory } from "@shared/schema";

type Step = 'upload' | 'map' | 'preview';
type ImportMode = 'transactions' | 'trades' | 'holdings' | 'accounts' | 'categories';

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

interface HoldingMapping {
  ticker: string;
  name: string;
  assetType?: string;
  currency?: string;
}

export default function ImportTransactions() {
  const { accounts, categories, addTransactions, addAccounts, addCategories } = useFinance();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('upload');
  const [importMode, setImportMode] = useState<ImportMode>('transactions');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [allCsvData, setAllCsvData] = useState<{ name: string; headers: string[]; data: any[] }[]>([]);
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
    incomeAmount: "none",
    expenseAmount: "none",
    accountName: "",
    accountType: "",
    accountBalance: "none",
    accountCurrency: "none",
    categoryName: "",
    categoryType: "",
    categoryBudget: "none"
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

  const [holdingMapping, setHoldingMapping] = useState<HoldingMapping>({
    ticker: "",
    name: "",
    assetType: "",
    currency: ""
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceCsvData, setReferenceCsvData] = useState<{ headers: string[], data: any[] } | null>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isReference: boolean = false) => {
    const uploadedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (uploadedFiles.length > 0) {
      const fileToProcess = uploadedFiles[0];

      if (isReference) {
        setReferenceFile(fileToProcess);
      } else {
        setPrimaryFile(fileToProcess); // Replaces the single file state
        setFile(fileToProcess); // Keep for compatibility if needed, but we should switch to primaryFile
      }

      Papa.parse(fileToProcess, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fileHeaders = results.meta.fields || [];
          const data = results.data;

          if (isReference) {
            setReferenceCsvData({ headers: fileHeaders, data });
          } else {
            setCsvData(data);
            setHeaders(fileHeaders);
            if (!isReference && step === 'upload') setStep('map');

            const fields = fileHeaders;
            initializeMapping(fields, importMode);
          }
        }
      });
    }
  };

  const initializeMapping = (fields: string[], mode: ImportMode) => {
    // Reset all mappings first
    const cleanMapping: Mapping = {
      date: "", amount: "", description: "", type: "none", account: "none", category: "none",
      incomeAmount: "none", expenseAmount: "none",
      accountName: "", accountType: "", accountBalance: "none", accountCurrency: "none",
      categoryName: "", categoryType: "", categoryBudget: "none"
    };
    const cleanTradeMapping: TradeMapping = { date: "", ticker: "", name: "", type: "", quantity: "", pricePerUnit: "", totalAmount: "", fees: "" };
    const cleanHoldingMapping: HoldingMapping = { ticker: "", name: "", assetType: "", currency: "" };

    setUseDualAmountColumns(false);

    if (mode === 'transactions') {
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
        if (lower.includes('entrata') || lower.includes('income') || lower.includes('credit')) { currentMapping.incomeAmount = field; foundIncome = true; }
        if (lower.includes('uscita') || lower.includes('expense') || lower.includes('debit')) { currentMapping.expenseAmount = field; foundExpense = true; }
        if ((lower.includes('amount') || lower.includes('importo') || lower.includes('value')) && !currentMapping.amount) currentMapping.amount = field;
      });

      if (foundIncome && foundExpense) setUseDualAmountColumns(true);
      setMapping(currentMapping);
    } else if (mode === 'accounts') {
      const currentMapping = { ...cleanMapping };
      fields.forEach(field => {
        const lower = cleanHeader(field);
        if (lower.includes('name') || lower.includes('nome')) currentMapping.accountName = field;
        if (lower.includes('type') || lower.includes('tipo')) currentMapping.accountType = field;
        if (lower.includes('balance') || lower.includes('saldo') || lower.includes('starting')) currentMapping.accountBalance = field;
        if (lower.includes('currency') || lower.includes('valuta')) currentMapping.accountCurrency = field;
      });
      setMapping(currentMapping);
    } else if (mode === 'categories') {
      const currentMapping = { ...cleanMapping };
      fields.forEach(field => {
        const lower = cleanHeader(field);
        if (lower.includes('name') || lower.includes('nome')) currentMapping.categoryName = field;
        if (lower.includes('type') || lower.includes('tipo')) currentMapping.categoryType = field;
        if (lower.includes('budget')) currentMapping.categoryBudget = field;
      });
      setMapping(currentMapping);
    } else if (mode === 'trades') {
      const currentTradeMapping = { ...cleanTradeMapping };
      fields.forEach(field => {
        const lower = cleanHeader(field);
        if (lower.includes('date') || lower.includes('data')) currentTradeMapping.date = field;
        if (lower.includes('ticker') || lower.includes('symbol') || lower.includes('isin')) currentTradeMapping.ticker = field;
        if (lower.includes('holdingid')) { if (!currentTradeMapping.ticker) currentTradeMapping.ticker = field; }
        if (lower.includes('name') || lower.includes('nome')) currentTradeMapping.name = field;
        if (lower.includes('type') || lower.includes('tipo') || lower.includes('side')) currentTradeMapping.type = field;
        if (lower.includes('quantity') || lower.includes('quant') || lower.includes('qty')) currentTradeMapping.quantity = field;
        if (lower.includes('price') || lower.includes('prezzo')) currentTradeMapping.pricePerUnit = field;
        if (lower.includes('total') || lower.includes('amount') || lower.includes('controvalore')) currentTradeMapping.totalAmount = field;
        if (lower.includes('fee') || lower.includes('commission')) currentTradeMapping.fees = field;
      });
      setTradeMapping(currentTradeMapping);
      api.fetchHoldings().then(setHoldings);
    } else if (mode === 'holdings') {
      const currentHoldingMapping = { ...cleanHoldingMapping };
      fields.forEach(field => {
        const lower = cleanHeader(field);
        if (lower.includes('ticker') || lower.includes('symbol')) currentHoldingMapping.ticker = field;
        if (lower.includes('name') || lower.includes('nome')) currentHoldingMapping.name = field;
        if (lower.includes('type') || lower.includes('tipo')) currentHoldingMapping.assetType = field;
        if (lower.includes('currency') || lower.includes('valuta')) currentHoldingMapping.currency = field;
      });
      setHoldingMapping(currentHoldingMapping);
    }
  };

  const parseDate = (value: string) => {
    if (!value) return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

    // Clean value: trim and remove surrounding quotes (double or single)
    const cleanValue = value.trim().replace(/^["']+|["']+$/g, '');

    const parts = cleanValue.split(/[-/.]/);
    if (parts.length === 3) {
      const [first, second, third] = parts;
      if (third && third.length === 4) { // DD/MM/YYYY
        return format(new Date(parseInt(third), parseInt(second) - 1, parseInt(first), 12), "yyyy-MM-dd'T'HH:mm:ss");
      }
      if (first && first.length === 4) { // YYYY-MM-DD
        return format(new Date(parseInt(first), parseInt(second) - 1, parseInt(third), 12), "yyyy-MM-dd'T'HH:mm:ss");
      }
    }
    const date = new Date(cleanValue);
    if (isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
    return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
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
      const rawVal = row[mapping.account].toString().trim();
      const valLower = rawVal.toLowerCase();

      // Try match by name
      let matched = accounts.find(a => a.name.toLowerCase() === valLower);

      // Try match by ID if no name match
      if (!matched) {
        const numId = parseInt(rawVal);
        if (!isNaN(numId)) {
          matched = accounts.find(a => a.id === numId);
        }
      }

      if (matched) {
        accountId = matched.id;
      } else if (selectedAccount) {
        accountId = selectedAccount;
      }
    } else if (!accountId && accounts.length > 0) {
      accountId = accounts[0].id; // Final fallback if nothing else
    }

    let categoryId = categories.find(c => c.type === type)?.id || categories[0]?.id || 0;
    if (mapping.category && mapping.category !== 'none' && row[mapping.category]) {
      const rawVal = row[mapping.category].toString().trim();
      const valLower = rawVal.toLowerCase();

      // Try match by name + type
      let matched = categories.find(c => c.name.toLowerCase() === valLower && c.type === type);

      // Try match by name only
      if (!matched) {
        matched = categories.find(c => c.name.toLowerCase() === valLower);
      }

      // Try match by ID
      if (!matched) {
        const numId = parseInt(rawVal);
        if (!isNaN(numId)) {
          matched = categories.find(c => c.id === numId);
        }
      }

      if (matched) categoryId = matched.id;
    }

    return {
      date: parseDate(row[mapping.date]),
      amount: Math.abs(amount).toString(),
      description: row[mapping.description] || "Imported Transaction",
      accountId: accountId || 0,
      categoryId: categoryId || 0,
      type,
      _hasValidAccount: accountId !== null && accountId !== 0,
      _hasValidCategory: categoryId !== null && categoryId !== 0
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
    try {
      if (importMode === 'transactions') {
        const processed = csvData.map(getTransactionFromRow);
        const transactions = processed.filter(t => t._hasValidAccount && t._hasValidCategory && parseFloat(t.amount) > 0);

        if (transactions.length === 0) {
          const missingAccount = processed.some(t => !t._hasValidAccount);
          const missingCategory = processed.some(t => !t._hasValidCategory);
          let reason = "No valid transactions found.";
          if (missingAccount) reason += " Some rows have no valid Account mapping.";
          if (missingCategory) reason += " Some rows have no valid Category mapping.";

          toast({
            title: "Import Failed",
            description: reason,
            variant: "destructive"
          });
          return;
        }

        const toSave = transactions.map(({ _hasValidAccount, _hasValidCategory, ...tx }) => tx);
        await addTransactions(toSave);

        toast({
          title: "Import Successful",
          description: `Imported ${transactions.length} transactions.`,
        });
        setLocation('/transactions');
      } else if (importMode === 'accounts') {
        const newAccounts = csvData.map(getAccountFromRow).filter(a => a.name);
        if (newAccounts.length === 0) {
          toast({ title: "Import Failed", description: "No valid accounts found.", variant: "destructive" });
          return;
        }
        await addAccounts(newAccounts);
        toast({ title: "Import Successful", description: `Imported ${newAccounts.length} accounts.` });
        setLocation('/accounts');
      } else if (importMode === 'categories') {
        const newCategories = csvData.map(getCategoryFromRow).filter(c => c.name);
        if (newCategories.length === 0) {
          toast({ title: "Import Failed", description: "No valid categories found.", variant: "destructive" });
          return;
        }
        await addCategories(newCategories);
        toast({ title: "Import Successful", description: `Imported ${newCategories.length} categories.` });
        setLocation('/categories');
      } else if (importMode === 'trades') {
        await handleTradeImport();
      } else if (importMode === 'holdings') {
        const newHoldings = csvData.map(row => {
          const ticker = (row[holdingMapping.ticker] || "").toString().toUpperCase().trim();
          const name = (row[holdingMapping.name] || "").toString().trim();
          const assetType = (row[holdingMapping.assetType || ""] || "stock").toLowerCase();
          const currency = (row[holdingMapping.currency || ""] || "EUR").toUpperCase();
          return { ticker, name, assetType, currency };
        }).filter(h => h.ticker && h.name);

        if (newHoldings.length === 0) {
          toast({ title: "Import Failed", description: "No valid holdings found.", variant: "destructive" });
          return;
        }

        // We create them one by one or bulk if API supports it. Assuming createHolding is singular, we'll loop or use a hypothetical bulk if available.
        // The API likely only has createHolding singular. Let's do a loop for now or check if there is bulk.
        // Re-using the logic from trade import: check if exists, if not create.

        const currentHoldings = await api.fetchHoldings();
        let createdCount = 0;
        for (const h of newHoldings) {
          const exists = currentHoldings.find(ex => ex.ticker === h.ticker);
          if (!exists) {
            try {
              await api.createHolding(h);
              createdCount++;
            } catch (e) { console.error(e); }
          }
        }

        toast({ title: "Import Successful", description: `Processed ${newHoldings.length} holdings. Created ${createdCount} new holdings.` });
        setLocation('/portfolio');
      }
    } catch (error: any) {
      toast({
        title: "Import Error",
        description: error.message || "An unexpected error occurred during import.",
        variant: "destructive"
      });
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
    // Build holding map from REFERENCE file if available
    const holdingInfoMap = new Map<string, { ticker: string; name: string }>();

    if (referenceCsvData) {
      const headers = referenceCsvData.headers;
      const tickerField = headers.find(h => cleanHeader(h) === 'ticker' || cleanHeader(h) === 'symbol');
      const idField = headers.find(h => cleanHeader(h) === 'id' || cleanHeader(h) === 'holdingid'); // The source ID
      const nameField = headers.find(h => cleanHeader(h) === 'name') || tickerField;

      if (tickerField && idField) {
        referenceCsvData.data.forEach(row => {
          holdingInfoMap.set(row[idField]?.toString(), {
            ticker: row[tickerField]?.toString().toUpperCase(),
            name: row[nameField || tickerField]?.toString()
          });
        });
      }
    }

    const tradeRows = csvData.map(row => {
      let ticker = (row[tradeMapping.ticker] || "").toString().toUpperCase().trim();
      let name = tradeMapping.name ? row[tradeMapping.name] || ticker : ticker;

      // If we have a holding_id and a holdings map, resolve it
      const holdingIdLower = tradeMapping.ticker && cleanHeader(tradeMapping.ticker).includes('holdingid')
        ? (row[tradeMapping.ticker] || "").toString()
        : null;

      if (holdingIdLower && holdingInfoMap.has(holdingIdLower)) {
        const info = holdingInfoMap.get(holdingIdLower)!;
        ticker = info.ticker;
        name = info.name;
      }

      const rawType = (row[tradeMapping.type] || "").toString().toLowerCase().trim();
      let type: "buy" | "sell" = "buy";
      if (rawType.match(/sell|vendita|vend|s|v/)) type = "sell";
      const quantity = Math.abs(parseNumeric(row[tradeMapping.quantity]));
      const pricePerUnit = Math.abs(parseNumeric(row[tradeMapping.pricePerUnit]));
      let totalAmount = tradeMapping.totalAmount ? Math.abs(parseNumeric(row[tradeMapping.totalAmount])) : 0;
      if (!totalAmount && quantity && pricePerUnit) totalAmount = quantity * pricePerUnit;
      const fees = tradeMapping.fees ? Math.abs(parseNumeric(row[tradeMapping.fees])) : 0;

      return { ticker, name, type, date: parseDate(row[tradeMapping.date]), quantity: quantity.toString(), pricePerUnit: pricePerUnit.toString(), totalAmount: totalAmount.toString(), fees: fees.toString(), _isValid: !!ticker && quantity > 0 && pricePerUnit > 0 };
    }).filter(t => t._isValid);

    if (tradeRows.length === 0) {
      toast({
        title: "Import Failed",
        description: "No valid trades found. Make sure ticker, quantity, and price are correctly mapped.",
        variant: "destructive"
      });
      return;
    }

    const tickerMap = new Map<string, { name: string; trades: any[] }>();
    for (const trade of tradeRows) {
      if (!tickerMap.has(trade.ticker)) tickerMap.set(trade.ticker, { name: trade.name, trades: [] });
      tickerMap.get(trade.ticker)!.trades.push(trade);
    }

    const currentHoldings = await api.fetchHoldings();
    const holdingIdMap = new Map<string, number>();
    for (const [ticker, data] of Array.from(tickerMap.entries())) {
      let holding = currentHoldings.find(h => h.ticker.toUpperCase() === ticker);
      if (!holding) {
        try {
          holding = await api.createHolding({ ticker, name: data.name, assetType: "stock", currency: "EUR" });
          if (holding) currentHoldings.push(holding);
        } catch (e) {
          console.error(e);
          continue;
        }
      }
      if (holding) {
        holdingIdMap.set(ticker, holding.id);
      }
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
    toast({
      title: "Import Successful",
      description: `Imported ${validTrades.length} trades for ${tickerMap.size} holdings.`,
    });
    setLocation('/portfolio');
  };

  const canPreview = () => {
    if (importMode === 'transactions') return mapping.date && mapping.description && (useDualAmountColumns ? (mapping.incomeAmount && mapping.expenseAmount) : mapping.amount);
    if (importMode === 'accounts') return mapping.accountName && mapping.accountType;
    if (importMode === 'categories') return mapping.categoryName && mapping.categoryType;
    if (importMode === 'trades') return tradeMapping.date && tradeMapping.ticker && tradeMapping.quantity && tradeMapping.pricePerUnit;
    if (importMode === 'holdings') return holdingMapping.ticker && holdingMapping.name;
    return false;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground">Upload CSV to import transactions, accounts, categories or trades</p>
        </div>

        <Tabs value={importMode} onValueChange={(v) => {
          setImportMode(v as ImportMode);
          setStep('upload');
          setPrimaryFile(null);
          setReferenceFile(null);
          setFile(null);
          setCsvData([]);
          setReferenceCsvData(null);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="transactions" className="gap-2"><CreditCard className="h-4 w-4" /> Transazioni</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2"><Wallet className="h-4 w-4" /> Conti</TabsTrigger>
            <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" /> Categorie</TabsTrigger>
            <TabsTrigger value="trades" className="gap-2"><TrendingUp className="h-4 w-4" /> Portfolio: Trades</TabsTrigger>
            <TabsTrigger value="holdings" className="gap-2"><BarChart3 className="h-4 w-4" /> Portfolio: Holdings</TabsTrigger>
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
              <div className="space-y-6">
                {/* Primary File Upload */}
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => primaryFileInputRef.current?.click()}>
                  <div className="w-16 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2"><Upload className="w-8 h-8 text-primary" /></div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {importMode === 'trades' ? "Upload Trades CSV" :
                        importMode === 'holdings' ? "Upload Holdings CSV" :
                          "Click to upload CSV"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">or drag and drop file here</p>
                  </div>
                  <input type="file" ref={primaryFileInputRef} accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                </div>

                {/* Reference File Upload for Trades */}
                {importMode === 'trades' && (
                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-md font-medium">Reference Holdings File (Optional)</h3>
                        <p className="text-xs text-muted-foreground">
                          <strong>Recommended for "All-in-One" Matching:</strong> Upload your <code>holdings.csv</code> here.
                          This allows us to automatically link trades to their assets (e.g. matching 'ID 1' to 'Apple').
                        </p>
                      </div>
                      {referenceFile ? (
                        <span className="text-sm text-green-600 flex items-center gap-1"><FileSpreadsheet size={14} /> {referenceFile.name}</span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => referenceFileInputRef.current?.click()}>Select File</Button>
                      )}
                    </div>
                    <input type="file" ref={referenceFileInputRef} accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, true)} />
                  </div>
                )}
              </div>
            )}

            {step === 'map' && (
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
                        {accounts.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Dynamic Mapping Fields based on Mode */}
                  {importMode === 'transactions' && (
                    <>
                      <div className="space-y-2"><Label>Date *</Label><Select value={mapping.date} onValueChange={v => setMapping({ ...mapping, date: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Description *</Label><Select value={mapping.description} onValueChange={v => setMapping({ ...mapping, description: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Amount *</Label><Select value={mapping.amount} onValueChange={v => setMapping({ ...mapping, amount: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Type Column (Optional)</Label><Select value={mapping.type} onValueChange={v => setMapping({ ...mapping, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Detect by Sign --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
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
                    </>
                  )}
                  {importMode === 'holdings' && (
                    <>
                      <div className="space-y-2"><Label>Ticker *</Label><Select value={holdingMapping.ticker} onValueChange={v => setHoldingMapping({ ...holdingMapping, ticker: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Name *</Label><Select value={holdingMapping.name} onValueChange={v => setHoldingMapping({ ...holdingMapping, name: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Type</Label><Select value={holdingMapping.assetType} onValueChange={v => setHoldingMapping({ ...holdingMapping, assetType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Default (Stock) --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Currency</Label><Select value={holdingMapping.currency} onValueChange={v => setHoldingMapping({ ...holdingMapping, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">-- Default (EUR) --</SelectItem>{headers.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setStep('upload');
                    setPrimaryFile(null);
                    setReferenceFile(null);
                    setFile(null);
                  }}>Cancel</Button>
                  <Button onClick={() => setStep('preview')} disabled={!canPreview()}>Preview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {step === 'preview' && (
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
                        {importMode === 'categories' && <><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Budget</TableHead></>}
                        {importMode === 'transactions' && <><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Account</TableHead><TableHead>Category</TableHead></>}
                        {importMode === 'trades' && <><TableHead>Date</TableHead><TableHead>Ticker</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Quantity</TableHead><TableHead>Price</TableHead></>}
                        {importMode === 'holdings' && <><TableHead>Ticker</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Currency</TableHead></>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, i) => {
                        if (importMode === 'accounts') {
                          const acc = getAccountFromRow(row);
                          return <TableRow key={i}><TableCell>{acc.name}</TableCell><TableCell className="capitalize">{acc.type}</TableCell><TableCell>{acc.startingBalance}</TableCell></TableRow>;
                        }
                        if (importMode === 'categories') {
                          const cat = getCategoryFromRow(row);
                          return <TableRow key={i}><TableCell>{cat.name}</TableCell><TableCell className="capitalize">{cat.type}</TableCell><TableCell>{cat.budget || '0'}</TableCell></TableRow>;
                        }
                        if (importMode === 'transactions') {
                          const tx = getTransactionFromRow(row);
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
                          // Build holding map from REFERENCE file if available
                          const holdingInfoMap = new Map<string, { ticker: string; name: string }>();
                          if (referenceCsvData) {
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

                          let ticker = (row[tradeMapping.ticker] || "").toString().toUpperCase().trim();
                          let name = tradeMapping.name ? row[tradeMapping.name] || ticker : ticker;

                          const holdingIdLower = (row[tradeMapping.ticker] || "").toString();

                          // Attempt to resolve if it looks like an ID (numeric) OR if we simply have a map and want to try lookup
                          // But specifically if the mapping column was labeled 'holdingid', we suspect it is an ID.
                          // Or simply, if the value matches a key in our map.
                          if (holdingInfoMap.has(holdingIdLower)) {
                            const info = holdingInfoMap.get(holdingIdLower)!;
                            ticker = info.ticker;
                            name = info.name;
                          }

                          const rawType = (row[tradeMapping.type] || "").toString().toLowerCase().trim();
                          let type: "buy" | "sell" = "buy";
                          if (rawType.match(/sell|vendita|vend|s|v/)) type = "sell";
                          const quantity = Math.abs(parseNumeric(row[tradeMapping.quantity]));
                          const pricePerUnit = Math.abs(parseNumeric(row[tradeMapping.pricePerUnit]));

                          return (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{parseDate(row[tradeMapping.date]).split('T')[0]}</TableCell>
                              <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{ticker}</span></TableCell>
                              <TableCell className="max-w-[150px] truncate">{name}</TableCell>
                              <TableCell className="capitalize">{type}</TableCell>
                              <TableCell>{quantity}</TableCell>
                              <TableCell>{pricePerUnit}</TableCell>
                            </TableRow>
                          );
                        }
                        if (importMode === 'holdings') {
                          const ticker = (row[holdingMapping.ticker] || "").toString().toUpperCase();
                          const name = (row[holdingMapping.name] || "").toString();
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{ticker}</TableCell>
                              <TableCell>{name}</TableCell>
                              <TableCell className="capitalize">{row[holdingMapping.assetType || ""] || 'stock'}</TableCell>
                              <TableCell>{row[holdingMapping.currency || ""] || 'EUR'}</TableCell>
                            </TableRow>
                          );
                        }
                        return null;
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
                  <Button onClick={handleImport}>Import All Data</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
