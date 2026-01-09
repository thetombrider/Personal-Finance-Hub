
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkColumn() {
    try {
        const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'budget';
    `);

        if (result.rows.length > 0) {
            console.log("Column 'budget' EXISTS in 'categories' table.");
        } else {
            console.log("Column 'budget' DOES NOT EXIST in 'categories' table.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error checking column:", err);
        process.exit(1);
    }
}

checkColumn();
