/**
 * Base utilities for repository pattern.
 * Provides shared database access and encryption utilities.
 */

import { db } from "../db";
import crypto from "crypto";

// Encryption setup for sensitive fields
const ALGORITHM = 'aes-256-cbc';

// In production, APP_SECRET must be set - fail fast if missing
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.APP_SECRET) {
    console.error('[FATAL] APP_SECRET environment variable is required in production mode');
    process.exit(1);
}

const SECRET_KEY = process.env.APP_SECRET || 'dev_secret_key_ensure_this_is_changed_in_prod';
const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest().subarray(0, 32);

// Regex to validate encrypted format: iv_hex (32 chars) : encrypted_hex (variable)
const ENCRYPTED_FORMAT_REGEX = /^[a-f0-9]{32}:[a-f0-9]+$/i;

/**
 * Check if a string appears to be encrypted (matches iv:ciphertext hex format).
 */
function isEncryptedFormat(text: string): boolean {
    return ENCRYPTED_FORMAT_REGEX.test(text);
}

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
 * Validates format before attempting decryption.
 * Returns the original value if it appears to be plaintext (legacy unencrypted data).
 * Throws on decryption failure of encrypted data.
 */
export function decrypt(text: string): string {
    if (!text) return text;

    // Check if the input matches encrypted format
    if (!isEncryptedFormat(text)) {
        // Not encrypted format - return as-is (legacy plaintext data)
        console.warn('[decrypt] Input does not match encrypted format, treating as plaintext (length: %d)', text.length);
        return text;
    }

    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        // Log error with context (not the actual secret data)
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error('[decrypt] Decryption failed for encrypted input (length: %d): %s', text.length, errorMessage);

        // Always throw on failure to prevent silent data corruption or masked errors
        if (isProduction) {
            throw new Error('Decryption failed');
        } else {
            // In development/test, provide more context for debugging
            throw new Error(`Decryption failed: ${errorMessage}`);
        }
    }
}

/**
 * Error thrown when a requested resource is not found.
 */
export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export { db };
