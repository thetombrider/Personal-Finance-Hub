// @ts-ignore
import * as nordigenData from "nordigen-node";
// Handle various import scenarios (CJS/ESM/Bundled) for the library
const NordigenClient = (nordigenData as any).NordigenClient || (nordigenData as any).default || nordigenData;
import { storage } from "../storage";
import { type BankConnection, type InsertBankConnection } from "@shared/schema";
import { aiService } from "./openai";
import { logger } from "../lib/logger";
import crypto from "crypto";


// These should be in .env
const SECRET_ID = process.env.GOCARDLESS_SECRET_ID;
const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY;

if (!SECRET_ID || !SECRET_KEY) {
    logger.gocardless.error("GOCARDLESS_SECRET_ID or GOCARDLESS_SECRET_KEY not set in environment. GoCardless integration will be unavailable.");
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
            logger.gocardless.error("Failed to generate GoCardless token:", e);
            throw new Error("Failed to authenticate with GoCardless");
        }
    }

    async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            // Check for 401 Unauthorized which indicates expired token
            if (error.response && error.response.status === 401) {
                logger.gocardless.info("Token expired (401). Refreshing...");
                try {
                    this.client.token = null; // Force clear token
                    await this.ensureToken(); // Generate new token
                    logger.gocardless.info("Token refreshed successfully. Retrying operation...");
                    return await operation(); // Retry once
                } catch (refreshError) {
                    logger.gocardless.error("Failed to refresh token:", refreshError);
                    throw refreshError; // Re-throw the refresh error
                }
            }

            // Log full error details for debugging
            logger.gocardless.error("API Request Failed:", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

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
        const startTime = Date.now();
        logger.gocardless.info(`handleCallback:${requisitionId} started`);
        await this.ensureToken();

        try {
            return await this.executeWithRetry(async () => {
                // 1. Get requisition status
                logger.gocardless.info(`handleCallback:${requisitionId} Fetching requisition status...`, { elapsed: `${Date.now() - startTime}ms` });
                const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);
                logger.gocardless.info(`handleCallback:${requisitionId} Requisition status fetched`, { elapsed: `${Date.now() - startTime}ms` });

                // 2. Update DB
                const connection = await storage.getBankConnectionByRequisitionId(requisitionId);
                if (!connection) {
                    throw new Error("Connection not found for requisition: " + requisitionId);
                }

                // Always update the status in the DB
                await storage.updateBankConnection(connection.id, { status: requisitionData.status });

                if (requisitionData.status === "LN") { // Linked
                    // Fetch details for each account to return useful info (name, owner, etc)
                    logger.gocardless.info(`handleCallback:${requisitionId} Fetching account details...`, { elapsed: `${Date.now() - startTime}ms` });
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
                            logger.gocardless.error(`Failed to fetch details for account ${id}`, e);
                            return { id, name: `Bank Account (${id.substring(0, 8)}...)` };
                        }
                    }));
                    logger.gocardless.info(`handleCallback:${requisitionId} Account details fetched`, { elapsed: `${Date.now() - startTime}ms` });

                    return {
                        accounts: accountsWithDetails,
                        bankConnectionId: connection.id
                    };
                } else {
                    // Throw a specific error object or message that the route can interpret
                    const error = new Error(`Bank connection not completed. Status: ${requisitionData.status}`);
                    (error as any).status = 400; // Hint for the route handler
                    (error as any).code = requisitionData.status;
                    throw error;
                }
            });
        } finally {
            logger.gocardless.info(`handleCallback:${requisitionId} finished`, { totalDuration: `${Date.now() - startTime}ms` });
        }
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

    async syncTransactions(userId: string, localAccountId: number, bookDirectly: boolean = false) {
        const localAccount = await storage.getAccount(localAccountId);
        if (!localAccount || !localAccount.gocardlessAccountId) {
            throw new Error("Account not found or not linked to GoCardless");
        }

        const gcAccountId = localAccount.gocardlessAccountId;
        const isInitialSync = !localAccount.lastSynced;

        // Fetch last 180 days to support retroactive reconciliation
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 180);
        const dateFromStr = dateFrom.toISOString().split('T')[0];

        // Parallel fetch: Transactions AND Current Balance (needed for initial sync calculation)
        const [transactionsData, balancesData] = await Promise.all([
            this.getTransactions(gcAccountId, dateFromStr).catch(error => {
                // Handle 403 Access Forbidden (e.g. user denied transaction access or account type doesn't support it)
                if (error.response && error.response.status === 403) {
                    logger.gocardless.warn(`Transaction access forbidden (403) for account ${gcAccountId}. Proceeding with empty transactions.`);
                    return { transactions: { booked: [] }, accessDenied: true };
                }
                throw error;
            }),
            isInitialSync ? this.getBalances(gcAccountId).catch(e => {
                logger.gocardless.warn("Failed to fetch balances during sync:", e);
                return null;
            }) : Promise.resolve(null)
        ]);

        if (!transactionsData || !transactionsData.transactions) {
            logger.gocardless.warn("No transaction data returned from GoCardless");
            return { added: 0, total: 0 };
        }

        const booked = transactionsData.transactions.booked || [];

        // --- STARTING BALANCE CALCULATION (Initial Sync Only) ---
        if (isInitialSync && balancesData?.balances) {
            try {
                // 1. Get Current Balance
                const balanceObj = balancesData.balances.find((b: any) => b.balanceType === "closingBooked")
                    || balancesData.balances.find((b: any) => b.balanceType === "interimBooked")
                    || balancesData.balances.find((b: any) => b.balanceType === "expected")
                    || balancesData.balances.find((b: any) => b.balanceType === "interimAvailable");

                if (balanceObj && balanceObj.balanceAmount) {
                    const currentBalance = parseFloat(balanceObj.balanceAmount.amount);
                    let startingBalance = 0;
                    let method = "CALCULATED";

                    // 2. Try to find balanceBefore available in the OLDEST transaction
                    // Sort booked to find the oldest one (API usually returns newest first, but let's be safe)
                    const sortedTransactions = [...booked].sort((a, b) => {
                        const dateA = new Date(a.bookingDate || a.valueDate).getTime();
                        const dateB = new Date(b.bookingDate || b.valueDate).getTime();
                        return dateA - dateB;
                    });

                    const oldestTx = sortedTransactions[0];

                    // Check if transaction has balance info (Some banks provide this in proprietary fields or standard structure)
                    // Note: Nordigen/GoCardless standardizes this as 'balanceAfterTransaction' usually, but it's optional.
                    if (oldestTx && (oldestTx as any).balanceAfterTransaction && (oldestTx as any).balanceAfterTransaction.amount) {
                        const balanceAfter = parseFloat((oldestTx as any).balanceAfterTransaction.amount.amount);
                        const txAmount = parseFloat(oldestTx.transactionAmount.amount);
                        // Starting balance = Balance After Oldest Tx - Oldest Tx Amount
                        // Wait, 'starting balance' for our app means the balance *before* the first imported transaction.
                        // So if we have t1, t2, t3...
                        // Starting Balance should be: Balance(t0) = Balance(t1_after) - Amount(t1)
                        startingBalance = balanceAfter - txAmount;
                        method = "DIRECT_FROM_METADATA";
                    } else {
                        // 3. Fallback: Back-calculation
                        // Starting Balance = Current Balance - Sum(All Imported Transactions)
                        const sumTransactions = booked.reduce((sum: number, tx: any) => {
                            return sum + parseFloat(tx.transactionAmount.amount);
                        }, 0);

                        startingBalance = currentBalance - sumTransactions;
                    }

                    logger.gocardless.info(`Initial Sync: Setting starting balance for account ${localAccountId}.`);
                    logger.gocardless.info(`Method: ${method}, Current: ${currentBalance}, SumTx: ${booked.length > 0 ? booked.reduce((s: number, t: any) => s + parseFloat(t.transactionAmount.amount), 0) : 0}, Calculated Start: ${startingBalance}`);

                    await storage.updateAccount(localAccountId, {
                        startingBalance: startingBalance.toFixed(2)
                    });
                }
            } catch (error) {
                logger.gocardless.error("Failed to calculate starting balance:", error);
            }
        }

        // Optimization: Fetch all data once before loop to avoid O(N*M) DB calls
        const allTransactions = await storage.getTransactions(userId);
        const accountTransactions = allTransactions.filter(t => t.accountId === localAccountId);
        const stagingTransactions = await storage.getImportStaging(userId, localAccountId);
        const categories = await storage.getCategories(userId);

        let addedCount = 0;

        for (const tx of booked) {
            if (!tx.transactionId) continue;

            const amount = parseFloat(tx.transactionAmount.amount);
            const date = tx.bookingDate || tx.valueDate;
            const description = tx.remittanceInformationUnstructured || "Bank Transaction";

            // Check if already imported
            const existing = accountTransactions.find(t => t.externalId === tx.transactionId);
            const staged = stagingTransactions.find(t => t.externalId === tx.transactionId);

            if (existing || staged) {
                continue; // Already imported or staged with EXACT externalId match
            }

            // Fuzzy match logic
            // 1. Find potential matches (same amount, close date)
            // 2. Allow matching if:
            //    a) No externalId exists (pure manual)
            //    b) externalId is "Legacy" (numeric) AND different from new UUID

            const absAmount = Math.abs(amount);
            const targetDate = new Date(date);
            const minDate = new Date(targetDate); minDate.setDate(minDate.getDate() - 3);
            const maxDate = new Date(targetDate); maxDate.setDate(maxDate.getDate() + 3);

            const potentialMatches = accountTransactions.filter(t => {
                // EXCLUSION CRITERIA:
                // If it has an external ID, check if it's a UUID.
                // If it's a UUID (length > 20), we treat it as a "Verified Bank Transaction" and DO NOT touch it.
                // If it's short (numeric legacy), we ALLOW matching.
                if (t.externalId && t.externalId.length > 20) return false;

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
                logger.gocardless.info(`Linking GoCardless tx ${tx.transactionId} to existing tx ${match.id} (Legacy ID: ${match.externalId})`);

                await storage.updateTransaction(match.id, {
                    externalId: tx.transactionId
                });

                // Update in-memory list
                match.externalId = tx.transactionId;
            } else {
                if (bookDirectly) {
                    // BOOK DIRECTLY: Insert into transactions table
                    // Find or create "Uncategorized" category
                    let uncategorizedCategory = categories.find(c => c.name.toLowerCase() === "uncategorized");
                    if (!uncategorizedCategory) {
                        logger.gocardless.info(`Creating "Uncategorized" category for user ${userId}`);
                        uncategorizedCategory = await storage.createCategory({
                            name: "Uncategorized",
                            type: amount < 0 ? "expense" : "income",
                            color: "#9CA3AF", // Gray
                            userId: userId
                        });
                        categories.push(uncategorizedCategory); // Add to in-memory list for subsequent iterations
                    }

                    logger.gocardless.info(`Booking directly: ${tx.transactionId}`);
                    await storage.createTransaction({
                        accountId: localAccountId,
                        date: date,
                        amount: Math.abs(amount).toFixed(2), // Store as ABSOLUTE value
                        description: description,
                        categoryId: uncategorizedCategory.id,
                        type: amount < 0 ? "expense" : "income",
                        externalId: tx.transactionId
                    });
                    addedCount++;
                } else {
                    // STAGING: Create new in staging table
                    logger.gocardless.info(`Staging new tx for GoCardless tx ${tx.transactionId}`);

                    await storage.createImportStaging({
                        accountId: localAccountId,
                        date: date,
                        amount: amount.toFixed(2), // Store signed amount
                        description: description,
                        externalId: tx.transactionId,
                        rawData: tx,
                        suggestedCategoryId: await aiService.categorizeTransaction(description, categories)
                    });
                    addedCount++;
                }
            }
        }

        // Update lastSynced timestamp
        await storage.updateAccount(localAccountId, { lastSynced: new Date().toISOString() });

        return {
            added: addedCount,
            total: booked.length,
            warning: (transactionsData as any)?.accessDenied ? "transaction_access_denied" : undefined
        };
    }

    async syncBalances(localAccountId: number) {
        const localAccount = await storage.getAccount(localAccountId);
        if (!localAccount || !localAccount.gocardlessAccountId) return;

        try {
            const balances = await this.getBalances(localAccount.gocardlessAccountId);
            if (balances && balances.balances) {
                // Find the interimAvailable or closingBooked balance
                // GoCardless returns an array of balances with different types
                const balanceObj = balances.balances.find((b: any) => b.balanceType === "closingBooked")
                    || balances.balances.find((b: any) => b.balanceType === "interimBooked")
                    || balances.balances.find((b: any) => b.balanceType === "expected")
                    || balances.balances.find((b: any) => b.balanceType === "interimAvailable");

                if (balanceObj && balanceObj.balanceAmount) {
                    const amount = parseFloat(balanceObj.balanceAmount.amount);
                    // await storage.updateAccount(localAccountId, { balance: amount.toString() });
                    logger.gocardless.info(`Updated balance for account ${localAccountId} to ${amount} (Skipped: balance column missing)`);
                }
            }
        } catch (error) {
            logger.gocardless.error(`Failed to sync balance for account ${localAccountId}:`, error);
            // Don't fail the whole sync if balance fails
        }
    }
}

export const gocardlessService = new GoCardlessService();
