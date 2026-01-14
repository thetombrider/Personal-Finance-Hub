
import { IStorage } from "../../storage";
import { MarketDataService } from "../marketData";
import { WeeklyReportData } from "./types";
import { getWeeklyReportData } from "./weeklyReport";
import { getMonthlyIncomeStatement, getMonthlyBudget, getYearlyBudgetTotal } from "./budgetReport";
import { getBalanceSheet, calculateAccountBalances } from "./balanceSheet";
import { generateWeeklyReportHtml, formatEur, formatPercent } from "./templates";
import { Account, Transaction } from "@shared/schema";

export class ReportService {
    constructor(
        private storage: IStorage,
        private marketDataService: MarketDataService
    ) { }

    async getWeeklyReportData(userId: string): Promise<WeeklyReportData> {
        return getWeeklyReportData(this.storage, this.marketDataService, userId);
    }

    generateHtml(data: WeeklyReportData): string {
        return generateWeeklyReportHtml(data);
    }

    // Exposed internal helpers if needed, though they seem only used internally by generateHtml in original code.
    // Original class exposed them as methods, so we keep them if needed, but they were not private.
    formatEur(n: number) {
        return formatEur(n);
    }

    formatPercent(n: number) {
        return formatPercent(n);
    }

    async getMonthlyIncomeStatement(userId: string, year: number, month: number) {
        return getMonthlyIncomeStatement(this.storage, userId, year, month);
    }

    async getBalanceSheet(userId: string) {
        return getBalanceSheet(this.storage, this.marketDataService, userId);
    }

    async getMonthlyBudget(userId: string, year: number, month: number) {
        return getMonthlyBudget(this.storage, userId, year, month);
    }

    async getYearlyBudgetTotal(userId: string, year: number) {
        return getYearlyBudgetTotal(this.storage, userId, year);
    }

    async calculateAccountBalances(accounts: Account[], transactions?: Transaction[]) {
        // Original method handled optional transactions, but we fixed it to be required in helper.
        // However, to maintain API compatibility if called from outside with optional:
        return calculateAccountBalances(accounts, transactions || []);
    }
}
