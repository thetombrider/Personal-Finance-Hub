import { IStorage } from "../storage";
import { MarketDataService } from "./marketData";
import { Account, Category, Holding, Trade, Transaction } from "@shared/schema";

interface WeeklyReportData {
  startDate: string;
  endDate: string;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  balanceChange: number;
  top5Expenses: Array<{
    description: string;
    amount: number;
    accountName: string;
    categoryName: string;
    date: string;
  }>;
  sortedCategories: Array<[string, number]>;
  portfolioData: Array<{
    ticker: string;
    name: string;
    quantity: number;
    avgCost: number;
    totalInvested: number;
    currentPrice: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercent: number;
  }>;
  portfolioMetrics: {
    totalInvested: number;
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  };
  creditCardData: {
    transactions: Array<{
      date: string;
      description: string;
      accountName: string;
      categoryName: string;
      amount: number;
    }>;
    total: number;
    showAccountName: boolean;
  };
}

export class ReportService {
  constructor(
    private storage: IStorage,
    private marketDataService: MarketDataService
  ) { }

  async getWeeklyReportData(): Promise<WeeklyReportData> {
    const [transactions, accounts, categories, holdingsList, allTrades] = await Promise.all([
      this.storage.getTransactions(),
      this.storage.getAccounts(),
      this.storage.getCategories(),
      this.storage.getHoldings(),
      this.storage.getTrades()
    ]);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= oneWeekAgo && txDate <= now;
    });

    const totalIncome = weekTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalExpense = weekTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const expensesByCategory: Record<string, number> = {};
    weekTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat?.name || 'Altro';
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + parseFloat(t.amount.toString());
    });

    const sortedCategories = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Calculate actual balance
    const balances = await this.calculateAccountBalances(accounts, transactions);
    const totalBalance = balances.assets + balances.liabilities;

    // Credit Cards
    const creditCardAccounts = accounts.filter(a => a.type === 'credit');
    const creditCardIds = creditCardAccounts.map(a => a.id);
    const weekCreditCardTransactions = weekTransactions
      .filter(t => creditCardIds.includes(t.accountId) && t.type === 'expense')
      .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()));

    const totalCreditCardExpenses = weekCreditCardTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const creditCardData = {
      transactions: weekCreditCardTransactions.map(t => {
        const category = categories.find(c => c.id === t.categoryId);
        const account = accounts.find(a => a.id === t.accountId);
        return {
          date: new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
          description: t.description,
          accountName: account?.name || 'N/A',
          categoryName: category?.name || 'N/A',
          amount: parseFloat(t.amount.toString())
        };
      }),
      total: totalCreditCardExpenses,
      showAccountName: creditCardAccounts.length > 1
    };

    // Top 5 Expenses
    const top5Expenses = weekTransactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()))
      .slice(0, 5)
      .map(t => {
        const account = accounts.find(a => a.id === t.accountId);
        const category = categories.find(c => c.id === t.categoryId);
        return {
          description: t.description,
          amount: parseFloat(t.amount.toString()),
          accountName: account?.name || 'N/A',
          categoryName: category?.name || 'N/A',
          date: new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
        };
      });

    // Portfolio
    const portfolioData: WeeklyReportData['portfolioData'] = [];

    // Fetch prices in parallel
    await Promise.all(holdingsList.map(h => this.marketDataService.getQuote(h.ticker)));

    for (const holding of holdingsList) {
      const holdingTrades = allTrades.filter(t => t.holdingId === holding.id);
      let totalQuantity = 0;
      let totalCost = 0;

      for (const trade of holdingTrades) {
        const qty = parseFloat(trade.quantity.toString());
        const amount = parseFloat(trade.totalAmount.toString());
        const fees = parseFloat(trade.fees?.toString() || "0");

        if (trade.type === 'buy') {
          totalQuantity += qty;
          totalCost += amount + fees;
        } else {
          totalQuantity -= qty;
          totalCost -= amount - fees;
        }
      }

      if (totalQuantity > 0.0001) {
        const avgCost = totalCost / totalQuantity;
        const quote = await this.marketDataService.getQuote(holding.ticker);
        const currentPrice = quote?.data.price || avgCost; // Fallback to cost if no price
        const currentValue = totalQuantity * currentPrice;
        const gainLoss = currentValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

        portfolioData.push({
          ticker: holding.ticker,
          name: holding.name,
          quantity: totalQuantity,
          avgCost,
          totalInvested: totalCost,
          currentPrice,
          currentValue,
          gainLoss,
          gainLossPercent
        });
      }
    }

    const portfolioTotalInvested = portfolioData.reduce((sum, p) => sum + p.totalInvested, 0);
    const portfolioTotalValue = portfolioData.reduce((sum, p) => sum + p.currentValue, 0);
    const portfolioTotalGainLoss = portfolioTotalValue - portfolioTotalInvested;
    const portfolioTotalGainLossPercent = portfolioTotalInvested > 0 ? (portfolioTotalGainLoss / portfolioTotalInvested) * 100 : 0;

    return {
      startDate: oneWeekAgo.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }),
      endDate: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
      totalBalance,
      totalIncome,
      totalExpense,
      balanceChange: totalIncome - totalExpense,
      top5Expenses,
      sortedCategories,
      portfolioData,
      portfolioMetrics: {
        totalInvested: portfolioTotalInvested,
        totalValue: portfolioTotalValue,
        totalGainLoss: portfolioTotalGainLoss,
        totalGainLossPercent: portfolioTotalGainLossPercent
      },
      creditCardData
    };
  }

  async getMonthlyIncomeStatement(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [categories, budgetData] = await Promise.all([
      this.storage.getCategories(),
      this.getMonthlyBudget(year, month)
    ]);

    const transactions = await this.storage.getTransactions();

    // Filter transactions for the month
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    const report = categories
      .filter(c => c.name.toLowerCase() !== 'trasferimenti')
      .map(category => {
        const budgetItem = budgetData.find(b => b.category.id === category.id);

        // Calculate actuals
        const categoryTransactions = monthTransactions.filter(t => t.categoryId === category.id);
        const actual = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const budget = budgetItem ? budgetItem.total : 0;
        const isIncome = category.type === 'income';

        // Difference:
        // For Income: Actual - Budget (Positive = Earned more than budget = Good)
        // For Expense: Budget - Actual (Positive = Spent less than budget = Good)
        const difference = isIncome ? actual - budget : budget - actual;

        return {
          category,
          actual,
          budget,
          difference,
          isIncome
        };
      });

    // Calculate totals
    const totalIncome = report
      .filter(r => r.isIncome)
      .reduce((acc, curr) => ({
        actual: acc.actual + curr.actual,
        budget: acc.budget + curr.budget
      }), { actual: 0, budget: 0 });

    const totalExpenses = report
      .filter(r => !r.isIncome)
      .reduce((acc, curr) => ({
        actual: acc.actual + curr.actual,
        budget: acc.budget + curr.budget
      }), { actual: 0, budget: 0 });

    const netResult = {
      actual: totalIncome.actual - totalExpenses.actual,
      budget: totalIncome.budget - totalExpenses.budget
    };

    return {
      items: report,
      summary: {
        income: totalIncome,
        expenses: totalExpenses,
        netResult
      }
    };
  }

  async getBalanceSheet() {
    const [accounts, holdingsList, allTrades] = await Promise.all([
      this.storage.getAccounts(),
      this.storage.getHoldings(),
      this.storage.getTrades()
    ]);

    // Assets
    // 1. Liquidità (Cash)
    // Calculated as the sum of current balances for 'checking', 'savings', and 'cash' accounts.
    // We fetch all transactions once to calculate current balances.

    const allTransactions = await this.storage.getTransactions();
    let cashAssets = 0;

    // We reuse logic similar to calculateAccountBalances but filter by specific types
    // or we could use the generic helper and just pick the fields we want, but let's be explicit here to match user request.

    for (const account of accounts) {
      if (account.type === 'checking' || account.type === 'savings' || account.type === 'cash') {
        const accountTx = allTransactions.filter(t => t.accountId === account.id);
        const txSum = accountTx.reduce((sum, t) => {
          const val = parseFloat(t.amount.toString());
          return sum + (t.type === 'income' ? val : -val);
        }, 0);
        const currentBalance = parseFloat(account.startingBalance.toString()) + txSum;
        cashAssets += currentBalance;
      }
    }

    // 2. Investments (Holdings)
    // Fetch current prices
    await Promise.all(holdingsList.map(h => this.marketDataService.getQuote(h.ticker)));

    let investmentsValue = 0;
    for (const holding of holdingsList) {
      const holdingTrades = allTrades.filter(t => t.holdingId === holding.id);
      let quantity = 0;
      for (const t of holdingTrades) {
        const qty = parseFloat(t.quantity.toString());
        if (t.type === 'buy') quantity += qty;
        else quantity -= qty;
      }

      if (quantity > 0.0001) {
        const quote = await this.marketDataService.getQuote(holding.ticker);
        const price = quote?.data.price || parseFloat(holding.currentPrice?.toString() || "0");
        investmentsValue += quantity * price;
      }
    }

    const totalAssets = cashAssets + investmentsValue;

    // Liabilities
    // Credit cards logic
    let totalLiabilities = 0;
    for (const account of accounts) {
      if (account.type === 'credit') {
        const accountTx = allTransactions.filter(t => t.accountId === account.id);
        const txSum = accountTx.reduce((sum, t) => {
          const val = parseFloat(t.amount.toString());
          return sum + (t.type === 'income' ? val : -val);
        }, 0);
        const currentBalance = parseFloat(account.startingBalance.toString()) + txSum;
        // Liability is the magnitude of the debt (absolute value of negative balance)
        totalLiabilities += Math.abs(currentBalance);
      }
    }

    // Equity
    const netWorth = totalAssets - totalLiabilities;

    return {
      assets: {
        cash: cashAssets,
        investments: investmentsValue,
        total: totalAssets
      },
      liabilities: {
        creditCards: totalLiabilities,
        total: totalLiabilities
      },
      equity: {
        netWorth
      }
    };
  }

  // Refactored from routes.ts
  async getMonthlyBudget(year: number, month: number) {
    const [categories, monthlyBudgets, plannedExpenses, recurringExpenses] = await Promise.all([
      this.storage.getCategories(),
      this.storage.getMonthlyBudgets(year, month),
      this.storage.getPlannedExpenses(year, month),
      this.storage.getActiveRecurringExpenses()
    ]);

    return categories.map(category => {
      const monthlyBudget = monthlyBudgets.find(b => b.categoryId === category.id);
      const baseline = monthlyBudget ? parseFloat(monthlyBudget.amount.toString()) : 0;

      const categoryPlanned = plannedExpenses.filter(p => p.categoryId === category.id);
      const plannedTotal = categoryPlanned.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

      const categoryRecurring = recurringExpenses.filter(r => r.categoryId === category.id);
      // Simple active check logic as per original
      const recurringTotal = categoryRecurring.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

      return {
        category,
        baseline,
        planned: plannedTotal,
        recurring: recurringTotal,
        total: baseline + plannedTotal + recurringTotal,
        plannedExpenses: categoryPlanned,
        recurringExpenses: categoryRecurring
      };
    });
  }

  private async calculateAccountBalances(accounts: Account[], transactions?: Transaction[]) {
    const allTransactions = transactions || await this.storage.getTransactions();

    let assets = 0;
    let liabilities = 0;

    for (const account of accounts) {
      const accountTx = allTransactions.filter(t => t.accountId === account.id);
      const txSum = accountTx.reduce((sum, t) => {
        const val = parseFloat(t.amount.toString());
        return sum + (t.type === 'income' ? val : -val);
      }, 0);

      const currentBalance = parseFloat(account.startingBalance.toString()) + txSum;

      if (account.type === 'credit') {
        liabilities += currentBalance; // Usually negative for credit cards, but we track the 'balance'. 
        // If credit card balance is -500 (owed), it's a liability.
        // Assuming 'liabilities' sum should be the magnitude of debt.
        // However, the function returns raw sums. Let's keep it consistent.
      } else {
        assets += currentBalance;
      }
    }

    return { assets, liabilities };
  }

  generateHtml(data: WeeklyReportData): string {
    const formatEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
    const formatPercent = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1a1a1a; margin-bottom: 5px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.income { background: #ecfdf5; }
    .summary-card.expense { background: #fef2f2; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .summary-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
    .summary-value.income { color: #059669; }
    .summary-value.expense { color: #dc2626; }
    .category-list { margin: 20px 0; }
    .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
    .category-name { color: #333; }
    .category-amount { font-weight: 600; color: #dc2626; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
    .balance-card { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px; }
    .balance-label { font-size: 14px; opacity: 0.9; }
    .balance-value { font-size: 32px; font-weight: 700; margin-top: 5px; }
    .expense-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .expense-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #eee; font-size: 11px; color: #666; text-transform: uppercase; }
    .expense-table td { padding: 12px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .expense-table .amount { font-weight: 600; color: #dc2626; text-align: right; }
    .expense-table .desc { color: #333; }
    .expense-table .meta { color: #888; font-size: 11px; }
    .credit-card-section { background: #fef3c7; border-radius: 8px; padding: 20px; margin-top: 25px; }
    .credit-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .credit-card-title { font-weight: 600; color: #92400e; }
    .credit-card-total { font-weight: 700; color: #dc2626; }
    .portfolio-section { background: #f0fdf4; border-radius: 8px; padding: 20px; margin-top: 25px; }
    .portfolio-header { margin-bottom: 15px; }
    .portfolio-title { font-weight: 600; color: #166534; font-size: 16px; }
    .portfolio-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .portfolio-table th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #86efac; font-size: 10px; color: #166534; text-transform: uppercase; }
    .portfolio-table td { padding: 10px 6px; border-bottom: 1px solid #dcfce7; font-size: 12px; }
    .portfolio-table .ticker { font-weight: 600; color: #166534; }
    .portfolio-table .number { text-align: right; }
    .portfolio-table .gain { color: #059669; font-weight: 600; }
    .portfolio-table .loss { color: #dc2626; font-weight: 600; }
    .portfolio-table tfoot td { border-top: 2px solid #86efac; font-weight: 700; background: #dcfce7; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Report Settimanale</h1>
    <p class="subtitle">${data.startDate} - ${data.endDate}</p>
    
    <div class="balance-card">
      <div class="balance-label">Saldo Totale Conti</div>
      <div class="balance-value">${formatEur(data.totalBalance)}</div>
    </div>
    
    ${data.top5Expenses.length > 0 ? `
    <h3>💸 Top 5 Spese Più Alte</h3>
    <table class="expense-table">
      <thead>
        <tr>
          <th>Descrizione</th>
          <th>Conto</th>
          <th>Categoria</th>
          <th style="text-align: right;">Importo</th>
        </tr>
      </thead>
      <tbody>
        ${data.top5Expenses.map(e => `
          <tr>
            <td class="desc">${e.description}</td>
            <td class="meta">${e.accountName}</td>
            <td class="meta">${e.categoryName}</td>
            <td class="amount">${formatEur(e.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <div class="summary-grid">
      <div class="summary-card income">
        <div class="summary-label">Entrate</div>
        <div class="summary-value income">+${formatEur(data.totalIncome)}</div>
      </div>
      <div class="summary-card expense">
        <div class="summary-label">Uscite</div>
        <div class="summary-value expense">-${formatEur(data.totalExpense)}</div>
      </div>
    </div>
    
    <p style="text-align: center; margin-bottom: 25px;">
      <strong>Bilancio Settimanale:</strong> 
      <span style="color: ${data.balanceChange >= 0 ? '#059669' : '#dc2626'}; font-weight: 700;">
        ${data.balanceChange >= 0 ? '+' : ''}${formatEur(data.balanceChange)}
      </span>
    </p>
    
    <h3>🏷️ Top 5 Categorie Spese</h3>
    <div class="category-list">
      ${data.sortedCategories.length > 0
        ? data.sortedCategories.map(([name, amount]) => `
          <div class="category-item">
            <span class="category-name">${name}</span>
            <span class="category-amount">${formatEur(amount)}</span>
          </div>
        `).join('')
        : '<p style="color: #999; text-align: center;">Nessuna spesa questa settimana</p>'
      }
    </div>
    
    ${data.portfolioData.length > 0 ? `
    <div class="portfolio-section">
      <div class="portfolio-header">
        <span class="portfolio-title">📈 Portafoglio Titoli</span>
      </div>
      <table class="portfolio-table">
        <thead>
          <tr>
            <th>Titolo</th>
            <th class="number">Investito</th>
            <th class="number">Valore Attuale</th>
            <th class="number">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          ${data.portfolioData.map(p => `
            <tr>
              <td class="ticker">${p.ticker}</td>
              <td class="number">${formatEur(p.totalInvested)}</td>
              <td class="number">${formatEur(p.currentValue)}</td>
              <td class="number ${p.gainLoss >= 0 ? 'gain' : 'loss'}">${p.gainLoss >= 0 ? '+' : ''}${formatEur(p.gainLoss)} (${formatPercent(p.gainLossPercent)})</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>TOTALE</strong></td>
            <td class="number">${formatEur(data.portfolioMetrics.totalInvested)}</td>
            <td class="number">${formatEur(data.portfolioMetrics.totalValue)}</td>
            <td class="number ${data.portfolioMetrics.totalGainLoss >= 0 ? 'gain' : 'loss'}">${data.portfolioMetrics.totalGainLoss >= 0 ? '+' : ''}${formatEur(data.portfolioMetrics.totalGainLoss)} (${formatPercent(data.portfolioMetrics.totalGainLossPercent)})</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ` : ''}
    
    ${data.creditCardData.transactions.length > 0 ? `
    <div class="credit-card-section">
      <div class="credit-card-header">
        <span class="credit-card-title">💳 Spese Carta di Credito</span>
        <span class="credit-card-total">Totale: ${formatEur(data.creditCardData.total)}</span>
      </div>
      <table class="expense-table" style="margin: 0;">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrizione</th>
            <th>Categoria</th>
            <th style="text-align: right;">Importo</th>
          </tr>
        </thead>
        <tbody>
          ${data.creditCardData.transactions.map(t => `
            <tr>
              <td class="meta">${t.date}</td>
              <td class="desc">${t.description}${data.creditCardData.showAccountName ? ` <span class="meta">(${t.accountName})</span>` : ''}</td>
              <td class="meta">${t.categoryName}</td>
              <td class="amount">${formatEur(t.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Questo report è stato generato automaticamente da FinTrack</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
