import type { Category } from "@shared/schema";

/**
 * Find a category by name (case-insensitive, supports multiple names)
 */
export function findCategoryByName(
    categories: Category[],
    names: string | string[]
): Category | undefined {
    const searchNames = Array.isArray(names) ? names : [names];
    const lowerNames = searchNames.map((n) => n.toLowerCase());

    return categories.find((c) => lowerNames.includes(c.name.toLowerCase()));
}

/**
 * Find the transfer category
 */
export function findTransferCategory(categories: Category[]): Category | undefined {
    return findCategoryByName(categories, ["trasferimenti", "transfer", "transfers"]);
}

/**
 * Get categories by type
 */
export function getCategoriesByType(
    categories: Category[],
    type: "income" | "expense" | "transfer"
): Category[] {
    return categories.filter((c) => c.type === type);
}

/**
 * Sort categories by usage or name
 */
export function sortCategories(
    categories: Category[],
    sortBy: "name" | "usage" = "name"
): Category[] {
    return [...categories].sort((a, b) => {
        if (sortBy === "name") {
            return a.name.localeCompare(b.name);
        }
        // For usage, we'd need transaction count data which isn't available here yet
        // Fallback to name sort
        return a.name.localeCompare(b.name);
    });
}
