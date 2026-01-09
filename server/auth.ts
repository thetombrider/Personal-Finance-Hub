import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as OpenIDConnectStrategy } from "passport-openidconnect";
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

    const oidcIssuer = process.env.OIDC_ISSUER_URL?.trim();
    const oidcClientId = process.env.OIDC_CLIENT_ID?.trim();
    const oidcClientSecret = process.env.OIDC_CLIENT_SECRET?.trim();
    const oidcCallbackUrl = process.env.OIDC_CALLBACK_URL?.trim();

    // Allow custom endpoints (Authelia/Authentik/PocketID have different paths)
    const oidcAuthorizationUrl = process.env.OIDC_AUTHORIZATION_URL?.trim() || `${oidcIssuer}/protocol/openid-connect/auth`;
    const oidcTokenUrl = process.env.OIDC_TOKEN_URL?.trim() || `${oidcIssuer}/protocol/openid-connect/token`;
    const oidcUserInfoUrl = process.env.OIDC_USERINFO_URL?.trim() || `${oidcIssuer}/protocol/openid-connect/userinfo`;

    const oidcEnabled = !!(oidcIssuer && oidcClientId && oidcClientSecret && oidcCallbackUrl);

    // Validate SSO_ONLY configuration
    if (process.env.SSO_ONLY === "true" && !oidcEnabled) {
        throw new Error(
            "SSO_ONLY is enabled but OIDC is not properly configured. " +
            "Please set OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, and OIDC_CALLBACK_URL " +
            "environment variables, or disable SSO_ONLY."
        );
    }

    if (oidcEnabled) {
        passport.use(
            "openidconnect",
            new OpenIDConnectStrategy(
                {
                    issuer: oidcIssuer!,
                    authorizationURL: oidcAuthorizationUrl,
                    tokenURL: oidcTokenUrl,
                    userInfoURL: oidcUserInfoUrl,
                    clientID: oidcClientId!,
                    clientSecret: oidcClientSecret!,
                    callbackURL: oidcCallbackUrl!,
                    scope: ["openid", "profile", "email"],
                    passReqToCallback: true,
                },
                async (req: any, issuer: any, profile: any, cb: any) => {
                    try {
                        const oidcId = profile.id;
                        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

                        // Case 1: Link to existing logged-in user
                        if (req.user) {
                            const existingUser = await storage.getUserByOidcId(oidcId);
                            if (existingUser && existingUser.id !== req.user.id) {
                                return cb(new Error("This SSO account is already connected to another user."));
                            }
                            if (!existingUser) {
                                const updated = await storage.updateUser(req.user.id, { oidcId: oidcId });
                                return cb(null, updated);
                            }
                            return cb(null, req.user);
                        }

                        // Case 2: Standard Login/Register

                        // Prioritize username (preferred_username) over display name
                        const baseUsername = profile.username || profile.displayName || (email ? email.split('@')[0] : "user");

                        // 1. Check if user exists by OIDC ID
                        let user = await storage.getUserByOidcId(oidcId);
                        if (user) {
                            return cb(null, user);
                        }

                        // 2. Check if user exists by email (link account)
                        if (email) {
                            const existingUser = await storage.getUserByEmail(email);
                            if (existingUser) {
                                const updated = await storage.updateUser(existingUser.id, { oidcId: oidcId });
                                return cb(null, updated);
                            }
                        }

                        // 3. Auto-provision with retry for username collision
                        const randomPassword = randomBytes(32).toString("hex");
                        const hashedPassword = await hashPassword(randomPassword);
                        const profileImageUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

                        let attempts = 0;
                        const maxAttempts = 3;

                        while (attempts < maxAttempts) {
                            try {
                                const suffix = attempts === 0 ? "" : `_${randomBytes(4).toString("hex")}`;
                                let usernameCandidate = attempts === 0 ? baseUsername : `${baseUsername}${suffix}`;

                                if (!usernameCandidate) {
                                    usernameCandidate = `user_${randomBytes(4).toString("hex")}`;
                                }

                                user = await storage.createUser({
                                    username: usernameCandidate,
                                    password: hashedPassword,
                                    email: email,
                                    oidcId: oidcId,
                                    profileImageUrl: profileImageUrl,
                                    firstName: profile.name?.givenName,
                                    lastName: profile.name?.familyName,
                                });
                                return cb(null, user);
                            } catch (err: any) {
                                // Check if error is constraint violation
                                if (err.message && (err.message.includes("unique") || err.message.includes("constraint"))) {
                                    // If it's email constraint, we should have caught it above in step 2 if we handle logic correctly.
                                    if (err.message.includes("email") || (err.constraint && err.constraint.includes("email"))) {
                                        if (email) {
                                            const existingUser = await storage.getUserByEmail(email);
                                            if (existingUser) {
                                                const updated = await storage.updateUser(existingUser.id, { oidcId: oidcId });
                                                return cb(null, updated);
                                            }
                                        }
                                        return cb(err);
                                    }

                                    // Assume it is username collision, retry
                                    attempts++;
                                    if (attempts === maxAttempts) return cb(err);
                                } else {
                                    return cb(err);
                                }
                            }
                        }
                    } catch (err: any) {
                        return cb(err);
                    }
                }
            )
        );

        app.get("/api/auth/oidc", passport.authenticate("openidconnect"));

        app.get(
            "/api/auth/oidc/callback",
            passport.authenticate("openidconnect", {
                failWithError: true,
                failureRedirect: "/auth?error=oidc_failed",
                successRedirect: "/",
            })
        );
    }

    passport.serializeUser((user, done) => done(null, (user as User).id));
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });


    // Moved to bottom to include oidcEnabled
    // app.get("/api/auth/config", ... 


    app.post("/api/register", async (req, res, next) => {
        if (process.env.DISABLE_SIGNUP === "true" || process.env.SSO_ONLY === "true") {
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

    app.post("/api/login", (req, res, next) => {
        if (process.env.SSO_ONLY === "true") {
            return res.status(403).send("Native login disabled");
        }
        passport.authenticate("local")(req, res, next);
    }, (req, res) => {
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

            // Update email (check uniqueness)
            if (req.body.email && req.body.email !== (req.user as User).email) {
                const existingUser = await storage.getUserByEmail(req.body.email);
                if (existingUser) {
                    return res.status(400).send("Email already exists");
                }
                updateData.email = req.body.email;
            }

            // Update profile fields
            if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
            if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
            if (req.body.profileImageUrl !== undefined) updateData.profileImageUrl = req.body.profileImageUrl;

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

    app.delete("/api/user", async (req, res, next) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);

        try {
            const userId = (req.user as User).id;

            // Delete all user data
            await storage.deleteUser(userId);

            // Logout and destroy session
            req.logout((err) => {
                if (err) return next(err);
                if (req.session) {
                    req.session.destroy((err) => {
                        if (err) return next(err);
                        res.sendStatus(204);
                    });
                } else {
                    res.sendStatus(204);
                }
            });
        } catch (err) {
            next(err);
        }
    });

    app.get("/api/auth/config", (_req, res) => {
        res.json({
            disableSignup: process.env.DISABLE_SIGNUP === "true",
            oidcEnabled: !!(process.env.OIDC_ISSUER_URL && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET && process.env.OIDC_CALLBACK_URL),
            ssoOnly: process.env.SSO_ONLY === "true"
        });
    });


}

export function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
}
