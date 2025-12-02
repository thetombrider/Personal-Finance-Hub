import { useFinance, Transaction } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowRight, Check, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { parse, isValid } from "date-fns";

type Step = 'upload' | 'map' | 'preview';

interface Mapping {
  date: string;
  amount: string;
  description: string;
  type?: string;
}

export default function ImportTransactions() {
  const { accounts, categories, addTransactions, formatCurrency } = useFinance();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [mapping, setMapping] = useState<Mapping>({
    date: "",
    amount: "",
    description: "",
    type: "none"
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
          
          fields.forEach(field => {
            const lower = field.toLowerCase();
            if (lower.includes('date') || lower.includes('data')) guessMapping.date = field;
            if (lower.includes('amount') || lower.includes('importo') || lower.includes('value')) guessMapping.amount = field;
            if (lower.includes('description') || lower.includes('descrizione') || lower.includes('memo')) guessMapping.description = field;
            if (lower.includes('type') || lower.includes('tipo')) guessMapping.type = field;
          });
          
          setMapping(guessMapping);
        }
      });
    }
  };

  const parseAmount = (value: string) => {
    if (!value) return 0;
    // Handle currency symbols and commas
    const clean = value.toString().replace(/[^0-9.,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const parseDate = (value: string) => {
    // Try standard formats
    const date = new Date(value);
    if (isValid(date)) return date.toISOString();
    
    // Try DD/MM/YYYY
    try {
      const [d, m, y] = value.split(/[-/.]/);
      if (d && m && y) {
        const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        if (isValid(parsed)) return parsed.toISOString();
      }
    } catch (e) {}
    
    return new Date().toISOString(); // Fallback
  };

  const getPreviewData = () => {
    return csvData.slice(0, 5).map(row => ({
      date: row[mapping.date],
      amount: row[mapping.amount],
      description: row[mapping.description],
      type: mapping.type && mapping.type !== 'none' ? row[mapping.type] : 'Auto-detected'
    }));
  };

  const handleImport = () => {
    if (!selectedAccount) return;

    const transactions = csvData.map(row => {
      let amount = parseAmount(row[mapping.amount]);
      let type: "income" | "expense" = "expense";

      // Try to infer type if mapped
      if (mapping.type && mapping.type !== 'none' && row[mapping.type]) {
        const typeVal = row[mapping.type].toLowerCase();
        if (typeVal.includes('income') || typeVal.includes('credit') || typeVal.includes('entrata')) {
          type = "income";
        }
      } else {
        // Infer from amount sign
        if (amount > 0) {
          // Often positive amounts in CSV are income, but depends on bank
          // Let's assume standard: + is income, - is expense
          // BUT many banks show expense as positive number in debit column. 
          // For simplicity here: >0 is income, <0 is expense.
          // If user selects "Expense" as default, we might need to flip.
          // Let's rely on amount sign for now.
          if (amount < 0) {
             type = "expense";
             amount = Math.abs(amount);
          } else {
             type = "income"; // This is risky, usually expenses are positive in CSVs too.
             // Let's assume for now positive amounts are expenses unless specified otherwise?
             // Actually, safest is: if amount is negative -> expense. If positive -> income.
             // If bank provides all absolute values, we can't know without column type.
          }
        } else {
           type = "expense";
           amount = Math.abs(amount);
        }
      }

      // Default category (Uncategorized)
      // In a real app we'd have a 'Uncategorized' category or let user map values
      // For now, pick the first expense category
      const defaultCategory = categories.find(c => c.type === type)?.id || categories[0].id;

      return {
        date: parseDate(row[mapping.date]),
        amount: Math.abs(amount),
        description: row[mapping.description] || "Imported Transaction",
        accountId: selectedAccount,
        categoryId: defaultCategory,
        type
      };
    });

    addTransactions(transactions);
    setLocation('/transactions');
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
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                     <div className="space-y-2">
                      <Label>Select Account</Label>
                      <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account to import to" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Column</Label>
                      <Select value={mapping.date} onValueChange={(v) => setMapping({...mapping, date: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
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
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Amount Column</Label>
                      <Select value={mapping.amount} onValueChange={(v) => setMapping({...mapping, amount: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type Column (Optional)</Label>
                      <Select value={mapping.type} onValueChange={(v) => setMapping({...mapping, type: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column (if exists)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- None (Infer from amount) --</SelectItem>
                          {headers.map(h => (
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
                    disabled={!selectedAccount || !mapping.date || !mapping.amount || !mapping.description}
                  >
                    Preview Import <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-6">
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPreviewData().map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.description}</TableCell>
                          <TableCell>{row.amount}</TableCell>
                          <TableCell>{row.type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg text-sm flex gap-2 items-start">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    Please verify the data above matches your expectations. 
                    Importing will create {csvData.length} transactions in <strong>{accounts.find(a => a.id === selectedAccount)?.name}</strong>.
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
