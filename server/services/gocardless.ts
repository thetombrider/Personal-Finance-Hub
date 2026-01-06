import * as nordigenData from "nordigen-node";
// Handle various import scenarios (CJS/ESM/Bundled) for the library
const NordigenClient = (nordigenData as any).NordigenClient || (nordigenData as any).default || nordigenData;
import { storage } from "../storage";
import { type BankConnection, type InsertBankConnection } from "@shared/schema";
import crypto from "crypto";


// These should be in .env
const SECRET_ID = process.env.GOCARDLESS_SECRET_ID;
const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY;

if (!SECRET_ID || !SECRET_KEY) {
    console.error("GOCARDLESS_SECRET_ID or GOCARDLESS_SECRET_KEY not set in environment. GoCardless integration will be unavailable.");
}

class GoCardlessService {
    private client: NordigenClient;
    private isConfigured: boolean;

    constructor() {
        this.isConfigured = !!(SECRET_ID && SECRET_KEY);
        this.client = new NordigenClient({
            secretId: SECRET_ID || "dummy",
            secretKey: SECRET_KEY || "dummy",
        });
    }

    async ensureToken() {
        if (!this.isConfigured) {
            throw new Error("GoCardless is not configured. Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.");
        }
        try {
            if (!this.client.token) {
                await this.client.generateToken();
            }
        } catch (e) {
            console.error("Failed to generate GoCardless token:", e);
            throw new Error("Failed to authenticate with GoCardless");
        }
    }

    async listInstitutions(country: string) {
        await this.ensureToken();
        return await this.client.institution.getInstitutions({ country });
    }

    async createRequisition(userId: string, institutionId: string, redirect: string) {
        await this.ensureToken();

        // 0. Create Agreement (Step 5 in Quickstart)
        // Explicitly asking for 180 days of history and 90 days access
        const agreement = await this.client.agreement.createAgreement({
            institutionId: institutionId,
            maxHistoricalDays: 180,
            accessValidForDays: 90,
            accessScope: ["balances", "details", "transactions"],
        });

        const reference = crypto.randomUUID();
        const requisition = await this.client.requisition.createRequisition({
            redirectUrl: redirect,
            institutionId: institutionId,
            reference: reference, // Must be unique per requisition
            agreement: agreement.id,
            userLanguage: "IT", // Enforce Italian if possible
        });

        // 2. Save to DB
        const connection: InsertBankConnection = {
            userId,
            requisitionId: requisition.id,
            institutionId,
            status: "INIT",
        };
        await storage.createBankConnection(connection);

        // 3. Build link
        const link = requisition.link;

        return { link, requisitionId: requisition.id };
    }

    // Called when user returns from bank
    async handleCallback(requisitionId: string) {
        await this.ensureToken();

        // 1. Get requisition status
        const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);

        // 2. Update DB
        const connection = await storage.getBankConnectionByRequisitionId(requisitionId);
        if (!connection) {
            throw new Error("Connection not found for requisition: " + requisitionId);
        }

