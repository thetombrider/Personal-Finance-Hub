
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface DashboardHeaderProps {
    privacyMode: boolean;
    setPrivacyMode: (value: boolean) => void;
}

export function DashboardHeader({
    privacyMode,
    setPrivacyMode
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your financial health</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrivacyMode(!privacyMode)}
                    data-testid="button-privacy-toggle"
                    title={privacyMode ? "Show amounts" : "Hide amounts"}
                >
                    {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
