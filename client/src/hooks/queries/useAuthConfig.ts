import { useQuery } from "@tanstack/react-query";

interface AuthConfig {
    authEnabled: boolean;
    disableSignup: boolean;
    oidcEnabled: boolean;
    ssoOnly: boolean;
}

export function useAuthConfig() {
    return useQuery<AuthConfig>({
        queryKey: ["/api/auth/config"],
        queryFn: async () => {
            const res = await fetch("/api/auth/config");
            if (!res.ok) throw new Error("Failed to fetch auth config");
            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - auth config rarely changes
    });
}
