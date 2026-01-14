/**
 * User Repository
 * Handles all user-related database operations.
 */

import { eq } from "drizzle-orm";
import { db } from "./base";
import {
    type User,
    type UpsertUser,
    users,
} from "@shared/schema";

export class UserRepository {
    async getUser(id: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
    }

    async getUserByOidcId(oidcId: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.oidcId, oidcId));
        return user;
    }

    async createUser(userData: UpsertUser): Promise<User> {
        const [user] = await db.insert(users).values(userData).returning();
        return user;
    }

    async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
        const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
        return user;
    }
}
