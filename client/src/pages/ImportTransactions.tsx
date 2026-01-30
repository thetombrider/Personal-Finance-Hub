import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, TrendingUp, Wallet, Tag } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { read, utils, writeFile } from "xlsx";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError } from "@/lib/toastHelpers";
import * as api from "@/lib/api";
import type { Holding } from "@shared/schema";
import { getErrorMessage } from "@/lib/errors";

import { Step, ImportMode, Mapping, TradeMapping } from "@/components/import/types";
import { cleanHeader, parseNumeric, getTransactionFromRow, getAccountFromRow, getCategoryFromRow, parseDate } from "@/components/import/utils";
import ImportZone from "@/components/import/ImportZone";
import MappingManager from "@/components/import/MappingManager";
import FileReview from "@/components/import/FileReview";

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
    fees: "",
    account: ""
  });

  const [holdings, setHoldings] = useState<Holding[]>([]);

  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceCsvData, setReferenceCsvData] = useState<{ headers: string[], data: any[] } | null>(null);

  const handleFileUpload = (files: File[], isReference: boolean = false) => {
    const uploadedFiles = files;
    if (uploadedFiles.length > 0) {
      const fileToProcess = uploadedFiles[0];
      const isExcel = fileToProcess.name.endsWith('.xlsx') || fileToProcess.name.endsWith('.xls');

      if (isReference) {
        setReferenceFile(fileToProcess);
      } else {
        setPrimaryFile(fileToProcess);
        setFile(fileToProcess);
      }

      if (isExcel) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target?.result;
          if (data) {
            const workbook = read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = utils.sheet_to_json(worksheet, { defval: "" }) as any[];

            if (json.length > 0) {
              const fileHeaders = Object.keys(json[0]);

              if (isReference) {
                setReferenceCsvData({ headers: fileHeaders, data: json });
              } else {
                setCsvData(json);
                setHeaders(fileHeaders);
                if (!isReference && step === 'upload') setStep('map');

                const fields = fileHeaders;
                initializeMapping(fields, importMode);
              }
            } else {
              showError(toast, "Import Failed", "The Excel file appears to be empty or invalid.");
            }
          }
        };
        reader.readAsArrayBuffer(fileToProcess);
      } else {
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
        if (lower.includes('income') || lower.includes('entrata')) { currentMapping.incomeAmount = field; foundIncome = true; }
        if (lower.includes('expense') || lower.includes('uscita')) { currentMapping.expenseAmount = field; foundExpense = true; }
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

        // Improved Type detection
        if (lower.includes('type') || lower.includes('tipo') || lower.includes('side') ||
          lower.includes('segno') || lower.includes('direction') || lower.includes('operazione')) {
          currentTradeMapping.type = field;
        }

        if (lower.includes('quantity') || lower.includes('quant') || lower.includes('qty')) currentTradeMapping.quantity = field;
        if (lower.includes('price') || lower.includes('prezzo')) currentTradeMapping.pricePerUnit = field;
        if (lower.includes('total') || lower.includes('amount') || lower.includes('controvalore')) currentTradeMapping.totalAmount = field;
        if (lower.includes('fee') || lower.includes('commission')) currentTradeMapping.fees = field;

        // Auto-detect Account
        if (lower.includes('account') || lower.includes('conto') || lower.includes('bank') || lower.includes('banca')) {
          currentTradeMapping.account = field;
        }
      });
      setTradeMapping(currentTradeMapping);
      api.fetchHoldings().then(setHoldings);
    }
  };

  const handleImport = async () => {
    try {
      if (importMode === 'transactions') {
        const processed = csvData.map(row => getTransactionFromRow(row, mapping, accounts, categories, useDualAmountColumns, selectedAccount));
        const transactions = processed.filter(t => t._hasValidAccount && t._hasValidCategory && parseFloat(t.amount) > 0);

        if (transactions.length === 0) {
          const missingAccount = processed.some(t => !t._hasValidAccount);
          const missingCategory = processed.some(t => !t._hasValidCategory);
          let reason = "No valid transactions found.";
          if (missingAccount) reason += " Some rows have no valid Account mapping.";
          if (missingCategory) reason += " Some rows have no valid Category mapping.";

          showError(toast, "Import Failed", reason);
          return;
        }

        const toSave = transactions.map(({ _hasValidAccount, _hasValidCategory, ...tx }) => tx);
        const saved = await addTransactions(toSave);
        const skipped = toSave.length - (saved?.length || 0);

        showSuccess(toast, "Import Successful", `Imported ${saved?.length || 0} transactions (${skipped} duplicates skipped).`);
        setLocation('/transactions');
      } else if (importMode === 'accounts') {
        const newAccounts = csvData.map(row => getAccountFromRow(row, mapping)).filter(a => a.name);
        if (newAccounts.length === 0) {
          showError(toast, "Import Failed", "No valid accounts found.");
          return;
        }
        const saved = await addAccounts(newAccounts);
        const skipped = newAccounts.length - (saved?.length || 0);
        showSuccess(toast, "Import Successful", `Imported ${saved?.length || 0} accounts (${skipped} duplicates skipped).`);
        setLocation('/accounts');
      } else if (importMode === 'categories') {
        const newCategories = csvData.map(row => getCategoryFromRow(row, mapping)).filter(c => c.name);
        if (newCategories.length === 0) {
          showError(toast, "Import Failed", "No valid categories found.");
          return;
        }
        const saved = await addCategories(newCategories);
        const skipped = newCategories.length - (saved?.length || 0);
        showSuccess(toast, "Import Successful", `Imported ${saved?.length || 0} categories (${skipped} duplicates skipped).`);
        setLocation('/categories');
      } else if (importMode === 'trades') {
        await handleTradeImport();
      }
    } catch (error) {
      showError(toast, "Import Error", getErrorMessage(error));
    }
  };

  // Trade import functions
  async function handleTradeImport() {
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
      let name = (tradeMapping.name ? row[tradeMapping.name] || ticker : ticker).toString();

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
      if (rawType.match(/^(sell|vend|s$|v$|-|uscita|debit)/i)) type = "sell";

      // Use imported parseNumeric for consistency, but if needed locally we can import it.
      // I imported parseNumeric from utils.
      const quantity = Math.abs(parseNumeric(row[tradeMapping.quantity]));
      const pricePerUnit = Math.abs(parseNumeric(row[tradeMapping.pricePerUnit]));
      let totalAmount = tradeMapping.totalAmount ? Math.abs(parseNumeric(row[tradeMapping.totalAmount])) : 0;
      if (!totalAmount && quantity && pricePerUnit) totalAmount = quantity * pricePerUnit;
      const fees = tradeMapping.fees ? Math.abs(parseNumeric(row[tradeMapping.fees])) : 0;

      // Account Resolution
      let accountId: number | null = null;
      if (tradeMapping.account && row[tradeMapping.account]) {
        const rawAcc = row[tradeMapping.account].toString().trim();
        const accLower = rawAcc.toLowerCase();
        // Try match by name
        let matched = accounts.find(a => a.name.toLowerCase() === accLower);
        // Try match by ID
        if (!matched) {
          const numId = parseInt(rawAcc);
          if (!isNaN(numId)) matched = accounts.find(a => a.id === numId);
        }
        if (matched) accountId = matched.id;
      }
      // Note: parseDate needs to be imported from utils too. I imported it.
      // Wait, I imported parseDate but didn't use it in this map function? 
      // Ah, I need to use it for `t.date`.

      // Need to import parseDate from utils. (Checked imports, it is there)
      const dateVal = row[tradeMapping.date]; // Need to parse this?
      // Originally: date: parseDate(row[tradeMapping.date])

      return {
        ticker,
        name,
        type,
        date: parseDate(row[tradeMapping.date]),
        quantity: quantity.toString(),
        pricePerUnit: pricePerUnit.toString(),
        totalAmount: totalAmount.toString(),
        fees: fees.toString(),
        accountId,
        _isValid: !!ticker && quantity > 0 && pricePerUnit > 0
      };
    }).filter(t => t._isValid);

    if (tradeRows.length === 0) {
      showError(toast, "Import Failed", "No valid trades found. Make sure ticker, quantity, and price are correctly mapped.");
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
        } catch (error) {
          console.error(error);
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
      type: t.type,
      accountId: t.accountId
    }));

    const saved = await api.createTradesBulk(validTrades);
    const skipped = validTrades.length - (saved?.length || 0);
    showSuccess(toast, "Import Successful", `Imported ${saved?.length || 0} trades for ${tickerMap.size} holdings (${skipped} duplicates skipped).`);
    setLocation('/portfolio');
  };

  const canPreview = () => {
    if (importMode === 'transactions') return !!(mapping.date && mapping.description && (useDualAmountColumns ? (mapping.incomeAmount && mapping.expenseAmount) : mapping.amount));
    if (importMode === 'accounts') return !!(mapping.accountName && mapping.accountType);
    if (importMode === 'categories') return !!(mapping.categoryName && mapping.categoryType);
    if (importMode === 'trades') return !!(tradeMapping.date && tradeMapping.ticker && tradeMapping.quantity && tradeMapping.pricePerUnit);
    return false;
  };

  const handleDownloadTemplate = (mode: string = importMode) => {
    let headers: string[] = [];
    let filename = `template_${mode}.xlsx`;

    switch (mode) {
      case 'transactions':
        headers = ['Date', 'Description', 'Amount', 'Type', 'Account', 'Category'];
        break;
      case 'accounts':
        headers = ['Name', 'Type', 'Balance', 'Currency'];
        break;
      case 'categories':
        headers = ['Name', 'Type', 'Budget'];
        break;
      case 'trades':
        headers = ['Date', 'Ticker', 'Name', 'Type', 'Quantity', 'Price', 'TotalAmount', 'Fees', 'Account'];
        break;
      case 'holdings':
        headers = ['ID', 'Ticker', 'Name'];
        break;

    }

    const ws = utils.aoa_to_sheet([headers]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template");
    writeFile(wb, filename);
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
          <TabsList className="w-max">
            <TabsTrigger value="transactions" className="gap-2"><CreditCard className="h-4 w-4" /> Transactions</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2"><Wallet className="h-4 w-4" /> Accounts</TabsTrigger>
            <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" /> Categories</TabsTrigger>
            <TabsTrigger value="trades" className="gap-2"><TrendingUp className="h-4 w-4" /> Portfolio: Trades</TabsTrigger>

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
              <ImportZone
                importMode={importMode}
                primaryFileInputRef={primaryFileInputRef}
                referenceFileInputRef={referenceFileInputRef}
                referenceFile={referenceFile}
                onFileSelect={handleFileUpload}
                onDownloadTemplate={handleDownloadTemplate}
              />
            )}

            {step === 'map' && (
              <MappingManager
                importMode={importMode}
                headers={headers}
                mapping={mapping}
                setMapping={setMapping}
                tradeMapping={tradeMapping}
                setTradeMapping={setTradeMapping}
                accounts={accounts}
                useDualAmountColumns={useDualAmountColumns}
                setUseDualAmountColumns={setUseDualAmountColumns}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                onCancel={() => {
                  setStep('upload');
                  setPrimaryFile(null);
                  setReferenceFile(null);
                  setFile(null);
                }}
                onPreview={() => setStep('preview')}
                canPreview={canPreview}
              />
            )}

            {step === 'preview' && (
              <FileReview
                importMode={importMode}
                csvData={csvData}
                referenceCsvData={referenceCsvData}
                mapping={mapping}
                tradeMapping={tradeMapping}
                accounts={accounts}
                categories={categories}
                useDualAmountColumns={useDualAmountColumns}
                selectedAccount={selectedAccount}
                onBack={() => setStep('map')}
                onImport={handleImport}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
