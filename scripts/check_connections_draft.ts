
import { storage } from "../server/storage";
import { gocardlessService } from "../server/services/gocardless";
import { db } from "../server/db";
import { bankConnections } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkConnections() {
    console.log("Checking bank connection statuses...");
    try {
        const connections = await db.select().from(bankConnections);
        console.log(`Found ${connections.length} connections in DB.`);

        for (const conn of connections) {
            console.log(`Checking connection ${conn.id} (Status: ${conn.status}, Requisition: ${conn.requisitionId})...`);
            try {
                await gocardlessService.ensureToken();
                // Access client directly if possible, or we need a method in service.
                // The service has ensureToken and client is private.
                // But we can use executeWithRetry if we modify the service or expose client.
                // Actually, we can just use `handleCallback` logic but without the redirect check?
                // No, `handleCallback` expects a callback interaction.
                // We need `getRequisition`.
                // `gocardlessService` does NOT expose `getRequisition`.
                // But it has `getAccounts(requisitionId)` which calls `getRequisitionById`.
                // Wait, `getAccounts` returns `requisitionData.accounts`.
                // We can't see the status from `getAccounts`.

                // I should add a method `getRequisitionStatus` to `GoCardlessService` or use the client directly?
                // I cannot access private `client` from here.
                // modifying gocardless.ts to add getRequisition method.
            } catch (e) {
                console.error(`Error checking connection ${conn.id}:`, e);
            }
        }
    } catch (e) {
        console.error("Error fetching connections:", e);
    }
}

// Check if I can run this... actually I need to modify gocardless.ts first to expose status check.
