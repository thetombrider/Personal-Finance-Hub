
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
            console.log(`\nChecking connection ${conn.id} (Status: ${conn.status}, Requisition: ${conn.requisitionId})...`);
            try {
                const reqData = await gocardlessService.getRequisitionStatus(conn.requisitionId);
                console.log(`REAL GoCardless Status: ${reqData.status}`);

                if (reqData.status !== conn.status) {
                    console.log(`MISMATCH! Updating DB from ${conn.status} to ${reqData.status}...`);
                    await storage.updateBankConnection(conn.id, { status: reqData.status });
                    console.log("Updated.");
                } else {
                    console.log("Status matches.");
                }
            } catch (e: any) {
                console.error(`Error checking connection ${conn.id}:`, e.message);
            }
        }
    } catch (e) {
        console.error("Error fetching connections:", e);
    }
}

checkConnections().catch(console.error);
