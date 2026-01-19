
import { WeeklyReportData } from "./types";

export function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export function formatPercent(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}


export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateWeeklyReportHtml(data: WeeklyReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'JetBrains Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; padding: 20px; color: #171717; }
    .container { max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 30px; }
    h1 { color: #171717; margin-bottom: 5px; font-weight: 700; letter-spacing: -0.025em; }
    h3 { font-weight: 600; font-size: 16px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
    .subtitle { color: #737373; margin-bottom: 40px; font-size: 14px; }
    
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
    .summary-card { padding: 20px; border: 1px solid #e5e5e5; text-align: center; }
    .summary-label { font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .summary-value { font-size: 24px; font-weight: 700; }
    .summary-value.income { color: #171717; }
    .summary-value.expense { color: #171717; }
    
    .balance-card { border: 1px solid #171717; background: #171717; color: white; padding: 30px; text-align: center; margin-bottom: 40px; }
    .balance-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; margin-bottom: 10px; }
    .balance-value { font-size: 42px; font-weight: 700; letter-spacing: -0.025em; }
    
    .category-list { margin: 20px 0; border-top: 1px solid #e5e5e5; }
    .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
    .category-name { color: #171717; font-size: 13px; }
    .category-amount { font-weight: 600; color: #171717; font-size: 13px; }
    
    .expense-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .expense-table th { text-align: left; padding: 10px 0; border-bottom: 1px solid #171717; font-size: 10px; color: #737373; text-transform: uppercase; letter-spacing: 0.05em; }
    .expense-table td { padding: 12px 0; border-bottom: 1px solid #e5e5e5; font-size: 12px; color: #171717; }
    .expense-table .amount { font-weight: 600; text-align: right; }
    .expense-table .desc { color: #171717; }
    .expense-table .meta { color: #737373; font-size: 11px; }
    
    .credit-card-section { border: 1px solid #e5e5e5; padding: 25px; margin-top: 40px; }
    .credit-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5; }
    .credit-card-title { font-weight: 600; color: #171717; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
    .credit-card-total { font-weight: 700; color: #171717; }
    
    .portfolio-section { border: 1px solid #e5e5e5; padding: 25px; margin-top: 40px; }
    .portfolio-header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5; }
    .portfolio-title { font-weight: 600; color: #171717; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .portfolio-table { width: 100%; border-collapse: collapse; }
    .portfolio-table th { text-align: left; padding: 8px 0; border-bottom: 1px solid #737373; font-size: 10px; color: #737373; text-transform: uppercase; letter-spacing: 0.05em; }
    .portfolio-table td { padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size: 12px; color: #171717; }
    .portfolio-table .ticker { font-weight: 600; font-family: 'JetBrains Mono', monospace; }
    .portfolio-table .number { text-align: right; }
    .portfolio-table .gain { color: #171717; }
    .portfolio-table .loss { color: #171717; }
    .portfolio-table tfoot td { border-top: 2px solid #171717; border-bottom: none; font-weight: 700; padding-top: 20px; }
    
    .footer { text-align: center; margin-top: 60px; color: #a3a3a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
    
    /* Utilities */
    .text-right { text-align: right; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Report Settimanale</h1>
    <p class="subtitle">${escapeHtml(data.startDate)} - ${escapeHtml(data.endDate)}</p>
    
    <div class="balance-card">
      <div class="balance-label">Patrimonio Netto</div>
      <div class="balance-value">${formatEur(data.netWorth)}</div>
    </div>
    
    ${data.top5Expenses.length > 0 ? `
    <h3>💸 Top 5 Spese Più Alte</h3>
    <table class="expense-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Account</th>
          <th>Category</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.top5Expenses.map(e => `
          <tr>
            <td class="desc">${escapeHtml(e.description)}</td>
            <td class="meta">${escapeHtml(e.accountName)}</td>
            <td class="meta">${escapeHtml(e.categoryName)}</td>
            <td class="amount">${formatEur(e.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <div class="summary-grid">
      <div class="summary-card income">
        <div class="summary-label">Income</div>
        <div class="summary-value income">+${formatEur(data.totalIncome)}</div>
      </div>
      <div class="summary-card expense">
        <div class="summary-label">Expenses</div>
        <div class="summary-value expense">-${formatEur(data.totalExpense)}</div>
      </div>
    </div>
    
    <p style="text-align: center; margin-bottom: 25px;">
      <strong>Weekly Balance:</strong> 
      <span style="color: ${data.balanceChange >= 0 ? '#059669' : '#dc2626'}; font-weight: 700;">
        ${data.balanceChange >= 0 ? '+' : ''}${formatEur(data.balanceChange)}
      </span>
    </p>
    
    <h3>Top 5 Categories Expenses</h3>
    <div class="category-list">
      ${data.sortedCategories.length > 0
      ? data.sortedCategories.map(([name, amount]) => `
          <div class="category-item">
            <span class="category-name">${escapeHtml(name)}</span>
            <span class="category-amount">${formatEur(amount)}</span>
          </div>
        `).join('')
      : '<p style="color: #999; text-align: center;">No expenses this week</p>'
    }
    </div>
    
    ${data.portfolioData.length > 0 ? `
    <div class="portfolio-section">
      <div class="portfolio-header">
        <span class="portfolio-title">📈 Portfolio Stocks</span>
      </div>
      <table class="portfolio-table">
        <thead>
          <tr>
            <th>Stock</th>
            <th class="number">Invested</th>
            <th class="number">Current Value</th>
            <th class="number">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          ${data.portfolioData.map(p => `
            <tr>
              <td class="ticker">${escapeHtml(p.ticker)}</td>
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
    
    ${data.creditCardData && data.creditCardData.transactions && data.creditCardData.transactions.length > 0 ? `
    <div class="credit-card-section">
      <div class="credit-card-header">
        <span class="credit-card-title">💳 Credit Card Expenses</span>
        <span class="credit-card-total">Total: ${formatEur(data.creditCardData.total)}</span>
      </div>
      <table class="expense-table" style="margin: 0;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.creditCardData.transactions.map(t => `
            <tr>
              <td class="meta">${escapeHtml(t.date)}</td>
              <td class="desc">${escapeHtml(t.description)}${data.creditCardData && data.creditCardData.showAccountName ? ` <span class="meta">(${escapeHtml(t.accountName)})</span>` : ''}</td>
              <td class="meta">${escapeHtml(t.categoryName)}</td>
              <td class="amount">${formatEur(t.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>This report was automatically generated by FinTrack</p>
    </div>
  </div>
</body>
</html>
    `;
}
