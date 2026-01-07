// @ts-ignore
import * as nordigenData from "nordigen-node";
// Handle various import scenarios (CJS/ESM/Bundled) for the library
const NordigenClient = (nordigenData as any).NordigenClient || (nordigenData as any).default || nordigenData;
import { storage } from "../storage";
import { type BankConnection, type InsertBankConnection } from "@shared/schema";
import { aiService } from "./openai";
import crypto from "crypto";


// These should be in .env
const SECRET_ID = process.env.GOCARDLESS_SECRET_ID;
const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY;

if (!SECRET_ID || !SECRET_KEY) {
    console.error("GOCARDLESS_SECRET_ID or GOCARDLESS_SECRET_KEY not set in environment. GoCardless integration will be unavailable.");
}

class GoCardlessService {
    private client: any;
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

    async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            // Check for 401 Unauthorized which indicates expired token
            if (error.response && error.response.status === 401) {
                console.log("GoCardless token expired (401), refreshing...");
                this.client.token = null; // Force clear token
                await this.ensureToken(); // Generate new token
                return await operation(); // Retry once
            }
            // Pass through 429 errors specifically
            if (error.response && error.response.status === 429) {
                const err = new Error("Rate limit reached");
                (err as any).status = 429;
                throw err;
            }
            throw error;
        }
    }

    async listInstitutions(country: string) {
        await this.ensureToken();
        return await this.executeWithRetry(() => this.client.institution.getInstitutions({ country }));
    }

    async createRequisition(userId: string, institutionId: string, redirect: string) {
        await this.ensureToken();

        return await this.executeWithRetry(async () => {
            // 1. Get institution details to check limits
            const institution = await this.client.institution.getInstitutionById(institutionId);
            const maxHistory = institution.transaction_total_days
                ? Math.min(180, parseInt(institution.transaction_total_days))
                : 180;

            // 0. Create Agreement (Step 5 in Quickstart)
            const agreement = await this.client.agreement.createAgreement({
                institutionId: institutionId,
                maxHistoricalDays: maxHistory,
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
        });
    }

    // Called when user returns from bank
    async handleCallback(requisitionId: string) {
        await this.ensureToken();

        return await this.executeWithRetry(async () => {
            // 1. Get requisition status
            const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);

            // 2. Update DB
            const connection = await storage.getBankConnectionByRequisitionId(requisitionId);
            if (!connection) {
                throw new Error("Connection not found for requisition: " + requisitionId);
            }

            // Always update the status in the DB
            await storage.updateBankConnection(connection.id, { status: requisitionData.status });

            if (requisitionData.status === "LN") { // Linked
                // Fetch details for each account to return useful info (name, owner, etc)
                const accountIds = requisitionData.accounts;
                const accountsWithDetails = await Promise.all(accountIds.map(async (id: string) => {
                    try {
                        const details = await this.client.account(id).getDetails();
                        // Struct: { account: { resourceId, iban, currency, name, product, ... } }
                        return {
                            id,
                            name: details.account.name || details.account.product || "Bank Account",
                            iban: details.account.iban,
                            currency: details.account.currency,
                            ownerName: details.account.ownerName
                        };
                    } catch (e) {
                        console.error(`Failed to fetch details for account ${id}`, e);
                        return { id, name: `Bank Account (${id.substring(0, 8)}...)` };
                    }
                }));

                return accountsWithDetails;
            } else {
                // Throw a specific error object or message that the route can interpret
                const error = new Error(`Bank connection not completed. Status: ${requisitionData.status}`);
                (error as any).status = 400; // Hint for the route handler
                (error as any).code = requisitionData.status;
                throw error;
            }
        });
    }

    async getRequisitionStatus(requisitionId: string) {
        await this.ensureToken();
        return await this.executeWithRetry(async () => {
            const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);
            return requisitionData;
        });
    }

    async getAccounts(requisitionId: string) {
        await this.ensureToken();
        return await this.executeWithRetry(async () => {
            const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);
            return requisitionData.accounts;
        });
    }

    async getAccountDetails(accountId: string) {
        await this.ensureToken();
        return await this.executeWithRetry(async () => {
            const account = this.client.account(accountId);
            return await account.getDetails();
        });
    }

    async getBalances(accountId: string) {
        await this.ensureToken();
        return await this.executeWithRetry(async () => {
            const account = this.client.account(accountId);
            return await account.getBalances();
        });
    }

    async getTransactions(accountId: string, dateFrom?: string, dateTo?: string) {
        await this.ensureToken();
        return await this.executeWithRetry(async () => {
            const account = this.client.account(accountId);
            return await account.getTransactions({ dateFrom, dateTo });
        });
    }

    async syncTransactions(userId: string, localAccountId: number) {
        const localAccount = await storage.getAccount(localAccountId);
        if (!localAccount || !localAccount.gocardlessAccountId) {
            throw new Error("Account not found or not linked to GoCardless");
        }

        const gcAccountId = localAccount.gocardlessAccountId;

        // Fetch last 180 days to support retroactive reconciliation
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 180);
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
        const stagingTransactions = await storage.getImportStaging(localAccountId);
        const categories = await storage.getCategories();

        let addedCount = 0;

        for (const tx of booked) {
            if (!tx.transactionId) continue;

            // Check if already imported (using in-memory list)
            const existing = accountTransactions.find(t => t.gocardlessTransactionId === tx.transactionId);
            const staged = stagingTransactions.find(t => t.gocardlessTransactionId === tx.transactionId);

            if (existing || staged) {
                continue; // Already imported or staged
            }

            const amount = parseFloat(tx.transactionAmount.amount);
            // const absAmount = Math.abs(amount); // Removed: Staging stores raw amount
            const date = tx.bookingDate || tx.valueDate;
            const description = tx.remittanceInformationUnstructured || "Bank Transaction";

            // Fuzzy match logic (Optional: keep this to link existing manual transactions?)
            // For now, let's keep the logic: if we find a manual match, we LINK it.
            // If we don't find a match, we STAGE it.

            const absAmount = Math.abs(amount);
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

                // Update in-memory list
                match.gocardlessTransactionId = tx.transactionId;
            } else {
                // Create new in STAGING
                console.log(`Staging new tx for GoCardless tx ${tx.transactionId}`);

                await storage.createImportStaging({
                    accountId: localAccountId,
                    date: date,
                    amount: amount.toFixed(2), // Store signed amount
                    description: description,
                    gocardlessTransactionId: tx.transactionId,
                    rawData: tx,
                    suggestedCategoryId: await aiService.categorizeTransaction(description, categories)
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
                    // await storage.updateAccount(localAccountId, { balance: amount.toString() });
                    console.log(`Updated balance for account ${localAccountId} to ${amount} (Skipped: balance column missing)`);
                }
            }
        } catch (error) {
            console.error(`Failed to sync balance for account ${localAccountId}:`, error);
            // Don't fail the whole sync if balance fails
        }
    }
}

export const gocardlessService = new GoCardlessService();
