export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
        return String((error as { message: unknown }).message);
    }
    return "An unexpected error occurred";
}

export function isNetworkError(error: unknown): boolean {
    return error instanceof TypeError && error.message === "Failed to fetch";
}

export function isApiError(error: unknown): error is { status: number; message: string } {
    return error !== null && typeof error === "object" && "status" in error && "message" in error;
}
