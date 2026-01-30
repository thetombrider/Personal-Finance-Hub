/**
 * Chart data type definitions for dashboard visualizations
 */

// Basic chart data point
export interface ChartDataPoint {
    name: string;
    value: number;
}

// Cash flow chart (income vs expenses over time)
export interface CashFlowDataPoint {
    name: string;
    income: number;
    expense: number;
    net?: number;
}

// Net worth evolution chart
export interface NetWorthDataPoint {
    name: string;
    netWorth: number;
}

// Net worth projection chart
export interface NetWorthProjectionDataPoint {
    name: string;
    netWorth: number;
}

// Category spending breakdown
export interface CategoryDataPoint {
    name: string;
    value: number;
    color?: string;
}

// Category trend chart (monthly totals with budget comparison)
export interface CategoryTrendDataPoint {
    name: string;
    total: number;
    budget: number;
    overBudget: boolean;
}

// Budget comparison chart
export interface BudgetComparisonDataPoint {
    name: string;
    budget: number;
    actual: number;
}

// Net worth by account type
export interface NetWorthByTypeDataPoint {
    name: string;
    base: number;
    gain: number;
    loss: number;
    totalDisplay: number;
}

// Sankey chart types
export interface SankeyNode {
    name: string;
    fill?: string;
}

export interface SankeyLink {
    source: number;
    target: number;
    value: number;
}

export interface SankeyData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

// Recharts tooltip props (used in custom tooltips)
export interface RechartsTooltipProps {
    active?: boolean;
    payload?: Array<{
        value: number;
        name?: string;
        dataKey?: string;
        payload?: Record<string, unknown>;
    }>;
    label?: string;
}

// Sankey node render props
export interface SankeyNodeProps {
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    payload: {
        name: string;
        fill?: string;
        value: number;
        sourceLinks?: unknown[];
        targetLinks?: unknown[];
        node?: { fill?: string };
    };
    containerWidth: number;
    sourceLinks?: unknown[];
    targetLinks?: unknown[];
}

// Portfolio summary from dashboard stats
export interface PortfolioSummary {
    totalInvested: number;
    totalCurrentValue: number;
    totalGainLoss: number;
    totalGainLossPercent?: number;  // Used by usePortfolioStats
    percentageChange?: number;       // Alternative field name
    holdingsCount?: number;
    holdingsWithValue?: number;
}

// Budget data structure
export interface BudgetMonthData {
    total: number;
}

export interface BudgetCategoryData {
    [month: number]: BudgetMonthData;
}

export interface BudgetData {
    [categoryId: number]: BudgetCategoryData;
}

export interface YearlyBudget {
    budgetData: BudgetData;
}

// Credit usage data
export interface CreditUsageData {
    spent: number;
    limit: number;
    percentage: number;
}
