import { getErrorMessage } from "./errors";

type ToastFn = (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => void;

export const showSuccess = (toast: ToastFn, title: string, description?: string) => {
    toast({ title, description });
};

export const showError = (toast: ToastFn, title: string, description?: string) => {
    toast({ title, description, variant: "destructive" });
};

// CRUD operation helpers
export const toastPatterns = {
    created: (toast: ToastFn, resource: string, description?: string) =>
        showSuccess(toast, `${resource} created`, description),
    updated: (toast: ToastFn, resource: string, description?: string) =>
        showSuccess(toast, `${resource} updated`, description),
    deleted: (toast: ToastFn, resource: string) =>
        showSuccess(toast, `${resource} deleted`),
    saved: (toast: ToastFn, resource: string) =>
        showSuccess(toast, `${resource} saved`),
    failed: (toast: ToastFn, action: string, error?: unknown) =>
        showError(toast, `Failed to ${action}`, error ? getErrorMessage(error) : undefined),
    copied: (toast: ToastFn) =>
        showSuccess(toast, "Copied to clipboard"),
};
