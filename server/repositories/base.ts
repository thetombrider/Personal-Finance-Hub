/**
 * Base utilities for repository pattern.
 * Provides shared database access and encryption utilities.
 */

import { db } from "../db";
import crypto from "crypto";

// Encryption setup for sensitive fields
const ALGORITHM = 'aes-256-cbc';
// In production, APP_SECRET must be set and kept secure
const SECRET_KEY = process.env.APP_SECRET || 'dev_secret_key_ensure_this_is_changed_in_prod';
const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest().subarray(0, 32);

/**
 * Encrypt a string value using AES-256-CBC.
 * Returns the original value if empty.
 */
export function encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt a string value encrypted with encrypt().
 * Returns the original value if decryption fails (handles legacy unencrypted data).
 */
export function decrypt(text: string): string {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        // If decryption fails, return original text (handles legacy data)
        return text;
    }
}

export { db };
