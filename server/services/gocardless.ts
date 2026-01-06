import { NordigenClient } from "nordigen-node";
import { storage } from "../storage";
import { type BankConnection, type InsertBankConnection } from "@shared/schema";

// These should be in .env
const SECRET_ID = process.env.GOCARDLESS_SECRET_ID;
const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY;

if (!SECRET_ID || !SECRET_KEY) {
    console.warn("GOCARDLESS_SECRET_ID or GOCARDLESS_SECRET_KEY not set in environment");
}

class GoCardlessService {
    private client: NordigenClient;

    constructor() {
        this.client = new NordigenClient({
            secretId: SECRET_ID || "dummy",
            secretKey: SECRET_KEY || "dummy",
        });
    }

    async ensureToken() {
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

        // 1. Create requisition
        const requisition = await this.client.requisition.createRequisition({
            redirect: redirect,
            institutionId: institutionId,
            reference: userId,
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
        const booked = data.transactions.booked;

        let addedCount = 0;

        for (const tx of booked) {
            if (!tx.transactionId) continue;

            const existing = (await storage.getTransactions()).find(t => t.gocardlessTransactionId === tx.transactionId);

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

            // We only match against transactions that are NOT already linked to GC
            // And we match specifically for the same accountId.
            const potentialMatches = (await storage.getTransactions()).filter(t => {
                if (t.accountId !== localAccountId) return false;
                if (t.gocardlessTransactionId) return false;

                // Exact amount check on absolute value
                const tAmount = parseFloat(t.amount.toString());
                if (Math.abs(tAmount) !== absAmount) return false;

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
            } else {
                // Create new
                console.log(`Creating new tx for GoCardless tx ${tx.transactionId}`);
                // Fetch first category as fallback
                const categories = await storage.getCategories();
                const defaultCategoryId = categories.length > 0 ? categories[0].id : 1;

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
}

export const gocardlessService = new GoCardlessService();
