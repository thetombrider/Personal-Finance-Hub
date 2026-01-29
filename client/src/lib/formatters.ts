/**
 * Format amount for API submission (string, positive)
 */
export function formatAmountForApi(amount: number): string {
    return Math.abs(amount).toString();
}

/**
 * Format amount for display with currency
 */
export function formatCurrency(
    amount: number,
    currency: string = "EUR",
    locale: string = "it-IT"
): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(amount);
}

/**
 * Parse amount string to number
 */
export function parseAmount(value: string): number {
    // Handle European format (1.234,56) and US format (1,234.56)
    const cleaned = value.replace(/[^\d,.-]/g, "");

    // If we have both comma and dot, determine format
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma > lastDot) {
        // European format: 1.234,56
        return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    }

    // US format or simple number
    return parseFloat(cleaned.replace(/,/g, ""));
}
