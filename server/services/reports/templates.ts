
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