        if (requisitionData.status === "LN") { // Linked
            await storage.updateBankConnection(connection.id, { status: "LINKED" });

            // Return accounts
            return requisitionData.accounts;
        } else {
            await storage.updateBankConnection(connection.id, { status: requisitionData.status });
            throw new Error("Bank connection failed with status: " + requisitionData.status);
        }
    }

    async getAccounts(requisitionId: string) {
        await this.ensureToken();
        const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);
        return requisitionData.accounts;
    }

    async getAccountDetails(accountId: string) {
        await this.ensureToken();
        const account = this.client.account(accountId);
        return await account.getDetails();
    }

    async getBalances(accountId: string) {
        await this.ensureToken();
        const account = this.client.account(accountId);
        return await account.getBalances();
    }

    async getTransactions(accountId: string, dateFrom?: string, dateTo?: string) {
        await this.ensureToken();
        const account = this.client.account(accountId);
        return await account.getTransactions({ dateFrom, dateTo });
    }

    async syncTransactions(userId: string, localAccountId: number) {
        const localAccount = await storage.getAccount(localAccountId);
        if (!localAccount || !localAccount.gocardlessAccountId) {
            throw new Error("Account not found or not linked to GoCardless");
        }

        const gcAccountId = localAccount.gocardlessAccountId;

        // Fetch last 30 days
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);
        const dateFromStr = dateFrom.toISOString().split('T')[0];

        const data = await this.getTransactions(gcAccountId, dateFromStr);

        if (!data || !data.transactions) {
            console.warn("No transaction data returned from GoCardless");
            return { added: 0, total: 0 };
        }

        const booked = data.transactions.booked || [];

        // Optimization: Fetch all data once before loop to avoid O(N*M) DB calls
        const allTransactions = await storage.getTransactions();
        const accountTransactions = allTransactions.filter(t => t.accountId === localAccountId);

        // Pre-fetch categories for fallback
        const categories = await storage.getCategories();
        if (categories.length === 0) {
            throw new Error("Cannot sync transactions: no categories exist. Please create at least one category first.");
        }
        const defaultCategoryId = categories[0].id;

        let addedCount = 0;

        for (const tx of booked) {
            if (!tx.transactionId) continue;

            // Check if already imported (using in-memory list)
            const existing = accountTransactions.find(t => t.gocardlessTransactionId === tx.transactionId);

            if (existing) {
                continue; // Already imported
            }

            const amount = parseFloat(tx.transactionAmount.amount);
            const absAmount = Math.abs(amount);
            const date = tx.bookingDate || tx.valueDate;
            const description = tx.remittanceInformationUnstructured || "Bank Transaction";

            // Fuzzy match: same amount (abs) and close date (+/- 3 days)
            const targetDate = new Date(date);
            const minDate = new Date(targetDate); minDate.setDate(minDate.getDate() - 3);
            const maxDate = new Date(targetDate); maxDate.setDate(maxDate.getDate() + 3);

            // Match against transactions NOT linked to GC, for this account
            const potentialMatches = accountTransactions.filter(t => {
                if (t.gocardlessTransactionId) return false;

                // Fuzzy comparison for float equality
                const EPSILON = 0.001;
                const tAmount = parseFloat(t.amount.toString());
                if (Math.abs(Math.abs(tAmount) - absAmount) > EPSILON) return false;

                const tDate = new Date(t.date);
                return tDate >= minDate && tDate <= maxDate;
            });

            if (potentialMatches.length > 0) {
                // Link to the first match
                const match = potentialMatches[0];
                console.log(`Linking GoCardless tx ${tx.transactionId} to existing tx ${match.id}`);
                await storage.updateTransaction(match.id, {
                    gocardlessTransactionId: tx.transactionId
                });

                // Update in-memory list to prevent double-linking if multiple matches occur (though rare)
                match.gocardlessTransactionId = tx.transactionId;
            } else {
                // Create new
                console.log(`Creating new tx for GoCardless tx ${tx.transactionId}`);

                await storage.createTransaction({
                    accountId: localAccountId,
                    date: date,
                    amount: absAmount.toFixed(2),
                    description: description,
                    categoryId: defaultCategoryId,
                    type: amount < 0 ? "expense" : "income",
                    gocardlessTransactionId: tx.transactionId,
                });
                addedCount++;
            }
        }

        return { added: addedCount, total: booked.length };
    }

    async syncBalances(localAccountId: number) {
        const localAccount = await storage.getAccount(localAccountId);
        if (!localAccount || !localAccount.gocardlessAccountId) return;

        try {
            const balances = await this.getBalances(localAccount.gocardlessAccountId);
            if (balances && balances.balances) {
                // Find the interimAvailable or closingBooked balance
                // GoCardless returns an array of balances with different types
                const balanceObj = balances.balances.find((b: any) => b.balanceType === "interimAvailable")
                    || balances.balances.find((b: any) => b.balanceType === "expected")
                    || balances.balances.find((b: any) => b.balanceType === "closingBooked");

                if (balanceObj && balanceObj.balanceAmount) {
                    const amount = parseFloat(balanceObj.balanceAmount.amount);
                    await storage.updateAccount(localAccountId, { balance: amount.toString() });
                    console.log(`Updated balance for account ${localAccountId} to ${amount}`);
                }
            }
        } catch (error) {
            console.error(`Failed to sync balance for account ${localAccountId}:`, error);
            // Don't fail the whole sync if balance fails
        }
    }
}

export const gocardlessService = new GoCardlessService();
