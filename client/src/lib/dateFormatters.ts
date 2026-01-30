import { format, parseISO } from "date-fns";

export const dateFormats = {
    short: "dd/MM/yyyy",           // 27/01/2026
    medium: "MMM d, yyyy",         // Jan 27, 2026
    long: "dd MMMM yyyy",          // 27 January 2026
    dateTime: "dd/MM/yyyy HH:mm",  // 27/01/2026 14:30
    dateTimeSeconds: "dd/MM/yyyy HH:mm:ss",
    iso: "yyyy-MM-dd",             // 2026-01-27
    isoDateTime: "yyyy-MM-dd'T'HH:mm:ss",
    monthYear: "MMMM yyyy",        // January 2026
    time: "HH:mm",                 // 14:30
} as const;

export type DateFormatKey = keyof typeof dateFormats;

export function formatDate(date: Date | string, formatKey: DateFormatKey = "short"): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, dateFormats[formatKey]);
}

export function formatForApi(date: Date): string {
    return format(date, dateFormats.isoDateTime);
}

export function formatForDisplay(date: Date | string): string {
    return formatDate(date, "short");
}

export function formatDateTime(date: Date | string): string {
    return formatDate(date, "dateTime");
}
