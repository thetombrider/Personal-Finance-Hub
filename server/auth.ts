import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);
const PgSession = connectPgSimple(session);

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "default-secret-do-not-use-prod",
        resave: false,
        saveUninitialized: false,
        store: new PgSession({
            pool,
            createTableIfMissing: false,
            tableName: 'sessions',
        }),
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false, { message: "Invalid username or password" });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }),
    );

    passport.serializeUser((user, done) => done(null, (user as User).id));
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.get("/api/auth/config", (_req, res) => {
        res.json({ disableSignup: process.env.DISABLE_SIGNUP === "true" });
    });

    app.post("/api/register", async (req, res, next) => {
        if (process.env.DISABLE_SIGNUP === "true") {
            return res.status(403).send("Signups are disabled");
        }
        try {
            const existingUser = await storage.getUserByUsername(req.body.username);
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.createUser({
                ...req.body,
                password: hashedPassword,
            });

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.status(200).json(req.user);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(req.user);
    });

    app.put("/api/user", async (req, res, next) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        try {
            const userId = (req.user as User).id;
            const updateData: Partial<User> = {};

            // Update username
            if (req.body.username && req.body.username !== (req.user as User).username) {
                const existingUser = await storage.getUserByUsername(req.body.username);
                if (existingUser) {
                    return res.status(400).send("Username already exists");
                }
                updateData.username = req.body.username;
            }

            // Update password
            if (req.body.password) {
                updateData.password = await hashPassword(req.body.password);
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(200).json(req.user);
            }

            const updatedUser = await storage.updateUser(userId, updateData);

            // Re-login with updated user to update session
            req.login(updatedUser!, (err) => {
                if (err) return next(err);
                res.status(200).json(updatedUser);
            });
        } catch (err) {
            next(err);
        }
    });
}

export function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
}
